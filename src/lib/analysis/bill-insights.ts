/**
 * Bill Insights Engine - The Elegant Approach
 *
 * Philosophy:
 * - We don't verify tariffs. COJ doesn't make arithmetic errors.
 * - We extract INSIGHTS that are ACTIONABLE.
 * - Every insight must answer: "So what should I do?"
 *
 * The value is not in saying "VERIFIED" - it's in saying:
 * - "Your meter is estimated - request a reading"
 * - "You're on business rates - verify your classification"
 * - "Your consumption spiked 40% - check for leaks"
 */

import { ParsedBill, ParsedLineItem } from '../parsers/types';

// ============================================================================
// TYPES - Simple, clear, actionable
// ============================================================================

export type InsightSeverity = 'info' | 'attention' | 'action_required' | 'critical';

export interface Insight {
  service: 'electricity' | 'water' | 'sewerage' | 'rates' | 'refuse' | 'general';
  severity: InsightSeverity;
  title: string;
  finding: string;      // What we found
  implication: string;  // Why it matters
  action: string;       // What to do
  savingsPotential?: number;  // In cents, if applicable
}

export interface BillAnalysis {
  accountNumber: string;
  billDate: Date | null;
  propertyClassification: 'residential' | 'business' | 'mixed' | 'unknown';
  totalCurrentCharges: number;
  insights: Insight[];
  summary: {
    criticalCount: number;
    actionCount: number;
    attentionCount: number;
    totalSavingsPotential: number;
  };
}

// ============================================================================
// ANALYSIS ENGINE - Extract what matters
// ============================================================================

export function analyzeBill(bill: ParsedBill): BillAnalysis {
  const insights: Insight[] = [];

  // Determine property classification from rates
  const ratesItem = bill.lineItems.find(i => i.serviceType === 'rates');
  const propertyClassification = inferClassification(bill, ratesItem);

  // Analyze each service for actionable insights
  analyzePropertyValuation(bill, insights);
  analyzeElectricity(bill, insights, propertyClassification);
  analyzeWater(bill, insights, propertyClassification);
  analyzeSewerage(bill, insights);
  analyzeRates(bill, insights, propertyClassification);
  analyzeRefuse(bill, insights, propertyClassification);
  analyzeOverallBill(bill, insights);

  // Calculate summary
  const summary = {
    criticalCount: insights.filter(i => i.severity === 'critical').length,
    actionCount: insights.filter(i => i.severity === 'action_required').length,
    attentionCount: insights.filter(i => i.severity === 'attention').length,
    totalSavingsPotential: insights.reduce((sum, i) => sum + (i.savingsPotential || 0), 0),
  };

  return {
    accountNumber: bill.accountNumber || 'Unknown',
    billDate: bill.billDate,
    propertyClassification,
    totalCurrentCharges: bill.currentCharges || 0,
    insights,
    summary,
  };
}

// ============================================================================
// CLASSIFICATION - Understand what type of property this is
// ============================================================================

function inferClassification(
  bill: ParsedBill,
  ratesItem?: ParsedLineItem
): 'residential' | 'business' | 'mixed' | 'unknown' {
  const rawText = bill.rawText.toLowerCase();

  // Check for explicit business rates
  const hasBusinessRates = rawText.includes('property rates business');
  const hasResidentialRates = rawText.includes('property rates residential');

  if (hasBusinessRates && hasResidentialRates) return 'mixed';
  if (hasBusinessRates) return 'business';
  if (hasResidentialRates) return 'residential';

  // Fallback: check rate used
  if (ratesItem?.metadata) {
    const meta = ratesItem.metadata as { rateUsed?: number };
    if (meta.rateUsed) {
      // Business rate is ~0.0238, residential is ~0.0095
      return meta.rateUsed > 0.015 ? 'business' : 'residential';
    }
  }

  return 'unknown';
}

// ============================================================================
// INSIGHT GENERATORS - Each focuses on what's actionable
// ============================================================================

function analyzePropertyValuation(bill: ParsedBill, insights: Insight[]): void {
  const valuation = bill.propertyInfo?.municipalValuation;

  // R0 valuation is CRITICAL - property is not being rated
  if (valuation === 0) {
    insights.push({
      service: 'rates',
      severity: 'critical',
      title: 'Property has R0 municipal valuation',
      finding: 'Your property shows a market value of R0.00 on the municipal roll.',
      implication: 'You are not being charged property rates, but this will be corrected. When it is, you may receive a backdated bill for multiple years.',
      action: 'Contact COJ Valuations immediately to verify your property is correctly valued. If this is an error, resolving it now prevents a large backdated bill.',
    });
  }
}

