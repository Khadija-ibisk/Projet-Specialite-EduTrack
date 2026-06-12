#!/bin/bash
# ============================================================
# EduTrack Analytics  — Script de démarrage
# MAROC YNOV CAMPUS — Projet Spé DATA 2026
# ============================================================

set -e
cd "$(dirname "$0")"

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║      EduTrack Analytics                  ║"
echo "║      MAROC YNOV CAMPUS                   ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# 1. Dépendances Python
echo "📦 Installation des dépendances Python..."
pip install -r requirements.txt -q

# 2. Dataset de démonstration
if [ ! -f "data/etudiants.csv" ]; then
    echo "📊 Génération du dataset de démonstration..."
    python scripts/generate_data.py
else
    echo "✅ Dataset existant détecté"
fi

# 3. Backend FastAPI
echo "🚀 Lancement du backend (port 8000)..."
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

# Attendre que le backend soit prêt
echo "⏳ Attente du backend..."
for i in {1..15}; do
    if curl -s http://localhost:8000/api/stats/global > /dev/null 2>&1; then
        echo "✅ Backend prêt !"
        break
    fi
    sleep 1
done

# 4. Frontend React
echo "🎨 Lancement du frontend (port 5173)..."
cd frontend
npm install -q
npm run dev &
FRONTEND_PID=$!

echo ""
echo "════════════════════════════════════════════"
echo " ✅ EduTrack Analytics est opérationnel !"
echo ""
echo " 🌐 Application  : http://localhost:5173"
echo " 📡 API REST     : http://localhost:8000"
echo " 📚 Docs API     : http://localhost:8000/docs"
echo ""
echo " 👥 Comptes de connexion :"
echo "    admin    / admin123   (accès complet)"
echo "    formateur/ form123    (lecture + import)"
echo "    viewer   / viewer123  (lecture seule)"
echo "════════════════════════════════════════════"
echo ""
echo "Appuyez sur Ctrl+C pour arrêter."
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo 'Arrêt...'" EXIT
wait
