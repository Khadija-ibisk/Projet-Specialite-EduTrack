"""
Service d'analyse statistique et Machine Learning — EduTrack Analytics
Inclut : retards, variance, seuils configurables, progression, clustering, Random Forest
"""
import numpy as np
import pandas as pd
import warnings
warnings.filterwarnings("ignore")

from sqlalchemy.orm import Session
from typing import Dict, List, Any
from backend.database import Etudiant, Note, Absence, Retard, Alerte, AlerteConfig
from sklearn.ensemble import RandomForestClassifier
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import (accuracy_score, precision_score,
                             recall_score, f1_score, confusion_matrix)


# ── Chargement données ────────────────────────────────────────────────────────

def get_all_data(db: Session) -> Dict[str, pd.DataFrame]:
    notes_q    = db.query(Note).all()
    etudiants_q= db.query(Etudiant).all()
    absences_q = db.query(Absence).all()
    retards_q  = db.query(Retard).all()

    df_notes = pd.DataFrame([{
        "etudiant_id": n.etudiant_id, "module": n.module,
        "semestre": n.semestre, "note": n.note, "coefficient": n.coefficient
    } for n in notes_q])

    df_etudiants = pd.DataFrame([{
        "etudiant_id": e.etudiant_id, "prenom": e.prenom,
        "nom": e.nom, "email": e.email, "classe": e.classe
    } for e in etudiants_q])

    df_absences = pd.DataFrame([{
        "etudiant_id": a.etudiant_id, "module": a.module,
        "date": a.date, "justifiee": a.justifiee
    } for a in absences_q])

    df_retards = pd.DataFrame([{
        "etudiant_id": r.etudiant_id, "module": r.module,
        "date": r.date, "minutes": r.minutes
    } for r in retards_q])

    return {"notes": df_notes, "etudiants": df_etudiants,
            "absences": df_absences, "retards": df_retards}


def get_alerte_config(db: Session) -> AlerteConfig:
    cfg = db.query(AlerteConfig).first()
    if not cfg:
        cfg = AlerteConfig()
        db.add(cfg)
        db.commit()
    return cfg


# ── Stats par étudiant ────────────────────────────────────────────────────────

def compute_student_stats(df_notes: pd.DataFrame, df_absences: pd.DataFrame,
                          df_etudiants: pd.DataFrame,
                          df_retards: pd.DataFrame = None) -> pd.DataFrame:
    if df_notes.empty:
        return pd.DataFrame()

    def weighted_mean(g):
        return np.average(g["note"], weights=g["coefficient"]) if g["coefficient"].sum() > 0 else g["note"].mean()

    stats = df_notes.groupby("etudiant_id").apply(lambda g: pd.Series({
        "moyenne":    weighted_mean(g),
        "note_min":   g["note"].min(),
        "note_max":   g["note"].max(),
        "ecart_type": g["note"].std(),
        "variance":   g["note"].var(),          # ← variance explicite (énoncé §2.3)
        "nb_modules": g["module"].nunique(),
    })).reset_index()

    # Absences
    if not df_absences.empty:
        abs_s = df_absences.groupby("etudiant_id").agg(
            nb_absences=("date","count"),
            absences_injustifiees=("justifiee", lambda x: (~x).sum())
        ).reset_index()
        stats = stats.merge(abs_s, on="etudiant_id", how="left")
    else:
        stats["nb_absences"] = 0
        stats["absences_injustifiees"] = 0

    # Retards (énoncé mentionne retards comme variable d'analyse)
    if df_retards is not None and not df_retards.empty:
        ret_s = df_retards.groupby("etudiant_id").agg(
            nb_retards=("date","count"),
            minutes_retard_total=("minutes","sum")
        ).reset_index()
        stats = stats.merge(ret_s, on="etudiant_id", how="left")
    else:
        stats["nb_retards"] = 0
        stats["minutes_retard_total"] = 0

    stats["nb_absences"]           = stats["nb_absences"].fillna(0)
    stats["absences_injustifiees"] = stats["absences_injustifiees"].fillna(0)
    stats["nb_retards"]            = stats["nb_retards"].fillna(0)
    stats["minutes_retard_total"]  = stats["minutes_retard_total"].fillna(0)
    stats["variance"]              = stats["variance"].fillna(0)

    # Infos étudiants
    if not df_etudiants.empty:
        stats = stats.merge(
            df_etudiants[["etudiant_id","prenom","nom","classe"]],
            on="etudiant_id", how="left"
        )

    stats["score_risque"] = _compute_risk_score(stats)
    stats["segment"]      = stats["score_risque"].apply(_classify_segment)
    stats["a_risque"]     = stats["segment"].isin(["risque","fragile"])
    return stats


