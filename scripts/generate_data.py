import pandas as pd
import numpy as np
import random
from datetime import datetime, timedelta

np.random.seed(42)
random.seed(42)

CLASSES = ["BTS-SIO-A", "BTS-SIO-B", "Bachelor-3", "MBA-Tech", "BTS-COMMERCE", "Licence-Pro"]
MODULES = [
    "Mathematiques", "Algorithmique", "Base de Donnees",
    "Reseaux", "Developpement Web", "Systemes d'Information",
    "Anglais Technique", "Gestion de Projet",
    "Cybersecurite", "Intelligence Artificielle"
]
PRENOMS = [
    "Adam","Youssef","Fatima","Sara","Amine","Mehdi","Nadia","Karim",
    "Leila","Omar","Aicha","Hassan","Zineb","Rachid","Imane","Tariq",
    "Houda","Khalid","Samira","Bilal","Meryem","Soufiane","Rania","Hamid",
    "Yasmine","Mourad","Sanaa","Driss","Hajar","Younes","Dounia","Adil",
    "Ghita","Badr","Layla","Kamal","Widad","Saad","Malak","Ilyas"
]
NOMS = [
    "Alaoui","Benali","Chraibi","Daoudi","El Fassi","Filali","Ghali",
    "Hajji","Idrissi","Jamai","Kadiri","Lamrani","Moumen","Nassiri",
    "Ouali","Qadri","Rahali","Slimani","Tazi","Wahabi","Ziani",
    "Bennani","Chakir","El Amrani","Fathallah","Guerraoui","Haddad",
    "Kabbaj","Lahlou","Mansouri","Nasser","Oufkir","Raji","Sabir"
]
SEMESTRES = ["S1", "S2", "S3"]

students = []
for i in range(1, 301):
    classe = random.choice(CLASSES)
    prenom = random.choice(PRENOMS)
    nom = random.choice(NOMS)
    clean_nom = nom.lower().replace(" ", "").replace("'", "")
    email = f"{prenom.lower()}.{clean_nom}_{i}@campus.ma"
    students.append({
        "etudiant_id": f"ETU{i:04d}",
        "prenom": prenom,
        "nom": nom,
        "email": email,
        "classe": classe,
        "date_inscription": (datetime(2024, 9, 1) + timedelta(days=random.randint(0, 10))).strftime("%Y-%m-%d"),
    })

df_students = pd.DataFrame(students)

notes = []
for _, stu in df_students.iterrows():
    profil = np.random.choice(["excellent","bon","moyen","faible","risque"], p=[0.15,0.25,0.30,0.20,0.10])
    base_mean = {"excellent":16,"bon":14,"moyen":12,"faible":9,"risque":7}[profil]
    base_std  = {"excellent":1.5,"bon":2,"moyen":2.5,"faible":2.5,"risque":3}[profil]
    drift = {"excellent":0.1,"bon":0.2,"moyen":0.0,"faible":-0.1,"risque":-0.3}[profil]
    for s_idx, semestre in enumerate(SEMESTRES):
        for module in MODULES:
            note = np.clip(np.random.normal(base_mean + drift*s_idx, base_std), 0, 20)
            notes.append({
                "etudiant_id": stu["etudiant_id"],
                "module": module,
                "semestre": semestre,
                "note": round(note, 2),
                "coefficient": random.choice([1, 2, 3]),
            })

df_notes = pd.DataFrame(notes)

absences = []
for _, stu in df_students.iterrows():
    profil_abs = np.random.choice(["assidu","normal","absent","risque"], p=[0.20,0.45,0.25,0.10])
    nb_absences = {"assidu":0,"normal":random.randint(1,5),"absent":random.randint(6,15),"risque":random.randint(16,35)}[profil_abs]
    for _ in range(nb_absences):
        date_abs = datetime(2024,9,15) + timedelta(days=random.randint(0,270))
        absences.append({
            "etudiant_id": stu["etudiant_id"],
            "module": random.choice(MODULES),
            "date": date_abs.strftime("%Y-%m-%d"),
            "justifiee": random.choice([True, False]),
        })

df_absences = pd.DataFrame(absences)

import os
os.makedirs("data", exist_ok=True)
df_students.to_csv("data/etudiants.csv", index=False)
df_notes.to_csv("data/notes.csv", index=False)
df_absences.to_csv("data/absences.csv", index=False)
print(f"OK {len(df_students)} etudiants | {len(df_notes)} notes | {len(df_absences)} absences")

# ── Retards ──────────────────────────────────────────────────
retards = []
for _, stu in df_students.iterrows():
    profil_ret = np.random.choice(["ponctuel","normal","retardataire","risque"], p=[0.25,0.45,0.22,0.08])
    nb_retards = {
        "ponctuel":     0,
        "normal":       random.randint(1, 4),
        "retardataire": random.randint(5, 12),
        "risque":       random.randint(13, 25)
    }[profil_ret]
    for _ in range(nb_retards):
        date_ret = datetime(2024, 9, 15) + timedelta(days=random.randint(0, 270))
        retards.append({
            "etudiant_id": stu["etudiant_id"],
            "module":      random.choice(MODULES),
            "date":        date_ret.strftime("%Y-%m-%d"),
            "minutes":     random.choice([5, 10, 15, 20, 30, 45]),
        })

df_retards = pd.DataFrame(retards)
df_retards.to_csv("data/retards.csv", index=False)
print(f"OK retards : {len(df_retards)} enregistrements")
