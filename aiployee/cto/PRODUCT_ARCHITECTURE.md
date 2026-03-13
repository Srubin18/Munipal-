# Aiployee Product Architecture
## Jobix.ai Voice AI + Paperclip AI Teams — Technical Design

---

## 1. PRODUCT OVERVIEW

```
┌─────────────────────────────────────────────────────┐
│                   CUSTOMER VIEW                      │
│                                                      │
│   aiployee.co.za Dashboard                          │
│   ┌──────────┐  ┌──────────┐  ┌──────────────────┐ │
│   │ Voice AI  │  │ AI Team  │  │ Analytics &      │ │
│   │ Console   │  │ Tasks    │  │ Billing          │ │
│   └──────────┘  └──────────┘  └──────────────────┘ │
└─────────────────────────────────────────────────────┘
           │                │              │
           ▼                ▼              ▼
┌──────────────┐  ┌──────────────┐  ┌─────────────┐
│  Jobix.ai    │  │  Paperclip   │  │ Aiployee    │
│  Voice API   │  │  Server      │  │ Backend     │
│              │  │  (AI Teams)  │  │ (Auth/Bill) │
└──────────────┘  └──────────────┘  └─────────────┘
```

---

## 2. CUSTOMER ONBOARDING FLOW

```
Step 1: Sign Up
  → aiployee.co.za/signup
  → Email, business name, industry selection
  → "I'm a..." [Dentist] [Law Firm] [Estate Agent] [Call Centre] [Other]

Step 2: Pick Plan
  → Starter (R999) / Pro (R2,499) / Enterprise (R4,999)
  → Payment via PayStack (SA-friendly, supports EFT & card)

Step 3: Voice AI Setup (Automatic)
  → Jobix.ai API: provision voice agent
  → Pre-trained for selected industry
  → Customer gets a phone number (or port existing number)
  → Test call: "Call your new AI receptionist now!"

Step 4: AI Team Setup (Pro/Enterprise only)
  → Paperclip auto-creates company with pre-built template
  → Industry-specific team deployed:
    - Dentist: Appointment Manager, Patient Follow-up, Billing Assistant
    - Law Firm: Intake Coordinator, Document Prep, Calendar Manager
    - Estate Agent: Lead Qualifier, Viewing Scheduler, Listing Manager

Step 5: Dashboard Access
  → Customer logs into aiployee.co.za
  → Sees unified view: calls handled, tasks completed, team activity
```

---

## 3. SYSTEM ARCHITECTURE

### 3.1 Frontend — aiployee.co.za
- **Framework**: Next.js 14 (App Router)
- **UI**: Tailwind CSS + shadcn/ui
- **Auth**: Supabase Auth (email/password, Google, magic link)
- **Hosting**: Vercel

### 3.2 Backend — Aiployee API
- **Runtime**: Node.js / Next.js API routes
- **Database**: PostgreSQL (Supabase)
- **Payments**: PayStack API (SA cards, EFT, debit orders)
- **Key tables**:
  ```
  customers (id, email, business_name, industry, plan, status)
  subscriptions (id, customer_id, plan, amount_cents, paystack_ref)
  voice_agents (id, customer_id, jobix_agent_id, phone_number, config)
  ai_teams (id, customer_id, paperclip_company_id, template)
  call_logs (id, voice_agent_id, timestamp, duration, summary)
  ```

### 3.3 Jobix.ai Integration
- **API calls**:
  - `POST /agents` — provision new voice agent
  - `PATCH /agents/:id/config` — update voice behaviour
  - `GET /agents/:id/calls` — fetch call history
  - `POST /agents/:id/phone-numbers` — assign phone number
- **Webhook**: Jobix sends call events to Aiployee
  ```json
  {
    "event": "call.completed",
    "agent_id": "...",
    "caller": "+27823456789",
    "duration_seconds": 120,
    "summary": "Patient called to book cleaning. Booked for Tuesday 10am.",
    "action_items": ["Send confirmation SMS", "Block calendar slot"]
  }
  ```

### 3.4 Paperclip Integration (AI Teams)
- **API calls**:
  - `POST /api/companies` — create customer's AI company
  - `POST /api/companies/:id/agents` — deploy team members
  - `POST /api/companies/:id/goals` — set objectives
  - `GET /api/companies/:id/agents` — monitor team status
- **Voice → Task bridge**: When Jobix voice agent completes a call:
  1. Webhook hits Aiployee backend
  2. Backend creates task in Paperclip for relevant AI team member
  3. AI team member picks up task on next heartbeat
  ```
  Voice call: "Book cleaning for Mrs Naidoo, Tuesday 10am"
    → Paperclip task: "Send confirmation SMS to Mrs Naidoo for cleaning Tuesday 10am"
    → AI Admin agent executes task
  ```

