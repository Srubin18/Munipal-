#!/usr/bin/env python3
"""Generate Assemble AI Product Brief PDF using ReportLab"""

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm, cm
from reportlab.lib.colors import HexColor, white, black
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, KeepTogether
)
from reportlab.platypus.flowables import HRFlowable, Flowable
from reportlab.graphics.shapes import Drawing, Rect, String, Line, Polygon, Circle, Group
from reportlab.graphics import renderPDF

# Colors
BLUE = HexColor('#2563eb')
DARK = HexColor('#141414')
BODY = HexColor('#333333')
LIGHT_GRAY = HexColor('#f5f7fa')
MID_GRAY = HexColor('#888888')
LIGHT_BLUE = HexColor('#eef2ff')

WIDTH, HEIGHT = A4

def create_styles():
    styles = getSampleStyleSheet()

    styles.add(ParagraphStyle(
        'CoverTitle', fontName='Helvetica-Bold', fontSize=36,
        textColor=DARK, leading=42, spaceAfter=4
    ))
    styles.add(ParagraphStyle(
        'CoverSub', fontName='Helvetica', fontSize=16,
        textColor=BLUE, leading=22, spaceAfter=8
    ))
    styles.add(ParagraphStyle(
        'CoverMeta', fontName='Helvetica', fontSize=11,
        textColor=MID_GRAY, leading=16
    ))
    styles.add(ParagraphStyle(
        'SectionTitle', fontName='Helvetica-Bold', fontSize=18,
        textColor=DARK, leading=24, spaceBefore=16, spaceAfter=6
    ))
    styles.add(ParagraphStyle(
        'SubTitle', fontName='Helvetica-Bold', fontSize=13,
        textColor=BLUE, leading=18, spaceBefore=12, spaceAfter=4
    ))
    styles.add(ParagraphStyle(
        'BodyText2', fontName='Helvetica', fontSize=10,
        textColor=BODY, leading=15, spaceAfter=6
    ))
    styles.add(ParagraphStyle(
        'BoldBody', fontName='Helvetica-Bold', fontSize=10,
        textColor=BODY, leading=15, spaceAfter=4
    ))
    styles.add(ParagraphStyle(
        'Bullet2', fontName='Helvetica', fontSize=10,
        textColor=BODY, leading=15, spaceAfter=3,
        leftIndent=16, bulletIndent=4, bulletFontName='Helvetica',
        bulletFontSize=10, bulletColor=BLUE
    ))
    styles.add(ParagraphStyle(
        'FooterStyle', fontName='Helvetica-Oblique', fontSize=8,
        textColor=MID_GRAY, alignment=TA_CENTER
    ))
    styles.add(ParagraphStyle(
        'ClosingBold', fontName='Helvetica-Bold', fontSize=14,
        textColor=DARK, leading=20, spaceAfter=4
    ))
    styles.add(ParagraphStyle(
        'ClosingBlue', fontName='Helvetica', fontSize=12,
        textColor=BLUE, leading=18, spaceBefore=8
    ))
    styles.add(ParagraphStyle(
        'TableHeader', fontName='Helvetica-Bold', fontSize=9,
        textColor=white, leading=12
    ))
    styles.add(ParagraphStyle(
        'TableCell', fontName='Helvetica', fontSize=9,
        textColor=BODY, leading=12
    ))
    styles.add(ParagraphStyle(
        'TableCellBold', fontName='Helvetica-Bold', fontSize=9,
        textColor=BODY, leading=12
    ))
    return styles

def blue_line():
    return HRFlowable(width='30%', thickness=2, color=BLUE, spaceAfter=10, spaceBefore=4, hAlign='LEFT')

def gray_line():
    return HRFlowable(width='100%', thickness=0.5, color=MID_GRAY, spaceAfter=8, spaceBefore=8)

def bullet(text, styles):
    return Paragraph(f'<bullet>&bull;</bullet> {text}', styles['Bullet2'])

def make_table(headers, rows, col_widths=None):
    """Create a styled table"""
    style_h = ParagraphStyle('th', fontName='Helvetica-Bold', fontSize=9, textColor=white, leading=12)
    style_c = ParagraphStyle('tc', fontName='Helvetica', fontSize=9, textColor=BODY, leading=12)
    style_cb = ParagraphStyle('tcb', fontName='Helvetica-Bold', fontSize=9, textColor=BODY, leading=12)

    data = [[Paragraph(h, style_h) for h in headers]]
    for i, row in enumerate(rows):
        is_bold = isinstance(row, tuple) and row[-1] == 'BOLD'
        cells = row[:-1] if is_bold else row
        s = style_cb if is_bold else style_c
        data.append([Paragraph(str(c), s) for c in cells])

    if col_widths is None:
        col_widths = [160 / len(headers)] * len(headers)

    t = Table(data, colWidths=[w * mm for w in col_widths], repeatRows=1)

    table_style = [
        ('BACKGROUND', (0, 0), (-1, 0), BLUE),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 6),
        ('TOPPADDING', (0, 0), (-1, 0), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, LIGHT_GRAY]),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('TOPPADDING', (0, 1), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 4),
        ('LINEBELOW', (0, 0), (-1, 0), 1, BLUE),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]

    # Bold last row if flagged
    for i, row in enumerate(rows):
        if isinstance(row, tuple) and row[-1] == 'BOLD':
            table_style.append(('BACKGROUND', (0, i+1), (-1, i+1), LIGHT_BLUE))
            table_style.append(('FONTNAME', (0, i+1), (-1, i+1), 'Helvetica-Bold'))

    t.setStyle(TableStyle(table_style))
    return t