function analyzeElectricity(
  bill: ParsedBill,
  insights: Insight[],
  classification: string
): void {
  const elecItem = bill.lineItems.find(i => i.serviceType === 'electricity');
  if (!elecItem) return;

  const meta = elecItem.metadata as {
    meters?: Array<{ consumption: number; type: string }>;
    charges?: Array<{ step: number; kWh: number; rate: number }>;
    isEstimated?: boolean;
  } | undefined;

  // Check for estimated readings - very common, very important
  const isEstimated = meta?.meters?.some(m => m.type?.toLowerCase().includes('estimated')) ||
    bill.rawText.toLowerCase().includes('type: estimated');

  if (isEstimated) {
    insights.push({
      service: 'electricity',
      severity: 'action_required',
      title: 'Electricity meter reading is ESTIMATED',
      finding: 'City Power did not read your meter this month. The consumption shown is an estimate based on historical usage.',
      implication: 'When an actual reading is taken, you will receive a correction. If actual usage was higher, you\'ll get a large catch-up bill. If lower, you\'ll get a credit.',
      action: 'Request an actual meter reading from City Power (0860 562 874) to avoid surprise corrections. Keep recent bills to compare.',
    });
  }

  // Check consumption levels
  const consumption = elecItem.quantity;
  if (consumption && consumption > 0) {
    const billingDays = extractBillingDays(bill.rawText, 'electricity') || 30;
    const dailyAvg = consumption / billingDays;

    // High consumption for residential
    if (classification === 'residential' && dailyAvg > 50) {
      insights.push({
        service: 'electricity',
        severity: 'attention',
        title: 'Higher than typical residential consumption',
        finding: `Your daily average of ${dailyAvg.toFixed(1)} kWh is above typical residential usage (15-35 kWh/day).`,
        implication: 'This could indicate inefficient appliances, a geyser issue, or incorrect meter attribution.',
        action: 'Review your usage patterns. Consider a home energy audit. Verify the meter belongs to your property.',
      });
    }

    // Multi-meter properties
    const meterCount = meta?.meters?.length || 1;
    if (meterCount > 1) {
      insights.push({
        service: 'electricity',
        severity: 'info',
        title: `Property has ${meterCount} electricity meters`,
        finding: `Your bill shows ${meterCount} separate meters with different tariff structures.`,
        implication: 'Each meter may be on a different tariff (residential vs commercial). Verify each meter serves the correct area.',
        action: 'Review which areas each meter serves. Ensure commercial meters are only for commercial use.',
      });
    }
  }
}

function analyzeWater(
  bill: ParsedBill,
  insights: Insight[],
  classification: string
): void {
  const waterItem = bill.lineItems.find(i => i.serviceType === 'water');
  if (!waterItem) return;

  const consumption = waterItem.quantity;
  const units = bill.propertyInfo?.units || 1;

  // Zero consumption but charges exist - demand levy only
  if ((!consumption || consumption === 0) && waterItem.amount > 0) {
    insights.push({
      service: 'water',
      severity: 'info',
      title: 'Water charges are demand levy only',
      finding: `No water consumption recorded, but you're paying R${(waterItem.amount / 100).toFixed(2)} in demand levies.`,
      implication: 'This is normal for properties with prepaid water meters or no consumption.',
      action: 'No action needed unless you expected consumption to be recorded.',
    });
    return;
  }

  if (consumption && consumption > 0) {
    const billingDays = extractBillingDays(bill.rawText, 'water') || 30;
    const dailyAvg = consumption / billingDays;
    const perUnitDaily = dailyAvg / units;

    // High consumption check
    if (classification === 'residential' && dailyAvg > 2) {
      insights.push({
        service: 'water',
        severity: 'attention',
        title: 'Higher than typical water consumption',
        finding: `Your daily average of ${dailyAvg.toFixed(1)} kL is above typical (0.5-1.5 kL/day for residential).`,
        implication: 'This could indicate a leak, running toilet, or faulty meter.',
        action: 'Check for visible leaks. Turn off all taps and see if meter still moves. Consider a plumber inspection.',
      });
    }

    // Multi-unit high consumption
    if (units > 1 && perUnitDaily > 1.5) {
      insights.push({
        service: 'water',
        severity: 'attention',
        title: 'High water usage per unit',
        finding: `With ${units} units, you're averaging ${perUnitDaily.toFixed(2)} kL/day per unit.`,
        implication: 'Typical multi-unit usage is 0.5-1.0 kL/day per unit. High usage suggests leaks or meter issues.',
        action: 'Inspect common areas for leaks. Consider sub-metering to identify high-usage units.',
      });
    }
  }
}

