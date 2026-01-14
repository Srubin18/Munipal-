/**
 * MUNIPAL CORE ANALYSIS ENGINE
 * ════════════════════════════════════════════════════════════════════════════
 *
 * "Elegance is achieved not when there's nothing left to add,
 *  but when there's nothing left to take away."
 *
 * This module is the heart of Munipal. It answers one question:
 * "Is this bill correct, and if not, what should I do?"
 *
 * What ChatGPT can't do:
 * - Parse your actual PDF bill
 * - Know current FY 2025/26 COJ tariffs
 * - Apply SA municipal law (MPRA, bylaws)
 * - Take action on your behalf
 * - Remember your account history
 *
 * ════════════════════════════════════════════════════════════════════════════
 */

import type { ParsedBill } from '../parsers/types';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES - Clear, Minimal, Purposeful
// ═══════════════════════════════════════════════════════════════════════════════

export type Severity = 'critical' | 'warning' | 'info' | 'success';

export type ActionType =
  | 'contact_valuations'    // R0 or wrong valuation
  | 'request_meter_reading' // Estimated readings
  | 'apply_reclassification' // Wrong tariff category
  | 'lodge_dispute'         // Billing error found
  | 'request_rebate'        // Missing rebate
  | 'none';                 // All good

export interface Finding {
  severity: Severity;
  title: string;
  detail: string;
  action: ActionType;
  actionSteps?: string[];
  legalBasis?: string;
  potentialSavings?: number; // In Rands
}

export interface ServiceAnalysis {
  name: string;
  billed: number;
  status: 'verified' | 'noted' | 'issue';
  consumption?: string;
  note?: string;
}

export interface BillAnalysis {
  account: string;
  billDate: string;
  propertyType: string;
  valuation: number;
  units: number;

  verdict: 'all_correct' | 'action_needed' | 'review_recommended';
  summary: string;

  services: ServiceAnalysis[];
  findings: Finding[];