def add_header_footer(canvas, doc):
    """Add header and footer to non-cover pages"""
    if doc.page > 1:
        canvas.saveState()
        canvas.setFont('Helvetica-Oblique', 8)
        canvas.setFillColor(MID_GRAY)
        canvas.drawCentredString(WIDTH / 2, HEIGHT - 15 * mm,
                                  'ASSEMBLE AI  |  Product Brief  |  Confidential')
        canvas.setStrokeColor(HexColor('#cccccc'))
        canvas.setLineWidth(0.3)
        canvas.line(20 * mm, HEIGHT - 18 * mm, WIDTH - 20 * mm, HEIGHT - 18 * mm)

    canvas.saveState()
    canvas.setFont('Helvetica-Oblique', 8)
    canvas.setFillColor(MID_GRAY)
    canvas.drawCentredString(WIDTH / 2, 12 * mm, f'Page {doc.page}')
    canvas.restoreState()


class DiagramFlowable(Flowable):
    """Custom flowable that draws the architecture diagram"""
    def __init__(self, width=170*mm, height=200*mm):
        Flowable.__init__(self)
        self.width = width
        self.height = height

    def draw(self):
        c = self.canv
        W = self.width
        H = self.height

        # Helper functions
        def rounded_box(x, y, w, h, fill_color, border_color=None, radius=4):
            c.saveState()
            c.setFillColor(fill_color)
            if border_color:
                c.setStrokeColor(border_color)
                c.setLineWidth(1.2)
            else:
                c.setStrokeColor(fill_color)
                c.setLineWidth(0)
            c.roundRect(x, y, w, h, radius, fill=1, stroke=1 if border_color else 0)
            c.restoreState()

        def label(x, y, text, size=9, bold=False, color=BODY, align='center'):
            c.saveState()
            font = 'Helvetica-Bold' if bold else 'Helvetica'
            c.setFont(font, size)
            c.setFillColor(color)
            if align == 'center':
                c.drawCentredString(x, y, text)
            elif align == 'left':
                c.drawString(x, y, text)
            c.restoreState()

        def arrow_down(x, y1, y2, color=MID_GRAY):
            c.saveState()
            c.setStrokeColor(color)
            c.setFillColor(color)
            c.setLineWidth(1.5)
            c.line(x, y1, x, y2 + 6)
            # arrowhead
            p = c.beginPath()
            p.moveTo(x - 4, y2 + 6)
            p.lineTo(x, y2)
            p.lineTo(x + 4, y2 + 6)
            p.close()
            c.drawPath(p, fill=1, stroke=0)
            c.restoreState()

        def arrow_right(x1, x2, y, color=MID_GRAY):
            c.saveState()
            c.setStrokeColor(color)
            c.setFillColor(color)
            c.setLineWidth(1.5)
            c.line(x1, y, x2 - 6, y)
            p = c.beginPath()
            p.moveTo(x2 - 6, y - 4)
            p.lineTo(x2, y)
            p.lineTo(x2 - 6, y + 4)
            p.close()
            c.drawPath(p, fill=1, stroke=0)
            c.restoreState()

        def arrow_left(x1, x2, y, color=MID_GRAY):
            c.saveState()
            c.setStrokeColor(color)
            c.setFillColor(color)
            c.setLineWidth(1.5)
            c.line(x1, y, x2 + 6, y)
            p = c.beginPath()
            p.moveTo(x2 + 6, y - 4)
            p.lineTo(x2, y)
            p.lineTo(x2 + 6, y + 4)
            p.close()
            c.drawPath(p, fill=1, stroke=0)
            c.restoreState()

        def double_arrow_h(x1, x2, y, color=MID_GRAY):
            arrow_right(x1, x2, y + 2, color)
            arrow_left(x1, x2, y - 2, color)

        # Layout constants
        col1 = 10 * mm   # Tenant side
        col2 = 55 * mm   # Channels
        col3 = 105 * mm  # AI Engine center
        col4 = 155 * mm  # PM side (unused, will use col3 area)
        box_w = 40 * mm
        box_h = 14 * mm
        small_box_w = 35 * mm
        small_box_h = 11 * mm

        # ---- TITLE ----
        top = H - 8 * mm
        label(W / 2, top, 'ASSEMBLE AI \u2014 System Architecture', size=12, bold=True, color=DARK)

        # ============ LEFT SIDE: TENANT ============
        tenant_y = H - 45 * mm
        rounded_box(col1, tenant_y, box_w, box_h * 1.2, HexColor('#f0fdf4'), HexColor('#22c55e'))
        label(col1 + box_w / 2, tenant_y + box_h * 0.8, 'TENANT', size=10, bold=True, color=HexColor('#15803d'))
        label(col1 + box_w / 2, tenant_y + 4, '(Renter / Debtor)', size=7, color=MID_GRAY)

        # ============ CENTER: COMMUNICATION CHANNELS ============
        channels_top = H - 30 * mm

        # WhatsApp
        wa_y = channels_top - 10 * mm
        rounded_box(col2, wa_y, small_box_w, small_box_h, HexColor('#dcfce7'), HexColor('#22c55e'))
        label(col2 + small_box_w / 2, wa_y + 3.5, 'WhatsApp', size=9, bold=True, color=HexColor('#15803d'))

        # Voice
        voice_y = wa_y - 16 * mm
        rounded_box(col2, voice_y, small_box_w, small_box_h, HexColor('#dbeafe'), HexColor('#2563eb'))
        label(col2 + small_box_w / 2, voice_y + 3.5, 'Voice Calls', size=9, bold=True, color=HexColor('#1d4ed8'))

        # SMS/Email
        sms_y = voice_y - 16 * mm
        rounded_box(col2, sms_y, small_box_w, small_box_h, HexColor('#fef3c7'), HexColor('#f59e0b'))
        label(col2 + small_box_w / 2, sms_y + 3.5, 'SMS / Email', size=9, bold=True, color=HexColor('#b45309'))

        # Arrows: Tenant <-> Channels
        mid_tenant_x = col1 + box_w
        ch_left = col2
        tenant_mid_y = tenant_y + box_h * 0.6

        # Connect tenant to each channel
        double_arrow_h(mid_tenant_x + 2, ch_left - 2, wa_y + small_box_h / 2, HexColor('#22c55e'))
        double_arrow_h(mid_tenant_x + 2, ch_left - 2, voice_y + small_box_h / 2, BLUE)
        double_arrow_h(mid_tenant_x + 2, ch_left - 2, sms_y + small_box_h / 2, HexColor('#f59e0b'))

        # ============ CENTER: AI ENGINE (big box) ============
        engine_x = col3 - 5 * mm
        engine_w = 55 * mm
        engine_h = 65 * mm
        engine_y = H - 90 * mm

        # Main engine box
        rounded_box(engine_x, engine_y, engine_w, engine_h, HexColor('#eef2ff'), BLUE, radius=6)
        label(engine_x + engine_w / 2, engine_y + engine_h - 8, 'ASSEMBLE AI ENGINE', size=10, bold=True, color=BLUE)

        # Sub-components inside engine
        sub_x = engine_x + 4 * mm
        sub_w = engine_w - 8 * mm
        sub_h = 9 * mm

        # Collections AI
        sy1 = engine_y + engine_h - 20 * mm
        rounded_box(sub_x, sy1, sub_w, sub_h, white, HexColor('#c7d2fe'))
        label(sub_x + sub_w / 2, sy1 + 2.5, 'Collections AI', size=8, bold=True, color=DARK)

        # Leasing AI
        sy2 = sy1 - 13 * mm
        rounded_box(sub_x, sy2, sub_w, sub_h, white, HexColor('#c7d2fe'))
        label(sub_x + sub_w / 2, sy2 + 2.5, 'Leasing AI', size=8, bold=True, color=DARK)

        # Maintenance AI
        sy3 = sy2 - 13 * mm
        rounded_box(sub_x, sy3, sub_w, sub_h, white, HexColor('#c7d2fe'))
        label(sub_x + sub_w / 2, sy3 + 2.5, 'Maintenance AI', size=8, bold=True, color=DARK)

        # Compliance
        sy4 = sy3 - 13 * mm
        rounded_box(sub_x, sy4, sub_w, sub_h, white, HexColor('#c7d2fe'))
        label(sub_x + sub_w / 2, sy4 + 2.5, 'Compliance Engine', size=8, bold=True, color=DARK)

        # Arrows: Channels -> Engine
        ch_right = col2 + small_box_w
        eng_left = engine_x

        double_arrow_h(ch_right + 2, eng_left - 2, wa_y + small_box_h / 2, BLUE)
        double_arrow_h(ch_right + 2, eng_left - 2, voice_y + small_box_h / 2, BLUE)
        double_arrow_h(ch_right + 2, eng_left - 2, sms_y + small_box_h / 2, BLUE)

        # ============ RIGHT SIDE: PROPERTY MANAGER ============
        pm_y = H - 45 * mm
        pm_x = engine_x + engine_w + 15 * mm

        # Check if PM box fits, adjust if needed
        if pm_x + box_w > W:
            pm_x = W - box_w - 5 * mm

        rounded_box(pm_x, pm_y, box_w, box_h * 1.2, HexColor('#eff6ff'), BLUE)
        label(pm_x + box_w / 2, pm_y + box_h * 0.8, 'PROPERTY', size=10, bold=True, color=BLUE)
        label(pm_x + box_w / 2, pm_y + 4, 'MANAGER', size=10, bold=True, color=BLUE)

        # Dashboard box under PM
        dash_y = pm_y - 22 * mm
        rounded_box(pm_x, dash_y, box_w, box_h, HexColor('#f5f7fa'), MID_GRAY)
        label(pm_x + box_w / 2, dash_y + 5, 'Dashboard', size=9, bold=True, color=DARK)
        label(pm_x + box_w / 2, dash_y - 3, '(Web App)', size=7, color=MID_GRAY)

        # Arrow: Engine -> PM Dashboard
        arrow_right(engine_x + engine_w + 2, pm_x - 2, engine_y + engine_h / 2 + 10, BLUE)
        # Label on arrow
        mid_arrow_x = (engine_x + engine_w + pm_x) / 2
        label(mid_arrow_x, engine_y + engine_h / 2 + 16, 'Real-time', size=7, color=MID_GRAY)
        label(mid_arrow_x, engine_y + engine_h / 2 + 9, 'updates', size=7, color=MID_GRAY)

        # Arrow PM -> Engine (instructions)
        arrow_left(engine_x + engine_w + 2, pm_x - 2, engine_y + engine_h / 2 - 5, MID_GRAY)

        # ============ BOTTOM ROW: INTEGRATIONS ============
        bottom_y = engine_y - 30 * mm
        integrations = [
            ('DebiCheck', 'Payments', HexColor('#dcfce7'), HexColor('#22c55e')),
            ('TPN', 'Screening', HexColor('#fef3c7'), HexColor('#f59e0b')),
            ('Property24', 'Leads', HexColor('#fee2e2'), HexColor('#ef4444')),
            ('PayProp', 'Reconciliation', HexColor('#e0e7ff'), HexColor('#6366f1')),
        ]

        int_w = 32 * mm
        int_h = 16 * mm
        total_int_w = len(integrations) * int_w + (len(integrations) - 1) * 5 * mm
        int_start_x = (W - total_int_w) / 2

        label(W / 2, bottom_y + int_h + 8, 'INTEGRATIONS', size=9, bold=True, color=MID_GRAY)

        for i, (name, desc, fill, border) in enumerate(integrations):
            ix = int_start_x + i * (int_w + 5 * mm)
            rounded_box(ix, bottom_y, int_w, int_h, fill, border)
            label(ix + int_w / 2, bottom_y + int_h / 2 + 1, name, size=8, bold=True, color=DARK)
            label(ix + int_w / 2, bottom_y + 2, desc, size=6, color=MID_GRAY)

            # Arrow up from integration to engine
            arrow_top = engine_y
            arrow_down(ix + int_w / 2, arrow_top, bottom_y + int_h + 2, border)

        # ============ BOTTOM: COMPLIANCE BAR ============
        comp_y = bottom_y - 22 * mm
        comp_w = W - 10 * mm
        comp_x = 5 * mm
        rounded_box(comp_x, comp_y, comp_w, 14 * mm, HexColor('#fef2f2'), HexColor('#fca5a5'), radius=4)
        label(comp_x + comp_w / 2, comp_y + 6, 'POPIA  |  PIE Act  |  Rental Housing Act  |  Debt Collectors Act  |  Consumer Protection Act', size=8, bold=True, color=HexColor('#991b1b'))
        label(comp_x + comp_w / 2, comp_y + 0.5, 'Full legal compliance layer across all interactions', size=7, color=HexColor('#b91c1c'))


