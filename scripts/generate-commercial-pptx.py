import os
import zipfile
from datetime import datetime, timezone
from xml.sax.saxutils import escape


ROOT = os.getcwd()
LOGO_PATH = os.path.join(ROOT, "public", "megafy-logo.png")
OUT_PATH = os.path.join(ROOT, "generated", "megafy-resumen-comercial.pptx")

SLIDE_W = 12192000  # 13.333in
SLIDE_H = 6858000   # 7.5in (16:9)


def emu(inches: float) -> int:
    return int(inches * 914400)


def text_paragraph(text, size=1800, bold=False, color="334155", align=None):
    align_attr = f' algn="{align}"' if align else ""
    b_attr = ' b="1"' if bold else ""
    txt = escape(text)
    return (
        f'<a:p>'
        f'<a:pPr{align_attr}/>'
        f'<a:r><a:rPr lang="es-CL" sz="{size}"{b_attr}><a:solidFill><a:srgbClr val="{color}"/></a:solidFill></a:rPr>'
        f'<a:t>{txt}</a:t></a:r>'
        f'<a:endParaRPr lang="es-CL" sz="{size}"/></a:p>'
    )


def textbox(shape_id, name, x, y, w, h, paragraphs):
    paras_xml = "".join(paragraphs)
    return f"""
    <p:sp>
      <p:nvSpPr>
        <p:cNvPr id="{shape_id}" name="{escape(name)}"/>
        <p:cNvSpPr txBox="1"/>
        <p:nvPr/>
      </p:nvSpPr>
      <p:spPr>
        <a:xfrm><a:off x="{x}" y="{y}"/><a:ext cx="{w}" cy="{h}"/></a:xfrm>
        <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
        <a:noFill/>
        <a:ln><a:noFill/></a:ln>
      </p:spPr>
      <p:txBody>
        <a:bodyPr wrap="square"/>
        <a:lstStyle/>
        {paras_xml}
      </p:txBody>
    </p:sp>
    """


def rounded_rect(shape_id, name, x, y, w, h, fill="FFFFFF", line="E2E8F0", radius_prst="roundRect"):
    return f"""
    <p:sp>
      <p:nvSpPr>
        <p:cNvPr id="{shape_id}" name="{escape(name)}"/>
        <p:cNvSpPr/>
        <p:nvPr/>
      </p:nvSpPr>
      <p:spPr>
        <a:xfrm><a:off x="{x}" y="{y}"/><a:ext cx="{w}" cy="{h}"/></a:xfrm>
        <a:prstGeom prst="{radius_prst}"><a:avLst/></a:prstGeom>
        <a:solidFill><a:srgbClr val="{fill}"/></a:solidFill>
        <a:ln w="12700"><a:solidFill><a:srgbClr val="{line}"/></a:solidFill></a:ln>
      </p:spPr>
      <p:style>
        <a:lnRef idx="1"><a:schemeClr val="accent1"/></a:lnRef>
        <a:fillRef idx="1"><a:schemeClr val="lt1"/></a:fillRef>
        <a:effectRef idx="0"><a:schemeClr val="accent1"/></a:effectRef>
        <a:fontRef idx="minor"><a:schemeClr val="tx1"/></a:fontRef>
      </p:style>
      <p:txBody><a:bodyPr/><a:lstStyle/><a:p/></p:txBody>
    </p:sp>
    """


def line(shape_id, name, x1, y1, x2, y2, color="E2E8F0", width=12700):
    return f"""
    <p:cxnSp>
      <p:nvCxnSpPr>
        <p:cNvPr id="{shape_id}" name="{escape(name)}"/>
        <p:cNvCxnSpPr/>
        <p:nvPr/>
      </p:nvCxnSpPr>
      <p:spPr>
        <a:xfrm><a:off x="{x1}" y="{y1}"/><a:ext cx="{max(1, x2-x1)}" cy="{max(1, y2-y1)}"/></a:xfrm>
        <a:prstGeom prst="line"><a:avLst/></a:prstGeom>
        <a:ln w="{width}"><a:solidFill><a:srgbClr val="{color}"/></a:solidFill></a:ln>
      </p:spPr>
      <p:style>
        <a:lnRef idx="1"><a:schemeClr val="accent1"/></a:lnRef>
        <a:fillRef idx="0"><a:schemeClr val="accent1"/></a:fillRef>
        <a:effectRef idx="0"><a:schemeClr val="accent1"/></a:effectRef>
        <a:fontRef idx="minor"><a:schemeClr val="tx1"/></a:fontRef>
      </p:style>
    </p:cxnSp>
    """


