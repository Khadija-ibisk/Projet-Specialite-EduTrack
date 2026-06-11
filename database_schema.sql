-- ============================================================
-- EduTrack Analytics v2.1 — Schéma de Base de Données
-- Compatible SQLite · PostgreSQL · MySQL
-- MAROC YNOV CAMPUS — Projet Spé DATA 2024-2025
-- ============================================================

-- Utilisateurs et authentification
CREATE TABLE IF NOT EXISTS users (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    username        VARCHAR(100) NOT NULL UNIQUE,
    email           VARCHAR(200) NOT NULL UNIQUE,
    hashed_password VARCHAR(255) NOT NULL,
    role            VARCHAR(50)  NOT NULL DEFAULT 'viewer',
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Étudiants (entité principale)
CREATE TABLE IF NOT EXISTS etudiants (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    etudiant_id      VARCHAR(50) NOT NULL UNIQUE,
    prenom           VARCHAR(100) NOT NULL,
    nom              VARCHAR(100) NOT NULL,
    email            VARCHAR(200),
    classe           VARCHAR(100),
    date_inscription VARCHAR(20)
);
CREATE INDEX IF NOT EXISTS idx_etudiants_id     ON etudiants(etudiant_id);
CREATE INDEX IF NOT EXISTS idx_etudiants_classe ON etudiants(classe);

-- Modules d'enseignement
CREATE TABLE IF NOT EXISTS modules (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    nom         VARCHAR(200) NOT NULL UNIQUE,
    coefficient INTEGER DEFAULT 1
);

-- Notes (résultats académiques)
CREATE TABLE IF NOT EXISTS notes (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    etudiant_id VARCHAR(50) NOT NULL REFERENCES etudiants(etudiant_id),
    module      VARCHAR(200) NOT NULL,
    semestre    VARCHAR(10),
    note        FLOAT NOT NULL CHECK (note >= 0 AND note <= 20),
    coefficient INTEGER DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_notes_etudiant ON notes(etudiant_id);
CREATE INDEX IF NOT EXISTS idx_notes_module   ON notes(module);

-- Absences (assiduité)
CREATE TABLE IF NOT EXISTS absences (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    etudiant_id VARCHAR(50) NOT NULL REFERENCES etudiants(etudiant_id),
    module      VARCHAR(200) NOT NULL,
    date        VARCHAR(20) NOT NULL,
    justifiee   BOOLEAN DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS idx_absences_etudiant ON absences(etudiant_id);

-- Retards (arrivées tardives — mentionné dans l'énoncé)
CREATE TABLE IF NOT EXISTS retards (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    etudiant_id VARCHAR(50) NOT NULL REFERENCES etudiants(etudiant_id),
    module      VARCHAR(200) NOT NULL,
    date        VARCHAR(20) NOT NULL,
    minutes     INTEGER DEFAULT 0 CHECK (minutes >= 0)
);
CREATE INDEX IF NOT EXISTS idx_retards_etudiant ON retards(etudiant_id);

-- Configuration des seuils d'alerte (configurables par l'utilisateur)
CREATE TABLE IF NOT EXISTS alerte_config (
    id                      INTEGER PRIMARY KEY AUTOINCREMENT,
    seuil_moyenne_critique  FLOAT   DEFAULT 8.0,
    seuil_moyenne_faible    FLOAT   DEFAULT 10.0,
    seuil_absences_critique INTEGER DEFAULT 15,
    seuil_absences_eleve    INTEGER DEFAULT 10,
    seuil_retards_critique  INTEGER DEFAULT 10,
    seuil_retards_eleve     INTEGER DEFAULT 5,
    updated_at              DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Historique des imports
CREATE TABLE IF NOT EXISTS import_history (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    filename    VARCHAR(255),
    import_type VARCHAR(50),
    nb_lignes   INTEGER,
    statut      VARCHAR(20),
    message     TEXT,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Alertes pédagogiques
CREATE TABLE IF NOT EXISTS alertes (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    etudiant_id VARCHAR(50) NOT NULL REFERENCES etudiants(etudiant_id),
    type_alerte VARCHAR(100),
    message     TEXT,
    niveau      VARCHAR(20),
    lue         BOOLEAN DEFAULT FALSE,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_alertes_etudiant ON alertes(etudiant_id);
CREATE INDEX IF NOT EXISTS idx_alertes_niveau   ON alertes(niveau);

-- Config d'alerte par défaut
INSERT OR IGNORE INTO alerte_config (id) VALUES (1);
