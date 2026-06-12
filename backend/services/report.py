from fastapi import FastAPI
from fastapi.responses import StreamingResponse
import io
from services.report import generate_pdf_report

app = FastAPI()

@app.get("/api/analytics/download-report")
async def download_report():
    # Données fictives simulant vos analyses issues de analytics.py ou de vos fichiers .csv
    kpis = {
        "nb_etudiants": 142,
        "moyenne_generale": 13.4,
        "taux_reussite": 84,
        "nb_a_risque": 12,
        "taux_absence_moyen": 2.5
    }
    
    modules = [
        {"nom": "Machine Learning", "moyenne": 14.2, "taux_validation": 88, "nb_alertes": 2},
        {"nom": "Développement Web", "moyenne": 15.1, "taux_validation": 92, "nb_alertes": 0},
        {"nom": "Base de Données", "moyenne": 11.5, "taux_validation": 74, "nb_alertes": 5},
    ]
    
    alertes = [
        {"etudiant": "Jean Dupont", "type": "Absences", "message": "Plus de 5 absences non justifiées."},
        {"etudiant": "Amine Sbihi", "type": "Notes", "message": "Moyenne critique en Base de données (7/20)."}
    ]
    
    pdf_bytes = generate_pdf_report(kpis, modules, alertes)
    
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=rapport_global.pdf"}
    )