def picture(shape_id, name, x, y, w, h, rid):
    return f"""
    <p:pic>
      <p:nvPicPr>
        <p:cNvPr id="{shape_id}" name="{escape(name)}"/>
        <p:cNvPicPr>
          <a:picLocks noChangeAspect="1"/>
        </p:cNvPicPr>
        <p:nvPr/>
      </p:nvPicPr>
      <p:blipFill>
        <a:blip r:embed="{rid}"/>
        <a:stretch><a:fillRect/></a:stretch>
      </p:blipFill>
      <p:spPr>
        <a:xfrm><a:off x="{x}" y="{y}"/><a:ext cx="{w}" cy="{h}"/></a:xfrm>
        <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
      </p:spPr>
    </p:pic>
    """


def slide_xml(shapes_xml):
    return f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
       xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
       xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:nvGrpSpPr>
        <p:cNvPr id="1" name=""/>
        <p:cNvGrpSpPr/>
        <p:nvPr/>
      </p:nvGrpSpPr>
      <p:grpSpPr>
        <a:xfrm>
          <a:off x="0" y="0"/>
          <a:ext cx="0" cy="0"/>
          <a:chOff x="0" y="0"/>
          <a:chExt cx="0" cy="0"/>
        </a:xfrm>
      </p:grpSpPr>
      {shapes_xml}
    </p:spTree>
  </p:cSld>
  <p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sld>
"""


def slide_rels_xml(include_image=True):
    rels = [
        ('rId1', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout', '../slideLayouts/slideLayout1.xml')
    ]
    if include_image:
        rels.append(('rId2', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/image', '../media/image1.png'))
    body = "".join([f'<Relationship Id="{rid}" Type="{typ}" Target="{target}"/>' for rid, typ, target in rels])
    return f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">{body}</Relationships>
"""


def footer_shapes(start_id, page_num):
    y = emu(7.15)
    return (
        line(start_id, "FooterLine", emu(0.45), y, emu(12.85), y, color="E2E8F0")
        + textbox(
            start_id + 1,
            "FooterLeft",
            emu(0.5),
            emu(7.18),
            emu(5.0),
            emu(0.2),
            [text_paragraph("Megafy · Resumen comercial del sistema", size=800, color="64748B")],
        )
        + textbox(
            start_id + 2,
            "FooterRight",
            emu(11.5),
            emu(7.18),
            emu(1.2),
            emu(0.2),
            [text_paragraph(f"{page_num}/3", size=800, color="64748B", align="r")],
        )
    )


