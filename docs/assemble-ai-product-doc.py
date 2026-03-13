#!/usr/bin/env python3
"""Generate Assemble AI Product Document PDF"""

from fpdf import FPDF
import os

class ProductPDF(FPDF):
    def __init__(self):
        super().__init__()
        self.set_auto_page_break(auto=True, margin=25)

    def header(self):
        if self.page_no() > 1:
            self.set_font('Helvetica', 'I', 8)
            self.set_text_color(130, 130, 130)
            self.cell(0, 10, 'ASSEMBLE AI  |  Product Brief  |  Confidential', align='C')
            self.ln(5)
            # Gray line
            self.set_draw_color(200, 200, 200)
            self.line(20, self.get_y(), 190, self.get_y())
            self.ln(8)

    def footer(self):
        self.set_y(-20)
        self.set_font('Helvetica', 'I', 8)
        self.set_text_color(150, 150, 150)
        self.cell(0, 10, f'Page {self.page_no()}/{{nb}}', align='C')

    def section_title(self, title):
        self.ln(4)
        self.set_font('Helvetica', 'B', 16)
        self.set_text_color(20, 20, 20)
        self.cell(0, 10, title, new_x="LMARGIN", new_y="NEXT")
        # Blue accent line
        self.set_draw_color(37, 99, 235)
        self.set_line_width(0.8)
        self.line(20, self.get_y(), 70, self.get_y())
        self.set_line_width(0.2)
        self.ln(6)

    def sub_title(self, title):
        self.ln(2)
        self.set_font('Helvetica', 'B', 12)
        self.set_text_color(37, 99, 235)
        self.cell(0, 8, title, new_x="LMARGIN", new_y="NEXT")
        self.ln(2)

    def body_text(self, text):
        self.set_font('Helvetica', '', 10)
        self.set_text_color(50, 50, 50)
        self.multi_cell(0, 5.5, text)
        self.ln(2)

    def bold_text(self, text):
        self.set_font('Helvetica', 'B', 10)
        self.set_text_color(50, 50, 50)
        self.multi_cell(0, 5.5, text)
        self.ln(1)

    def bullet(self, text, indent=25):
        x = self.get_x()
        self.set_font('Helvetica', '', 10)
        self.set_text_color(37, 99, 235)
        self.cell(indent - 20, 5.5, chr(8226))
        self.set_text_color(50, 50, 50)
        self.multi_cell(0, 5.5, text)
        self.ln(1)

    def stat_block(self, label, value):
        self.set_font('Helvetica', '', 9)
        self.set_text_color(100, 100, 100)
        self.cell(0, 4.5, label, new_x="LMARGIN", new_y="NEXT")
        self.set_font('Helvetica', 'B', 18)
        self.set_text_color(37, 99, 235)
        self.cell(0, 10, value, new_x="LMARGIN", new_y="NEXT")
        self.ln(2)

    def table_row(self, cells, widths, bold=False, header=False):
        h = 7
        if header:
            self.set_font('Helvetica', 'B', 9)
            self.set_fill_color(37, 99, 235)
            self.set_text_color(255, 255, 255)
        elif bold:
            self.set_font('Helvetica', 'B', 9)
            self.set_text_color(50, 50, 50)
            self.set_fill_color(245, 247, 250)
        else:
            self.set_font('Helvetica', '', 9)
            self.set_text_color(50, 50, 50)
            self.set_fill_color(255, 255, 255)

        for i, (cell, w) in enumerate(zip(cells, widths)):
            self.cell(w, h, cell, border=0, fill=True)
        self.ln(h)


