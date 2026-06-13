"""
Bonus C — Génération automatique de rapports PDF professionnels.
Utilise ReportLab pour produire un document structuré avec KPIs, graphiques et alertes.
"""
import io
import os
from datetime import datetime
from typing import Dict, Any

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, KeepTogether
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.graphics.shapes import Drawing, Rect, String, Line
from reportlab.graphics.charts.barcharts import VerticalBarChart
from reportlab.graphics.charts.piecharts import Pie
from reportlab.graphics import renderPDF


# ── Palette couleurs ──────────────────────────────────────────────────────────
C_PRIMARY   = colors.HexColor("#4f8ef7")
C_SUCCESS   = colors.HexColor("#10b981")
C_WARNING   = colors.HexColor("#f59e0b")
C_DANGER    = colors.HexColor("#f05252")
C_PURPLE    = colors.HexColor("#7b6ff0")
C_BG        = colors.HexColor("#0f172a")
C_CARD      = colors.HexColor("#1e293b")
C_BORDER    = colors.HexColor("#334155")
C_TEXT      = colors.HexColor("#e2e8f0")
C_TEXT2     = colors.HexColor("#94a3b8")
C_WHITE     = colors.white


def _styles():
    base = getSampleStyleSheet()
    custom = {}
    custom["title"] = ParagraphStyle(
        "title", fontName="Helvetica-Bold", fontSize=22,
        textColor=C_WHITE, spaceAfter=4, alignment=TA_CENTER
    )
    custom["subtitle"] = ParagraphStyle(
        "subtitle", fontName="Helvetica", fontSize=11,
        textColor=C_TEXT2, spaceAfter=16, alignment=TA_CENTER
    )
    custom["section"] = ParagraphStyle(
        "section", fontName="Helvetica-Bold", fontSize=13,
        textColor=C_PRIMARY, spaceBefore=14, spaceAfter=6
    )
    custom["body"] = ParagraphStyle(
        "body", fontName="Helvetica", fontSize=10,
        textColor=C_TEXT, spaceAfter=4, leading=15
    )
    custom["small"] = ParagraphStyle(
        "small", fontName="Helvetica", fontSize=8,
        textColor=C_TEXT2, spaceAfter=2
    )
    custom["kpi_val"] = ParagraphStyle(
        "kpi_val", fontName="Helvetica-Bold", fontSize=22,
        textColor=C_PRIMARY, alignment=TA_CENTER, spaceAfter=0
    )
    custom["kpi_lbl"] = ParagraphStyle(
        "kpi_lbl", fontName="Helvetica", fontSize=8,
        textColor=C_TEXT2, alignment=TA_CENTER, spaceAfter=0
    )
    custom["alert_msg"] = ParagraphStyle(
        "alert_msg", fontName="Helvetica", fontSize=9,
        textColor=C_TEXT, leading=13
    )
    return custom


def _dark_table_style(header_color=None):
    hc = header_color or C_PRIMARY
    return TableStyle([
        ("BACKGROUND",    (0, 0), (-1, 0),  hc),
        ("TEXTCOLOR",     (0, 0), (-1, 0),  C_WHITE),
        ("FONTNAME",      (0, 0), (-1, 0),  "Helvetica-Bold"),
        ("FONTSIZE",      (0, 0), (-1, 0),  9),
        ("FONTNAME",      (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE",      (0, 1), (-1, -1), 8.5),
        ("TEXTCOLOR",     (0, 1), (-1, -1), C_TEXT),
        ("BACKGROUND",    (0, 1), (-1, -1), C_CARD),
        ("ROWBACKGROUNDS",(0, 1), (-1, -1), [C_CARD, colors.HexColor("#253045")]),
        ("GRID",          (0, 0), (-1, -1), 0.4, C_BORDER),
        ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING",    (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING",   (0, 0), (-1, -1), 8),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 8),
        ("ROUNDEDCORNERS",(0, 0), (-1, -1), [3, 3, 3, 3]),
    ])