def make_slide1():
    sid = 10
    shapes = []
    shapes.append(rounded_rect(sid, "BG", 0, 0, SLIDE_W, SLIDE_H, fill="F8FAFC", line="F8FAFC", radius_prst="rect")); sid += 1
    shapes.append(rounded_rect(sid, "HeroCard", emu(0.45), emu(0.55), emu(12.35), emu(4.25), fill="FFFFFF", line="E2E8F0")); sid += 1
    shapes.append(picture(sid, "MegafyLogo", emu(0.7), emu(0.75), emu(1.45), emu(0.42), "rId2")); sid += 1
    shapes.append(textbox(sid, "HeaderTag", emu(2.3), emu(0.78), emu(5.6), emu(0.35), [
        text_paragraph("PLATAFORMA DE GESTIÓN DOCUMENTAL ASISTIDA POR IA", size=900, bold=True, color="0F172A")
    ])); sid += 1
    shapes.append(rounded_rect(sid, "Pill", emu(0.7), emu(1.25), emu(1.7), emu(0.32), fill="ECFEFF", line="67E8F9")); sid += 1
    shapes.append(textbox(sid, "PillTxt", emu(0.86), emu(1.31), emu(1.4), emu(0.2), [
        text_paragraph("ONE-PAGE COMERCIAL", size=700, bold=True, color="0891B2")
    ])); sid += 1
    shapes.append(textbox(sid, "Title", emu(0.7), emu(1.65), emu(7.2), emu(1.3), [
        text_paragraph("Megafy transforma documentos operativos", size=2200, bold=True, color="0F172A"),
        text_paragraph("en conocimiento buscable y accionable", size=2200, bold=True, color="0F172A"),
    ])); sid += 1
    shapes.append(textbox(sid, "Subtitle", emu(0.72), emu(2.85), emu(7.15), emu(1.05), [
        text_paragraph("Centraliza expedientes, extrae datos con IA, habilita búsqueda conversacional con evidencias y genera", size=1050, color="475569"),
        text_paragraph("reportes para equipos de content management, backoffice, compliance y operaciones.", size=1050, color="475569"),
    ])); sid += 1
    shapes.append(rounded_rect(sid, "CTA1", emu(0.72), emu(3.95), emu(2.15), emu(0.48), fill="0F172A", line="0F172A")); sid += 1
    shapes.append(textbox(sid, "CTA1Txt", emu(0.96), emu(4.05), emu(1.8), emu(0.2), [
        text_paragraph("Gestión + IA + Gobierno", size=850, bold=True, color="FFFFFF")
    ])); sid += 1
    shapes.append(rounded_rect(sid, "CTA2", emu(2.98), emu(3.95), emu(2.05), emu(0.48), fill="06B6D4", line="06B6D4")); sid += 1
    shapes.append(textbox(sid, "CTA2Txt", emu(3.26), emu(4.05), emu(1.6), emu(0.2), [
        text_paragraph("Búsqueda con evidencia", size=800, bold=True, color="FFFFFF")
    ])); sid += 1

    shapes.append(rounded_rect(sid, "ValueCard", emu(8.25), emu(1.1), emu(4.25), emu(3.25), fill="F8FAFC", line="CBD5E1")); sid += 1
    shapes.append(textbox(sid, "ValueTitle", emu(8.55), emu(1.35), emu(3.6), emu(0.3), [
        text_paragraph("Valor inmediato para CM", size=1100, bold=True, color="0F172A")
    ])); sid += 1
    for item in [
        "Menos tiempo buscando documentos",
        "Mejor trazabilidad por operación",
        "Respuestas rápidas a auditorías",
        "Datos listos para reportes",
    ]:
        shapes.append(textbox(sid, f"Bullet{sid}", emu(8.62), emu(1.75 + (sid-24)*0.55), emu(3.4), emu(0.35), [
            text_paragraph(f"• {item}", size=950, color="334155")
        ]))
        sid += 1

    shapes.append(textbox(sid, "PVTitle", emu(0.5), emu(5.05), emu(6.8), emu(0.35), [
        text_paragraph("Propuesta de valor", size=1500, bold=True, color="0F172A")
    ])); sid += 1
    shapes.append(textbox(sid, "PVSub", emu(0.5), emu(5.35), emu(8.5), emu(0.25), [
        text_paragraph("Pensado para gestión de contenido documental en entornos operativos", size=900, color="64748B")
    ])); sid += 1

    cards = [
        ("Captura documental", "Carga de PDFs e imágenes, drag & drop y cámara móvil para expedientes."),
        ("Extracción IA", "Procesamiento en segundo plano para extraer texto y campos útiles."),
        ("Consulta y control", "Búsqueda por lenguaje natural, evidencias y gobierno por tipo documental."),
    ]
    cx = [0.5, 4.5, 8.5]
    for i, (t, b) in enumerate(cards):
        shapes.append(rounded_rect(sid, f"Card{i}", emu(cx[i]), emu(5.75), emu(3.75), emu(1.0), fill="FFFFFF", line="E2E8F0")); sid += 1
        shapes.append(textbox(sid, f"CardT{i}", emu(cx[i]+0.2), emu(5.95), emu(3.3), emu(0.25), [text_paragraph(t, size=950, bold=True, color="0F172A")])); sid += 1
        shapes.append(textbox(sid, f"CardB{i}", emu(cx[i]+0.2), emu(6.2), emu(3.3), emu(0.45), [text_paragraph(b, size=800, color="475569")])); sid += 1

    shapes.append(footer_shapes(90, 1))
    return slide_xml("".join(shapes))


