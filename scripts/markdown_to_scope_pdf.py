#!/usr/bin/env python3

from __future__ import annotations

import re
import sys
from pathlib import Path
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_JUSTIFY
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, StyleSheet1, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import ListFlowable, ListItem, PageBreak, Paragraph, SimpleDocTemplate, Spacer


def build_styles() -> StyleSheet1:
    styles = getSampleStyleSheet()
    styles.add(
        ParagraphStyle(
            name="ScopeTitle",
            parent=styles["Title"],
            fontName="Helvetica-Bold",
            fontSize=23,
            leading=28,
            textColor=colors.HexColor("#0f172a"),
            spaceAfter=10,
        )
    )
    styles.add(
        ParagraphStyle(
            name="ScopeH2",
            parent=styles["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=15,
            leading=20,
            textColor=colors.HexColor("#0f172a"),
            spaceBefore=10,
            spaceAfter=6,
        )
    )
    styles.add(
        ParagraphStyle(
            name="ScopeH3",
            parent=styles["Heading3"],
            fontName="Helvetica-Bold",
            fontSize=11.5,
            leading=15,
            textColor=colors.HexColor("#1d4ed8"),
            spaceBefore=8,
            spaceAfter=4,
        )
    )
    styles.add(
        ParagraphStyle(
            name="ScopeBody",
            parent=styles["BodyText"],
            fontName="Helvetica",
            fontSize=9.6,
            leading=14,
            textColor=colors.HexColor("#334155"),
            alignment=TA_JUSTIFY,
            spaceAfter=6,
        )
    )
    styles.add(
        ParagraphStyle(
            name="ScopeMeta",
            parent=styles["BodyText"],
            fontName="Helvetica",
            fontSize=8.5,
            leading=11,
            textColor=colors.HexColor("#64748b"),
            spaceAfter=12,
        )
    )
    return styles


def inline_markup(text: str) -> str:
    text = escape(text.strip())
    text = re.sub(r"`([^`]+)`", r"<font name='Helvetica-Bold'>\1</font>", text)
    text = re.sub(r"\*\*([^*]+)\*\*", r"<b>\1</b>", text)
    return text


def add_bullet_list(story, items, styles, ordered=False):
    bullet_type = "1" if ordered else "bullet"
    bullets = []
    for item in items:
        bullets.append(
            ListItem(
                Paragraph(inline_markup(item), styles["ScopeBody"]),
                leftIndent=10,
            )
        )
    story.append(
        ListFlowable(
            bullets,
            bulletType=bullet_type,
            start="1",
            leftIndent=16,
            bulletFontName="Helvetica",
            bulletFontSize=9.5,
            bulletColor=colors.HexColor("#0f172a"),
            spaceBefore=2,
            spaceAfter=6,
        )
    )


def parse_markdown(text: str, styles):
    lines = text.splitlines()
    story = []
    paragraph_buffer = []
    bullets = []
    ordered = []

    def flush_paragraph():
        if not paragraph_buffer:
            return
        text = " ".join(part.strip() for part in paragraph_buffer if part.strip())
        if text:
            story.append(Paragraph(inline_markup(text), styles["ScopeBody"]))
        paragraph_buffer.clear()

    def flush_bullets():
        if bullets:
            add_bullet_list(story, bullets[:], styles, ordered=False)
            bullets.clear()

    def flush_ordered():
        if ordered:
            add_bullet_list(story, ordered[:], styles, ordered=True)
            ordered.clear()

    for raw_line in lines:
        line = raw_line.rstrip()
        stripped = line.strip()

        if not stripped:
            flush_paragraph()
            flush_bullets()
            flush_ordered()
            continue

        if stripped == "---":
            flush_paragraph()
            flush_bullets()
            flush_ordered()
            story.append(Spacer(1, 4))
            continue

        if stripped.startswith("# "):
            flush_paragraph()
            flush_bullets()
            flush_ordered()
            story.append(Paragraph(inline_markup(stripped[2:]), styles["ScopeTitle"]))
            story.append(Paragraph("Documento funcional para implementacion con Mendix + Codex", styles["ScopeMeta"]))
            continue

        if stripped.startswith("## "):
            flush_paragraph()
            flush_bullets()
            flush_ordered()
            story.append(Paragraph(inline_markup(stripped[3:]), styles["ScopeH2"]))
            continue

        if stripped.startswith("### "):
            flush_paragraph()
            flush_bullets()
            flush_ordered()
            story.append(Paragraph(inline_markup(stripped[4:]), styles["ScopeH3"]))
            continue

        if stripped.startswith("- "):
            flush_paragraph()
            flush_ordered()
            bullets.append(stripped[2:].strip())
            continue

        match = re.match(r"^\d+\.\s+(.*)$", stripped)
        if match:
            flush_paragraph()
            flush_bullets()
            ordered.append(match.group(1).strip())
            continue

        paragraph_buffer.append(stripped)

    flush_paragraph()
    flush_bullets()
    flush_ordered()
    return story


def draw_header_footer(canvas, doc):
    canvas.saveState()
    width, height = A4
    canvas.setStrokeColor(colors.HexColor("#cbd5e1"))
    canvas.setLineWidth(0.5)
    canvas.line(doc.leftMargin, height - 18 * mm, width - doc.rightMargin, height - 18 * mm)
    canvas.setFont("Helvetica-Bold", 9)
    canvas.setFillColor(colors.HexColor("#0f172a"))
    canvas.drawString(doc.leftMargin, height - 13 * mm, "Megafyle - Documento de alcance")
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(colors.HexColor("#64748b"))
    canvas.drawRightString(width - doc.rightMargin, 12 * mm, f"Pagina {canvas.getPageNumber()}")
    canvas.restoreState()


def main():
    if len(sys.argv) != 3:
      print("Uso: markdown_to_scope_pdf.py <input.md> <output.pdf>", file=sys.stderr)
      sys.exit(1)

    source = Path(sys.argv[1])
    target = Path(sys.argv[2])
    target.parent.mkdir(parents=True, exist_ok=True)

    styles = build_styles()
    story = parse_markdown(source.read_text(encoding="utf-8"), styles)

    doc = SimpleDocTemplate(
        str(target),
        pagesize=A4,
        topMargin=26 * mm,
        bottomMargin=18 * mm,
        leftMargin=20 * mm,
        rightMargin=20 * mm,
        title="Documento de Alcance de Solucion",
        author="OpenAI Codex",
    )
    doc.build(story, onFirstPage=draw_header_footer, onLaterPages=draw_header_footer)
    print(target)


if __name__ == "__main__":
    main()