def build():
    output_path = '/home/user/Munipal-/docs/Assemble_AI_Product_Brief.pdf'

    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        leftMargin=20 * mm,
        rightMargin=20 * mm,
        topMargin=25 * mm,
        bottomMargin=20 * mm,
    )

    s = create_styles()
    story = []

    # ==========================================
    # COVER PAGE
    # ==========================================
    story.append(Spacer(1, 45 * mm))
    story.append(Paragraph('ASSEMBLE AI', s['CoverTitle']))
    story.append(Paragraph('AI-Powered Rent Collections & Leasing for Africa', s['CoverSub']))
    story.append(Spacer(1, 4 * mm))
    story.append(blue_line())
    story.append(Spacer(1, 10 * mm))
    story.append(Paragraph('Product Brief  |  March 2026', s['CoverMeta']))
    story.append(Paragraph('Confidential', s['CoverMeta']))
    story.append(Spacer(1, 70 * mm))
    story.append(Paragraph('Prepared by Aiployee (Pty) Ltd  |  Reg: 2026/196375/07', s['CoverMeta']))
    story.append(PageBreak())

    # ==========================================
    # THE PROBLEM
    # ==========================================
    story.append(Paragraph('The Problem', s['SectionTitle']))
    story.append(blue_line())

    story.append(Paragraph(
        'South Africa has 4.5 million renting households generating over R480 billion in annual rental flows. '
        'At any given time, approximately 390,000 of these households are in arrears, representing R2.7 billion '
        'in outstanding unpaid rent.',
        s['BodyText2']
    ))

    story.append(Paragraph(
        'The current collections process is manual, slow, and expensive. Property managers chase arrears through '
        'phone calls, letters, and attorneys. The average time from first missed payment to resolution is 6 to 18 '
        'months. Eviction through South African courts under the PIE Act is heavily regulated and can take over a year.',
        s['BodyText2']
    ))

    story.append(Paragraph(
        'Meanwhile, South Africa\u2019s infrastructure challenges compound the problem. Load shedding disrupts call '
        'centres and payment systems. Manual EFT payments have failure rates of 30\u201340%. Property managers lose '
        'thousands of rands per unit in the gap between a tenant stopping payment and eventual resolution.',
        s['BodyText2']
    ))

    story.append(Spacer(1, 4 * mm))
    story.append(Paragraph('Key Market Data', s['SubTitle']))

    story.append(Paragraph('<b>Tenants in arrears nationally:</b> 17% (~390,000 households)', s['BodyText2']))
    story.append(Paragraph('<b>Outstanding unpaid rent:</b> R2.7 billion+', s['BodyText2']))
    story.append(Paragraph('<b>Average resolution time:</b> 6\u201318 months', s['BodyText2']))
    story.append(Paragraph('<b>Manual EFT payment failure rate:</b> 30\u201340%', s['BodyText2']))
    story.append(Paragraph('<b>AI-powered collections tools in SA:</b> Zero', s['BodyText2']))

    story.append(Spacer(1, 4 * mm))
    story.append(Paragraph(
        'In the United States, EliseAI has built a $2.2 billion company solving this exact problem with AI-powered '
        'collections and leasing. They reduce delinquencies by 52% per quarter and operate across 10% of all US '
        'apartments. Their collections product is their fastest-growing line.',
        s['BodyText2']
    ))
    story.append(Paragraph(
        'No equivalent product exists in South Africa or anywhere on the African continent. '
        'The tools, the market, and the timing are aligned for Assemble AI to own this space.',
        s['BodyText2']
    ))

    story.append(PageBreak())

    # ==========================================
    # THE PRODUCT
    # ==========================================
    story.append(Paragraph('The Product', s['SectionTitle']))
    story.append(blue_line())

    story.append(Paragraph(
        'Assemble AI is an AI-powered collections and leasing platform purpose-built for the South African '
        'rental market. It uses conversational AI across WhatsApp, voice calls, SMS, and email to automate '
        'the entire tenant communication lifecycle \u2014 from first rental enquiry to rent collection to arrears recovery.',
        s['BodyText2']
    ))

    story.append(Paragraph(
        'The platform is built on three product layers, launched sequentially to maximise focus and speed to market.',
        s['BodyText2']
    ))

    # LAYER 1
    story.append(Paragraph('Product 1: Collections AI (Launch Product)', s['SubTitle']))
    story.append(Paragraph(
        'An AI agent that contacts tenants in arrears via WhatsApp (primary channel), voice calls (escalation), '
        'and SMS/email (fallback). The agent operates 24/7, communicates in English, Zulu, Sotho, and Afrikaans, '
        'and handles the full collections workflow:',
        s['BodyText2']
    ))

    story.append(bullet('Sends structured, POPIA-compliant payment reminders on an escalating cadence', s))
    story.append(bullet('Negotiates payment plans conversationally, adapting tone based on payment history and arrears depth', s))
    story.append(bullet('Sends secure payment links via WhatsApp for immediate settlement', s))
    story.append(bullet('Integrates with DebiCheck for authenticated debit orders (90\u201395% collection success vs 60\u201370% for manual EFT)', s))
    story.append(bullet('Tracks every interaction for legal compliance including letter of demand prerequisites and PIE Act timelines', s))
    story.append(bullet('Generates legal-ready documentation when escalation to attorneys is required', s))
    story.append(bullet('Provides a real-time dashboard showing who owes what, contact history, payment commitments, and recovery rates', s))

    story.append(Spacer(1, 3 * mm))
    story.append(Paragraph('Why WhatsApp First:', s['BoldBody']))
    story.append(Paragraph(
        'WhatsApp has 95%+ penetration in South Africa. It is the de facto communication channel for property '
        'managers and tenants alike. Unlike phone calls, WhatsApp is resilient to load shedding (async delivery), '
        'creates a persistent audit trail for POPIA compliance, and allows tenants to respond at their convenience. '
        'Voice calls serve as escalation for non-responders.',
        s['BodyText2']
    ))

    # LAYER 2
    story.append(Paragraph('Product 2: Leasing AI (Month 6+)', s['SubTitle']))
    story.append(Paragraph(
        'An AI agent that responds to every rental enquiry from Property24, Private Property, and direct channels '
        'within 60 seconds via WhatsApp. Speed of first response is the single biggest predictor of leasing conversion, '
        'yet most South African agents respond in hours or days.',
        s['BodyText2']
    ))

    story.append(bullet('Instant lead response across all channels (WhatsApp, SMS, email, webchat)', s))
    story.append(bullet('Pre-screens tenants with automated income verification and TPN credit check integration', s))
    story.append(bullet('Schedules property viewings and sends automated confirmations and reminders', s))
    story.append(bullet('Processes rental applications digitally, end to end', s))
    story.append(bullet('Generates POPIA-compliant lease agreements', s))
    story.append(bullet('Manages move-in inspection workflows and deposit collection', s))
    story.append(bullet('Supports 50+ written languages for international tenants', s))

    story.append(Spacer(1, 2 * mm))
    story.append(Paragraph(
        '<b>Expected Impact:</b> Based on EliseAI benchmarks: 125% more prospects converted to viewings, '
        '30% increase in lead-to-lease conversion rate, 15-day acceleration in renewal notices.',
        s['BodyText2']
    ))

    story.append(PageBreak())

    # LAYER 3
    story.append(Paragraph('Product 3: Property Operations Platform (Month 12+)', s['SubTitle']))
    story.append(Paragraph(
        'A full property management operations layer that unifies collections, leasing, maintenance, and reporting '
        'into a single AI-powered platform:',
        s['BodyText2']
    ))

    story.append(bullet('Maintenance AI: tenants submit requests via WhatsApp, AI categorises and prioritises, dispatches contractors, tracks resolution', s))
    story.append(bullet('Tenant portal: payment history, lease documents, maintenance tracking, all accessible via WhatsApp or web', s))
    story.append(bullet('Owner reporting: revenue dashboards, vacancy tracking, arrears analysis, maintenance cost reporting', s))
    story.append(bullet('Municipal account verification: automated checking of council bills against official tariffs (unique SA capability)', s))
    story.append(bullet('AI-generated dashboards: property managers describe what they need in plain English, the platform builds it', s))

    story.append(PageBreak())

    # ==========================================
    # ARCHITECTURE DIAGRAM
    # ==========================================
    story.append(Paragraph('How It All Fits Together', s['SectionTitle']))
    story.append(blue_line())
    story.append(Paragraph(
        'The diagram below shows how tenants, communication channels, the AI engine, integrations, '
        'and property managers connect within the Assemble AI platform.',
        s['BodyText2']
    ))
    story.append(Spacer(1, 4 * mm))
    story.append(DiagramFlowable(width=170*mm, height=175*mm))

    story.append(PageBreak())

    # ==========================================
    # HOW IT WORKS
    # ==========================================
    story.append(Paragraph('How It Works', s['SectionTitle']))
    story.append(blue_line())

    story.append(Paragraph('The Collections AI Flow', s['SubTitle']))

    flow_style = ParagraphStyle('Flow', fontName='Courier', fontSize=8, textColor=BODY, leading=11, leftIndent=4)

    flow_lines = [
        'Property manager uploads tenant/arrears data (CSV, API, or PMS integration)',
        '                            |',
        '                            v',
        'Assemble AI segments tenants by arrears depth, payment history, risk',
        '                            |',
        '                            v',
        'AI agent initiates contact via WhatsApp (primary channel)',
        '  - Personalised message in tenant\'s preferred language',
        '  - Empathetic, professional tone (not threatening)',
        '  - Secure payment link included',
        '                            |',
        '            +---------------+---------------+',
        '            |               |               |',
        '       Tenant pays     Tenant engages   No response',
        '       immediately     in conversation      |',
        '            |               |               v',
        '       Mark resolved   Negotiate        Escalate to',
        '       Update PM       payment plan     voice call',
        '       dashboard       Set up DebiCheck (AI or human)',
        '                       debit order          |',
        '                            |          Still no response',
        '                       Monitor &            |',
        '                       auto-collect    Generate letter',
        '                                       of demand',
        '                                       Flag for legal',
    ]

    for line in flow_lines:
        story.append(Paragraph(line.replace(' ', '&nbsp;'), flow_style))

    story.append(Spacer(1, 6 * mm))
    story.append(Paragraph('Compliance Built In', s['SubTitle']))
    story.append(Paragraph('Every aspect of the product is designed around South African legal requirements:', s['BodyText2']))

    story.append(bullet('POPIA: explicit consent management, data minimisation, right to access, appointed Information Officer', s))
    story.append(bullet('Rental Housing Act (2025 amendments): written lease enforcement, deposit tracking, habitability standards', s))
    story.append(bullet('PIE Act: automated timeline tracking ensures proper notice periods before any legal escalation', s))
    story.append(bullet('Debt Collectors Act: if third-party collection is triggered, ensures registration compliance', s))
    story.append(bullet('Consumer Protection Act: fair terms, proper notice periods, no harassment', s))
    story.append(bullet('Full audit trail: every message, call, and payment tracked and exportable for legal proceedings', s))

    story.append(PageBreak())

    # ==========================================
    # WHAT WE HAVE
    # ==========================================
    story.append(Paragraph('What We Already Have', s['SectionTitle']))
    story.append(blue_line())

    story.append(Paragraph(
        'Assemble AI is not starting from zero. The founding team brings production-grade technology, '
        'live customer relationships, and deep domain expertise.',
        s['BodyText2']
    ))

    story.append(Paragraph('Production Voice AI Platform', s['SubTitle']))
    story.append(Paragraph(
        'We operate a production-grade voice AI platform capable of handling inbound and outbound calls '
        'in multiple South African languages. The platform includes telephony integration, speech-to-text, '
        'LLM-powered conversation, and text-to-speech. It is live, billing, and handling real calls today '
        'for property management clients in Johannesburg.',
        s['BodyText2']
    ))

    story.append(Paragraph('Municipal Bill Verification Engine', s['SubTitle']))
    story.append(Paragraph(
        'We have built and deployed a verification engine that parses City of Johannesburg municipal bills, '
        'extracts line items, and verifies every charge against official tariff schedules with full legal '
        'citations. This capability is unique in South Africa and directly relevant to property management '
        'operations where municipal accounts are a major cost centre and source of billing errors.',
        s['BodyText2']
    ))

    story.append(Paragraph('Technical Infrastructure', s['SubTitle']))
    story.append(Paragraph(
        'The existing platform runs on Next.js, Supabase (PostgreSQL), Prisma ORM, and Tailwind CSS, '
        'with Anthropic (Claude) and OpenAI integrations for AI capabilities. Authentication, file storage, '
        'and deployment infrastructure are all production-ready.',
        s['BodyText2']
    ))

    story.append(Paragraph('Live Property Management Clients', s['SubTitle']))
    story.append(Paragraph(
        'We have active, paying property management clients in Johannesburg representing tens of thousands '
        'of residential units. These relationships provide an immediate pilot base for Collections AI '
        'and a direct path to rapid scale.',
        s['BodyText2']
    ))

    story.append(Paragraph('Active Sales Pipeline', s['SubTitle']))
    story.append(Paragraph(
        'We have contracts in progress with two of the largest property management companies in South Africa, '
        'with presentations scheduled across estate agencies, telecoms, insurance, and BPO verticals. '
        'The sales infrastructure and relationships are in place.',
        s['BodyText2']
    ))

    story.append(PageBreak())

    # ==========================================
    # MARKET OPPORTUNITY
    # ==========================================
    story.append(Paragraph('Market Opportunity', s['SectionTitle']))
    story.append(blue_line())

    story.append(Paragraph('Total Addressable Market', s['SubTitle']))

    story.append(make_table(
        ['Metric', 'Value'],
        [
            ['Renting households in SA', '4.5 million'],
            ['Annual rental flows', 'R480 billion+'],
            ['Property management services market', 'R3.6 billion (growing 9.4% CAGR)'],
            ['Average national rent', 'R9,218/month'],
            ['Average PM fee', '10% of monthly rent'],
            ['National vacancy rate', '4.4\u20135.5% (historic lows)'],
        ],
        col_widths=[50, 50]
    ))

    story.append(Spacer(1, 6 * mm))
    story.append(Paragraph('The Collections Opportunity', s['SubTitle']))

    story.append(make_table(
        ['Metric', 'Value'],
        [
            ['Tenants in arrears', '~390,000 households (17%)'],
            ['Outstanding unpaid rent', 'R2.7 billion+'],
            ['Avg cost per non-paying tenant', 'R28,000\u2013R56,000 (lost rent + legal)'],
            ['DebiCheck success rate', '90\u201395% (vs 60\u201370% manual EFT)'],
            ['AI collections tools in SA', 'None'],
        ],
        col_widths=[50, 50]
    ))

    story.append(Spacer(1, 6 * mm))
    story.append(Paragraph('Competitive Landscape', s['SubTitle']))

    story.append(Paragraph(
        'The South African PropTech market is fragmented across point solutions:',
        s['BodyText2']
    ))

    story.append(make_table(
        ['Player', 'What They Do', 'What They Don\'t Do'],
        [
            ['PayProp', 'Rent collection & reconciliation', 'AI conversations, collections automation'],
            ['TPN', 'Tenant screening & credit checks', 'Collections, leasing automation'],
            ['WeConnectU', 'PM software & compliance', 'AI agents, voice, WhatsApp automation'],
            ['Prop Data', 'Agency websites & marketing', 'Operations, collections, tenant comms'],
            ['Preferental', 'AI tenant screening', 'Collections, leasing, maintenance'],
            ('Assemble AI', 'AI collections + leasing + ops', 'This is the whitespace we fill', 'BOLD'),
        ],
        col_widths=[25, 40, 40]
    ))

    story.append(Spacer(1, 4 * mm))
    story.append(Paragraph(
        'No South African player offers AI-powered conversational collections or leasing. '
        'The global leader, EliseAI ($2.2B valuation, $100M+ ARR), does not operate in Africa. '
        'We are building the EliseAI for this continent.',
        s['BodyText2']
    ))

    story.append(PageBreak())

    # ==========================================
    # REVENUE MODEL
    # ==========================================
    story.append(Paragraph('Revenue Model', s['SectionTitle']))
    story.append(blue_line())

    story.append(Paragraph('Per-Unit SaaS Pricing', s['SubTitle']))
    story.append(Paragraph(
        'Assemble AI charges property managers a monthly fee per unit under management. '
        'This aligns our revenue with their portfolio size and scales naturally as they grow.',
        s['BodyText2']
    ))

    story.append(make_table(
        ['Product', 'Price/Unit/Month', 'Avg PM (500 units)', 'Large PM (10,000 units)'],
        [
            ['Collections AI', 'R15\u2013R30', 'R7,500\u2013R15,000', 'R150,000\u2013R300,000'],
            ['Leasing AI', 'R10\u2013R20', 'R5,000\u2013R10,000', 'R100,000\u2013R200,000'],
            ('Full Platform', 'R30\u2013R50', 'R15,000\u2013R25,000', 'R300,000\u2013R500,000', 'BOLD'),
        ],
        col_widths=[30, 28, 28, 30]
    ))

    story.append(Spacer(1, 4 * mm))
    story.append(Paragraph('Alternative: Performance-Based Pricing', s['SubTitle']))
    story.append(Paragraph(
        'For collections specifically, we can offer a performance-based model where Assemble AI '
        'takes 10\u201315% of recovered arrears. This is zero-risk for the property manager and aligns '
        'incentives perfectly. On R2.7 billion in outstanding arrears with a 50% recovery rate, '
        'this represents a R168 million annual revenue opportunity at 12.5% commission.',
        s['BodyText2']
    ))

    story.append(Spacer(1, 4 * mm))
    story.append(Paragraph('Revenue Projections', s['SubTitle']))

    story.append(make_table(
        ['Milestone', 'Units', 'Avg Price', 'MRR', 'ARR'],
        [
            ['Month 3: First pilots', '10,000', 'R20', 'R200K', 'R2.4M'],
            ['Month 6: Early traction', '30,000', 'R20', 'R600K', 'R7.2M'],
            ['Month 12: Market leader', '80,000', 'R25', 'R2M', 'R24M'],
            ['Month 24: Scale', '200,000', 'R30', 'R6M', 'R72M'],
            ('Month 36: Dominance', '450,000', 'R30', 'R13.5M', 'R162M', 'BOLD'),
        ],
        col_widths=[30, 18, 18, 18, 18]
    ))

    story.append(Spacer(1, 4 * mm))
    story.append(Paragraph(
        'These projections are conservative. EliseAI reached $100M+ ARR serving 10% of the US apartment market. '
        'South Africa\u2019s formal rental market is smaller but the per-unit economics are strong, and Africa '
        'expansion (Nigeria, Kenya, Ghana) opens a significantly larger addressable market.',
        s['BodyText2']
    ))

    story.append(PageBreak())

    # ==========================================
    # HOW WE BUILD IT
    # ==========================================
    story.append(Paragraph('How We Build It', s['SectionTitle']))
    story.append(blue_line())

    story.append(Paragraph('Phase 1: Collections AI (Months 1\u20133)', s['SubTitle']))
    story.append(Paragraph('Objective: Prove that AI collections works in the SA market', s['BoldBody']))
    story.append(bullet('Build WhatsApp collections agent using existing voice AI platform and WhatsApp Business API', s))
    story.append(bullet('Integrate with DebiCheck for authenticated payment collection', s))
    story.append(bullet('Build property manager dashboard (arrears overview, contact history, recovery tracking)', s))
    story.append(bullet('Deploy with existing property management clients as pilot', s))
    story.append(bullet('Target: 25\u201350% reduction in arrears within 30 days of deployment', s))
    story.append(bullet('Target: 10,000 units under management by end of Month 3', s))

    story.append(Paragraph('Phase 2: Leasing AI + Scale (Months 4\u20139)', s['SubTitle']))
    story.append(Paragraph('Objective: Add leasing automation, expand customer base', s['BoldBody']))
    story.append(bullet('Build Property24 and Private Property lead integration (instant response via WhatsApp)', s))
    story.append(bullet('Add tenant screening workflow (TPN integration, income verification)', s))
    story.append(bullet('Digital lease generation and e-signature', s))
    story.append(bullet('Expand to top 20 property management companies nationally', s))
    story.append(bullet('Target: 50,000 units under management', s))

    story.append(Paragraph('Phase 3: Full Platform (Months 10\u201318)', s['SubTitle']))
    story.append(Paragraph('Objective: Become the operating system for SA property management', s['BoldBody']))
    story.append(bullet('Maintenance AI (WhatsApp-based request submission, contractor dispatch, tracking)', s))
    story.append(bullet('Tenant portal (payment history, documents, communication hub)', s))
    story.append(bullet('Owner reporting and analytics', s))
    story.append(bullet('Municipal account verification (leveraging existing Munipal engine)', s))
    story.append(bullet('AI-generated custom dashboards (property managers describe needs in plain English)', s))
    story.append(bullet('Target: 150,000+ units, R3M+ MRR', s))

    story.append(Paragraph('Phase 4: Africa Expansion (Months 18\u201336)', s['SubTitle']))
    story.append(Paragraph('Objective: Replicate the model across Africa\u2019s largest rental markets', s['BoldBody']))
    story.append(bullet('Nigeria (Lagos: 21M people, massive rental market, similar collections challenges)', s))
    story.append(bullet('Kenya (Nairobi: fast-growing PropTech ecosystem, M-Pesa payment integration)', s))
    story.append(bullet('Ghana, Tanzania, Rwanda as follow-on markets', s))
    story.append(bullet('Target: 450,000+ units across the continent', s))

    story.append(PageBreak())

    # ==========================================
    # WHY WE WIN
    # ==========================================
    story.append(Paragraph('Why We Win', s['SectionTitle']))
    story.append(blue_line())

    story.append(Paragraph('1. WhatsApp + Voice + AI in One Platform', s['SubTitle']))
    story.append(Paragraph(
        'No competitor in South Africa combines conversational AI across WhatsApp, voice, SMS, and email. '
        'We do not need to build the voice layer from scratch \u2014 it is live and billing today. Adding WhatsApp '
        'as the primary collections channel creates a multi-channel system that no point solution can match.',
        s['BodyText2']
    ))

    story.append(Paragraph('2. Built for South Africa', s['SubTitle']))
    story.append(Paragraph(
        'Multilingual AI (English, Zulu, Sotho, Afrikaans). POPIA-compliant by design. PIE Act timeline '
        'tracking built in. DebiCheck integration for reliable collections. Load shedding resilient (WhatsApp '
        'is async). Municipal bill verification included. This is not a US product adapted for SA \u2014 it is '
        'built from the ground up for this market.',
        s['BodyText2']
    ))

    story.append(Paragraph('3. Distribution Advantage', s['SubTitle']))
    story.append(Paragraph(
        'We are already inside the building. We have paying property management clients and active contracts '
        'with the largest property management companies in South Africa. Collections AI is a natural upsell '
        'to the same buyer, in the same budget line, with a clear and measurable ROI.',
        s['BodyText2']
    ))

    story.append(Paragraph('4. Data Flywheel', s['SubTitle']))
    story.append(Paragraph(
        'Every tenant interaction improves the model. We learn which message templates, timing patterns, '
        'escalation cadences, and payment plan structures work best for South African tenants. This data '
        'compounds over time and creates an advantage that new entrants cannot replicate without years of '
        'operational history.',
        s['BodyText2']
    ))

    story.append(Paragraph('5. Regulatory Moat', s['SubTitle']))
    story.append(Paragraph(
        'South Africa\u2019s regulatory environment (PIE Act, Rental Housing Act, POPIA, Debt Collectors Act, '
        'Consumer Protection Act) is complex and specific. A US or European product cannot simply be dropped '
        'into this market. Our compliance-first approach is a barrier to entry for international players '
        'and a differentiator against local competitors who lack the technical capability.',
        s['BodyText2']
    ))

    story.append(Paragraph('6. Timing', s['SubTitle']))
    story.append(Paragraph(
        'The 2025 Rental Housing Act amendments have just taken effect, creating new compliance requirements '
        'that property managers need help with. AI capabilities have reached the point where conversational '
        'agents can handle nuanced, multilingual tenant interactions reliably. WhatsApp Business API is '
        'mature and widely adopted. The infrastructure moment and the regulatory moment have converged.',
        s['BodyText2']
    ))

    story.append(PageBreak())

    # ==========================================
    # WHAT WE NEED
    # ==========================================
    story.append(Paragraph('What We Need', s['SectionTitle']))
    story.append(blue_line())

    story.append(Paragraph(
        'Assemble AI has the technology, the domain expertise, and the customer relationships to execute. '
        'To move from current state to market-leading position, we need:',
        s['BodyText2']
    ))

    story.append(Paragraph('Technical Build (Months 1\u20133)', s['SubTitle']))
    story.append(bullet('WhatsApp Business API integration and conversational AI agent for collections', s))
    story.append(bullet('DebiCheck / payment gateway integration', s))
    story.append(bullet('Property manager dashboard and reporting', s))
    story.append(bullet('PMS data integration (CSV import, API connectors)', s))

    story.append(Paragraph('Go-To-Market (Months 1\u20136)', s['SubTitle']))
    story.append(bullet('Pilot deployment with existing property management clients (tens of thousands of units)', s))
    story.append(bullet('Case study development with real arrears recovery data', s))
    story.append(bullet('Outbound sales to top 20 property management companies in South Africa', s))
    story.append(bullet('Strategic partnerships with PayProp (payments), TPN (screening), and Property24 (leads)', s))

    story.append(Paragraph('Team', s['SubTitle']))
    story.append(bullet('Product engineer: full-stack developer with AI/ML experience', s))
    story.append(bullet('Sales lead: PropTech or SaaS sales experience in SA market', s))
    story.append(bullet('Compliance advisor: SA property law and data protection expertise', s))

    story.append(Spacer(1, 15 * mm))
    story.append(gray_line())
    story.append(Spacer(1, 4 * mm))

    story.append(Paragraph('The opportunity is R2.7 billion in unpaid rent.', s['ClosingBold']))
    story.append(Paragraph('The technology exists today.', s['ClosingBold']))
    story.append(Paragraph('The customers are already ours.', s['ClosingBold']))
    story.append(Spacer(1, 4 * mm))
    story.append(Paragraph('Let\u2019s build the EliseAI for Africa.', s['ClosingBlue']))

    # Build PDF
    doc.build(story, onFirstPage=add_header_footer, onLaterPages=add_header_footer)
    print(f'PDF generated: {output_path}')


if __name__ == '__main__':
    build()