def _compute_risk_score(df: pd.DataFrame) -> pd.Series:
    score = pd.Series(0.0, index=df.index)
    if "moyenne"    in df.columns: score += (1 - df["moyenne"].clip(0,20) / 20) * 45
    if "nb_absences"in df.columns: score += (df["nb_absences"].clip(0,30) / 30) * 25
    if "nb_retards" in df.columns: score += (df["nb_retards"].clip(0,20)  / 20) * 15
    if "ecart_type" in df.columns: score += (df["ecart_type"].clip(0,10)  / 10) * 15
    return score.clip(0,100).round(1)


def _classify_segment(score: float) -> str:
    if score < 20: return "excellent"
    if score < 40: return "stable"
    if score < 55: return "moyen"
    if score < 70: return "fragile"
    return "risque"


# ── KPIs Dashboard ────────────────────────────────────────────────────────────

def get_dashboard_kpis(db: Session) -> Dict:
    data = get_all_data(db)
    if data["notes"].empty:
        return {"no_data": True}

    stats = compute_student_stats(
        data["notes"], data["absences"], data["etudiants"], data["retards"]
    )
    n = len(stats)

    # Taux d'absence = nb absences / (nb étudiants × nb modules supposé ~10 séances/module)
    nb_seances_total = max(n * data["notes"]["module"].nunique() * 1, 1)
    taux_absence = round(data["absences"].shape[0] / nb_seances_total * 100, 1)

    moy_module = data["notes"].groupby("module")["note"].agg(
        moyenne="mean", ecart_type="std", min="min", max="max", count="count"
    ).round(2).reset_index()
    moy_module["taux_reussite"] = (
        data["notes"].groupby("module")["note"]
        .apply(lambda x: round((x >= 10).mean() * 100, 1)).values
    )

    classe_stats = stats.groupby("classe").agg(
        moyenne=("moyenne","mean"),
        nb_etudiants=("etudiant_id","count"),
        taux_reussite=("a_risque", lambda x: round((1-x.mean())*100,1))
    ).round(2).reset_index()

    # Retards globaux
    nb_retards_total = int(data["retards"].shape[0]) if not data["retards"].empty else 0
    moy_retards      = round(nb_retards_total / max(n,1), 1)

    return {
        "nb_etudiants":        n,
        "moyenne_generale":    round(stats["moyenne"].mean(), 2),
        "taux_reussite":       round((stats["moyenne"] >= 10).mean() * 100, 1),
        "nb_a_risque":         int(stats["a_risque"].sum()),
        "taux_absence":        taux_absence,
        "taux_absence_moyen":  round(data["absences"].shape[0] / max(n,1), 1),
        "nb_retards_total":    nb_retards_total,
        "moy_retards_etudiant":moy_retards,
        "segments":            stats["segment"].value_counts().to_dict(),
        "module_stats":        moy_module.to_dict(orient="records"),
        "classe_stats":        classe_stats.to_dict(orient="records"),
        "distribution_notes":  data["notes"]["note"].tolist(),
    }


# ── Détail étudiant ───────────────────────────────────────────────────────────

