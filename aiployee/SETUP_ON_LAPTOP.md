# How to Run Paperclip + Aiployee on Your Laptop

## Quick Setup (5 minutes)

### 1. Install Paperclip
```bash
git clone https://github.com/paperclipai/paperclip.git ~/paperclip
cd ~/paperclip
npm install -g pnpm    # if you don't have pnpm
pnpm install
```

### 2. Start Paperclip
```bash
cd ~/paperclip
pnpm dev
```
This starts at http://localhost:3100 with an embedded database — no PostgreSQL needed.

### 3. Set Up Aiployee in Paperclip
Open http://localhost:3100 in your browser. Then either:

**Option A: Use the Dashboard UI**
- Create a company called "Aiployee"
- Add agents (CEO, CTO, CMO, CFO, Engineers)
- Set their adapter type to "Claude Code (local)"

**Option B: Use the API (paste these into terminal)**

```bash
# Create the company
curl -X POST http://localhost:3100/api/companies \
  -H "Content-Type: application/json" \
  -d '{"name": "Aiployee", "description": "AI workforce for SA SMBs - Jobix.ai affiliate"}'

# Note the company ID from the response, then create agents:
# (Replace COMPANY_ID with the actual ID)

# CEO
curl -X POST http://localhost:3100/api/companies/COMPANY_ID/agents \
  -H "Content-Type: application/json" \
  -d '{
    "name": "CEO", "role": "ceo", "title": "Chief Executive Officer",
    "icon": "crown", "adapterType": "claude_local",
    "adapterConfig": {"model": "claude-opus-4-6", "cwd": "'$HOME'/aiployee/ceo"},
    "capabilities": "Strategic planning for Aiployee"
  }'

# CTO (use CEO's ID as reportsTo)
curl -X POST http://localhost:3100/api/companies/COMPANY_ID/agents \
  -H "Content-Type: application/json" \
  -d '{
    "name": "CTO", "role": "cto", "title": "Chief Technology Officer",
    "icon": "cpu", "adapterType": "claude_local", "reportsTo": "CEO_ID",
    "adapterConfig": {"model": "claude-opus-4-6", "cwd": "'$HOME'/aiployee/cto"}
  }'

# CMO
curl -X POST http://localhost:3100/api/companies/COMPANY_ID/agents \
  -H "Content-Type: application/json" \
  -d '{
    "name": "CMO", "role": "cmo", "title": "Chief Marketing Officer",
    "icon": "rocket", "adapterType": "claude_local", "reportsTo": "CEO_ID",
    "adapterConfig": {"model": "claude-sonnet-4-6", "cwd": "'$HOME'/aiployee/cmo"}
  }'

# CFO
curl -X POST http://localhost:3100/api/companies/COMPANY_ID/agents \
  -H "Content-Type: application/json" \
  -d '{
    "name": "CFO", "role": "cfo", "title": "Chief Financial Officer",
    "icon": "database", "adapterType": "claude_local", "reportsTo": "CEO_ID",
    "adapterConfig": {"model": "claude-sonnet-4-6", "cwd": "'$HOME'/aiployee/cfo"}
  }'

# Engineers (use CTO's ID as reportsTo)
curl -X POST http://localhost:3100/api/companies/COMPANY_ID/agents \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Senior Engineer", "role": "engineer",
    "icon": "code", "adapterType": "claude_local", "reportsTo": "CTO_ID",
    "adapterConfig": {"model": "claude-opus-4-6", "cwd": "'$HOME'/aiployee/senior-engineer"}
  }'
```

### 4. Set Your API Key
Make sure `ANTHROPIC_API_KEY` is set in your environment:
```bash
export ANTHROPIC_API_KEY=sk-ant-...your-key-from-hireinbox...
```

### 5. Trigger Agent Heartbeats
Once API key is set, agents will work on heartbeats. To manually trigger:
```bash
curl -X POST http://localhost:3100/api/agents/AGENT_ID/heartbeat/invoke
```

## Files in This Directory

```
aiployee/
├── ceo/SALES_STRATEGY.md       — Sales playbook, scripts, targets
├── cmo/MARKETING_PLAN.md       — Marketing plan, campaigns, channels
├── cfo/PRICING_MODEL.md        — ZAR pricing tiers, revenue projections
├── cto/PRODUCT_ARCHITECTURE.md — Tech stack, integrations, MVP roadmap
├── senior-engineer/             — (workspace for coding tasks)
├── frontend-engineer/           — (workspace for UI tasks)
├── voice-ai-engineer/           — (workspace for voice AI tasks)
└── SETUP_ON_LAPTOP.md          — This file
```