def _kpi_box(value: str, label: str, color=None) -> Table:
    c = color or C_PRIMARY
    val_style = ParagraphStyle("v", fontName="Helvetica-Bold", fontSize=20, textColor=c, alignment=TA_CENTER)
    lbl_style = ParagraphStyle("l", fontName="Helvetica", fontSize=8, textColor=C_TEXT2, alignment=TA_CENTER)
    t = Table([[Paragraph(value, val_style)], [Paragraph(label, lbl_style)]], colWidths=[3.5*cm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,-1), C_CARD),
        ("BOX",        (0,0), (-1,-1), 1.5, c),
        ("ROUNDEDCORNERS",(0,0),(-1,-1),[6,6,6,6]),
        ("TOPPADDING", (0,0),(-1,-1), 8),
        ("BOTTOMPADDING",(0,0),(-1,-1),8),
    ]))
    return t


def _bar_chart_drawing(data_dict: Dict[str, float], width=14*cm, height=5*cm, color=C_PRIMARY) -> Drawing:
    """Graphique en barres ReportLab."""
    labels = list(data_dict.keys())
    values = [float(v) for v in data_dict.values()]
    n = len(labels)
    if n == 0:
        return Drawing(width, height)

    d = Drawing(width, height)
    bc = VerticalBarChart()
    bc.x = 40; bc.y = 20
    bc.height = height - 30; bc.width = width - 50
    bc.data = [values]
    bc.bars[0].fillColor = color
    bc.bars[0].strokeColor = colors.transparent
    bc.categoryAxis.categoryNames = [l[:12] for l in labels]
    bc.categoryAxis.labels.angle = 30
    bc.categoryAxis.labels.fontSize = 7
    bc.categoryAxis.labels.fillColor = C_TEXT2
    bc.categoryAxis.visibleGrid = False
    bc.categoryAxis.strokeColor = C_BORDER
    bc.valueAxis.labels.fontSize = 7
    bc.valueAxis.labels.fillColor = C_TEXT2
    bc.valueAxis.strokeColor = C_BORDER
    bc.valueAxis.gridStrokeColor = C_BORDER
    bc.valueAxis.gridStrokeDashArray = [2, 2]
    d.add(bc)
    return d


def _pie_drawing(data_dict: Dict[str, int], width=7*cm, height=5*cm) -> Drawing:
    palette = [C_SUCCESS, C_PRIMARY, C_PURPLE, C_WARNING, C_DANGER]
    labels = list(data_dict.keys())
    values = [float(v) for v in data_dict.values()]
    total = sum(values) or 1

    d = Drawing(width, height)
    pie = Pie()
    pie.x = 10; pie.y = 10
    pie.width = min(width, height) - 20
    pie.height = pie.width
    pie.data = values
    pie.labels = [f"{l} ({int(v/total*100)}%)" for l, v in zip(labels, values)]
    pie.sideLabels = True
    pie.sideLabelsOffset = 0.05
    for i, c in enumerate(palette[:len(labels)]):
        pie.slices[i].fillColor = c
        pie.slices[i].strokeColor = C_BG
        pie.slices[i].strokeWidth = 1.5
    d.add(pie)
    return d


