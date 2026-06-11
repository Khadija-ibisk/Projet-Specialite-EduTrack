"""EduTrack Analytics — API FastAPI v2.1 — 100% conforme énoncé"""
import sys, os, warnings
warnings.filterwarnings("ignore")
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import datetime, timedelta
from typing import Optional
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form, status, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel

from backend.database import (get_db, init_db, Etudiant, Note, Absence,
                               Retard, ImportHistory, Alerte, AlerteConfig, User)
from backend.auth import (authenticate_user, create_access_token, get_current_user,
                          get_password_hash, create_default_users,
                          require_permission, ACCESS_TOKEN_EXPIRE_MINUTES, ROLE_PERMISSIONS)
from backend.services.pipeline import (read_file, normalize_columns, validate_data,
                                        clean_data, save_to_db, log_import)
from backend.services.analytics import (get_dashboard_kpis, get_student_detail,
                                         get_module_analysis, compute_correlations,
                                         train_risk_model, run_clustering,
                                         generate_alerts, compute_student_stats,
                                         get_all_data, get_progression_semestre,
                                         get_alerte_config)
from backend.services.report import generate_pdf_report

app = FastAPI(title="EduTrack Analytics API", version="2.1.0",
              description="MAROC YNOV CAMPUS — Projet Spé DATA")

