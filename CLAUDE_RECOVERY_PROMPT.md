# MUNIPAL Recovery Prompt

**Use this prompt to continue work on MUNIPAL in a new Claude Code session.**

---

## Quick Start

Copy and paste this into a new Claude Code session:

```
I'm continuing work on MUNIPAL - a municipal bill verification system for City of Johannesburg.

Project location: /Users/simon/Desktop/MUNIPAL
GitHub: https://github.com/Srubin18/Munipal-
Live: https://www.munipal.tech

## Current State (2026-01-13)

The system is WORKING with 100% accuracy on the test account (554528356 - Magnum Commercial).

### Recent Achievements
1. ✅ Fixed multi-meter electricity verification (arithmetic verification using bill rates)
2. ✅ Created elegant FindingBuilder (fluent API for findings)
3. ✅ Unified financial year logic (single source of truth)
4. ✅ Created ARCHITECTURE.md documentation
5. ✅ Created verification brain test suite

### Key Files to Know
- src/lib/verification/finding-builder.ts - Elegant finding construction
- src/lib/knowledge/financial-year.ts - CoJ fiscal calendar
- src/lib/parsers/coj-bill.ts - Bill PDF parser (580 lines)
- src/lib/verification/checks/tariff-check.ts - Rate verification
- ARCHITECTURE.md - System architecture documentation
- scripts/VERIFICATION_BRAIN.md - Ground truth test cases

### Test Commands
```bash
npx tsx scripts/test-bill-verification.ts    # Full verification test
npx tsx scripts/verification-simulation.ts   # Mathematical simulation
```

### Known Test Account
- Account: 554528356 (Magnum Multi-Meter Commercial)
- PDF: /Users/simon/Dropbox/554528356 - Magnum2.pdf
- Expected Total: R159,412.34
- 2 meters with negotiated rates (R2.3981 and R3.4907/kWh)

### Design Philosophy
"Be transparent about what you know, explicit about what you don't, and auditable for everything you claim."

- VERIFIED = Matches tariff
- LIKELY_WRONG = Discrepancy with evidence
- CANNOT_VERIFY = Missing data (never guess)

Please read ARCHITECTURE.md first to understand the system's soul.
```

---

## Architecture Overview

```
VERIFICATION LAYER
├── finding-builder.ts  - Elegant finding construction (F.tariff().verified()...)
├── checks/
│   ├── tariff-check.ts    - Rate verification
│   ├── arithmetic-check.ts - Math verification
│   └── meter-check.ts     - Consumption checks

KNOWLEDGE LAYER
├── financial-year.ts   - CoJ fiscal calendar (SINGLE SOURCE)
├── rule-matcher.ts     - Tariff lookup hierarchy
├── tariff-calculator.ts - Calculation with breakdown
└── tariffs.ts          - Public API

PARSER LAYER
└── coj-bill.ts         - PDF to ParsedBill
```

---

## Common Tasks

### Run Verification Test
```bash
npx tsx scripts/test-bill-verification.ts
```

### Build and Deploy
```bash
npm run build
npx vercel --prod
```

### Debug PDF Parsing
```bash
npx tsx scripts/debug-pdf-text.ts /path/to/bill.pdf
npx tsx scripts/debug-verification.ts
```

---

## Important Patterns

### Multi-Meter Commercial Bills
- DO NOT compare against standard tariffs (rates are negotiated)
- DO verify arithmetic using rates shown on bill
- Pattern in tariff-check.ts: `verifyElectricityArithmetic()`

### Meter Parsing
- Pattern: `/Meter[:\s]*(\d+)[;\s][\s\S]*?Consumption[:\s]*([\d,]+\.\d+)[;\s][\s\S]*?Type[:\s]*(\w+)/gi`
- Note: Uses `[\s\S]*?` (not `.*?`) to match across newlines

### Network Surcharge
- Pattern: `/Network\s+Surcharge[^:\d]*?([\d,]+\.\d+)/i`
- Note: Non-greedy `[^:\d]*?` to stop at digits

---

## Pending Improvements (Optional)

1. Refactor parser into composable section extractors
2. Add pricing structure validation with type guards
3. Add more test accounts to verification brain

---

**Last Updated:** 2026-01-13
**Commit:** 5625f0a (Craftsman refactor: Verification accuracy + code elegance)