---

## 4. INDUSTRY TEMPLATES

### Dental Practice Template
```yaml
company_name: "{business_name} AI Team"
agents:
  - name: "Appointment Manager"
    role: "admin"
    capabilities: "Manages appointment calendar, sends reminders, handles rescheduling"
  - name: "Patient Communicator"
    role: "support"
    capabilities: "Sends appointment confirmations, follow-up messages, recall reminders"
  - name: "Billing Assistant"
    role: "finance"
    capabilities: "Generates invoices, tracks payments, sends payment reminders"
voice_config:
  greeting: "Good day, thank you for calling {business_name}. How can I help you?"
  capabilities:
    - book_appointment
    - check_availability
    - cancel_appointment
    - transfer_to_dentist (urgent)
  hours: "24/7"
  language: "English, Afrikaans"
```

### Law Firm Template
```yaml
company_name: "{business_name} AI Team"
agents:
  - name: "Client Intake Coordinator"
    role: "admin"
    capabilities: "Captures new client details, categorises matter type, schedules consultations"
  - name: "Calendar Manager"
    role: "admin"
    capabilities: "Manages attorney calendars, court dates, meeting scheduling"
  - name: "Document Prep Assistant"
    role: "researcher"
    capabilities: "Prepares standard documents, engagement letters, basic correspondence"
voice_config:
  greeting: "Good day, {business_name} Attorneys. How may I direct your call?"
  capabilities:
    - new_client_intake
    - schedule_consultation
    - check_case_status
    - transfer_to_attorney (urgent)
  compliance: "Never provide legal advice. Always state 'I can schedule a consultation with one of our attorneys.'"
```

### Estate Agent Template
```yaml
company_name: "{business_name} AI Team"
agents:
  - name: "Lead Qualifier"
    role: "sales"
    capabilities: "Qualifies buyer leads, captures requirements (budget, area, bedrooms), scores urgency"
  - name: "Viewing Scheduler"
    role: "admin"
    capabilities: "Schedules property viewings, sends directions, confirms attendance"
  - name: "Listing Manager"
    role: "marketing"
    capabilities: "Writes property descriptions, manages listing updates, responds to property enquiries"
voice_config:
  greeting: "Hi, thank you for calling {business_name}. Are you looking to buy, sell, or rent?"
  capabilities:
    - qualify_buyer
    - schedule_viewing
    - property_enquiry
    - transfer_to_agent
```

---

## 5. TECH STACK SUMMARY

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | Next.js 14 + Tailwind | Fast, SEO-friendly, React ecosystem |
| Auth | Supabase Auth | Free tier, social login, SA-friendly |
| Database | PostgreSQL (Supabase) | Reliable, free tier, real-time |
| Payments | PayStack | SA market leader, EFT support, ZAR |
| Voice AI | Jobix.ai API | Core product, affiliate relationship |
| AI Teams | Paperclip (self-hosted) | Open source, customisable, multi-tenant |
| AI Models | Claude (Anthropic) | Best reasoning, handles SA context |
| Hosting | Vercel (frontend) + VPS (Paperclip) | Cost-effective, scales |
| SMS/WhatsApp | Twilio or Africa's Talking | SA numbers, WhatsApp Business API |

---

## 6. MVP DEVELOPMENT ROADMAP

### Phase 1: Landing Page + Manual Onboarding (Week 1-2)
- [ ] aiployee.co.za landing page with pricing
- [ ] Sign-up form → Google Sheet / Supabase
- [ ] Manual Jobix voice agent setup per customer
- [ ] Manual Paperclip team setup per customer
- **Revenue can start here** — onboard first 5 customers manually

### Phase 2: Self-Service Onboarding (Week 3-6)
- [ ] PayStack payment integration
- [ ] Automated Jobix.ai agent provisioning
- [ ] Automated Paperclip company + team creation
- [ ] Customer dashboard (calls, tasks, team status)

### Phase 3: Full Platform (Month 2-3)
- [ ] Voice → Task bridge (Jobix webhooks → Paperclip tasks)
- [ ] Industry template system
- [ ] Analytics dashboard (call volume, resolution rate, cost savings)
- [ ] WhatsApp integration

### Phase 4: Scale (Month 3-6)
- [ ] Multi-language voice (Zulu, Afrikaans, Sotho)
- [ ] White-label option for IT partners
- [ ] Mobile app (React Native)
- [ ] API for enterprise integrations

---

*Generated by Aiployee CTO Agent | Paperclip Orchestration*