function analyzeSewerage(bill: ParsedBill, insights: Insight[]): void {
  const sewerItem = bill.lineItems.find(i => i.serviceType === 'sewerage');
  if (!sewerItem) return;

  // Sewerage is usually straightforward - just note the calculation method
  const rawText = bill.rawText.toLowerCase();

  if (rawText.includes('sewer monthly charge based on stand size')) {
    insights.push({
      service: 'sewerage',
      severity: 'info',
      title: 'Sewerage based on stand size',
      finding: 'Your sewerage charge is calculated from your stand size, not water consumption.',
      implication: 'This is the standard residential method. The charge is fixed regardless of actual usage.',
      action: 'No action needed. This is normal for residential properties.',
    });
  } else if (rawText.includes('sewer charge per') && rawText.includes('living unit')) {
    const units = bill.propertyInfo?.units || 1;
    insights.push({
      service: 'sewerage',
      severity: 'info',
      title: `Sewerage for ${units} living units`,
      finding: `Your sewerage is charged per living unit (${units} units on record).`,
      implication: 'If the unit count is wrong, you may be over or under-charged.',
      action: `Verify that ${units} units is correct for your property.`,
    });
  }
}

function analyzeRates(
  bill: ParsedBill,
  insights: Insight[],
  classification: string
): void {
  const ratesItem = bill.lineItems.find(i => i.serviceType === 'rates');
  if (!ratesItem) return;

  const valuation = bill.propertyInfo?.municipalValuation || 0;

  // Business vs Residential comparison
  if (classification === 'business' && valuation > 0) {
    // Business rate is ~2.5x residential
    const businessMonthly = (valuation / 100) * 0.0238620 / 12;
    const residentialMonthly = ((valuation / 100) - 300000) * 0.0095447 / 12;
    const difference = businessMonthly - Math.max(0, residentialMonthly);

    if (difference > 50000) { // More than R500/month difference
      insights.push({
        service: 'rates',
        severity: 'attention',
        title: 'Business rates are significantly higher than residential',
        finding: `Your property is on BUSINESS rates (0.0238620). This is 2.5× the residential rate.`,
        implication: `If your property qualifies as residential, you could save approximately R${(difference / 100).toFixed(2)}/month.`,
        action: 'Review your property zoning. If it\'s used for residential purposes, apply for reclassification with COJ.',
        savingsPotential: Math.round(difference),
      });
    }
  }

  // Check for R300k rebate
  if (classification === 'residential') {
    const hasRebate = bill.rawText.includes('Less rates on first R300');
    if (!hasRebate && valuation > 30000000) { // Valuation > R300k
      insights.push({
        service: 'rates',
        severity: 'action_required',
        title: 'R300,000 residential rebate may be missing',
        finding: 'Your bill doesn\'t show the standard R300,000 residential property rebate.',
        implication: 'Primary residences get the first R300,000 exempt from rates. This saves ~R238/month.',
        action: 'Contact COJ to verify your property is registered as your primary residence.',
        savingsPotential: 23862, // ~R238.62/month
      });
    }
  }
}

function analyzeRefuse(
  bill: ParsedBill,
  insights: Insight[],
  classification: string
): void {
  const refuseItem = bill.lineItems.find(i => i.serviceType === 'refuse');
  if (!refuseItem) {
    // No refuse charges - might be worth noting
    if (classification === 'business') {
      insights.push({
        service: 'refuse',
        severity: 'info',
        title: 'No refuse charges on this bill',
        finding: 'Your bill doesn\'t include PIKITUP refuse charges.',
        implication: 'You may have a private waste removal contract, or refuse is billed separately.',
        action: 'Verify your waste removal arrangement is in order.',
      });
    }
    return;
  }

  // Check if bins match property needs
  const rawText = bill.rawText;
  const binMatch = rawText.match(/(\d+)-bin/i);
  const bins = binMatch ? parseInt(binMatch[1]) : 1;

  if (classification === 'business' && bins >= 5) {
    insights.push({
      service: 'refuse',
      severity: 'info',
      title: `Commercial refuse: ${bins} bins`,
      finding: `You're paying for ${bins} refuse bins at R495.97 each.`,
      implication: 'Consider if this matches your actual waste generation.',
      action: 'Review your bin allocation. If you generate less waste, request fewer bins to reduce costs.',
    });
  }
}

