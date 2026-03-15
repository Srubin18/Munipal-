# EduTutor - AI Voice Tutoring Platform

## Overview
AI-powered voice tutoring platform for South African students (Grade 8-12). A voice AI tutor guides students through CAPS and IEB curriculum content on-screen, with persistent memory to personalize teaching style per student.

**Pricing:** R100/hour via prepaid bundles (1hr, 5hr, 10hr)

## Architecture

### Tech Stack
- **Frontend:** Next.js 14 (App Router) + Tailwind CSS + shadcn/ui
- **Voice AI:** OpenAI Realtime API (WebSocket-based, handles both speech-to-text and text-to-speech with low latency)
- **LLM Backend:** Claude API (Anthropic) for curriculum knowledge, question generation, and tutoring logic
- **Database:** Supabase (PostgreSQL) + Prisma ORM
- **Auth:** Supabase Auth (email/password + Google)
- **Payments:** PayStack (SA-native, supports ZAR, debit orders)
- **File Storage:** Supabase Storage (past papers, worksheets)

### Project Structure (Separate from Munipal)
```
edututor/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/             # Login, register, onboarding
│   │   ├── (dashboard)/        # Parent dashboard
│   │   ├── (student)/          # Student learning interface
│   │   ├── (session)/          # Live tutoring session
│   │   └── api/                # API routes
│   ├── components/             # UI components
│   ├── lib/
│   │   ├── voice/              # OpenAI Realtime API integration
│   │   ├── tutor/              # Tutoring logic, prompt engineering
│   │   ├── curriculum/         # CAPS/IEB content management
│   │   ├── memory/             # Student memory/preference system
│   │   ├── billing/            # PayStack integration, hour tracking
│   │   └── db/                 # Prisma client, queries
│   └── types/                  # TypeScript types
├── prisma/
│   └── schema.prisma
├── public/
│   └── content/                # Static curriculum content
└── scripts/                    # Data import scripts
```

## Core Features

### 1. User Accounts
- **Parent accounts:** Sign up, add children, buy hour bundles, view progress reports
- **Student accounts:** Linked to parent, own login, grade & curriculum (CAPS/IEB) selection
- **Onboarding:** Student picks grade, subjects, curriculum type. AI conducts a short voice "get to know you" session to establish learning preferences

### 2. Voice Tutoring Sessions
- Student opens a subject/topic → screen shows content (questions, diagrams, explanations)
- Voice AI acts as tutor: explains concepts, asks questions, gives feedback
- OpenAI Realtime API handles bidirectional voice over WebSocket
- Claude API powers the tutoring intelligence (curriculum knowledge, Socratic method, adaptive difficulty)
- Session timer tracks usage against prepaid hours
- Student can browse content silently; AI nudges when it detects struggle (wrong answers, long pauses)

### 3. Persistent Student Memory
Each student has a memory profile stored in the database:
- **Learning style:** Visual, auditory, reading, kinesthetic preferences
- **Pace:** Slow/medium/fast explanation speed
- **Strengths/weaknesses:** Per-subject topic mastery tracking
- **Preferences:** Preferred explanation approaches, examples that resonated
- **History:** Past sessions, questions asked, topics covered
- Memory is injected into every tutoring prompt so the AI adapts its teaching style

### 4. Curriculum Content
- **Subjects:** All Grade 8-12 CAPS and IEB subjects (Maths, Science, English, Afrikaans, Life Sciences, Accounting, Business Studies, Geography, History, etc.)
- **Content types:** Past papers (DoE/IEB freely available), AI-generated quizzes, topic explanations, worked examples
- **Structure:** Organized by Grade → Subject → Topic → Content Type
- Past papers stored as PDFs in Supabase Storage, parsed for AI context
- AI generates practice questions aligned to CAPS/IEB assessment standards

### 5. Assessment Engine
- **Quizzes:** AI-generated, adaptive difficulty based on student performance
- **Past paper practice:** Student works through past paper questions with AI guidance
- **Mock exams:** Timed exam simulations
- **Progress tracking:** Scores, time spent, mastery level per topic

### 6. Billing & Payments
- **PayStack integration** for ZAR payments
- **Bundles:** 1hr (R100), 5hr (R450), 10hr (R800)
- **Session tracking:** Per-minute billing against prepaid balance
- **Parent dashboard:** Balance, usage history, top-up
- **Low balance alerts** via email/SMS

## Data Model (Key Entities)

```
Parent: id, email, name, phone
Student: id, parentId, name, grade, curriculum (CAPS|IEB), subjects[]
StudentMemory: id, studentId, learningStyle, pace, preferences (JSON), strengths (JSON), weaknesses (JSON)
Session: id, studentId, subjectId, startedAt, endedAt, durationMinutes, topicsCovered[]
HourBundle: id, parentId, hoursTotal, hoursUsed, purchasedAt, expiresAt
Payment: id, parentId, bundleId, amount, paystackRef, status
Subject: id, name, grade, curriculum
Topic: id, subjectId, name, order
Content: id, topicId, type (past_paper|quiz|explanation|worked_example), content (JSON), fileUrl?
QuizResult: id, studentId, contentId, score, answers (JSON), completedAt
MemoryEntry: id, studentId, sessionId, key, value, createdAt
```

## Key Design Decisions

1. **OpenAI Realtime API** over ElevenLabs+Whisper — single service, lower latency, simpler architecture, native function calling for screen updates
2. **Claude for tutoring intelligence** — best at nuanced educational explanations, Socratic questioning, and following complex curriculum guidelines
3. **PayStack** over Stripe — native ZAR support, lower fees for SA merchants, familiar to SA users
4. **Prepaid bundles** — simpler than subscriptions for MVP, no recurring billing complexity, parents control spend
5. **Hybrid voice mode** — students can browse silently but AI nudges when help is needed. Best tutoring UX.
6. **Memory as structured JSON** — flexible enough to capture diverse learning preferences without rigid schema

## MVP Scope
Build in this order:
1. Auth + user management (parent/student accounts)
2. Subject/topic browser with curriculum structure
3. Voice tutoring session (core experience)
4. Student memory system
5. Quiz/assessment engine
6. PayStack billing integration
7. Parent dashboard with progress reports
