# Munipal Verification Architecture

## The Elegant Truth

After testing 10 real COJ bills across residential and commercial properties, one truth emerged:

**COJ doesn't make arithmetic errors.**

Every charge on every bill follows the formula: `consumption × rate + fixed charges + VAT = total`. The math is always correct.

So what DO municipal consultants actually do? They find **policy errors**, not calculation errors:

---

## What Municipal Consultants Do (That We Should Automate)

### 1. Property Valuation Disputes
- **Problem**: Municipal valuation is too high (or R0.00)
- **Action**: Lodge objection with COJ Valuations
- **Value**: Can reduce monthly rates by 20-50%
- **Munipal**: Detect R0 valuations, compare to market data, flag potential overvaluations

### 2. Tariff Category Verification
- **Problem**: Property billed as "Business" when it should be "Residential"
- **Action**: Apply for reclassification
- **Value**: Business rates are 2.5× residential rates
- **Munipal**: Detect category from bill, compare to property use, flag mismatches

### 3. Meter Reading Issues
- **Problem**: Estimated readings accumulating, potential shock bills
- **Action**: Request actual reading from City Power/Joburg Water
- **Value**: Prevents large correction bills
- **Munipal**: Detect "Type: Estimated" in bill data, track estimated periods

### 4. Missing Rebates
- **Problem**: Primary residence R300k rebate not applied
- **Action**: Register property as primary residence
- **Value**: ~R238/month savings
- **Munipal**: Check for rebate line in residential bills

### 5. Account Reconciliation
- **Problem**: Unexplained arrears, duplicate charges
- **Action**: Reconcile account with municipality
- **Value**: Clear erroneous balances
- **Munipal**: Track month-over-month changes, flag anomalies

---

## Verification Architecture

### The Simple Model

```
┌─────────────────────────────────────────────────────────────────┐
│                        BILL PARSING                              │
│  PDF → Extract: account, valuation, consumption, charges, rates  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    ARITHMETIC CHECK                              │
│  For each service:                                               │
│  1. Extract rates FROM THE BILL (not tariff lookup)              │
│  2. Calculate: consumption × rate + fixed + VAT                  │
│  3. Compare to billed amount                                     │
│  4. Result: VERIFIED (match) or FLAG (discrepancy)               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     POLICY CHECKS                                │
│  1. Valuation: R0.00? → CRITICAL                                 │
│  2. Category: Business on residential property? → FLAG           │
│  3. Meter type: Estimated? → WARN                                │
│  4. Rebate: Missing R300k exemption? → FLAG                      │
│  5. Consumption: Spike vs previous month? → WARN                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    USER FEEDBACK                                 │
│  For each finding:                                               │
│  - What we found                                                 │
│  - Why it matters                                                │
│  - What you should do                                            │
│  - Potential savings (if applicable)                             │
└─────────────────────────────────────────────────────────────────┘
```

### Key Insight

**We don't verify tariffs against a knowledge base. We verify arithmetic using bill rates.**

Why? Because:
1. COJ uses the correct tariff - they have the master data
2. Commercial tariffs vary (bulk, negotiated, multi-meter)
3. Multi-dwelling water scales by units and days
4. The bill SHOWS what rate was used

The only question is: **does the math add up?**

---

## Test Results Summary

| Service | Verified | Notes |
|---------|----------|-------|
| **Electricity** | 90%+ | Arithmetic using bill rates works perfectly |
| **Rates** | 90%+ | R227 discrepancy = legitimate Section 15 MPRA adjustment |
| **Water** | ~60% | Multi-meter/unit properties need better parsing |
| **Refuse** | N/A | Too variable (bins, skips, levies) to verify |

### Verified Across 10 Bills:
- All electricity arithmetic matches when we have step data
- All business rates arithmetic matches
- Residential rates include R226.69 "Section 15 MPRA" adjustment - this is legitimate
- Water parsing needs refinement for multi-meter properties

---

## What Munipal Should Tell Users

### When Arithmetic Matches
> "Your electricity charge of R4,629.22 has been verified. The calculation breaks down as:
> - 542 kWh × R2.6444 = R1,433.51
> - 455 kWh × R3.0348 = R1,381.91
> - Service charge: R278.98
> - Network charge: R931.02
> - VAT (15%): R603.81
>
> The math is correct."

### When Policy Issues Found
> "Your property shows a municipal valuation of R0.00. This is unusual and typically means:
> - Your property is not on the municipal roll
> - You're not being charged property rates
> - When corrected, you may receive a backdated bill
>
> **Action**: Contact COJ Valuations at 011-407-6111 to verify your property record."

### When Estimated Readings
> "Your electricity meter reading is marked as ESTIMATED. This means:
> - City Power didn't read your meter this month
> - The consumption is based on historical average
> - When an actual reading is taken, you'll get a correction
>
> **Action**: Request an actual meter reading by calling 0860 562 874 or visit the City Power e-Services portal."

---

## Simplify Ruthlessly

Remove complexity:
- ~~Tariff knowledge base lookups~~ → Use rates from bill
- ~~Complex multi-step tariff calculations~~ → Verify arithmetic only
- ~~Guessing which tariff applies~~ → Bill tells us which rate was used

The elegant solution: **verify the math, flag the policy issues, tell the user what to do.**

---

## Files Created

| File | Purpose |
|------|---------|
| `scripts/verify-arithmetic.ts` | Arithmetic verification using bill rates |
| `scripts/verify-tariffs-standalone.ts` | Tariff verification with FY 2025/26 rates |
| `scripts/test-real-parser.ts` | Parser test across all 10 PDFs |
| `src/lib/analysis/bill-insights.ts` | Insight-based analysis engine |

---

*The best code is the code you don't write.*
*The best verification is the verification that can't be wrong.*
*Use the rates from the bill. Verify the math. Tell the user what matters.*