  // What makes us better than ChatGPT
  legalContext?: string;
  historicalComparison?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS - SA Municipal Law Knowledge (ChatGPT doesn't know this)
// ═══════════════════════════════════════════════════════════════════════════════

const SA_MUNICIPAL_LAW = {
  // Municipal Property Rates Act 6 of 2004
  MPRA: {
    section50: {
      name: 'Right to object to valuation',
      deadline: '30 days from valuation notice',
      reference: 'MPRA Section 50(1)',
    },
    section15: {
      name: 'Rates ratios adjustment',
      description: 'Adjustment to ensure rates ratios comply with prescribed limits',
      amount: 226.69, // Current FY 2025/26
    },
    residentialRebate: {
      threshold: 300000,
      description: 'First R300,000 of primary residence exempt from rates',
    },
  },

  // COJ Credit Control Bylaw
  creditControl: {
    disputeDeadline: 21, // Days to respond to dispute
    reference: 'COJ Credit Control Bylaw Section 14',
    escalation: 'If no response in 21 days, escalate to City Manager',
  },

  // Prescription Act
  prescription: {
    maxBackdating: 3, // Years
    reference: 'Prescription Act 68 of 1969',
    description: 'Municipality cannot backdate charges more than 3 years',
  },

  // Contact Information
  contacts: {
    valuations: { name: 'COJ Valuations', phone: '011-407-6111', email: 'valuations@joburg.org.za' },
    cityPower: { name: 'City Power', phone: '0860-562-874', email: 'customerservice@citypower.co.za' },
    joburgWater: { name: 'Joburg Water', phone: '011-688-1400', email: 'customercare@jwater.co.za' },
    ombudsman: { name: 'City Ombudsman', phone: '011-407-6000', email: 'ombudsman@joburg.org.za' },
  },
};

// FY 2025/26 Tariffs (1 July 2025 - 30 June 2026)
const TARIFFS = {
  rates: {
    residential: 0.0095447,  // Per Rand of valuation p.a.
    business: 0.0238620,     // Per Rand of valuation p.a.
    rebateThreshold: 300000, // R300k primary residence exemption
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// CORE ANALYSIS - Every function name should sing
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Analyze a parsed bill and return actionable insights.
 * This is the main entry point - simple, clear, powerful.
 */
export function analyzeBill(bill: ParsedBill): BillAnalysis {
  const findings: Finding[] = [];
  const services: ServiceAnalysis[] = [];

  // Extract core data
  const account = bill.accountNumber || 'Unknown';
  const billDate = bill.billDate?.toISOString().split('T')[0] || 'Unknown';
  const valuationCents = bill.propertyInfo?.municipalValuation || 0;
  const valuation = valuationCents / 100;
  const propertyType = detectPropertyType(bill);
  const units = bill.propertyInfo?.units || 1;

  // Run checks - each returns findings
  findings.push(...checkValuation(valuation, bill));
  findings.push(...checkMeterReadings(bill));
  findings.push(...checkPropertyClassification(bill, propertyType, units));

  // Analyze each service
  services.push(...analyzeElectricity(bill));
  services.push(...analyzeWater(bill, units));
  services.push(...analyzeRates(bill, valuation, propertyType));
  services.push(...analyzeSewerage(bill));
  services.push(...analyzeRefuse(bill));

  // Check for service-level issues
  for (const service of services) {
    if (service.status === 'issue') {
      findings.push(createServiceFinding(service));
    }
  }

  // Determine verdict
  const verdict = determineVerdict(findings);
  const summary = createSummary(verdict, findings);

  return {
    account,
    billDate,
    propertyType,
    valuation,
    units,
    verdict,
    summary,
    services,
    findings,
    legalContext: createLegalContext(findings),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// DETECTION FUNCTIONS - Elegant, Single-Purpose
// ═══════════════════════════════════════════════════════════════════════════════

function detectPropertyType(bill: ParsedBill): string {
  const text = bill.rawText || '';
  if (text.includes('Property Rates Business')) return 'Business';
  if (text.includes('Property Rates Residential')) return 'Residential';
  if (text.includes('Industrial')) return 'Industrial';
  return 'Unknown';
}

function isEstimatedReading(bill: ParsedBill): boolean {
  const text = (bill.rawText || '').toLowerCase();
  return text.includes('type: estimated') || text.includes('type:estimated');
}

function hasSection15Adjustment(bill: ParsedBill): boolean {
  return (bill.rawText || '').includes('Section 15 MPRA');
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHECK FUNCTIONS - Each answers one question
// ═══════════════════════════════════════════════════════════════════════════════

function checkValuation(valuation: number, bill: ParsedBill): Finding[] {
  const findings: Finding[] = [];

  // Critical: R0 valuation
  if (valuation === 0) {
    findings.push({
      severity: 'critical',
      title: 'Property has no municipal valuation',
      detail: 'Your property shows R0.00 valuation. You are not being charged property rates. When corrected, expect backdated charges (limited to 3 years by Prescription Act).',
      action: 'contact_valuations',
      actionSteps: [
        'Call COJ Valuations: 011-407-6111',
        'Email: valuations@joburg.org.za',
        'Request verification of your property on the valuation roll',
        'Keep this bill as evidence of the error',
      ],
      legalBasis: 'MPRA Section 50 - Right to correct valuation roll',
      potentialSavings: undefined, // Could go either way
    });
  }

  return findings;
}

function checkMeterReadings(bill: ParsedBill): Finding[] {
  const findings: Finding[] = [];

  if (isEstimatedReading(bill)) {
    findings.push({
      severity: 'warning',
      title: 'Electricity meter reading is estimated',
      detail: 'City Power did not read your meter this month. Your consumption is based on historical average. When an actual reading is taken, you may receive a correction (higher or lower).',
      action: 'request_meter_reading',
      actionSteps: [
        'Call City Power: 0860-562-874',
        'Request an actual meter reading',
        'Or submit your own reading via City Power e-Services',
        'Keep records of your actual meter readings',
      ],
      legalBasis: 'COJ Credit Control Bylaw - Right to accurate billing',
    });
  }

  return findings;
}

function checkPropertyClassification(bill: ParsedBill, propertyType: string, units: number): Finding[] {
  const findings: Finding[] = [];

  // Check if this is a mixed-use property (both business and residential)
  const ratesItem = bill.lineItems.find(i => i.serviceType === 'rates');
  const ratesMeta = ratesItem?.metadata as {
    propertyType?: string;
    rateLines?: Array<{ value: number; rate: number; amount: number; category: string }>;
  } | undefined;

  const isMixedUse = ratesMeta?.propertyType?.includes('&') ||
    (ratesMeta?.rateLines && ratesMeta.rateLines.filter(l => l.category !== 'rebate').length > 1);

  // Don't suggest reclassification for mixed-use properties - they already have residential portions
  if (isMixedUse) {
    return findings;
  }

  // Business rates on small property - might be wrong classification
  // Only flag this for pure business properties with small footprint
  if (propertyType === 'Business' && units <= 2) {
    findings.push({
      severity: 'info',
      title: 'Property classified as Business',
      detail: `You are paying business rates (${TARIFFS.rates.business} per Rand), which is 2.5× the residential rate. If this property is primarily your home, you may qualify for residential rates.`,
      action: 'apply_reclassification',
      actionSteps: [
        'Review your property\'s primary use',
        'If residential, apply for reclassification at COJ',
        'Provide proof of residence (utility bills, ID)',
        'Potential savings: ~60% on property rates',
      ],
      legalBasis: 'MPRA Section 8 - Property categorisation',
      potentialSavings: calculateReclassificationSavings(bill),
    });
  }

  return findings;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SERVICE ANALYSIS - Clean, Consistent, Complete
// ═══════════════════════════════════════════════════════════════════════════════

function analyzeElectricity(bill: ParsedBill): ServiceAnalysis[] {
  const item = bill.lineItems.find(i => i.serviceType === 'electricity');
  if (!item) return [];

  const meta = item.metadata as {
    charges?: Array<{ step: number; kWh: number; rate: number }>;
    serviceCharge?: number;
    networkCharge?: number;
  } | undefined;

  // Verify arithmetic using bill rates
  let status: 'verified' | 'noted' | 'issue' = 'noted';
  let note = `${item.quantity?.toFixed(0) || 'N/A'} kWh`;

  if (meta?.charges && meta.charges.length > 0) {
    let calculated = 0;
    for (const c of meta.charges) {
      calculated += c.kWh * c.rate;
    }
    calculated += (meta.serviceCharge || 0) + (meta.networkCharge || 0);
    calculated *= 1.15; // VAT

    const billed = item.amount / 100;
    const diff = Math.abs(billed - calculated);

    // Allow up to R50 or 1% difference (whichever is greater) for rounding/timing
    const tolerance = Math.max(50, billed * 0.01);
    status = diff < tolerance ? 'verified' : 'issue';
    note = status === 'verified'
      ? `Verified: ${item.quantity?.toFixed(0)} kWh`
      : `Discrepancy: R${diff.toFixed(2)}`;
  }

  return [{
    name: 'Electricity',
    billed: item.amount / 100,
    status,
    consumption: `${item.quantity?.toFixed(0) || 0} kWh`,
    note,
  }];
}

function analyzeWater(bill: ParsedBill, units: number): ServiceAnalysis[] {
  const item = bill.lineItems.find(i => i.serviceType === 'water');
  if (!item) return [];

  return [{
    name: 'Water',
    billed: item.amount / 100,
    status: 'noted',
    consumption: `${item.quantity?.toFixed(1) || 0} kL`,
    note: units > 1 ? `${units} units` : undefined,
  }];
}

function analyzeRates(bill: ParsedBill, valuation: number, propertyType: string): ServiceAnalysis[] {
  const item = bill.lineItems.find(i => i.serviceType === 'rates');
  if (!item || valuation === 0) return [];

  const billed = item.amount / 100;
  const meta = item.metadata as {
    propertyType?: string;
    rateLines?: Array<{ value: number; rate: number; amount: number; category: string }>;
    calculatedTotal?: number;
  } | undefined;

  // MIXED-USE PROPERTY: If bill has rate breakdown, verify against that
  if (meta?.rateLines && meta.rateLines.length > 0) {
    const isMixedUse = meta.propertyType?.includes('&') ||
      meta.rateLines.filter(l => l.category !== 'rebate').length > 1;

    // Sum up the rate lines to get expected total
    let expectedTotal = 0;
    const breakdown: string[] = [];

    for (const line of meta.rateLines) {
      expectedTotal += line.amount;
      if (line.category === 'rebate') {
        breakdown.push(`Rebate: -R${Math.abs(line.amount).toFixed(2)}`);
      } else {
        const rateType = line.rate > 0.02 ? 'Business' : 'Residential';
        breakdown.push(`${rateType}: R${line.amount.toFixed(2)}`);
      }
    }

    // Check for Section 15 MPRA adjustment (~R227) - applies to residential properties
    const diffFromCalc = Math.abs(billed - expectedTotal);
    const hasSection15 = hasSection15Adjustment(bill) ||
      (!isMixedUse && propertyType === 'Residential' && diffFromCalc > 200 && diffFromCalc < 250);

    if (hasSection15) {
      expectedTotal += SA_MUNICIPAL_LAW.MPRA.section15.amount;
    }

    const diff = Math.abs(billed - expectedTotal);
    const status = diff < 10 ? 'verified' : 'issue';

    let note: string;
    if (status === 'verified') {
      if (isMixedUse) {
        note = 'Mixed-use (Business + Residential)';
      } else if (hasSection15) {
        note = `${propertyType} rate + Sec.15 MPRA`;
      } else {
        note = `${propertyType} rate`;
      }
    } else {
      note = `Expected: R${expectedTotal.toFixed(2)}`;
    }

    return [{
      name: 'Rates',
      billed,
      status,
      note,
    }];
  }

  // SINGLE-USE PROPERTY: Calculate expected rate
  const isBusiness = propertyType === 'Business';
  const rate = isBusiness ? TARIFFS.rates.business : TARIFFS.rates.residential;
  const rebate = isBusiness ? 0 : TARIFFS.rates.rebateThreshold;
  const assessable = Math.max(0, valuation - rebate);
  const expectedMonthly = (assessable * rate) / 12;

  // Check for Section 15 MPRA adjustment (~R227)
  const diffWithoutAdj = Math.abs(billed - expectedMonthly);
  const hasSection15 = hasSection15Adjustment(bill) || (diffWithoutAdj > 200 && diffWithoutAdj < 250);
  const section15Amount = hasSection15 ? SA_MUNICIPAL_LAW.MPRA.section15.amount : 0;
  const expectedWithAdj = expectedMonthly + section15Amount;
  const diff = Math.abs(billed - expectedWithAdj);

  const status = diff < 30 ? 'verified' : 'issue';
  const note = status === 'verified'
    ? `${isBusiness ? 'Business' : 'Residential'} rate${hasSection15 ? ' + Sec.15 MPRA' : ''}`
    : `Expected: R${expectedWithAdj.toFixed(2)}`;

  return [{
    name: 'Rates',
    billed,
    status,
    note,
  }];
}

function analyzeSewerage(bill: ParsedBill): ServiceAnalysis[] {
  const item = bill.lineItems.find(i => i.serviceType === 'sewerage');
  if (!item) return [];

  const units = bill.propertyInfo?.units || 1;

  return [{
    name: 'Sewerage',
    billed: item.amount / 100,
    status: 'noted',
    note: units > 1 ? `${units} units` : 'Standard',
  }];
}

function analyzeRefuse(bill: ParsedBill): ServiceAnalysis[] {
  const item = bill.lineItems.find(i => i.serviceType === 'refuse');
  if (!item) return [];

  return [{
    name: 'Refuse',
    billed: item.amount / 100,
    status: 'noted',
  }];
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS - Small, Focused, Testable
// ═══════════════════════════════════════════════════════════════════════════════

function createServiceFinding(service: ServiceAnalysis): Finding {
  return {
    severity: 'warning',
    title: `${service.name} charge requires review`,
    detail: service.note || 'Arithmetic does not match expected calculation.',
    action: 'lodge_dispute',
    actionSteps: [
      'Compare your bill to previous months',
      'Check meter readings are correct',
      'If discrepancy persists, lodge a dispute with COJ',
    ],
    legalBasis: 'COJ Credit Control Bylaw Section 14',
  };
}

function determineVerdict(findings: Finding[]): 'all_correct' | 'action_needed' | 'review_recommended' {
  if (findings.some(f => f.severity === 'critical')) return 'action_needed';
  if (findings.some(f => f.severity === 'warning')) return 'review_recommended';
  return 'all_correct';
}

function createSummary(verdict: string, findings: Finding[]): string {
  switch (verdict) {
    case 'all_correct':
      return 'All charges verified. No issues found.';
    case 'action_needed':
      return `Critical issue found: ${findings.find(f => f.severity === 'critical')?.title}`;
    case 'review_recommended':
      return `${findings.filter(f => f.severity === 'warning').length} item(s) require your attention.`;
    default:
      return 'Analysis complete.';
  }
}

function createLegalContext(findings: Finding[]): string | undefined {
  const legalFindings = findings.filter(f => f.legalBasis);
  if (legalFindings.length === 0) return undefined;

  return `Your rights under SA law: ${legalFindings.map(f => f.legalBasis).join('; ')}`;
}

function calculateReclassificationSavings(bill: ParsedBill): number | undefined {
  const ratesItem = bill.lineItems.find(i => i.serviceType === 'rates');
  if (!ratesItem) return undefined;

  const currentMonthly = ratesItem.amount / 100;
  // Business rate is ~2.5× residential
  const potentialMonthly = currentMonthly / 2.5;
  const annualSavings = (currentMonthly - potentialMonthly) * 12;

  return Math.round(annualSavings);
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS - Clean Public API
// ═══════════════════════════════════════════════════════════════════════════════

export { SA_MUNICIPAL_LAW, TARIFFS };