def build_pdf():
    pdf = ProductPDF()
    pdf.alias_nb_pages()

    # ==========================================
    # COVER PAGE
    # ==========================================
    pdf.add_page()
    pdf.ln(50)

    # Title
    pdf.set_font('Helvetica', 'B', 36)
    pdf.set_text_color(20, 20, 20)
    pdf.cell(0, 15, 'ASSEMBLE AI', new_x="LMARGIN", new_y="NEXT")

    # Subtitle
    pdf.set_font('Helvetica', '', 16)
    pdf.set_text_color(37, 99, 235)
    pdf.cell(0, 10, 'AI-Powered Rent Collections & Leasing for Africa', new_x="LMARGIN", new_y="NEXT")

    pdf.ln(8)

    # Blue accent line
    pdf.set_draw_color(37, 99, 235)
    pdf.set_line_width(1)
    pdf.line(20, pdf.get_y(), 120, pdf.get_y())
    pdf.set_line_width(0.2)

    pdf.ln(15)

    pdf.set_font('Helvetica', '', 11)
    pdf.set_text_color(100, 100, 100)
    pdf.cell(0, 7, 'Product Brief  |  March 2026', new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 7, 'Confidential', new_x="LMARGIN", new_y="NEXT")

    pdf.ln(60)

    pdf.set_font('Helvetica', 'I', 9)
    pdf.set_text_color(150, 150, 150)
    pdf.cell(0, 6, 'Prepared by Aiployee (Pty) Ltd  |  Reg: 2026/196375/07', new_x="LMARGIN", new_y="NEXT")

    # ==========================================
    # PAGE 2: THE PROBLEM
    # ==========================================
    pdf.add_page()
    pdf.section_title('The Problem')

    pdf.body_text(
        'South Africa has 4.5 million renting households generating over R480 billion in annual rental flows. '
        'At any given time, approximately 390,000 of these households are in arrears, representing R2.7 billion '
        'in outstanding unpaid rent.'
    )

    pdf.body_text(
        'The current collections process is manual, slow, and expensive. Property managers chase arrears through '
        'phone calls, letters, and attorneys. The average time from first missed payment to resolution is 6 to 18 '
        'months. Eviction through South African courts under the PIE Act is heavily regulated and can take over a year.'
    )

    pdf.body_text(
        'Meanwhile, South Africa\'s infrastructure challenges compound the problem. Load shedding disrupts call '
        'centres and payment systems. Manual EFT payments have failure rates of 30-40%. Property managers lose '
        'thousands of rands per unit in the gap between a tenant stopping payment and eventual resolution.'
    )

    pdf.ln(4)
    pdf.sub_title('Key Market Data')

    # Stats in a visual layout
    pdf.bold_text('Tenants in arrears nationally: 17% (~390,000 households)')
    pdf.bold_text('Outstanding unpaid rent: R2.7 billion+')
    pdf.bold_text('Average resolution time: 6-18 months')
    pdf.bold_text('Manual EFT payment failure rate: 30-40%')
    pdf.bold_text('AI-powered collections tools in SA: Zero')

    pdf.ln(4)
    pdf.body_text(
        'In the United States, EliseAI has built a $2.2 billion company solving this exact problem with AI-powered '
        'collections and leasing. They reduce delinquencies by 52% per quarter and operate across 10% of all US '
        'apartments. Their collections product is their fastest-growing line.'
    )

    pdf.body_text(
        'No equivalent product exists in South Africa or anywhere on the African continent. '
        'The tools, the market, and the timing are aligned for Assemble AI to own this space.'
    )

    # ==========================================
    # PAGE 3: THE PRODUCT
    # ==========================================
    pdf.add_page()
    pdf.section_title('The Product')

    pdf.body_text(
        'Assemble AI is an AI-powered collections and leasing platform purpose-built for the South African '
        'rental market. It uses conversational AI across WhatsApp, voice calls, SMS, and email to automate '
        'the entire tenant communication lifecycle, from first rental enquiry to rent collection to arrears recovery.'
    )

    pdf.body_text(
        'The platform is built on three product layers, launched sequentially to maximise focus and speed to market.'
    )

    pdf.ln(4)

    # --- LAYER 1 ---
    pdf.sub_title('Product 1: Collections AI (Launch Product)')

    pdf.body_text(
        'An AI agent that contacts tenants in arrears via WhatsApp (primary channel), voice calls (escalation), '
        'and SMS/email (fallback). The agent operates 24/7, communicates in English, Zulu, Sotho, and Afrikaans, '
        'and handles the full collections workflow:'
    )

    pdf.bullet('Sends structured, POPIA-compliant payment reminders on an escalating cadence')
    pdf.bullet('Negotiates payment plans conversationally, adapting tone based on payment history and arrears depth')
    pdf.bullet('Sends secure payment links via WhatsApp for immediate settlement')
    pdf.bullet('Integrates with DebiCheck for authenticated debit orders (90-95% collection success vs 60-70% for manual EFT)')
    pdf.bullet('Tracks every interaction for legal compliance, including letter of demand prerequisites and PIE Act timelines')
    pdf.bullet('Generates legal-ready documentation when escalation to attorneys is required')
    pdf.bullet('Provides a real-time dashboard showing who owes what, contact history, payment commitments, and recovery rates')

    pdf.ln(2)
    pdf.bold_text('Why WhatsApp First:')
    pdf.body_text(
        'WhatsApp has 95%+ penetration in South Africa. It is the de facto communication channel for property '
        'managers and tenants alike. Unlike phone calls, WhatsApp is resilient to load shedding (async delivery), '
        'creates a persistent audit trail for POPIA compliance, and allows tenants to respond at their convenience. '
        'Voice calls serve as escalation for non-responders.'
    )

    # --- LAYER 2 ---
    pdf.add_page()
    pdf.sub_title('Product 2: Leasing AI (Month 6+)')

    pdf.body_text(
        'An AI agent that responds to every rental enquiry from Property24, Private Property, and direct channels '
        'within 60 seconds via WhatsApp. Speed of first response is the single biggest predictor of leasing conversion, '
        'yet most South African agents respond in hours or days.'
    )

    pdf.bullet('Instant lead response across all channels (WhatsApp, SMS, email, webchat)')
    pdf.bullet('Pre-screens tenants with automated income verification and TPN credit check integration')
    pdf.bullet('Schedules property viewings and sends automated confirmations and reminders')
    pdf.bullet('Processes rental applications digitally, end to end')
    pdf.bullet('Generates POPIA-compliant lease agreements')
    pdf.bullet('Manages move-in inspection workflows and deposit collection')
    pdf.bullet('Supports 50+ written languages for international tenants')

    pdf.ln(2)
    pdf.bold_text('Expected Impact:')
    pdf.body_text(
        'Based on EliseAI benchmarks: 125% more prospects converted to viewings, 30% increase in lead-to-lease '
        'conversion rate, 15-day acceleration in renewal notices.'
    )

    # --- LAYER 3 ---
    pdf.ln(2)
    pdf.sub_title('Product 3: Property Operations Platform (Month 12+)')

    pdf.body_text(
        'A full property management operations layer that unifies collections, leasing, maintenance, and reporting '
        'into a single AI-powered platform. This layer includes:'
    )

    pdf.bullet('Maintenance AI: tenants submit requests via WhatsApp, AI categorises and prioritises, dispatches contractors, tracks resolution')
    pdf.bullet('Tenant portal: payment history, lease documents, maintenance tracking, all accessible via WhatsApp or web')
    pdf.bullet('Owner reporting: revenue dashboards, vacancy tracking, arrears analysis, maintenance cost reporting')
    pdf.bullet('Municipal account verification: automated checking of council bills against official tariffs (unique SA capability already built)')
    pdf.bullet('AI-generated dashboards: property managers describe what they need in plain English, the platform builds it')

    # ==========================================
    # PAGE: HOW IT WORKS
    # ==========================================
    pdf.add_page()
    pdf.section_title('How It Works')

    pdf.sub_title('The Collections AI Flow')

    pdf.ln(2)
    pdf.set_font('Courier', '', 9)
    pdf.set_text_color(50, 50, 50)

    flow_text = """  Property manager uploads tenant/arrears data (CSV, API, or PMS integration)
                              |
                              v
  Assemble AI engine segments tenants by arrears depth, payment history, risk
                              |
                              v
  AI agent initiates contact via WhatsApp (primary channel)
    - Personalised message in tenant's preferred language
    - Empathetic, professional tone (not threatening)
    - Secure payment link included
                              |
              +---------------+---------------+
              |               |               |
         Tenant pays     Tenant engages   No response
         immediately     in conversation      |
              |               |               v
         Mark resolved   Negotiate        Escalate to
         Update PM       payment plan     voice call
         dashboard       Set up           (AI or human)
                         DebiCheck            |
                         debit order     Still no response
                              |               |
                         Monitor &        Generate letter
                         auto-collect     of demand
                                          Flag for legal"""

    for line in flow_text.split('\n'):
        pdf.cell(0, 4, line, new_x="LMARGIN", new_y="NEXT")

    pdf.ln(6)

    pdf.set_font('Helvetica', '', 10)
    pdf.sub_title('Compliance Built In')

    pdf.body_text(
        'Every aspect of the product is designed around South African legal requirements:'
    )

    pdf.bullet('POPIA: explicit consent management, data minimisation, right to access, appointed Information Officer')
    pdf.bullet('Rental Housing Act (2025 amendments): written lease enforcement, deposit tracking, habitability standards')
    pdf.bullet('PIE Act: automated timeline tracking ensures proper notice periods before any legal escalation')
    pdf.bullet('Debt Collectors Act: if third-party collection is triggered, ensures registration compliance')
    pdf.bullet('Consumer Protection Act: fair terms, proper notice periods, no harassment')
    pdf.bullet('Full audit trail: every message, call, and payment tracked and exportable for legal proceedings')

    # ==========================================
    # PAGE: WHAT WE HAVE
    # ==========================================
    pdf.add_page()
    pdf.section_title('What We Already Have')

    pdf.body_text(
        'Assemble AI is not starting from zero. The founding team brings production-grade technology, '
        'live customer relationships, and deep domain expertise to the table.'
    )

    pdf.ln(2)
    pdf.sub_title('Production Voice AI Platform')
    pdf.body_text(
        'We operate a production-grade voice AI platform capable of handling inbound and outbound calls '
        'in multiple South African languages. The platform includes telephony integration, speech-to-text, '
        'LLM-powered conversation, and text-to-speech. It is live, billing, and handling real calls today '
        'for property management clients in Johannesburg.'
    )

    pdf.sub_title('Municipal Bill Verification Engine')
    pdf.body_text(
        'We have built and deployed a verification engine that parses City of Johannesburg municipal bills, '
        'extracts line items, and verifies every charge against official tariff schedules with full legal '
        'citations. This capability is unique in South Africa and directly relevant to property management '
        'operations where municipal accounts are a major cost centre and source of errors.'
    )

    pdf.sub_title('Technical Infrastructure')
    pdf.body_text(
        'The existing platform runs on Next.js, Supabase (PostgreSQL), Prisma ORM, and Tailwind CSS, '
        'with Anthropic (Claude) and OpenAI integrations. Authentication, file storage, and deployment '
        'infrastructure are all production-ready on Vercel and Supabase.'
    )

    pdf.sub_title('Live Property Management Clients')
    pdf.body_text(
        'We have active, paying property management clients in Johannesburg representing tens of thousands '
        'of residential units. These relationships provide an immediate pilot base for Collections AI '
        'and a direct path to rapid scale.'
    )

    pdf.sub_title('Active Sales Pipeline')
    pdf.body_text(
        'We have contracts sent to two of the largest property management companies in South Africa, '
        'with presentations scheduled across estate agencies, telecoms, insurance, and BPO verticals. '
        'The sales infrastructure and relationships are in place.'
    )

    # ==========================================
    # PAGE: MARKET OPPORTUNITY
    # ==========================================
    pdf.add_page()
    pdf.section_title('Market Opportunity')

    pdf.sub_title('Total Addressable Market')

    w = [85, 85]
    pdf.table_row(['Metric', 'Value'], w, header=True)
    pdf.table_row(['Renting households in SA', '4.5 million'], w)
    pdf.table_row(['Annual rental flows', 'R480 billion+'], w)
    pdf.table_row(['Property management services market', 'R3.6 billion (growing 9.4% CAGR)'], w)
    pdf.table_row(['Average national rent', 'R9,218/month'], w)
    pdf.table_row(['Average PM fee', '10% of monthly rent'], w)
    pdf.table_row(['National vacancy rate', '4.4-5.5% (historic lows)'], w)

    pdf.ln(6)
    pdf.sub_title('The Collections Opportunity')

    w2 = [85, 85]
    pdf.table_row(['Metric', 'Value'], w2, header=True)
    pdf.table_row(['Tenants in arrears', '~390,000 households (17%)'], w2)
    pdf.table_row(['Outstanding unpaid rent', 'R2.7 billion+'], w2)
    pdf.table_row(['Average cost per non-paying tenant', 'R28,000-R56,000 (lost rent + legal)'], w2)
    pdf.table_row(['DebiCheck success rate', '90-95% (vs 60-70% manual EFT)'], w2)
    pdf.table_row(['AI collections tools in SA', 'None'], w2)

    pdf.ln(6)
    pdf.sub_title('Competitive Landscape')

    pdf.body_text(
        'The South African PropTech market is fragmented across point solutions:'
    )

    w3 = [40, 60, 70]
    pdf.table_row(['Player', 'What They Do', 'What They Don\'t Do'], w3, header=True)
    pdf.table_row(['PayProp', 'Rent collection & reconciliation', 'AI conversations, collections automation'], w3)
    pdf.table_row(['TPN', 'Tenant screening & credit checks', 'Collections, leasing automation'], w3)
    pdf.table_row(['WeConnectU', 'PM software & compliance', 'AI agents, voice, WhatsApp automation'], w3)
    pdf.table_row(['Prop Data', 'Agency websites & marketing', 'Operations, collections, tenant comms'], w3)
    pdf.table_row(['Preferental', 'AI tenant screening', 'Collections, leasing, maintenance'], w3)
    pdf.table_row(['Assemble AI', 'AI collections + leasing + ops', 'This is the whitespace we fill'], w3, bold=True)

    pdf.ln(4)
    pdf.body_text(
        'No South African player offers AI-powered conversational collections or leasing. '
        'The global leader, EliseAI ($2.2B valuation, $100M+ ARR), does not operate in Africa. '
        'We are building the EliseAI for this continent.'
    )

    # ==========================================
    # PAGE: REVENUE MODEL
    # ==========================================
    pdf.add_page()
    pdf.section_title('Revenue Model')

    pdf.sub_title('Per-Unit SaaS Pricing')

    pdf.body_text(
        'Assemble AI charges property managers a monthly fee per unit under management. '
        'This aligns our revenue with their portfolio size and scales naturally as they grow.'
    )

    pdf.ln(2)
    w4 = [50, 40, 40, 40]
    pdf.table_row(['Product', 'Price/Unit/Month', 'Avg PM (500 units)', 'Large PM (10,000 units)'], w4, header=True)
    pdf.table_row(['Collections AI', 'R15-R30', 'R7,500-R15,000', 'R150,000-R300,000'], w4)
    pdf.table_row(['Leasing AI', 'R10-R20', 'R5,000-R10,000', 'R100,000-R200,000'], w4)
    pdf.table_row(['Full Platform', 'R30-R50', 'R15,000-R25,000', 'R300,000-R500,000'], w4)

    pdf.ln(4)
    pdf.sub_title('Alternative: Performance-Based Pricing')

    pdf.body_text(
        'For collections specifically, we can offer a performance-based model where Assemble AI '
        'takes 10-15% of recovered arrears. This is zero-risk for the property manager and aligns '
        'incentives perfectly. On R2.7 billion in outstanding arrears with a 50% recovery rate, '
        'this represents a R168 million annual revenue opportunity at 12.5% commission.'
    )

    pdf.ln(4)
    pdf.sub_title('Revenue Projections')

    w5 = [45, 35, 35, 25, 30]
    pdf.table_row(['Milestone', 'Units', 'Avg Price', 'MRR', 'ARR'], w5, header=True)
    pdf.table_row(['Month 3: First pilots', '10,000', 'R20', 'R200K', 'R2.4M'], w5)
    pdf.table_row(['Month 6: Early traction', '30,000', 'R20', 'R600K', 'R7.2M'], w5)
    pdf.table_row(['Month 12: Market leader', '80,000', 'R25', 'R2M', 'R24M'], w5)
    pdf.table_row(['Month 24: Scale', '200,000', 'R30', 'R6M', 'R72M'], w5)
    pdf.table_row(['Month 36: Dominance', '450,000', 'R30', 'R13.5M', 'R162M'], w5, bold=True)

    pdf.ln(4)
    pdf.body_text(
        'These projections are conservative. EliseAI reached $100M+ ARR serving 10% of the US apartment market. '
        'South Africa\'s formal rental market is smaller but the per-unit economics are strong, and Africa '
        'expansion (Nigeria, Kenya, Ghana) opens a significantly larger addressable market.'
    )

    # ==========================================
    # PAGE: BUILD PLAN
    # ==========================================
    pdf.add_page()
    pdf.section_title('How We Build It')

    pdf.sub_title('Phase 1: Collections AI (Months 1-3)')
    pdf.bold_text('Objective: Prove that AI collections works in the SA market')
    pdf.bullet('Build WhatsApp collections agent using existing voice AI platform and WhatsApp Business API')
    pdf.bullet('Integrate with DebiCheck for authenticated payment collection')
    pdf.bullet('Build property manager dashboard (arrears overview, contact history, recovery tracking)')
    pdf.bullet('Deploy with existing property management clients as pilot')
    pdf.bullet('Target: 25-50% reduction in arrears within 30 days of deployment')
    pdf.bullet('Target: 10,000 units under management by end of Month 3')

    pdf.ln(2)
    pdf.sub_title('Phase 2: Leasing AI + Scale (Months 4-9)')
    pdf.bold_text('Objective: Add leasing automation, expand customer base')
    pdf.bullet('Build Property24 and Private Property lead integration (instant response via WhatsApp)')
    pdf.bullet('Add tenant screening workflow (TPN integration, income verification)')
    pdf.bullet('Digital lease generation and e-signature')
    pdf.bullet('Expand to top 20 property management companies nationally')
    pdf.bullet('Target: 50,000 units under management')

    pdf.ln(2)
    pdf.sub_title('Phase 3: Full Platform (Months 10-18)')
    pdf.bold_text('Objective: Become the operating system for SA property management')
    pdf.bullet('Maintenance AI (WhatsApp-based request submission, contractor dispatch, tracking)')
    pdf.bullet('Tenant portal (payment history, documents, communication hub)')
    pdf.bullet('Owner reporting and analytics')
    pdf.bullet('Municipal account verification (built-in, leveraging Munipal engine)')
    pdf.bullet('AI-generated custom dashboards (property managers describe needs in plain English)')
    pdf.bullet('Target: 150,000+ units, R3M+ MRR')

    pdf.ln(2)
    pdf.sub_title('Phase 4: Africa Expansion (Months 18-36)')
    pdf.bold_text('Objective: Replicate the model across Africa\'s largest rental markets')
    pdf.bullet('Nigeria (Lagos: 21M people, massive rental market, similar collections challenges)')
    pdf.bullet('Kenya (Nairobi: fast-growing PropTech ecosystem, M-Pesa payment integration)')
    pdf.bullet('Ghana, Tanzania, Rwanda as follow-on markets')
    pdf.bullet('Target: 450,000+ units across the continent')

    # ==========================================
    # PAGE: WHY WE WIN
    # ==========================================
    pdf.add_page()
    pdf.section_title('Why We Win')

    pdf.sub_title('1. WhatsApp + Voice + AI in One Platform')
    pdf.body_text(
        'No competitor in South Africa combines conversational AI across WhatsApp, voice, SMS, and email. '
        'We do not need to build the voice layer from scratch. It is live and billing today. Adding WhatsApp '
        'as the primary collections channel creates a multi-channel system that no point solution can match.'
    )

    pdf.sub_title('2. Built for South Africa')
    pdf.body_text(
        'Multilingual AI (English, Zulu, Sotho, Afrikaans). POPIA-compliant by design. PIE Act timeline '
        'tracking built in. DebiCheck integration for reliable collections. Load shedding resilient (WhatsApp '
        'is async). Municipal bill verification included. This is not a US product adapted for SA. It is '
        'built from the ground up for this market.'
    )

    pdf.sub_title('3. Distribution Advantage')
    pdf.body_text(
        'We are already inside the building. We have paying property management clients and active contracts '
        'with the largest property management companies in South Africa. Collections AI is a natural upsell '
        'to the same buyer, in the same budget line, with a clear and measurable ROI.'
    )

    pdf.sub_title('4. Data Flywheel')
    pdf.body_text(
        'Every tenant interaction improves the model. We will learn which message templates, timing patterns, '
        'escalation cadences, and payment plan structures work best for South African tenants. This data '
        'compounds over time and creates an advantage that new entrants cannot replicate without years of '
        'operational history.'
    )

    pdf.sub_title('5. Regulatory Moat')
    pdf.body_text(
        'South Africa\'s regulatory environment (PIE Act, Rental Housing Act, POPIA, Debt Collectors Act, '
        'Consumer Protection Act) is complex and specific. A US or European product cannot simply be dropped '
        'into this market. Our compliance-first approach is a barrier to entry for international players '
        'and a differentiator against local competitors who lack the technical capability.'
    )

    pdf.sub_title('6. Timing')
    pdf.body_text(
        'The 2025 Rental Housing Act amendments have just taken effect, creating new compliance requirements '
        'that property managers need help with. AI capabilities have reached the point where conversational '
        'agents can handle nuanced, multilingual tenant interactions reliably. WhatsApp Business API is '
        'mature and widely adopted. The infrastructure moment and the regulatory moment have converged.'
    )

    # ==========================================
    # PAGE: THE ASK
    # ==========================================
    pdf.add_page()
    pdf.section_title('What We Need')

    pdf.body_text(
        'Assemble AI has the technology, the domain expertise, and the customer relationships to execute on '
        'this vision. To move from current state to market-leading position, we need:'
    )

    pdf.ln(4)

    pdf.sub_title('Technical Build (Months 1-3)')
    pdf.bullet('WhatsApp Business API integration and conversational AI agent for collections')
    pdf.bullet('DebiCheck / payment gateway integration')
    pdf.bullet('Property manager dashboard and reporting')
    pdf.bullet('PMS data integration (CSV import, API connectors)')

    pdf.ln(2)
    pdf.sub_title('Go-To-Market (Months 1-6)')
    pdf.bullet('Pilot deployment with existing property management clients (tens of thousands of units)')
    pdf.bullet('Case study development with real arrears recovery data')
    pdf.bullet('Outbound sales to top 20 property management companies in South Africa')
    pdf.bullet('Strategic partnerships with PayProp (payments), TPN (screening), and Property24 (leads)')

    pdf.ln(2)
    pdf.sub_title('Team')
    pdf.bullet('Product engineer: full-stack developer with AI/ML experience')
    pdf.bullet('Sales lead: PropTech or SaaS sales experience in SA market')
    pdf.bullet('Compliance advisor: SA property law and data protection expertise')

    pdf.ln(10)

    # Closing line
    pdf.set_draw_color(37, 99, 235)
    pdf.set_line_width(0.8)
    pdf.line(20, pdf.get_y(), 190, pdf.get_y())
    pdf.set_line_width(0.2)
    pdf.ln(8)

    pdf.set_font('Helvetica', 'B', 14)
    pdf.set_text_color(20, 20, 20)
    pdf.cell(0, 8, 'The opportunity is R2.7 billion in unpaid rent.', new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 8, 'The technology exists today.', new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 8, 'The customers are already ours.', new_x="LMARGIN", new_y="NEXT")

    pdf.ln(6)
    pdf.set_font('Helvetica', '', 11)
    pdf.set_text_color(37, 99, 235)
    pdf.cell(0, 8, 'Let\'s build the EliseAI for Africa.', new_x="LMARGIN", new_y="NEXT")

    # ==========================================
    # SAVE
    # ==========================================
    output_path = '/home/user/Munipal-/docs/Assemble_AI_Product_Brief.pdf'
    pdf.output(output_path)
    print(f'PDF saved to: {output_path}')
    return output_path


if __name__ == '__main__':
    build_pdf()
