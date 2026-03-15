# Munipal Power Tools Setup Guide

## Overview

We leverage two of the fastest-growing open-source AI tools to supercharge Munipal:

| Tool | Purpose | Stars (Mar 2026) |
|------|---------|-----------------|
| **bytedance/deer-flow** | Autonomous research & code execution agent | +10.4K |
| **obra/superpowers** | Structured dev workflow with composable skills | +30.7K |

---

## 1. DeerFlow — Autonomous Research Agent

DeerFlow is ByteDance's open-source SuperAgent. For Munipal, it handles:

- **Tariff Research**: Automatically finds and extracts official CoJ tariff rates
- **Bill Analysis**: Parses PDFs in a sandboxed environment with code execution
- **Dispute Drafting**: Generates legally-grounded dispute letters with citations
- **Regulatory Monitoring**: Watches for tariff changes and council resolutions

### Quick Start

```bash
# 1. Make sure Docker is installed
docker --version

# 2. Add your API keys to .env
echo "OPENAI_API_KEY=sk-your-key" >> .env
echo "ANTHROPIC_API_KEY=sk-ant-your-key" >> .env  # optional

# 3. Start DeerFlow
docker compose -f docker-compose.deer-flow.yml up -d

# 4. Access the UI
open http://localhost:2026

# 5. API available at
curl http://localhost:8024/health
```

### Custom Skills (Pre-configured)

We've set up four Munipal-specific skills in `deer-flow-config/skills/`:

1. **tariff-researcher.md** — Finds official tariff rates from CoJ sources
2. **bill-analyzer.md** — Parses and verifies municipal bill PDFs
3. **dispute-drafter.md** — Drafts formal dispute letters with legal citations
4. **regulation-monitor.md** — Monitors for regulatory changes

### Using from Next.js

```typescript
import { deerFlow } from '@/lib/deer-flow-client';

// Check if DeerFlow is running
const healthy = await deerFlow.isHealthy();

// Research electricity tariffs
const tariffs = await deerFlow.researchTariffs('electricity', '2025/26');

// Draft a dispute letter
const letter = await deerFlow.draftDisputeLetter(
  '551526054',
  '123 Main Street, Johannesburg',
  [{ service: 'electricity', charged_cents: 150000, expected_cents: 120000, tariff_source: 'CoJ Tariff Schedule 2025/26 p.14' }]
);

// Monitor for changes (run via cron)
const updates = await deerFlow.checkForRegulatoryUpdates();
```

---

## 2. Superpowers — Dev Workflow Enhancement

Superpowers provides structured development workflows for Claude Code:

- **Brainstorming**: Socratic dialogue to refine ideas before coding
- **Planning**: Detailed implementation plans with bite-sized tasks
- **Execution**: Autonomous sub-agents with two-stage code review
- **Testing**: Enforced TDD with RED-GREEN-REFACTOR cycles

### Installation

For Claude Code:
```bash
/plugin install superpowers@claude-plugins-official
```

### Key Skills Available
- Automated test generation
- Code review against specification
- Debugging workflows
- Architecture planning

---

## Architecture: How They Work Together

```
┌─────────────────────────────────────────────────┐
│                  MUNIPAL STACK                   │
├─────────────────────────────────────────────────┤
│                                                 │
│  Next.js App (localhost:3000)                   │
│  ├── Bill Upload → Parser → Verification       │
│  ├── deer-flow-client.ts → DeerFlow API        │
│  └── Dashboard / Admin                          │
│                                                 │
├─────────────────────────────────────────────────┤
│                                                 │
│  DeerFlow Agent (localhost:2026 / :8024)        │
│  ├── Tariff Researcher (web search + extract)   │
│  ├── Bill Analyzer (sandboxed code execution)   │
│  ├── Dispute Drafter (legal letter generation)  │
│  └── Regulation Monitor (change detection)      │
│                                                 │
├─────────────────────────────────────────────────┤
│                                                 │
│  Superpowers (Claude Code Plugin)               │
│  ├── Structured development workflow            │
│  ├── Automated testing & review                 │
│  └── Architecture planning                      │
│                                                 │
├─────────────────────────────────────────────────┤
│                                                 │
│  Infrastructure                                 │
│  ├── Supabase (Auth + Database)                 │
│  ├── Vercel (Hosting)                           │
│  └── Docker (DeerFlow sidecar)                  │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## Environment Variables

Add these to your `.env`:

```env
# Existing
OPENAI_API_KEY=sk-...
DATABASE_URL=postgresql://...
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# New — DeerFlow
DEER_FLOW_API_URL=http://localhost:8024
ANTHROPIC_API_KEY=sk-ant-...  # optional, for Claude models in DeerFlow
SEARCH_API_KEY=...             # optional, for web search in DeerFlow
```

---

## What This Gives Us

| Capability | Before | After |
|-----------|--------|-------|
| Tariff updates | Manual PDF reading | Auto-discovered & extracted |
| Bill analysis | Single-pass verification | Multi-agent with code execution |
| Dispute letters | Not implemented | Auto-generated with legal citations |
| Regulatory monitoring | None | Automated weekly scans |
| Dev workflow | Ad-hoc | Structured with automated review |