def make_slide2():
    sid = 10
    shapes = []
    shapes.append(rounded_rect(sid, "BG", 0, 0, SLIDE_W, SLIDE_H, fill="F8FAFC", line="F8FAFC", radius_prst="rect")); sid += 1
    shapes.append(picture(sid, "MegafyLogo", emu(0.5), emu(0.35), emu(1.35), emu(0.38), "rId2")); sid += 1
    shapes.append(textbox(sid, "Title", emu(0.5), emu(0.85), emu(8.8), emu(0.4), [
        text_paragraph("Características clave del sistema", size=1700, bold=True, color="0F172A")
    ])); sid += 1
    shapes.append(textbox(sid, "Sub", emu(0.5), emu(1.16), emu(10.5), emu(0.3), [
        text_paragraph("Funcionalidades actuales para captura, búsqueda, reporting y control documental", size=900, color="64748B")
    ])); sid += 1

    features = [
        ("Alta de operaciones", "Cliente + identificación + múltiples documentos asociados."),
        ("Carga móvil y escritorio", "Drag & drop, selección manual o cámara móvil."),
        ("Compresión de imágenes", "Optimización previa para subir más rápido."),
        ("Extracción de campos IA", "Texto y metadatos relevantes para consulta."),
        ("Resumen por operación", "Consolidación de extracción en contexto de negocio."),
        ("Buscador conversacional", "Preguntas en lenguaje natural al agente."),
        ("Evidencias visuales", "Miniaturas, snippets y acceso al documento fuente."),
        ("Modos de búsqueda", "Preciso o amplio según necesidad analítica."),
        ("Reportes inteligentes", "Evolución, tipos de documento y top clientes."),
        ("Exportación", "Resultados descargables en CSV y PDF."),
        ("KPIs operacionales", "Operaciones, documentos y clientes únicos por período."),
        ("Seguridad documental", "Matriz de permisos por grupo y tipo documental."),
    ]

    start_x = 0.5
    start_y = 1.6
    box_w = 4.05
    box_h = 0.95
    gap_x = 0.25
    gap_y = 0.2
    for idx, (t, b) in enumerate(features):
        col = idx % 3
        row = idx // 3
        x = start_x + col * (box_w + gap_x)
        y = start_y + row * (box_h + gap_y)
        shapes.append(rounded_rect(sid, f"F{idx}", emu(x), emu(y), emu(box_w), emu(box_h), fill="FFFFFF", line="E2E8F0")); sid += 1
        shapes.append(rounded_rect(sid, f"Dot{idx}", emu(x+0.12), emu(y+0.13), emu(0.2), emu(0.2), fill="E0F2FE", line="E0F2FE", radius_prst="ellipse")); sid += 1
        shapes.append(textbox(sid, f"FT{idx}", emu(x+0.38), emu(y+0.12), emu(box_w-0.5), emu(0.22), [text_paragraph(t, size=900, bold=True, color="0F172A")])); sid += 1
        shapes.append(textbox(sid, f"FB{idx}", emu(x+0.12), emu(y+0.4), emu(box_w-0.24), emu(0.42), [text_paragraph(b, size=760, color="475569")])); sid += 1

    shapes.append(rounded_rect(sid, "ArchBox", emu(0.5), emu(6.1), emu(8.1), emu(0.75), fill="0F172A", line="0F172A")); sid += 1
    shapes.append(textbox(sid, "ArchTxt", emu(0.75), emu(6.33), emu(7.6), emu(0.22), [
        text_paragraph("Arquitectura moderna: Next.js + Prisma + PostgreSQL + IA (OpenAI/Gemini) + almacenamiento compatible con Vercel Blob", size=820, bold=True, color="FFFFFF")
    ])); sid += 1

    shapes.append(rounded_rect(sid, "RoleBox", emu(8.8), emu(6.1), emu(4.03), emu(0.75), fill="FFFFFF", line="CBD5E1")); sid += 1
    shapes.append(textbox(sid, "RoleTxt", emu(9.0), emu(6.24), emu(3.6), emu(0.5), [
        text_paragraph("Roles: Capturador (ingesta) + Analista (búsqueda y reportes)", size=800, color="0F172A", bold=True)
    ])); sid += 1

    shapes.append(footer_shapes(200, 2))
    return slide_xml("".join(shapes))