def get_student_detail(etudiant_id: str, db: Session) -> Dict:
    data = get_all_data(db)
    etu  = db.query(Etudiant).filter(Etudiant.etudiant_id == etudiant_id).first()
    if not etu:
        return None

    def filt(df, col="etudiant_id"):
        return df[df[col] == etudiant_id] if not df.empty else pd.DataFrame()

    notes_e   = filt(data["notes"])
    abs_e     = filt(data["absences"])
    retards_e = filt(data["retards"])

    moyenne = float(notes_e["note"].mean()) if not notes_e.empty else 0

    notes_by_module = {}
    if not notes_e.empty:
        notes_by_module = notes_e.groupby("module")["note"].agg(
            mean="mean", min="min", max="max", std="std"
        ).round(2).to_dict(orient="index")

    all_stats = compute_student_stats(
        data["notes"], data["absences"], data["etudiants"], data["retards"]
    )
    cls_stats  = all_stats[all_stats["classe"] == etu.classe].sort_values("moyenne", ascending=False).reset_index(drop=True)
    row_idx    = cls_stats.index[cls_stats["etudiant_id"] == etudiant_id].tolist()
    classement = int(row_idx[0] + 1) if row_idx else "N/A"

    my_row      = all_stats[all_stats["etudiant_id"] == etudiant_id]
    score_risque= float(my_row["score_risque"].iloc[0]) if not my_row.empty else 0
    segment     = my_row["segment"].iloc[0] if not my_row.empty else "N/A"
    variance    = float(my_row["variance"].iloc[0])  if not my_row.empty else 0

    return {
        "etudiant":       {"etudiant_id":etu.etudiant_id,"prenom":etu.prenom,"nom":etu.nom,"email":etu.email,"classe":etu.classe},
        "moyenne":        round(moyenne, 2),
        "variance":       round(variance, 2),
        "nb_absences":    int(abs_e.shape[0]),
        "nb_retards":     int(retards_e.shape[0]),
        "minutes_retard": int(retards_e["minutes"].sum()) if not retards_e.empty else 0,
        "notes":          notes_e[["module","semestre","note","coefficient"]].to_dict(orient="records"),
        "absences":       abs_e[["module","date","justifiee"]].to_dict(orient="records") if not abs_e.empty else [],
        "retards":        retards_e[["module","date","minutes"]].to_dict(orient="records") if not retards_e.empty else [],
        "notes_by_module":notes_by_module,
        "score_risque":   score_risque,
        "segment":        segment,
        "classement":     classement,
        "total_classe":   len(cls_stats),
    }


# ── Analyse modules ───────────────────────────────────────────────────────────

def get_module_analysis(db: Session) -> List[Dict]:
    data = get_all_data(db)
    if data["notes"].empty:
        return []

    results = []
    for module in data["notes"]["module"].unique():
        n = data["notes"][data["notes"]["module"] == module]["note"]
        results.append({
            "module":        module,
            "moyenne":       round(float(n.mean()),   2),
            "mediane":       round(float(n.median()), 2),
            "ecart_type":    round(float(n.std()),    2),
            "variance":      round(float(n.var()),    2),   # ← variance (énoncé §2.3)
            "min":           round(float(n.min()),    2),
            "max":           round(float(n.max()),    2),
            "q1":            round(float(n.quantile(0.25)), 2),
            "q3":            round(float(n.quantile(0.75)), 2),
            "taux_reussite": round(float((n >= 10).mean() * 100), 1),
            "nb_etudiants":  int(len(n)),
            "distribution":  n.round(1).tolist(),
        })
    return sorted(results, key=lambda x: x["moyenne"])


# ── Corrélations (absences + retards) ────────────────────────────────────────

def compute_correlations(db: Session) -> Dict:
    data  = get_all_data(db)
    if data["notes"].empty:
        return {}

    stats = compute_student_stats(
        data["notes"], data["absences"], data["etudiants"], data["retards"]
    )
    if stats.empty:
        return {}

    corr_abs = float(stats[["nb_absences","moyenne"]].corr().iloc[0,1])
    corr_ret = float(stats[["nb_retards","moyenne"]].corr().iloc[0,1])
    corr_inj = float(stats[["absences_injustifiees","moyenne"]].corr().iloc[0,1])

    scatter = stats[["etudiant_id","prenom","nom","nb_absences",
                      "nb_retards","moyenne","segment"]].to_dict(orient="records")
    return {
        "correlation_absences_moyenne":  round(corr_abs, 3),
        "correlation_retards_moyenne":   round(corr_ret, 3),   # ← retards (énoncé §2.3)
        "correlation_injustifiees_moy":  round(corr_inj, 3),
        "scatter_data":                  scatter,
    }


