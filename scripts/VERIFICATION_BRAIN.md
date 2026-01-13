# MUNIPAL Verification Brain

## Purpose
This document serves as the **ground truth reference** for bill verification accuracy. It captures manually verified bill data that our system MUST match exactly.

## Test Suite
Run verification tests with:
```bash
npx tsx scripts/test-bill-verification.ts
npx tsx scripts/verification-simulation.ts
```

---

## Account 554528356 - Magnum Multi-Meter Commercial

### Bill Details
- **Account**: 554528356
- **Property Type**: Multipurpose
- **Units**: 47
- **Bill Period**: 2025/12 (Oct 26 - Nov 25, 2025)

### Electricity (2 Meters)

| Meter | Consumption | Rate | Energy Charge |
|-------|-------------|------|---------------|
| 63029512 | 19,616 kWh | R2.3981 | R47,041.13 |
| 63029866 | 18,956 kWh | R3.4907 | R66,169.71 |
| **Total** | **38,572 kWh** | | **R113,210.84** |

| Fixed Charges | Amount |
|---------------|--------|
| Service (280.30 + 816.85) | R1,097.15 |
| Network (1,131.03 + 783.16) | R1,914.19 |
| Network Surcharge | R1,137.36 |
| **Fixed Total** | **R4,148.70** |

| Calculation | Amount |
|-------------|--------|
| Subtotal | R117,359.54 |
| VAT (15%) | R17,603.93 |
| **Electricity Total** | **R134,963.47** |

### Water (No Consumption - Demand Levy Only)

| Component | Amount |
|-----------|--------|
| Demand Levy (47 × R65.08) | R3,058.76 |
| Sewer Charge | R16,845.74 |
| Subtotal | R19,904.50 |
| VAT (15%) | R2,985.67 |
| **Water Total** | **R22,890.17** |

### Rates
- **Property Rates**: R0.00 (separate account)

### Sundry (Business Services)

| Component | Amount |
|-----------|--------|
| Surcharge on business services | R1,355.39 |
| VAT (15%) | R203.31 |
| **Sundry Total** | **R1,558.70** |

### Grand Total

| Service | Amount |
|---------|--------|
| Electricity | R134,963.47 |
| Water | R22,890.17 |
| Rates | R0.00 |
| Sundry | R1,558.70 |
| **Total Due** | **R159,412.34** |

### Expected Verification Findings
- `electricity_arithmetic_verified`: **VERIFIED**
- `water_demand_levy`: **VERIFIED**
- `rates_zero`: **VERIFIED**
- `sundry_business_surcharge`: **VERIFIED**
- `reconciliation_verified`: **VERIFIED**
- `vat_verified`: **VERIFIED**

---

## Key Parsing Patterns

### Electricity
1. **Meter blocks** (multi-line):
   ```regex
   /Meter[:\s]*(\d+)[;\s][\s\S]*?Consumption[:\s]*([\d,]+\.\d+)[;\s][\s\S]*?Type[:\s]*(\w+)/gi
   ```
2. **Step charges**:
   ```regex
   /Step\s*(\d+)\s*([\d,]+\.\d+)\s*kWh\s*@\s*R\s*([\d.]+)/gi
   ```
3. **Network surcharge** (no separator before amount):
   ```regex
   /Network\s+Surcharge[^:\d]*?([\d,]+\.\d+)/i
   ```

### Verification Logic
1. For **multi-meter properties**: Use ARITHMETIC verification with bill rates, NOT standard tariffs
2. For **commercial with specific rates**: Same as above
3. For **single-meter residential**: Compare against official tariff schedules
4. Tolerance: R5 for arithmetic verification, R10-50 for tariff comparisons

---

## Change Log

### 2026-01-13
- Fixed meter pattern to use `[\s\S]*?` instead of `.*?` for multi-line matching
- Fixed Network Surcharge pattern to use non-greedy `[^:\d]*?`
- Added comprehensive service/network charge extraction (multiple per meter)
- Implemented arithmetic verification for multi-meter commercial properties
- All test cases now passing: 100% accuracy