app.add_middleware(CORSMiddleware, allow_origins=["*"],
                   allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

@app.on_event("startup")
async def startup():
    init_db()
    db = next(get_db())
    create_default_users(db)
    db.close()


# ── AUTH ──────────────────────────────────────────────────────────────────────
@app.post("/api/auth/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends(),
                db: Session = Depends(get_db)):
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(401, "Identifiants incorrects")
    token = create_access_token({"sub": user.username},
                                timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    return {"access_token": token, "token_type": "bearer",
            "role": user.role, "username": user.username,
            "permissions": list(ROLE_PERMISSIONS.get(user.role, set()))}

@app.get("/api/auth/me")
async def get_me(current_user: User = Depends(get_current_user)):
    return {"username": current_user.username, "email": current_user.email,
            "role": current_user.role,
            "permissions": list(ROLE_PERMISSIONS.get(current_user.role, set()))}


# ── IMPORT ────────────────────────────────────────────────────────────────────
@app.post("/api/import/{import_type}")
async def import_data(import_type: str, file: UploadFile = File(...),
                      db: Session = Depends(get_db),
                      current_user: User = Depends(require_permission("import"))):
    if import_type not in ["etudiants", "notes", "absences", "retards"]:
        raise HTTPException(400, "Type invalide. Valeurs : etudiants, notes, absences, retards")
    content = await file.read()
    try:
        df         = read_file(content, file.filename)
        df         = normalize_columns(df)
        validation = validate_data(df, import_type)
        if not validation["valid"]:
            log_import(db, file.filename, import_type, 0, "error",
                       "; ".join(validation["issues"]))
            raise HTTPException(400, detail={"issues": validation["issues"],
                                              "warnings": validation["warnings"]})
        df, clean_stats = clean_data(df, import_type)
        result          = save_to_db(df, import_type, db)
        generate_alerts(db)
        msg = f"Import réussi : {result['saved']} lignes importées."
        log_import(db, file.filename, import_type, result["saved"], "success", msg)
        return {"success": True, "filename": file.filename,
                "import_type": import_type, "nb_lignes": result["saved"],
                "warnings": validation["warnings"], "clean_stats": clean_stats}
    except HTTPException:
        raise
    except Exception as e:
        log_import(db, file.filename, import_type, 0, "error", str(e))
        raise HTTPException(500, f"Erreur import : {str(e)}")

@app.get("/api/import/history")
async def get_import_history(db: Session = Depends(get_db),
                              _: User = Depends(require_permission("read"))):
    h = db.query(ImportHistory).order_by(ImportHistory.created_at.desc()).limit(50).all()
    return [{"id":i.id,"filename":i.filename,"import_type":i.import_type,
             "nb_lignes":i.nb_lignes,"statut":i.statut,"message":i.message,
             "created_at":i.created_at.isoformat() if i.created_at else None} for i in h]


# ── DASHBOARD ─────────────────────────────────────────────────────────────────
@app.get("/api/dashboard/kpis")
async def dashboard_kpis(db: Session = Depends(get_db),
                          _: User = Depends(require_permission("read"))):
    return get_dashboard_kpis(db)

@app.get("/api/dashboard/correlations")
async def dashboard_correlations(db: Session = Depends(get_db),
                                  _: User = Depends(require_permission("read"))):
    return compute_correlations(db)

@app.get("/api/dashboard/progression")
async def dashboard_progression(db: Session = Depends(get_db),
                                 _: User = Depends(require_permission("read"))):
    return get_progression_semestre(db)


# ── ÉTUDIANTS ─────────────────────────────────────────────────────────────────
@app.get("/api/etudiants")
async def list_etudiants(classe: Optional[str] = None, search: Optional[str] = None,
                          segment: Optional[str] = None,
                          db: Session = Depends(get_db),
                          _: User = Depends(require_permission("read"))):
    data  = get_all_data(db)
    if data["notes"].empty or data["etudiants"].empty:
        return []
    stats = compute_student_stats(data["notes"], data["absences"],
                                  data["etudiants"], data["retards"])
    if stats.empty:
        return []
    if classe:  stats = stats[stats["classe"]  == classe]
    if segment: stats = stats[stats["segment"] == segment]
    if search:
        m = (stats["prenom"].str.contains(search, case=False, na=False) |
             stats["nom"].str.contains(search, case=False, na=False) |
             stats["etudiant_id"].str.contains(search, case=False, na=False))
        stats = stats[m]
    return stats.fillna(0).to_dict(orient="records")

@app.get("/api/etudiants/{etudiant_id}")
async def get_etudiant(etudiant_id: str, db: Session = Depends(get_db),
                        _: User = Depends(require_permission("read"))):
    d = get_student_detail(etudiant_id, db)
    if not d:
        raise HTTPException(404, "Étudiant introuvable")
    return d

@app.delete("/api/etudiants/{etudiant_id}")
async def delete_etudiant(etudiant_id: str, db: Session = Depends(get_db),
                           _: User = Depends(require_permission("delete"))):
    etu = db.query(Etudiant).filter(Etudiant.etudiant_id == etudiant_id).first()
    if not etu:
        raise HTTPException(404, "Étudiant introuvable")
    db.query(Note).filter(Note.etudiant_id == etudiant_id).delete()
    db.query(Absence).filter(Absence.etudiant_id == etudiant_id).delete()
    db.query(Retard).filter(Retard.etudiant_id == etudiant_id).delete()
    db.query(Alerte).filter(Alerte.etudiant_id == etudiant_id).delete()
    db.delete(etu)
    db.commit()
    return {"success": True}

@app.get("/api/classes")
async def list_classes(db: Session = Depends(get_db),
                        _: User = Depends(require_permission("read"))):
    return [e[0] for e in db.query(Etudiant.classe).distinct().all() if e[0]]

@app.get("/api/retards")
async def list_retards(etudiant_id: Optional[str] = None,
                        db: Session = Depends(get_db),
                        _: User = Depends(require_permission("read"))):
    q = db.query(Retard)
    if etudiant_id:
        q = q.filter(Retard.etudiant_id == etudiant_id)
    return [{"etudiant_id":r.etudiant_id,"module":r.module,
             "date":r.date,"minutes":r.minutes} for r in q.all()]


# ── MODULES ───────────────────────────────────────────────────────────────────
@app.get("/api/modules/analysis")
async def modules_analysis(db: Session = Depends(get_db),
                            _: User = Depends(require_permission("read"))):
    return get_module_analysis(db)


# ── ALERTES ───────────────────────────────────────────────────────────────────
@app.get("/api/alertes")
async def list_alertes(niveau: Optional[str] = None,
                        db: Session = Depends(get_db),
                        _: User = Depends(require_permission("read"))):
    q = db.query(Alerte).order_by(Alerte.created_at.desc())
    if niveau:
        q = q.filter(Alerte.niveau == niveau)
    result = []
    for a in q.limit(200).all():
        etu = db.query(Etudiant).filter(Etudiant.etudiant_id == a.etudiant_id).first()
        result.append({"id":a.id,"etudiant_id":a.etudiant_id,
                       "nom_complet":f"{etu.prenom} {etu.nom}" if etu else a.etudiant_id,
                       "classe":etu.classe if etu else "",
                       "type_alerte":a.type_alerte,"message":a.message,
                       "niveau":a.niveau,"lue":a.lue,
                       "created_at":a.created_at.isoformat() if a.created_at else None})
    return result

@app.patch("/api/alertes/{alerte_id}/lue")
async def mark_lue(alerte_id: int, db: Session = Depends(get_db),
                   _: User = Depends(require_permission("read"))):
    a = db.query(Alerte).filter(Alerte.id == alerte_id).first()
    if not a:
        raise HTTPException(404, "Alerte introuvable")
    a.lue = True
    db.commit()
    return {"success": True}

@app.post("/api/alertes/refresh")
async def refresh_alertes(db: Session = Depends(get_db),
                           _: User = Depends(require_permission("write"))):
    n = generate_alerts(db)
    return {"alertes_generees": n}

# ── CONFIG ALERTES (seuils configurables — énoncé §2.4) ──────────────────────
@app.get("/api/alertes/config")
async def get_config(db: Session = Depends(get_db),
                     _: User = Depends(require_permission("read"))):
    cfg = get_alerte_config(db)
    return {"seuil_moyenne_critique":    cfg.seuil_moyenne_critique,
            "seuil_moyenne_faible":      cfg.seuil_moyenne_faible,
            "seuil_absences_critique":   cfg.seuil_absences_critique,
            "seuil_absences_eleve":      cfg.seuil_absences_eleve,
            "seuil_retards_critique":    cfg.seuil_retards_critique,
            "seuil_retards_eleve":       cfg.seuil_retards_eleve,
            "updated_at":                cfg.updated_at.isoformat() if cfg.updated_at else None}

class AlerteConfigUpdate(BaseModel):
    seuil_moyenne_critique:  Optional[float] = None
    seuil_moyenne_faible:    Optional[float] = None
    seuil_absences_critique: Optional[int]   = None
    seuil_absences_eleve:    Optional[int]   = None
    seuil_retards_critique:  Optional[int]   = None
    seuil_retards_eleve:     Optional[int]   = None

@app.put("/api/alertes/config")
async def update_config(body: AlerteConfigUpdate,
                        db: Session = Depends(get_db),
                        _: User = Depends(require_permission("write"))):
    cfg = get_alerte_config(db)
    for k, v in body.dict(exclude_none=True).items():
        setattr(cfg, k, v)
    cfg.updated_at = datetime.utcnow()
    db.commit()
    generate_alerts(db)
    return {"success": True, "message": "Seuils mis à jour et alertes recalculées."}


# ── ML ────────────────────────────────────────────────────────────────────────
@app.get("/api/ml/risk-model")
async def risk_model(db: Session = Depends(get_db),
                     _: User = Depends(require_permission("read"))):
    return train_risk_model(db)

@app.get("/api/ml/clustering")
async def clustering(n_clusters: int = 4, db: Session = Depends(get_db),
                     _: User = Depends(require_permission("read"))):
    return run_clustering(db, n_clusters)


# ── RAPPORT PDF (Bonus C) ─────────────────────────────────────────────────────
@app.get("/api/rapport/pdf")
async def generate_rapport(db: Session = Depends(get_db),
                            _: User = Depends(require_permission("read"))):
    kpis    = get_dashboard_kpis(db)
    modules = get_module_analysis(db)
    alertes_q = (db.query(Alerte).filter(Alerte.lue == False)
                 .order_by(Alerte.created_at.desc()).limit(50).all())
    alertes = []
    for a in alertes_q:
        etu = db.query(Etudiant).filter(Etudiant.etudiant_id == a.etudiant_id).first()
        alertes.append({"nom_complet": f"{etu.prenom} {etu.nom}" if etu else a.etudiant_id,
                        "classe":a.classe if hasattr(a,"classe") else (etu.classe if etu else ""),
                        "type_alerte":a.type_alerte,"message":a.message,"niveau":a.niveau})
    clusters = run_clustering(db)
    pdf      = generate_pdf_report(kpis, modules, alertes, clusters)
    fname    = f"EduTrack_Rapport_{datetime.now().strftime('%Y%m%d_%H%M')}.pdf"
    return Response(content=pdf, media_type="application/pdf",
                    headers={"Content-Disposition": f"attachment; filename={fname}"})


# ── STATS GLOBALES ────────────────────────────────────────────────────────────
@app.get("/api/stats/global")
async def global_stats(db: Session = Depends(get_db),
                        _: User = Depends(require_permission("read"))):
    return {"nb_etudiants":       db.query(Etudiant).count(),
            "nb_notes":           db.query(Note).count(),
            "nb_absences":        db.query(Absence).count(),
            "nb_retards":         db.query(Retard).count(),
            "nb_alertes_actives": db.query(Alerte).filter(Alerte.lue==False).count()}


# ── GESTION UTILISATEURS (admin) ──────────────────────────────────────────────
@app.get("/api/users")
async def list_users(db: Session = Depends(get_db),
                     _: User = Depends(require_permission("manage_users"))):
    return [{"id":u.id,"username":u.username,"email":u.email,"role":u.role,
             "created_at":u.created_at.isoformat() if u.created_at else None,
             "permissions":list(ROLE_PERMISSIONS.get(u.role,set()))}
            for u in db.query(User).all()]

@app.post("/api/users")
async def create_user(username: str=Form(...), email: str=Form(...),
                      password: str=Form(...), role: str=Form("viewer"),
                      db: Session = Depends(get_db),
                      _: User = Depends(require_permission("manage_users"))):
    if db.query(User).filter(User.username==username).first():
        raise HTTPException(400,"Nom d'utilisateur déjà utilisé")
    if role not in ROLE_PERMISSIONS:
        raise HTTPException(400,f"Rôle invalide : {list(ROLE_PERMISSIONS.keys())}")
    db.add(User(username=username,email=email,
                hashed_password=get_password_hash(password),role=role))
    db.commit()
    return {"success":True,"username":username,"role":role}

@app.patch("/api/users/{user_id}/role")
async def update_role(user_id: int, role: str=Form(...),
                      db: Session = Depends(get_db),
                      _: User = Depends(require_permission("manage_users"))):
    u = db.query(User).filter(User.id==user_id).first()
    if not u: raise HTTPException(404,"Utilisateur introuvable")
    if u.username=="admin" and role!="admin":
        raise HTTPException(400,"Impossible de modifier le rôle admin principal")
    if role not in ROLE_PERMISSIONS:
        raise HTTPException(400,"Rôle invalide")
    u.role = role
    db.commit()
    return {"success":True}

@app.delete("/api/users/{user_id}")
async def delete_user(user_id: int, db: Session = Depends(get_db),
                      _: User = Depends(require_permission("manage_users"))):
    u = db.query(User).filter(User.id==user_id).first()
    if not u: raise HTTPException(404,"Utilisateur introuvable")
    if u.username=="admin": raise HTTPException(400,"Impossible de supprimer l'admin principal")
    db.delete(u)
    db.commit()
    return {"success":True}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