function analyzeOverallBill(bill: ParsedBill, insights: Insight[]): void {
  // Check for arrears
  if (bill.previousBalance && bill.previousBalance > 0) {
    const arrearsAmount = bill.previousBalance;
    if (arrearsAmount > 10000000) { // Over R100k
      insights.push({
        service: 'general',
        severity: 'critical',
        title: 'Significant arrears on account',
        finding: `Your account shows R${(arrearsAmount / 100).toFixed(2)} in previous balance.`,
        implication: 'Large arrears may result in service disconnection or legal action.',
        action: 'Contact COJ about a payment arrangement. Apply for the Debt Relief Programme if eligible.',
      });
    }
  }

  // Check for interest charges
  if (bill.rawText.includes('Interest on Arrears')) {
    insights.push({
      service: 'general',
      severity: 'attention',
      title: 'Interest being charged on arrears',
      finding: 'Your account is accruing interest on outstanding amounts.',
      implication: 'Interest compounds monthly. Paying down arrears saves on future interest.',
      action: 'Prioritize paying off arrears to stop interest accumulation.',
    });
  }
}

// ============================================================================
// HELPERS
// ============================================================================

function extractBillingDays(rawText: string, service: string): number | null {
  const pattern = new RegExp(`Reading period.*?=\\s*(\\d+)\\s*days`, 'i');
  const match = rawText.match(pattern);
  return match ? parseInt(match[1]) : null;
}

// ============================================================================
// FORMATTING - Present insights clearly
// ============================================================================

export function formatInsightsForDisplay(analysis: BillAnalysis): string {
  const lines: string[] = [];

  lines.push('═'.repeat(70));
  lines.push(`BILL ANALYSIS: Account ${analysis.accountNumber}`);
  lines.push(`Property: ${analysis.propertyClassification.toUpperCase()}`);
  lines.push(`Bill Date: ${analysis.billDate?.toISOString().split('T')[0] || 'Unknown'}`);
  lines.push('═'.repeat(70));

  if (analysis.summary.criticalCount > 0) {
    lines.push(`\n🚨 ${analysis.summary.criticalCount} CRITICAL ISSUE(S) REQUIRE IMMEDIATE ATTENTION\n`);
  }

  // Group by severity
  const critical = analysis.insights.filter(i => i.severity === 'critical');
  const actionRequired = analysis.insights.filter(i => i.severity === 'action_required');
  const attention = analysis.insights.filter(i => i.severity === 'attention');
  const info = analysis.insights.filter(i => i.severity === 'info');

  for (const insight of [...critical, ...actionRequired, ...attention]) {
    const icon = insight.severity === 'critical' ? '🚨' :
                 insight.severity === 'action_required' ? '⚠️' : '📋';

    lines.push(`\n${icon} ${insight.title.toUpperCase()}`);
    lines.push('─'.repeat(50));
    lines.push(`Finding: ${insight.finding}`);
    lines.push(`Why it matters: ${insight.implication}`);
    lines.push(`→ ACTION: ${insight.action}`);
    if (insight.savingsPotential) {
      lines.push(`💰 Potential savings: R${(insight.savingsPotential / 100).toFixed(2)}/month`);
    }
  }

  if (info.length > 0) {
    lines.push('\n' + '─'.repeat(70));
    lines.push('INFORMATION NOTES:');
    for (const insight of info) {
      lines.push(`• ${insight.title}: ${insight.finding}`);
    }
  }

  // Summary
  lines.push('\n' + '═'.repeat(70));
  lines.push('SUMMARY');
  lines.push('─'.repeat(70));
  lines.push(`Critical issues: ${analysis.summary.criticalCount}`);
  lines.push(`Actions required: ${analysis.summary.actionCount}`);
  lines.push(`Items to review: ${analysis.summary.attentionCount}`);
  if (analysis.summary.totalSavingsPotential > 0) {
    lines.push(`Total potential savings: R${(analysis.summary.totalSavingsPotential / 100).toFixed(2)}/month`);
  }
  lines.push('═'.repeat(70));

  return lines.join('\n');
}
