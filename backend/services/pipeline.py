"""
Pipeline ETL complet : Lecture → Validation → Nettoyage → Transformation → Stockage
Supporte : étudiants, notes, absences, retards
"""
import pandas as pd
import numpy as np
import io
from typing import Tuple, Dict, Any
from sqlalchemy.orm import Session
from backend.database import Etudiant, Note, Absence, Retard, Module, ImportHistory
from datetime import datetime

COLONNES_OBLIGATOIRES = {
    "etudiants": ["etudiant_id", "prenom", "nom", "classe"],
    "notes":     ["etudiant_id", "module", "note"],
    "absences":  ["etudiant_id", "module", "date"],
    "retards":   ["etudiant_id", "module", "date"],
}


def read_file(content: bytes, filename: str) -> pd.DataFrame:
    """Lecture intelligente CSV (auto-détection séparateur) ou Excel."""
    fn = filename.lower()
    if fn.endswith(".csv"):
        for sep in [",", ";", "\t", "|"]:
            try:
                df = pd.read_csv(io.BytesIO(content), sep=sep)
                if len(df.columns) > 1:
                    return df
            except Exception:
                continue
        raise ValueError("Impossible de lire le CSV. Vérifiez le séparateur.")
    elif fn.endswith((".xlsx", ".xls")):
        return pd.read_excel(io.BytesIO(content))
    else:
        raise ValueError("Format non supporté. Utilisez CSV ou Excel (.xlsx/.xls).")


def normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Normalise les noms de colonnes : lowercase, sans accents, underscores."""
    df = df.copy()
    df.columns = (
        df.columns.str.strip()
        .str.lower()
        .str.replace(r"[éèêë]", "e", regex=True)
        .str.replace(r"[àâ]",   "a", regex=True)
        .str.replace(r"[ôo]",   "o", regex=True)
        .str.replace(r"[ùûü]",  "u", regex=True)
        .str.replace(r"[^a-z0-9_]", "_", regex=True)
        .str.strip("_")
    )
    return df


def validate_data(df: pd.DataFrame, import_type: str) -> Dict[str, Any]:
    """Vérifie la présence des colonnes obligatoires et la cohérence des types."""
    issues   = []
    warnings = []
    required = COLONNES_OBLIGATOIRES.get(import_type, [])

    for col in required:
        if col not in df.columns:
            candidates = [c for c in df.columns if col.replace("_","") in c.replace("_","")]
            if candidates:
                df.rename(columns={candidates[0]: col}, inplace=True)
                warnings.append(f"Colonne '{candidates[0]}' renommée automatiquement en '{col}'.")
            else:
                issues.append(f"Colonne obligatoire manquante : '{col}'")

    for col, cnt in df.isnull().sum().items():
        if cnt > 0:
            warnings.append(f"'{col}' : {cnt} valeur(s) manquante(s) détectée(s).")

    if import_type == "notes" and "note" in df.columns:
        n_invalid = pd.to_numeric(df["note"], errors="coerce").isna().sum()
        if n_invalid > 0:
            issues.append(f"{n_invalid} note(s) non numérique(s) détectée(s).")
        else:
            n_out = ((pd.to_numeric(df["note"], errors="coerce") < 0) |
                     (pd.to_numeric(df["note"], errors="coerce") > 20)).sum()
            if n_out > 0:
                warnings.append(f"{n_out} note(s) hors intervalle [0, 20] — seront limitées.")

    if import_type == "retards" and "minutes" in df.columns:
        n_neg = (pd.to_numeric(df["minutes"], errors="coerce") < 0).sum()
        if n_neg > 0:
            warnings.append(f"{n_neg} durée(s) de retard négative(s) — seront corrigées.")

    return {"issues": issues, "warnings": warnings, "valid": len(issues) == 0}


def clean_data(df: pd.DataFrame, import_type: str) -> Tuple[pd.DataFrame, Dict]:
    """Nettoyage complet : doublons, types, valeurs nulles, normalisation."""
    original = len(df)
    stats    = {}
    df       = df.copy()

    # 1. Supprimer les doublons
    df = df.drop_duplicates()
    stats["doublons_supprimes"] = original - len(df)

    # 2. Nettoyer les chaînes
    for col in df.select_dtypes(include=["object"]).columns:
        df[col] = df[col].astype(str).str.strip().replace("nan", np.nan)

    # 3. Traitement spécifique par type
    if import_type == "notes":
        df["note"]        = pd.to_numeric(df["note"], errors="coerce").clip(0, 20)
        nulls             = int(df["note"].isna().sum())
        df["note"]        = df["note"].fillna(df["note"].median())
        stats["notes_imputees"] = nulls
        if "coefficient" not in df.columns: df["coefficient"] = 1
        if "coefficient" not in df.columns: df["coefficient"] = 1
        if "semestre"    not in df.columns: df["semestre"]    = "S1"
        df["coefficient"] = pd.to_numeric(df["coefficient"], errors="coerce").fillna(1).astype(int)

    if import_type == "absences":
        if "justifiee" not in df.columns:
            df["justifiee"] = False
        df["justifiee"] = df["justifiee"].map(
            lambda x: True if str(x).lower() in ["true","oui","1","yes","vrai"] else False
        )

    if import_type == "retards":
        if "minutes" not in df.columns:
            df["minutes"] = 15
        df["minutes"] = pd.to_numeric(df["minutes"], errors="coerce").fillna(15).clip(1, 120).astype(int)

    if import_type == "etudiants":
        if "email" not in df.columns:
            df["email"] = df.apply(
                lambda r: f"{str(r.get('prenom','')).lower()}.{str(r.get('nom','')).lower().replace(' ','')}@campus.ma",
                axis=1
            )
        if "date_inscription" not in df.columns:
            df["date_inscription"] = "2024-09-01"

    stats["lignes_finales"] = len(df)
    return df, stats


def save_to_db(df: pd.DataFrame, import_type: str, db: Session) -> Dict:
    """Sauvegarde en base avec gestion des doublons."""
    saved  = 0
    errors = []

    if import_type == "etudiants":
        for _, row in df.iterrows():
            try:
                if not db.query(Etudiant).filter(Etudiant.etudiant_id == str(row["etudiant_id"])).first():
                    db.add(Etudiant(
                        etudiant_id      = str(row["etudiant_id"]),
                        prenom           = str(row.get("prenom", "")),
                        nom              = str(row.get("nom", "")),
                        email            = str(row.get("email", "")),
                        classe           = str(row.get("classe", "")),
                        date_inscription = str(row.get("date_inscription", "2024-09-01")),
                    ))
                    saved += 1
            except Exception as e:
                errors.append(str(e))
        db.commit()

    elif import_type == "notes":
        for mod in df["module"].unique():
            if not db.query(Module).filter(Module.nom == str(mod)).first():
                db.add(Module(nom=str(mod), coefficient=1))
        db.commit()
        for _, row in df.iterrows():
            try:
                if db.query(Etudiant).filter(Etudiant.etudiant_id == str(row["etudiant_id"])).first():
                    db.add(Note(
                        etudiant_id = str(row["etudiant_id"]),
                        module      = str(row["module"]),
                        semestre    = str(row.get("semestre", "S1")),
                        note        = float(row["note"]),
                        coefficient = int(row.get("coefficient", 1)),
                    ))
                    saved += 1
                else:
                    errors.append(f"Étudiant {row['etudiant_id']} introuvable")
            except Exception as e:
                errors.append(str(e))
        db.commit()

    elif import_type == "absences":
        for _, row in df.iterrows():
            try:
                if db.query(Etudiant).filter(Etudiant.etudiant_id == str(row["etudiant_id"])).first():
                    db.add(Absence(
                        etudiant_id = str(row["etudiant_id"]),
                        module      = str(row["module"]),
                        date        = str(row["date"]),
                        justifiee   = bool(row.get("justifiee", False)),
                    ))
                    saved += 1
            except Exception as e:
                errors.append(str(e))
        db.commit()

    elif import_type == "retards":
        for _, row in df.iterrows():
            try:
                if db.query(Etudiant).filter(Etudiant.etudiant_id == str(row["etudiant_id"])).first():
                    db.add(Retard(
                        etudiant_id = str(row["etudiant_id"]),
                        module      = str(row["module"]),
                        date        = str(row["date"]),
                        minutes     = int(row.get("minutes", 15)),
                    ))
                    saved += 1
            except Exception as e:
                errors.append(str(e))
        db.commit()

    return {"saved": saved, "errors": errors[:10]}


def log_import(db: Session, filename: str, import_type: str, nb_lignes: int, statut: str, message: str):
    db.add(ImportHistory(
        filename    = filename,
        import_type = import_type,
        nb_lignes   = nb_lignes,
        statut      = statut,
        message     = message,
        created_at  = datetime.utcnow()
    ))
    db.commit()