def make_slide3():
    sid = 10
    shapes = []
    shapes.append(rounded_rect(sid, "BG", 0, 0, SLIDE_W, SLIDE_H, fill="F8FAFC", line="F8FAFC", radius_prst="rect")); sid += 1
    shapes.append(picture(sid, "MegafyLogo", emu(0.5), emu(0.35), emu(1.35), emu(0.38), "rId2")); sid += 1
    shapes.append(textbox(sid, "Title", emu(0.5), emu(0.85), emu(9.2), emu(0.4), [
        text_paragraph("Beneficios comerciales y narrativa de venta", size=1700, bold=True, color="0F172A")
    ])); sid += 1
    shapes.append(textbox(sid, "Sub", emu(0.5), emu(1.16), emu(11.5), emu(0.3), [
        text_paragraph("Resumen para presentar Megafy a stakeholders internos o clientes", size=900, color="64748B")
    ])); sid += 1

    # Two columns
    shapes.append(rounded_rect(sid, "BizBox", emu(0.5), emu(1.6), emu(6.15), emu(2.2), fill="FFFFFF", line="E2E8F0")); sid += 1
    shapes.append(textbox(sid, "BizTitle", emu(0.75), emu(1.82), emu(5.6), emu(0.25), [text_paragraph("Beneficios de negocio", size=1050, bold=True, color="0F172A")])); sid += 1
    biz = [
        "• Acelera respuesta ante requerimientos internos y auditorías.",
        "• Reduce fricción entre captura documental y análisis de información.",
        "• Mejora consistencia de datos extraídos desde documentos.",
        "• Escala recuperación de contenido sin aumentar carga manual.",
    ]
    for i, txt in enumerate(biz):
        shapes.append(textbox(sid, f"Biz{i}", emu(0.8), emu(2.15 + i*0.36), emu(5.5), emu(0.25), [text_paragraph(txt, size=820, color="334155")])); sid += 1

    shapes.append(rounded_rect(sid, "SalesBox", emu(6.85), emu(1.6), emu(5.98), emu(2.2), fill="FFFFFF", line="E2E8F0")); sid += 1
    shapes.append(textbox(sid, "SalesTitle", emu(7.1), emu(1.82), emu(5.4), emu(0.25), [text_paragraph("Mensajes de venta (B2B)", size=1050, bold=True, color="0F172A")])); sid += 1
    sales = [
        "• De documentos estáticos a conocimiento operativo consultable.",
        "• IA con evidencias (snippets, miniaturas y fuente).",
        "• Reporting listo para seguimiento y decisiones.",
        "• Gobierno documental alineado con seguridad de acceso.",
    ]
    for i, txt in enumerate(sales):
        shapes.append(textbox(sid, f"Sales{i}", emu(7.15), emu(2.15 + i*0.36), emu(5.3), emu(0.25), [text_paragraph(txt, size=800, color="334155")])); sid += 1

    shapes.append(rounded_rect(sid, "CaseBox", emu(0.5), emu(4.05), emu(12.33), emu(1.55), fill="0F172A", line="0F172A")); sid += 1
    shapes.append(textbox(sid, "CaseTitle", emu(0.8), emu(4.32), emu(7.4), emu(0.28), [text_paragraph("Caso de uso de referencia (Content Management)", size=1150, bold=True, color="FFFFFF")])); sid += 1
    shapes.append(textbox(sid, "CaseBody", emu(0.8), emu(4.66), emu(11.6), emu(0.6), [
        text_paragraph("Un equipo de operaciones recibe expedientes con facturas, identificaciones y respaldos. Megafy centraliza la carga, extrae metadatos, permite buscar por prompt y emite reportes sin recorrer carpetas manualmente.", size=820, color="E2E8F0")
    ])); sid += 1
    shapes.append(rounded_rect(sid, "ResultPill", emu(0.8), emu(5.22), emu(4.15), emu(0.32), fill="06B6D4", line="06B6D4")); sid += 1
    shapes.append(textbox(sid, "ResultTxt", emu(1.0), emu(5.29), emu(3.8), emu(0.2), [text_paragraph("Resultado: rapidez + control + trazabilidad", size=760, bold=True, color="FFFFFF")])); sid += 1

    shapes.append(rounded_rect(sid, "DecisionBox", emu(0.5), emu(5.8), emu(12.33), emu(0.82), fill="EFF6FF", line="BFDBFE")); sid += 1
    shapes.append(textbox(sid, "DecisionTitle", emu(0.8), emu(6.0), emu(4.2), emu(0.22), [text_paragraph("Resumen ejecutivo para decisión", size=900, bold=True, color="1E40AF")])); sid += 1
    shapes.append(textbox(sid, "DecisionBody", emu(0.8), emu(6.25), emu(11.6), emu(0.25), [
        text_paragraph("Megafy unifica captura, extracción IA, búsqueda asistida y reporting documental, con valor directo para equipos con alto volumen de documentos.", size=760, color="1E3A8A")
    ])); sid += 1

    shapes.append(rounded_rect(sid, "CTABox", emu(0.5), emu(6.72), emu(12.33), emu(0.38), fill="ECFDF5", line="A7F3D0")); sid += 1
    shapes.append(textbox(sid, "CTAText", emu(0.8), emu(6.82), emu(11.6), emu(0.2), [
        text_paragraph("CTA sugerido: demo guiada con expedientes reales y medición de tiempo de búsqueda antes/después.", size=760, bold=True, color="065F46")
    ])); sid += 1

    shapes.append(footer_shapes(250, 3))
    return slide_xml("".join(shapes))