# ── Progression semestres ─────────────────────────────────────────────────────

def get_progression_semestre(db: Session) -> List[Dict]:
    data = get_all_data(db)
    if data["notes"].empty:
        return []
    result = []
    for sem in sorted(data["notes"]["semestre"].unique()):
        df_sem = data["notes"][data["notes"]["semestre"] == sem]
        result.append({
            "semestre":      sem,
            "moyenne":       round(float(df_sem["note"].mean()), 2),
            "taux_reussite": round(float((df_sem["note"] >= 10).mean() * 100), 1),
            "par_module":    df_sem.groupby("module")["note"].mean().round(2).to_dict(),
        })
    return result


# ── Alertes automatiques (seuils configurables) ───────────────────────────────

def generate_alerts(db: Session) -> int:
    """Génère les alertes selon les seuils définis par l'utilisateur (énoncé §2.4)."""
    cfg  = get_alerte_config(db)
    data = get_all_data(db)
    if data["notes"].empty:
        return 0

    db.query(Alerte).filter(Alerte.lue == False).delete()

    stats = compute_student_stats(
        data["notes"], data["absences"], data["etudiants"], data["retards"]
    )
    count = 0

    for _, row in stats.iterrows():
        eid = row["etudiant_id"]

        # Alertes moyenne
        if row["moyenne"] < cfg.seuil_moyenne_critique:
            db.add(Alerte(etudiant_id=eid, type_alerte="moyenne_critique",
                message=f"Moyenne très faible : {row['moyenne']:.1f}/20 (seuil critique : {cfg.seuil_moyenne_critique}). Intervention urgente.",
                niveau="critical"))
            count += 1
        elif row["moyenne"] < cfg.seuil_moyenne_faible:
            db.add(Alerte(etudiant_id=eid, type_alerte="moyenne_faible",
                message=f"Moyenne insuffisante : {row['moyenne']:.1f}/20 (seuil : {cfg.seuil_moyenne_faible}). Suivi recommandé.",
                niveau="warning"))
            count += 1

        # Alertes absences
        if row["nb_absences"] > cfg.seuil_absences_critique:
            db.add(Alerte(etudiant_id=eid, type_alerte="absence_critique",
                message=f"Absences critiques : {int(row['nb_absences'])} (seuil : {cfg.seuil_absences_critique}). Contact immédiat.",
                niveau="critical"))
            count += 1
        elif row["nb_absences"] > cfg.seuil_absences_eleve:
            db.add(Alerte(etudiant_id=eid, type_alerte="absence_elevee",
                message=f"Absences élevées : {int(row['nb_absences'])} (seuil : {cfg.seuil_absences_eleve}). Rappel d'assiduité.",
                niveau="warning"))
            count += 1

        # Alertes retards (énoncé mentionne retards comme indicateur)
        if row["nb_retards"] > cfg.seuil_retards_critique:
            db.add(Alerte(etudiant_id=eid, type_alerte="retard_critique",
                message=f"Retards excessifs : {int(row['nb_retards'])} retards / {int(row['minutes_retard_total'])} min (seuil : {cfg.seuil_retards_critique}).",
                niveau="critical"))
            count += 1
        elif row["nb_retards"] > cfg.seuil_retards_eleve:
            db.add(Alerte(etudiant_id=eid, type_alerte="retard_eleve",
                message=f"Retards fréquents : {int(row['nb_retards'])} retards (seuil : {cfg.seuil_retards_eleve}). Sensibilisation recommandée.",
                niveau="warning"))
            count += 1

    db.commit()
    return count


