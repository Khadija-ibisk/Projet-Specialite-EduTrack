from sqlalchemy import create_engine, Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
import os

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./edutrack.db")
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class User(Base):
    __tablename__ = "users"
    id              = Column(Integer, primary_key=True, index=True)
    username        = Column(String, unique=True, index=True)
    email           = Column(String, unique=True)
    hashed_password = Column(String)
    role            = Column(String, default="viewer")
    created_at      = Column(DateTime, default=datetime.utcnow)


class Etudiant(Base):
    __tablename__ = "etudiants"
    id               = Column(Integer, primary_key=True, index=True)
    etudiant_id      = Column(String, unique=True, index=True)
    prenom           = Column(String)
    nom              = Column(String)
    email            = Column(String)
    classe           = Column(String)
    date_inscription = Column(String)
    notes    = relationship("Note",    back_populates="etudiant")
    absences = relationship("Absence", back_populates="etudiant")
    retards  = relationship("Retard",  back_populates="etudiant")
    alertes  = relationship("Alerte",  back_populates="etudiant")


class Module(Base):
    __tablename__ = "modules"
    id          = Column(Integer, primary_key=True, index=True)
    nom         = Column(String, unique=True, index=True)
    coefficient = Column(Integer, default=1)


class Note(Base):
    __tablename__ = "notes"
    id          = Column(Integer, primary_key=True, index=True)
    etudiant_id = Column(String, ForeignKey("etudiants.etudiant_id"))
    module      = Column(String)
    semestre    = Column(String)
    note        = Column(Float)
    coefficient = Column(Integer, default=1)
    etudiant    = relationship("Etudiant", back_populates="notes")


class Absence(Base):
    __tablename__ = "absences"
    id          = Column(Integer, primary_key=True, index=True)
    etudiant_id = Column(String, ForeignKey("etudiants.etudiant_id"))
    module      = Column(String)
    date        = Column(String)
    justifiee   = Column(Boolean, default=False)
    etudiant    = relationship("Etudiant", back_populates="absences")


class Retard(Base):
    """Retards (arrivées tardives) — mentionné explicitement dans l'énoncé."""
    __tablename__ = "retards"
    id          = Column(Integer, primary_key=True, index=True)
    etudiant_id = Column(String, ForeignKey("etudiants.etudiant_id"))
    module      = Column(String)
    date        = Column(String)
    minutes     = Column(Integer, default=0)   # durée du retard en minutes
    etudiant    = relationship("Etudiant", back_populates="retards")


class AlerteConfig(Base):
    """Seuils d'alerte configurables par l'utilisateur (section 2.4 de l'énoncé)."""
    __tablename__ = "alerte_config"
    id                     = Column(Integer, primary_key=True, index=True)
    seuil_moyenne_critique = Column(Float, default=8.0)
    seuil_moyenne_faible   = Column(Float, default=10.0)
    seuil_absences_critique= Column(Integer, default=15)
    seuil_absences_eleve   = Column(Integer, default=10)
    seuil_retards_critique = Column(Integer, default=10)
    seuil_retards_eleve    = Column(Integer, default=5)
    updated_at             = Column(DateTime, default=datetime.utcnow)


class ImportHistory(Base):
    __tablename__ = "import_history"
    id          = Column(Integer, primary_key=True, index=True)
    filename    = Column(String)
    import_type = Column(String)
    nb_lignes   = Column(Integer)
    statut      = Column(String)
    message     = Column(Text)
    created_at  = Column(DateTime, default=datetime.utcnow)


class Alerte(Base):
    __tablename__ = "alertes"
    id          = Column(Integer, primary_key=True, index=True)
    etudiant_id = Column(String, ForeignKey("etudiants.etudiant_id"))
    type_alerte = Column(String)
    message     = Column(Text)
    niveau      = Column(String)
    lue         = Column(Boolean, default=False)
    created_at  = Column(DateTime, default=datetime.utcnow)
    etudiant    = relationship("Etudiant", back_populates="alertes")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    Base.metadata.create_all(bind=engine)
    # Créer la config par défaut si absente
    db = SessionLocal()
    if db.query(AlerteConfig).count() == 0:
        db.add(AlerteConfig())
        db.commit()
    db.close()