def content_types():
    return """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="png" ContentType="image/png"/>
  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
  <Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>
  <Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>
  <Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>
  <Override PartName="/ppt/slides/slide1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
  <Override PartName="/ppt/slides/slide2.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
  <Override PartName="/ppt/slides/slide3.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>
"""


def root_rels():
    return """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>
"""


def app_props():
    return """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"
            xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>Microsoft Office PowerPoint</Application>
  <PresentationFormat>On-screen Show (16:9)</PresentationFormat>
  <Slides>3</Slides>
  <Notes>0</Notes>
  <HiddenSlides>0</HiddenSlides>
  <MMClips>0</MMClips>
  <ScaleCrop>false</ScaleCrop>
  <HeadingPairs>
    <vt:vector size="2" baseType="variant">
      <vt:variant><vt:lpstr>Diapositivas</vt:lpstr></vt:variant>
      <vt:variant><vt:i4>3</vt:i4></vt:variant>
    </vt:vector>
  </HeadingPairs>
  <TitlesOfParts>
    <vt:vector size="3" baseType="lpstr">
      <vt:lpstr>Resumen comercial</vt:lpstr>
      <vt:lpstr>Características</vt:lpstr>
      <vt:lpstr>Beneficios y venta</vt:lpstr>
    </vt:vector>
  </TitlesOfParts>
  <Company>Megafy</Company>
</Properties>
"""


def core_props():
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    return f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"
 xmlns:dc="http://purl.org/dc/elements/1.1/"
 xmlns:dcterms="http://purl.org/dc/terms/"
 xmlns:dcmitype="http://purl.org/dc/dcmitype/"
 xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>Megafy - Resumen comercial del sistema</dc:title>
  <dc:creator>Codex</dc:creator>
  <cp:lastModifiedBy>Codex</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">{now}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">{now}</dcterms:modified>
</cp:coreProperties>
"""


def presentation_xml():
    return f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
 xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
 xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:sldMasterIdLst>
    <p:sldMasterId id="2147483648" r:id="rId1"/>
  </p:sldMasterIdLst>
  <p:sldIdLst>
    <p:sldId id="256" r:id="rId2"/>
    <p:sldId id="257" r:id="rId3"/>
    <p:sldId id="258" r:id="rId4"/>
  </p:sldIdLst>
  <p:sldSz cx="{SLIDE_W}" cy="{SLIDE_H}" type="screen16x9"/>
  <p:notesSz cx="6858000" cy="9144000"/>
  <p:defaultTextStyle>
    <a:defPPr/>
    <a:lvl1pPr marL="0" indent="0"><a:defRPr sz="1800"/></a:lvl1pPr>
  </p:defaultTextStyle>
</p:presentation>
"""


def presentation_rels():
    return """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide1.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide2.xml"/>
  <Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide3.xml"/>
</Relationships>
"""


def slide_master_xml():
    return """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
 xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
 xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:bg><p:bgPr><a:solidFill><a:srgbClr val="F8FAFC"/></a:solidFill><a:effectLst/></p:bgPr></p:bg>
    <p:spTree>
      <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
      <p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>
    </p:spTree>
  </p:cSld>
  <p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>
  <p:sldLayoutIdLst>
    <p:sldLayoutId id="2147483649" r:id="rId1"/>
  </p:sldLayoutIdLst>
  <p:txStyles>
    <p:titleStyle><a:lvl1pPr><a:defRPr sz="3200" b="1"/></a:lvl1pPr></p:titleStyle>
    <p:bodyStyle><a:lvl1pPr><a:defRPr sz="1800"/></a:lvl1pPr></p:bodyStyle>
    <p:otherStyle><a:lvl1pPr><a:defRPr sz="1800"/></a:lvl1pPr></p:otherStyle>
  </p:txStyles>
</p:sldMaster>
"""