def generate_pdf_report(kpis: Dict, modules: list, alertes: list, clusters: Dict = None) -> bytes:
    """Génère et retourne un rapport PDF en bytes."""
    buf = io.BytesIO()
    S = _styles()

    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        leftMargin=1.5*cm, rightMargin=1.5*cm,
        topMargin=1.5*cm, bottomMargin=1.5*cm,
        title="EduTrack Analytics — Rapport Pédagogique"
    )

    story = []
    W = A4[0] - 3*cm  # largeur utile

    # ── HEADER ───────────────────────────────────────────────────────────────
    header = Table(
        [[Paragraph("📊 EduTrack Analytics", S["title"]),
          Paragraph("MAROC YNOV CAMPUS", S["subtitle"])]],
        colWidths=[W * 0.65, W * 0.35]
    )
    header.setStyle(TableStyle([
        ("BACKGROUND", (0,0),(-1,-1), C_BG),
        ("BOX",        (0,0),(-1,-1), 0, colors.transparent),
        ("VALIGN",     (0,0),(-1,-1), "MIDDLE"),
        ("TOPPADDING", (0,0),(-1,-1), 14),
        ("BOTTOMPADDING",(0,0),(-1,-1),14),
        ("LEFTPADDING",(0,0),(-1,-1),14),
    ]))
    story.append(header)

    story.append(Paragraph(
        f"Rapport Pédagogique — Généré le {datetime.now().strftime('%d/%m/%Y à %H:%M')}",
        S["subtitle"]
    ))
    story.append(HRFlowable(width=W, thickness=1, color=C_PRIMARY, spaceAfter=14))

    # ── KPIs ─────────────────────────────────────────────────────────────────
    story.append(Paragraph("Vue Globale — Indicateurs Clés", S["section"]))

    kpi_boxes = Table([[
        _kpi_box(str(kpis.get("nb_etudiants", 0)),          "Étudiants",         C_PRIMARY),
        _kpi_box(f"{kpis.get('moyenne_generale',0)}/20",     "Moyenne Générale",  C_SUCCESS),
        _kpi_box(f"{kpis.get('taux_reussite',0)}%",          "Taux de Réussite",  C_SUCCESS),
        _kpi_box(str(kpis.get("nb_a_risque", 0)),            "Étudiants à Risque",C_DANGER),
        _kpi_box(str(kpis.get("taux_absence_moyen", 0)),     "Abs. Moy./Étudiant",C_WARNING),
    ]], colWidths=[3.6*cm]*5)
    kpi_boxes.setStyle(TableStyle([
        ("BACKGROUND",(0,0),(-1,-1),colors.transparent),
        ("ALIGN",     (0,0),(-1,-1),"CENTER"),
        ("LEFTPADDING",(0,0),(-1,-1),4),
        ("RIGHTPADDING",(0,0),(-1,-1),4),
    ]))
    story.append(kpi_boxes)
    story.append(Spacer(1, 12))

    # ── SEGMENTATION ─────────────────────────────────────────────────────────
    segs = kpis.get("segments", {})
    if segs:
        story.append(Paragraph("Segmentation des Profils Étudiants", S["section"]))
        seg_table_data = [["Profil", "Nb Étudiants", "% de la promotion"]]
        total_etu = sum(segs.values()) or 1
        for seg, nb in sorted(segs.items(), key=lambda x: -x[1]):
            pct = round(nb / total_etu * 100, 1)
            seg_table_data.append([seg.capitalize(), str(nb), f"{pct}%"])
        t = Table(seg_table_data, colWidths=[4*cm, 4*cm, 4*cm])
        t.setStyle(_dark_table_style(C_PURPLE))
        story.append(t)
        story.append(Spacer(1, 10))

    # ── PERFORMANCE PAR CLASSE ───────────────────────────────────────────────
    classe_stats = kpis.get("classe_stats", [])
    if classe_stats:
        story.append(Paragraph("Performance par Classe", S["section"]))
        classe_data = [["Classe", "Moyenne /20", "Nb Étudiants", "Réussite %"]]
        bar_data = {}
        for c in sorted(classe_stats, key=lambda x: -x.get("moyenne", 0)):
            m = c.get("moyenne", 0)
            bar_data[c.get("classe", "")] = m
            classe_data.append([
                c.get("classe", ""),
                f"{m:.2f}",
                str(c.get("nb_etudiants", "")),
                f"{c.get('taux_reussite', 0):.1f}%"
            ])
        t = Table(classe_data, colWidths=[4.5*cm, 3*cm, 3*cm, 3*cm])
        t.setStyle(_dark_table_style(C_PRIMARY))
        story.append(t)
        story.append(Spacer(1, 8))
        story.append(_bar_chart_drawing(bar_data, width=W, color=C_PRIMARY))
        story.append(Spacer(1, 10))

    # ── ANALYSE PAR MODULE ───────────────────────────────────────────────────
    if modules:
        story.append(Paragraph("Statistiques Descriptives par Module", S["section"]))
        mod_data = [["Module", "Moy.", "Méd.", "σ", "Min", "Max", "Réussite %"]]
        bar_mod = {}
        for m in sorted(modules, key=lambda x: -x.get("moyenne", 0)):
            bar_mod[m.get("module", "")[:14]] = m.get("moyenne", 0)
            mod_data.append([
                m.get("module", "")[:22],
                f"{m.get('moyenne',0):.2f}",
                f"{m.get('mediane',0):.2f}",
                f"{m.get('ecart_type',0):.2f}",
                f"{m.get('min',0):.1f}",
                f"{m.get('max',0):.1f}",
                f"{m.get('taux_reussite',0):.1f}%",
            ])
        t = Table(mod_data, colWidths=[3.8*cm, 1.5*cm, 1.5*cm, 1.3*cm, 1.3*cm, 1.3*cm, 2*cm])
        t.setStyle(_dark_table_style(C_SUCCESS))
        story.append(t)
        story.append(Spacer(1, 8))
        story.append(_bar_chart_drawing(bar_mod, width=W, color=C_SUCCESS))
        story.append(Spacer(1, 10))

    # ── ALERTES ──────────────────────────────────────────────────────────────
    if alertes:
        critiques  = [a for a in alertes if a.get("niveau") == "critical"]
        warnings_l = [a for a in alertes if a.get("niveau") == "warning"]

        story.append(Paragraph(f"Alertes Pédagogiques ({len(alertes)} actives)", S["section"]))

        alert_data = [["Niveau", "Étudiant", "Classe", "Message"]]
        for a in (critiques + warnings_l)[:30]:
            niv_color = "🔴" if a.get("niveau") == "critical" else "🟡"
            alert_data.append([
                f"{niv_color} {a.get('niveau','').upper()[:4]}",
                a.get("nom_complet", "")[:18],
                a.get("classe", "")[:12],
                a.get("message", "")[:55],
            ])
        t = Table(alert_data, colWidths=[2.2*cm, 3.5*cm, 2.8*cm, 8.2*cm])
        t.setStyle(_dark_table_style(C_DANGER))
        story.append(t)
        story.append(Spacer(1, 10))

    # ── RECOMMANDATIONS ──────────────────────────────────────────────────────
    story.append(Paragraph("Recommandations Pédagogiques", S["section"]))
    recos = []
    nb_risque = kpis.get("nb_a_risque", 0)
    moy = kpis.get("moyenne_generale", 0)
    taux = kpis.get("taux_reussite", 0)

    if nb_risque > 0:
        recos.append(f"• <b>{nb_risque} étudiant(s) nécessitent un accompagnement personnalisé urgent.</b> Organiser des entretiens individuels et mettre en place un suivi hebdomadaire.")
    if moy < 12:
        recos.append("• La moyenne générale est inférieure à 12/20. Envisager des séances de révision collectives et renforcer le soutien pédagogique.")
    if taux < 70:
        recos.append("• Le taux de réussite est sous 70%. Analyser les modules les plus difficiles et adapter les méthodes d'enseignement.")

    modules_difficiles = [m for m in modules if m.get("taux_reussite", 100) < 50]
    if modules_difficiles:
        noms = ", ".join([m.get("module", "") for m in modules_difficiles[:3]])
        recos.append(f"• Modules en difficulté : <b>{noms}</b>. Prévoir des séances de remédiation ciblées.")

    nb_abs_eleves = len([a for a in alertes if "absence" in a.get("type_alerte", "")])
    if nb_abs_eleves > 0:
        recos.append(f"• <b>{nb_abs_eleves} étudiant(s)</b> ont un taux d'absence critique. Contacter les familles et signaler au service de scolarité.")

    if not recos:
        recos.append("• Les performances globales sont satisfaisantes. Maintenir le niveau de suivi actuel.")

    for r in recos:
        story.append(Paragraph(r, S["body"]))
    story.append(Spacer(1, 10))

    # ── FOOTER ───────────────────────────────────────────────────────────────
    story.append(HRFlowable(width=W, thickness=0.5, color=C_BORDER, spaceBefore=10))
    story.append(Paragraph(
        f"EduTrack Analytics — MAROC YNOV CAMPUS — Rapport généré automatiquement le {datetime.now().strftime('%d/%m/%Y')}",
        S["small"]
    ))

    # Build avec fond sombre
    def on_page(canvas, doc):
        canvas.saveState()
        canvas.setFillColor(C_BG)
        canvas.rect(0, 0, A4[0], A4[1], fill=1, stroke=0)
        canvas.restoreState()

    doc.build(story, onFirstPage=on_page, onLaterPages=on_page)
    return buf.getvalue()