# ── Bonus A — Random Forest ───────────────────────────────────────────────────

def train_risk_model(db: Session) -> Dict:
    """Modèle prédictif — inclut notes, absences, retards, progression (énoncé §5 Bonus A)."""
    data  = get_all_data(db)
    if data["notes"].empty:
        return {"error": "Données insuffisantes pour l'entraînement."}

    stats = compute_student_stats(
        data["notes"], data["absences"], data["etudiants"], data["retards"]
    )
    if len(stats) < 20:
        return {"error": "Trop peu d'étudiants (minimum 20)."}

    # Variables : notes + absences + retards + progression (ecart_type proxy)
    features = ["moyenne", "nb_absences", "absences_injustifiees",
                "nb_retards", "minutes_retard_total", "ecart_type", "nb_modules"]
    available = [f for f in features if f in stats.columns]
    X = stats[available].fillna(0)
    y = (stats["moyenne"] < 10).astype(int)

    if y.sum() < 2:
        return {"error": "Pas assez d'étudiants à risque pour entraîner le modèle."}

    X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.3,
                                                random_state=42, stratify=y)
    scaler = StandardScaler()
    Xs_tr  = scaler.fit_transform(X_tr)
    Xs_te  = scaler.transform(X_te)

    model  = RandomForestClassifier(n_estimators=100, random_state=42, max_depth=6)
    model.fit(Xs_tr, y_tr)
    y_pred = model.predict(Xs_te)

    return {
        "accuracy":           round(accuracy_score(y_te, y_pred), 3),
        "precision":          round(precision_score(y_te, y_pred, zero_division=0), 3),
        "recall":             round(recall_score(y_te, y_pred,    zero_division=0), 3),
        "f1_score":           round(f1_score(y_te, y_pred,        zero_division=0), 3),
        "confusion_matrix":   confusion_matrix(y_te, y_pred).tolist(),
        "feature_importance": dict(zip(available, model.feature_importances_.round(3).tolist())),
        "variables_utilisees":available,
        "nb_train":           len(X_tr),
        "nb_test":            len(X_te),
    }


# ── Bonus B — KMeans ──────────────────────────────────────────────────────────

def run_clustering(db: Session, n_clusters: int = 4) -> Dict:
    data  = get_all_data(db)
    if data["notes"].empty:
        return {"error": "Données insuffisantes."}

    stats    = compute_student_stats(
        data["notes"], data["absences"], data["etudiants"], data["retards"]
    )
    features = ["moyenne", "nb_absences", "nb_retards", "ecart_type"]
    avail    = [f for f in features if f in stats.columns]
    X        = stats[avail].fillna(0)

    scaler  = StandardScaler()
    X_s     = scaler.fit_transform(X)
    kmeans  = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
    stats["cluster"] = kmeans.fit_predict(X_s)

    profiles = []
    for c in range(n_clusters):
        g = stats[stats["cluster"] == c]
        profiles.append({
            "cluster":     int(c),
            "nb_etudiants":len(g),
            "moyenne":     round(float(g["moyenne"].mean()), 2),
            "nb_absences": round(float(g["nb_absences"].mean()), 1),
            "nb_retards":  round(float(g["nb_retards"].mean()), 1),
            "label":       _label_cluster(float(g["moyenne"].mean()),
                                          float(g["nb_absences"].mean()),
                                          float(g["nb_retards"].mean())),
        })

    cols = ["etudiant_id","prenom","nom","classe","moyenne","nb_absences","nb_retards","cluster"]
    return {
        "n_clusters": n_clusters,
        "clusters":   profiles,
        "data":       stats[[c for c in cols if c in stats.columns]].to_dict(orient="records"),
    }


def _label_cluster(moy: float, abs_: float, ret: float) -> str:
    if moy >= 15 and abs_ < 3:   return "Excellents"
    if moy >= 12 and abs_ < 6:   return "Réguliers"
    if moy >= 10:                 return "Moyens"
    if abs_ > 10 or ret > 8:     return "Irréguliers / Absents"
    return "À Risque"
