# 📊 EduTrack Analytics — v2.1
## Plateforme d'Analyse de Performance des Étudiants
**MAROC YNOV CAMPUS — Projet Spé DATA 2024-2025**

---

## ⚡ Démarrage en 1 commande

```bash
git clone https://github.com/votre-repo/edutrack-analytics
cd edutrack-analytics
chmod +x start.sh && ./start.sh
```

| Service | URL |
|---------|-----|
| 🌐 Application web | http://localhost:5173 |
| 📡 API REST | http://localhost:8000 |
| 📚 Documentation API | http://localhost:8000/docs |

---

## 👥 Comptes & Rôles

| Identifiant | Mot de passe | Rôle | Droits |
|-------------|-------------|------|--------|
| `admin` | `admin123` | 👑 Admin | Lecture · Écriture · Suppression · Import · Gestion utilisateurs |
| `formateur` | `form123` | 🖊️ Formateur | Lecture · Import |
| `viewer` | `viewer123` | 👁️ Viewer | Lecture seule |

---

## 🏗️ Architecture du Projet

```
edutrack/
├── backend/
│   ├── main.py                  # API FastAPI — 20+ routes REST
│   ├── database.py              # Modèles SQLAlchemy (8 tables)
│   ├── auth.py                  # JWT + bcrypt + RBAC (4 rôles)
│   └── services/
│       ├── pipeline.py          # ETL : Lecture→Validation→Nettoyage→Stockage
│       ├── analytics.py         # Stats, ML, alertes, progression
│       └── report.py            # Génération PDF automatique (Bonus C)
├── frontend/src/
│   ├── pages/
│   │   ├── Dashboard.jsx        # KPIs (6) + 6 graphiques + PDF
│   │   ├── Etudiants.jsx        # Liste + fiche + onglets notes/absences/retards
│   │   ├── Modules.jsx          # 8 statistiques dont variance
│   │   ├── Alertes.jsx          # Alertes + seuils configurables
│   │   ├── Import.jsx           # Import 4 types (étudiants/notes/absences/retards)
│   │   ├── ML.jsx               # Random Forest + KMeans + retards
│   │   └── Users.jsx            # Gestion utilisateurs (admin)
│   └── components/
│       └── Sidebar.jsx          # Navigation filtrée par permissions
├── data/
│   ├── etudiants.csv            # 300 étudiants · 6 classes
│   ├── notes.csv                # 9 000 notes · 10 modules · 3 semestres
│   ├── absences.csv             # 2 100+ absences
│   └── retards.csv              # 1 330 retards
├── scripts/
│   └── generate_data.py         # Générateur dataset académique réaliste
├── notebook_analyse.ipynb       # Analyse exploratoire Jupyter (8 sections)
├── database_schema.sql          # Schéma SQL complet (8 tables)
├── requirements.txt             # Dépendances Python
├── start.sh                     # Lancement automatique tout-en-un
└── README.md                    # Ce fichier
```

---

## 📊 Fonctionnalités

### 2.1 Importation et Gestion des Données ✅
- Import **CSV et Excel** — étudiants, notes, absences, **retards**
- Validation automatique (colonnes obligatoires, types, intervalles)
- Nettoyage : doublons, valeurs nulles (imputation médiane), normalisation colonnes
- Historique complet des imports (date, fichier, lignes, statut, message)

### 2.2 Tableau de Bord Pédagogique ✅
- **6 KPIs** : étudiants, moyenne générale, taux réussite, étudiants à risque, absences, **retards**
- Analyse par classe (graphique barres comparatif)
- Analyse par module (performance et réussite)
- Fiche individuelle : notes, absences, **retards**, évolution, classement, statut risque
- **6 graphiques interactifs** : histogramme notes, segmentation, progression, modules, classes, corrélation
- **Bouton Rapport PDF** (Bonus C)

### 2.3 Analyse et Exploration des Données ✅
- Statistiques descriptives : moyenne, médiane, **variance**, écart-type, min, max, Q1, Q3
- Distribution des notes par module (histogramme interactif)
- Corrélations : **absences/moyenne**, **retards/moyenne**, absences injustifiées/moyenne
- Détection d'anomalies (score de risque composite)
- Segmentation : excellent, stable, moyen, fragile, risque

### 2.4 Système d'Alerte et Suivi ✅
- Détection automatique : moyenne faible/critique, absences, **retards**
- **Seuils configurables par l'utilisateur** (6 seuils via interface graphique)
- Recalcul des alertes après modification des seuils
- Recommandations pédagogiques par type d'alerte
- Suivi de progression semestre par semestre (S1→S2→S3)

### Section 3 — Architecture et Pipeline ✅
- Pipeline ETL : Lecture → Validation → Nettoyage → Transformation → Stockage → Alertes
- Base relationnelle avec 8 tables cohérentes
- Calculs statistiques côté backend (Python/Pandas)
- Code organisé en modules : import, nettoyage, analyse, API, auth, visualisation

### Bonus A — Modèle Prédictif ✅
- **Random Forest Classifier** (100 arbres, max_depth=6)
- **7 variables** : moyenne, absences, absences injustifiées, **retards**, **minutes retard**, écart-type, nb modules
- Métriques : accuracy, precision, recall, F1-score, matrice de confusion
- Importance des variables visualisée