def slide_master_rels():
    return """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/>
</Relationships>
"""


def slide_layout_xml():
    return """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
 xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
 xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" type="blank" preserve="1">
  <p:cSld name="Blank">
    <p:spTree>
      <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
      <p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>
    </p:spTree>
  </p:cSld>
  <p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sldLayout>
"""


def slide_layout_rels():
    return """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/>
</Relationships>
"""


def theme_xml():
    return """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="MegafyTheme">
  <a:themeElements>
    <a:clrScheme name="Megafy">
      <a:dk1><a:srgbClr val="0F172A"/></a:dk1>
      <a:lt1><a:srgbClr val="FFFFFF"/></a:lt1>
      <a:dk2><a:srgbClr val="334155"/></a:dk2>
      <a:lt2><a:srgbClr val="F8FAFC"/></a:lt2>
      <a:accent1><a:srgbClr val="06B6D4"/></a:accent1>
      <a:accent2><a:srgbClr val="3B82F6"/></a:accent2>
      <a:accent3><a:srgbClr val="10B981"/></a:accent3>
      <a:accent4><a:srgbClr val="0EA5E9"/></a:accent4>
      <a:accent5><a:srgbClr val="22C55E"/></a:accent5>
      <a:accent6><a:srgbClr val="64748B"/></a:accent6>
      <a:hlink><a:srgbClr val="2563EB"/></a:hlink>
      <a:folHlink><a:srgbClr val="7C3AED"/></a:folHlink>
    </a:clrScheme>
    <a:fontScheme name="MegafyFonts">
      <a:majorFont><a:latin typeface="Aptos Display"/><a:ea typeface=""/><a:cs typeface=""/></a:majorFont>
      <a:minorFont><a:latin typeface="Aptos"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont>
    </a:fontScheme>
    <a:fmtScheme name="Office">
      <a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst>
      <a:lnStyleLst><a:ln w="9525" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst>
      <a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst>
      <a:bgFillStyleLst><a:solidFill><a:schemeClr val="lt1"/></a:solidFill></a:bgFillStyleLst>
    </a:fmtScheme>
  </a:themeElements>
  <a:objectDefaults/>
  <a:extraClrSchemeLst/>
</a:theme>
"""


def write_pptx():
    if not os.path.exists(LOGO_PATH):
        raise FileNotFoundError(LOGO_PATH)
    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    with zipfile.ZipFile(OUT_PATH, "w", compression=zipfile.ZIP_DEFLATED) as z:
        z.writestr("[Content_Types].xml", content_types())
        z.writestr("_rels/.rels", root_rels())
        z.writestr("docProps/app.xml", app_props())
        z.writestr("docProps/core.xml", core_props())

        z.writestr("ppt/presentation.xml", presentation_xml())
        z.writestr("ppt/_rels/presentation.xml.rels", presentation_rels())
        z.writestr("ppt/slideMasters/slideMaster1.xml", slide_master_xml())
        z.writestr("ppt/slideMasters/_rels/slideMaster1.xml.rels", slide_master_rels())
        z.writestr("ppt/slideLayouts/slideLayout1.xml", slide_layout_xml())
        z.writestr("ppt/slideLayouts/_rels/slideLayout1.xml.rels", slide_layout_rels())
        z.writestr("ppt/theme/theme1.xml", theme_xml())

        z.writestr("ppt/slides/slide1.xml", make_slide1())
        z.writestr("ppt/slides/_rels/slide1.xml.rels", slide_rels_xml(include_image=True))
        z.writestr("ppt/slides/slide2.xml", make_slide2())
        z.writestr("ppt/slides/_rels/slide2.xml.rels", slide_rels_xml(include_image=True))
        z.writestr("ppt/slides/slide3.xml", make_slide3())
        z.writestr("ppt/slides/_rels/slide3.xml.rels", slide_rels_xml(include_image=True))

        with open(LOGO_PATH, "rb") as f:
            z.writestr("ppt/media/image1.png", f.read())
    return OUT_PATH


if __name__ == "__main__":
    print(write_pptx())
