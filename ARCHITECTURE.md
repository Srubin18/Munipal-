# MUNIPAL Architecture

> *"Be transparent about what you know, explicit about what you don't, and auditable for everything you claim."*

This document describes the soul of MUNIPAL - a municipal bill verification system that treats honesty as its core design principle.

---

## The Three Layers

```
                    ┌─────────────────────────────────┐
                    │         VERIFICATION            │
                    │   "What did we find?"           │
                    │                                 │
                    │  ┌──────────┐ ┌──────────┐     │
                    │  │  Tariff  │ │Arithmetic│     │
                    │  │  Checks  │ │  Checks  │     │
                    │  └──────────┘ └──────────┘     │
                    │           │                    │
                    │           ▼                    │
                    │    ┌─────────────┐             │
                    │    │  Finding    │             │
                    │    │  Builder    │ ◄── Elegant │
                    │    └─────────────┘             │
                    └─────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          KNOWLEDGE                                  │
│   "How do we know it?"                                              │
│                                                                     │
│   ┌──────────────┐    ┌───────────────┐    ┌────────────────┐      │
│   │ Rule Matcher │ ─► │ Tariff Calc   │ ─► │ Calculation    │      │
│   │              │    │               │    │ Breakdown      │      │
│   └──────────────┘    └───────────────┘    └────────────────┘      │
│          │                                                          │
│          ▼                                                          │
│   ┌──────────────────────────────────────────────────────────┐     │
│   │                Financial Year (Single Source)             │     │
│   │   financial-year.ts - CoJ fiscal calendar logic          │     │
│   └──────────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────────────┐
                    │           PARSER                │
                    │   "What's on the bill?"         │
                    │                                 │
                    │   PDF ─► Text ─► ParsedBill    │
                    │                                 │
                    │   Preserves ALL metadata       │
                    │   for verification layer       │
                    └─────────────────────────────────┘
```

---

## Design Principles

### 1. Honesty Over Cleverness

Every finding has exactly three possible states:

| Status | Meaning | Action |
|--------|---------|--------|
| `VERIFIED` | Charge matches official tariff | User can trust the charge |
| `LIKELY_WRONG` | Discrepancy with source evidence | User should investigate |
| `CANNOT_VERIFY` | Missing tariff data | No accusation without proof |

**The system never guesses.** If we don't have the tariff data, we say so explicitly rather than estimating.

### 2. Every Accusation Has a Citation

When we claim something is wrong, we must cite our source:

```typescript
Finding {
  status: 'LIKELY_WRONG',
  citation: {
    hasSource: true,
    knowledgeDocumentId: 'doc_abc123',  // Link to official document
    sourcePageNumber: 42,                // Exact page
    excerpt: 'The tariff rate is...'     // Relevant text
  }
}
```

If `hasSource: false`, we CANNOT claim overcharging - only flag for review.

### 3. Amounts in Cents (Integer Arithmetic)

All monetary values are stored in **cents** to avoid floating-point errors:

```typescript
// Good: R1,234.56 stored as 123456 cents
const amount = 123456;

// Display: only convert to Rand for human readability
const display = `R${(amount / 100).toFixed(2)}`; // "R1234.56"
```

---

## Key Abstractions

### Finding Builder (`finding-builder.ts`)

Elegant construction of findings using fluent API:

```typescript
// Before: Verbose, repetitive
return {
  checkType: 'tariff',
  checkName: 'electricity_verified',
  status: 'VERIFIED',
  confidence: 92,
  title: 'Electricity charges verified',
  explanation: `Your charge of R${amount}...`,
  citation: { hasSource: false, noSourceReason: '...' }
};

// After: Expressive, self-documenting
return F.tariff('electricity')
  .verified('Electricity charges verified')
  .because(`Your charge of R${formatAmount(amount)}...`)
  .confidence(92)
  .withoutSource('Arithmetic verified from bill data.')
  .build();
```

### Financial Year (`financial-year.ts`)

Single source of truth for CoJ fiscal calendar:

```typescript
// CoJ FY runs July 1 to June 30
getCurrentFinancialYear(new Date('2024-07-15')); // => "2024/25"
getCurrentFinancialYear(new Date('2025-03-15')); // => "2024/25"
getCurrentFinancialYear(new Date('2025-07-01')); // => "2025/26"
```

### Rule Matching Hierarchy

When looking up tariffs, we follow precedence:

1. **Verified rule** for current FY (confidence: 95)
2. **Unverified rule** for current FY (confidence: 70)
3. **Previous FY rule** (confidence: 50)
4. **No match** → CANNOT_VERIFY

---

## Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  1. PARSE                                                       │
│     PDF Buffer ─► pdf-parse ─► Raw Text ─► ParsedBill          │
│                                                                 │
│     ParsedBill {                                                │
│       accountNumber: "554528356",                               │
│       totalDue: 15941234,  // R159,412.34 in cents             │
│       lineItems: [                                              │
│         { serviceType: 'electricity', amount: 13496347,         │
│           metadata: { meters, charges, serviceCharge, ... }    │
│         }                                                       │
│       ]                                                         │
│     }                                                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. VERIFY                                                      │
│                                                                 │
│     For each lineItem:                                          │
│       ├─ Multi-meter? → verifyArithmetic()  // Use bill rates │
│       └─ Single-meter? → checkTariff()      // Compare to DB  │
│                                                                 │
│     + checkReconciliation()  // All items sum to total?        │
│     + checkVatCalculation()  // 15% on VAT-able services?      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. REPORT                                                      │
│                                                                 │
│     VerificationResult {                                        │
│       findings: Finding[],                                      │
│       summary: { verified: 5, likelyWrong: 1, unknown: 0 },    │
│       totalImpactMin: 500,   // R5.00 minimum potential issue  │
│       totalImpactMax: 1200,  // R12.00 maximum                 │
│       recommendation: 'handle_yourself'                         │
│     }                                                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## Multi-Meter Commercial Properties

MUNIPAL handles complex properties with multiple electricity meters:

```
Bill shows:
  Meter 63029512: 19,616 kWh @ R2.3981 = R47,041.13
  Meter 63029866: 18,956 kWh @ R3.4907 = R66,169.71
  + Service charges, Network charges, Network Surcharge
  + VAT 15%
  ────────────────────────────────────────────────
  Total: R134,963.47
```

For these properties:
1. We **DO NOT** compare against standard NERSA tariffs (rates are negotiated)
2. We **DO** verify arithmetic: (kWh × rate) + fixed charges + VAT = total
3. If arithmetic is correct → `VERIFIED`
4. If arithmetic is wrong → `LIKELY_WRONG` (math error on bill)

---

## VAT Handling

South Africa has mixed VAT rules for municipal bills:

| Service | VAT Rate | Reason |
|---------|----------|--------|
| Electricity | 15% | Standard |
| Water | 15% | Standard |
| Sewerage | 15% | Standard |
| Refuse | 15% | Standard |
| **Property Rates** | **0%** | VAT exempt per SA VAT Act |

The system:
1. Separates VAT-able and VAT-exempt services
2. Calculates expected VAT on VAT-able services only
3. Compares against billed VAT
4. Reports discrepancy if difference exceeds R5 tolerance

---

## Ground Truth Testing

The "verification brain" lives in:

```
scripts/
├── VERIFICATION_BRAIN.md       # Ground truth documentation
├── test-bill-verification.ts   # Parser + verification test
└── verification-simulation.ts  # Mathematical simulation
```

Run tests:
```bash
npx tsx scripts/test-bill-verification.ts
npx tsx scripts/verification-simulation.ts
```

### Test Case: Account 554528356 (Magnum Commercial)

| Component | Expected | Tolerance |
|-----------|----------|-----------|
| Account Number | 554528356 | Exact |
| Total Due | R159,412.34 | ±R1 |
| Electricity | R134,963.47 | ±R1 |
| Water | R22,890.17 | ±R1 |
| Rates | R0.00 | Exact |
| Sundry | R1,558.70 | ±R1 |
| Meter Count | 2 | Exact |

---

## File Structure

```
src/lib/
├── verification/
│   ├── engine.ts           # Main orchestrator
│   ├── types.ts            # Finding, Citation, VerificationResult
│   ├── finding-builder.ts  # Elegant finding construction
│   └── checks/
│       ├── tariff-check.ts    # Rate verification (900 lines)
│       ├── arithmetic-check.ts # Math verification (200 lines)
│       └── meter-check.ts     # Consumption checks (120 lines)
│
├── knowledge/
│   ├── financial-year.ts   # CoJ fiscal calendar (SINGLE SOURCE)
│   ├── rule-matcher.ts     # Tariff lookup with hierarchy
│   ├── tariff-calculator.ts # Calculation with breakdown
│   ├── tariffs.ts          # Public API wrapper
│   └── types.ts            # PricingStructure, CalculationBreakdown
│
└── parsers/
    ├── types.ts            # ParsedBill, ParsedLineItem
    └── coj-bill.ts         # City of Johannesburg bill parser
```

---

## The Soul of This Codebase

This is **honest code**. It says:
- "Here's what I found"
- "Here's my source"
- "Here's my confidence level"
- "Here's the math"

That's rare in verification systems. Most would estimate, guess, or hide uncertainty. MUNIPAL makes uncertainty a first-class citizen.

**Ship it. Trust it. Audit it.**