### Bonus B — Segmentation KMeans ✅
- **KMeans** (2 à 5 clusters, StandardScaler, n_init=10)
- Variables : moyenne, absences, **retards**, écart-type
- Profils interprétables : Excellents, Réguliers, Moyens, Irréguliers, À Risque
- Visualisation scatter plot interactive

### Bonus C — Rapport PDF Automatique ✅
- Généré via **ReportLab** — style professionnel sombre
- Contenu : KPIs, segmentation, stats modules, alertes, recommandations pédagogiques
- Téléchargement direct depuis le dashboard

---

## 🔧 Stack Technique

| Couche | Technologie | Version |
|--------|------------|---------|
| Langage principal | **Python** | 3.10+ |
| Analyse de données | **Pandas + NumPy** | 2.2 / 1.26 |
| Machine Learning | **Scikit-learn** | 1.4 |
| Visualisation backend | **Matplotlib + Seaborn** | (notebook) |
| Backend API | **FastAPI** | 0.111 |
| ORM | **SQLAlchemy** | 2.0 |
| Base de données | **SQLite** (dev) / PostgreSQL (prod) | — |
| Authentification | **JWT + bcrypt** | python-jose / passlib |
| Génération PDF | **ReportLab** | 4.2 |
| Frontend | **React 18 + Vite** | 18.3 / 5.4 |
| Graphiques | **Recharts** | 2.12 |
| Client HTTP | **Axios** | 1.6 |

---

## 🗃️ Format des Fichiers d'Import

### etudiants.csv
```csv
etudiant_id,prenom,nom,classe,email,date_inscription
ETU0001,Adam,Alaoui,BTS-SIO-A,adam.alaoui@campus.ma,2024-09-01
```

### notes.csv
```csv
etudiant_id,module,note,semestre,coefficient
ETU0001,Mathematiques,14.5,S1,3
```

### absences.csv
```csv
etudiant_id,module,date,justifiee
ETU0001,Algorithmique,2024-10-15,false
```

### retards.csv
```csv
etudiant_id,module,date,minutes
ETU0001,Reseaux,2024-11-03,15
```
> Les colonnes marquées sont obligatoires. Les noms approchants sont acceptés et renommés automatiquement.

---

## 🔐 Système de Rôles (RBAC)

```
admin       → read | write | delete | import | manage_users
responsable → read | write | import
formateur   → read | import
viewer      → read
```

Les routes API sont protégées par permission. Le frontend adapte la navigation et les boutons d'action selon le rôle connecté.

---

## 📐 Schéma de la Base de Données

```
users           → authentification (id, username, email, password, role)
etudiants       → entité principale (etudiant_id, prenom, nom, classe...)
modules         → matières d'enseignement
notes           → résultats (etudiant_id → module, semestre, note, coeff)
absences        → assiduité (etudiant_id → module, date, justifiee)
retards         → ponctualité (etudiant_id → module, date, minutes)
alerte_config   → seuils configurables (6 paramètres)
import_history  → traçabilité des imports
alertes         → alertes pédagogiques générées
```

---

## ✅ Tableau d'exigence

| Exigence | Statut |
|----------|--------|
| Import CSV/Excel : étudiants, notes, absences | ✅ |
| Import **retards** | ✅ |
| Validation colonnes + types | ✅ |
| Nettoyage automatique (doublons, nulls) | ✅ |
| Historique imports | ✅ |
| Tableau de bord global (KPIs) | ✅ |
| Analyse par classe | ✅ |
| Analyse par module | ✅ |
| Fiche individuelle étudiant | ✅ |
| ≥ 5 visualisations interactives | ✅ (8) |
| Statistiques : moy, médiane, **variance**, σ, min, max, Q1, Q3 | ✅ |
| Distribution des notes | ✅ |
| Corrélations absences/**retards**/résultats | ✅ |
| Détection anomalies | ✅ |
| Segmentation 5 profils | ✅ |
| Détection étudiants à risque | ✅ |
| Alertes pédagogiques avec **seuils configurables** | ✅ |
| Suivi progression (S1→S2→S3) | ✅ |
| Recommandations pédagogiques | ✅ |
| Pipeline ETL complet | ✅ |
| Base de données relationnelle | ✅ |
| JWT + authentification sécurisée | ✅ |
| Python + Pandas + NumPy | ✅ |
| Scikit-learn (ML) | ✅ |
| FastAPI (backend) | ✅ |
| React (frontend) | ✅ |
| README complet | ✅ |
| **Bonus A** — Random Forest (acc, precision, recall, F1, confusion) | ✅ |
| **Bonus B** — KMeans segmentation + visualisation | ✅ |
| **Bonus C** — Rapport PDF automatique | ✅ |
| Gestion rôles admin/viewer | ✅ |
| Notebook Jupyter (EDA complet) | ✅ |
| Schéma SQL exportable | ✅ |

---

## 📦 Livrables Inclus

1. **Rapport Technique** → ce README + documentation API `/docs`
2. **Notebook d'Analyse** → `notebook_analyse.ipynb`
3. **Code Source** → structure complète GitHub-ready
4. **Application Fonctionnelle** → `./start.sh`
5. **Base de Données** → `database_schema.sql`
6. **Dataset de démonstration** → `data/` (300 étudiants, 9 000 notes)

---

*EduTrack Analytics v2.1 — MAROC YNOV CAMPUS 2024-2025*