export interface PropertyInfo {
  address: string | null;
  standSize: number | null;
  units: number | null;
  propertyType: string | null;
  municipalValuation: number | null;
}

export interface ParsedBill {
  // Dates
  billDate: Date | null;
  dueDate: Date | null;
  periodStart: Date | null;
  periodEnd: Date | null;

  // Billing period
  billingDays?: number; // Number of days in billing period

  // Amounts (in ZAR cents)
  totalDue: number | null;
  previousBalance: number | null;
  currentCharges: number | null;
  vatAmount: number | null;

  // Account info
  accountNumber: string | null;

  // Property info (for multi-unit/commercial)
  propertyInfo?: PropertyInfo;

  // Line items
  lineItems: ParsedLineItem[];

  // Raw text for debugging
  rawText: string;
}

export interface ParsedLineItem {
  serviceType: 'electricity' | 'water' | 'sewerage' | 'refuse' | 'rates' | 'sundry' | 'other';
  description: string;
  quantity: number | null;
  unitPrice: number | null; // ZAR cents
  amount: number; // ZAR cents
  tariffCode: string | null;
  isEstimated: boolean;
  metadata?: Record<string, unknown>; // Additional parsed data
}
