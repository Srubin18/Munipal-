/**
 * MUNIPAL DISPUTE SYSTEM
 * ════════════════════════════════════════════════════════════════════════════
 *
 * ChatGPT can advise. Munipal can ACT.
 *
 * This module generates legally-sound dispute letters based on findings.
 * Every letter cites the correct legislation and follows COJ procedures.
 *
 * ════════════════════════════════════════════════════════════════════════════
 */

import type { BillAnalysis, Finding, ActionType } from './analyze';
import { SA_MUNICIPAL_LAW } from './analyze';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface DisputeLetter {
  subject: string;
  recipient: string;
  body: string;
  attachments: string[];
  deadline: string;
  reference: string;
}

export interface ActionPlan {
  type: ActionType;
  priority: 'immediate' | 'soon' | 'when_convenient';
  title: string;
  steps: ActionStep[];
  deadline?: string;
  contacts: Contact[];
  disputeLetter?: DisputeLetter;
}

export interface ActionStep {
  order: number;
  action: string;
  detail?: string;
  completed?: boolean;
}

export interface Contact {
  name: string;
  phone: string;
  email: string;
  hours?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN FUNCTION - Generate action plan from analysis
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate a complete action plan from bill analysis.
 * This is what makes Munipal valuable - not just finding issues, but solving them.
 */
export function generateActionPlan(analysis: BillAnalysis): ActionPlan[] {
  const plans: ActionPlan[] = [];

  for (const finding of analysis.findings) {
    const plan = createPlanForFinding(finding, analysis);
    if (plan) {
      plans.push(plan);
    }
  }

  // Sort by priority
  return plans.sort((a, b) => {
    const priority = { immediate: 0, soon: 1, when_convenient: 2 };
    return priority[a.priority] - priority[b.priority];
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// PLAN GENERATORS - One for each action type
// ═══════════════════════════════════════════════════════════════════════════════

function createPlanForFinding(finding: Finding, analysis: BillAnalysis): ActionPlan | null {
  switch (finding.action) {
    case 'contact_valuations':
      return createValuationPlan(finding, analysis);
    case 'request_meter_reading':
      return createMeterReadingPlan(finding, analysis);
    case 'apply_reclassification':
      return createReclassificationPlan(finding, analysis);
    case 'lodge_dispute':
      return createDisputePlan(finding, analysis);
    case 'request_rebate':
      return createRebatePlan(finding, analysis);
    case 'none':
    default:
      return null;
  }
}

function createValuationPlan(finding: Finding, analysis: BillAnalysis): ActionPlan {
  return {
    type: 'contact_valuations',
    priority: 'immediate',
    title: 'Correct property valuation',
    steps: [
      { order: 1, action: 'Call COJ Valuations', detail: '011-407-6111 (Mon-Fri 7:30-16:00)' },
      { order: 2, action: 'Quote your account number', detail: analysis.account },
      { order: 3, action: 'Request verification of your property on the valuation roll' },
      { order: 4, action: 'Get a reference number for your query' },
      { order: 5, action: 'Follow up in writing via email to valuations@joburg.org.za' },
    ],
    contacts: [SA_MUNICIPAL_LAW.contacts.valuations],
    disputeLetter: generateValuationLetter(analysis),
  };
}

function createMeterReadingPlan(finding: Finding, analysis: BillAnalysis): ActionPlan {
  return {
    type: 'request_meter_reading',
    priority: 'soon',
    title: 'Request actual meter reading',
    steps: [
      { order: 1, action: 'Call City Power', detail: '0860-562-874' },
      { order: 2, action: 'Request an actual meter reading for your property' },
      { order: 3, action: 'Alternatively, submit your own reading online', detail: 'via City Power e-Services portal' },
      { order: 4, action: 'Take a photo of your meter with date visible', detail: 'For your records' },
    ],
    contacts: [SA_MUNICIPAL_LAW.contacts.cityPower],
  };
}

function createReclassificationPlan(finding: Finding, analysis: BillAnalysis): ActionPlan {
  const savings = finding.potentialSavings;

  return {
    type: 'apply_reclassification',
    priority: 'when_convenient',
    title: 'Apply for residential classification',
    steps: [
      { order: 1, action: 'Gather proof of residence', detail: 'ID, utility bills in your name, lease agreement' },
      { order: 2, action: 'Visit your nearest COJ Customer Service Centre' },
      { order: 3, action: 'Request property reclassification from Business to Residential' },
      { order: 4, action: 'Submit application with supporting documents' },
      { order: 5, action: 'Follow up after 21 business days if no response' },
    ],
    contacts: [SA_MUNICIPAL_LAW.contacts.valuations],
    ...(savings && {
      deadline: `Potential annual savings: R${savings.toLocaleString()}`,
    }),
  };
}

function createDisputePlan(finding: Finding, analysis: BillAnalysis): ActionPlan {
  return {
    type: 'lodge_dispute',
    priority: 'soon',
    title: 'Lodge billing dispute',
    steps: [
      { order: 1, action: 'Submit dispute in writing', detail: 'Email is best - creates paper trail' },
      { order: 2, action: 'Include your account number, bill date, and specific concern' },
      { order: 3, action: 'Request acknowledgment of receipt' },
      { order: 4, action: 'COJ has 21 days to respond', detail: 'Per Credit Control Bylaw' },
      { order: 5, action: 'If no response, escalate to City Manager' },
    ],
    deadline: '21 days for COJ response (Credit Control Bylaw Section 14)',
    contacts: [
      SA_MUNICIPAL_LAW.contacts.cityPower,
      SA_MUNICIPAL_LAW.contacts.joburgWater,
    ],
    disputeLetter: generateDisputeLetter(finding, analysis),
  };
}

function createRebatePlan(finding: Finding, analysis: BillAnalysis): ActionPlan {
  return {
    type: 'request_rebate',
    priority: 'when_convenient',
    title: 'Apply for residential rebate',
    steps: [
      { order: 1, action: 'Confirm this is your primary residence' },
      { order: 2, action: 'Visit COJ Customer Service Centre with proof of residence' },
      { order: 3, action: 'Apply for R300,000 primary residence exemption' },
      { order: 4, action: 'Rebate applies from date of application (not backdated)' },
    ],
    contacts: [SA_MUNICIPAL_LAW.contacts.valuations],
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// LETTER GENERATORS - Legally sound, professionally written
// ═══════════════════════════════════════════════════════════════════════════════

function generateValuationLetter(analysis: BillAnalysis): DisputeLetter {
  const today = new Date().toISOString().split('T')[0];

  return {
    subject: `Valuation Query - Account ${analysis.account}`,
    recipient: 'COJ Valuations Department',
    body: `Dear Sir/Madam,

RE: PROPERTY VALUATION QUERY
Account Number: ${analysis.account}

I write to query the municipal valuation of my property, which currently reflects as R0.00 on my municipal account.

I request that you:
1. Verify whether my property is correctly recorded on the municipal valuation roll
2. Provide me with the current market value as recorded by the municipality
3. Advise on any action I need to take to correct this matter

I am aware that per the Municipal Property Rates Act (Section 50), I have the right to lodge an objection to my property valuation within 30 days of the valuation notice.

Please treat this as urgent, as I understand that when the valuation is corrected, I may be liable for backdated rates charges (limited to 3 years per the Prescription Act 68 of 1969).

I look forward to your response within 21 business days as required by the COJ Credit Control Bylaw.

Yours faithfully,
[Account Holder]
Account: ${analysis.account}
Date: ${today}`,
    attachments: ['Copy of current municipal bill showing R0.00 valuation'],
    deadline: '21 business days',
    reference: 'MPRA Section 50; Prescription Act 68 of 1969',
  };
}

function generateDisputeLetter(finding: Finding, analysis: BillAnalysis): DisputeLetter {
  const today = new Date().toISOString().split('T')[0];

  return {
    subject: `Billing Dispute - Account ${analysis.account}`,
    recipient: 'COJ Revenue Department',
    body: `Dear Sir/Madam,

RE: BILLING DISPUTE
Account Number: ${analysis.account}
Bill Date: ${analysis.billDate}
Issue: ${finding.title}

I write to formally dispute the following charge on my municipal account:

DETAILS OF DISPUTE:
${finding.detail}

REQUESTED ACTION:
I request that you:
1. Review the charges in question
2. Provide a detailed breakdown of how the charge was calculated
3. Correct the charge if an error is found
4. Credit my account accordingly

LEGAL BASIS:
Per the COJ Credit Control and Debt Collection Bylaw, I am entitled to dispute any charge I believe to be incorrect. You are required to respond to this dispute within 21 business days.

I reserve my rights under the Municipal Property Rates Act and the Consumer Protection Act.

Please acknowledge receipt of this dispute and provide a reference number.

Yours faithfully,
[Account Holder]
Account: ${analysis.account}
Date: ${today}`,
    attachments: ['Copy of disputed bill', 'Supporting calculations (if available)'],
    deadline: '21 business days',
    reference: 'COJ Credit Control Bylaw Section 14',
  };
}

// generateActionPlan is already exported at definition
