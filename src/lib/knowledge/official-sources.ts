// Canonical list of official City of Johannesburg tariff sources
// These are the authoritative sources MUNIPAL uses for verification

// Re-export financial year utility from single source of truth
export { getCurrentFinancialYear } from './financial-year';

export interface OfficialSource {
  provider: string;
  providerLabel: string;
  serviceTypes: string[];
  financialYear: string;
  // Primary URL - try PDF download first
  primaryUrl: string;
  // Fallback URLs if primary fails
  fallbackUrls: string[];
  // Document metadata
  documentType: 'tariff_schedule' | 'rates_policy' | 'by_law' | 'credit_control';
  category: 'TARIFF' | 'CREDIT_CONTROL' | 'METERING_POLICY' | 'VALUATION_ROLL' | 'BYLAW' | 'REVENUE_POLICY';
  expectedTitle: string;
  // Effective dates for this financial year
  effectiveDate: string;
  expiryDate: string;
}

// Official CoJ tariff sources for 2025/26 financial year
// Primary source: Consolidated Tariffs document from joburg.org.za
// This single document contains ALL tariffs: electricity, water, sanitation, rates, refuse
export const OFFICIAL_SOURCES_2025_26: OfficialSource[] = [
  {
    provider: 'city_power',
    providerLabel: 'City Power',
    serviceTypes: ['electricity'],
    financialYear: '2025/26',
    // Direct PDF link - consolidated tariffs document
    primaryUrl: 'https://joburg.org.za/documents_/Documents/Amendment%20of%20Tariff%20Charges/Consolidated-Tariffs-FY20252026.FINAL.pdf',
    fallbackUrls: [
      'https://joburg.org.za/documents_/Documents/2025-26_BUDGET-BOOK.pdf',
      'https://www.citypower.co.za/customers/Pages/Tariff-Info.aspx',
    ],
    documentType: 'tariff_schedule',
    category: 'TARIFF',
    expectedTitle: 'City of Johannesburg Consolidated Tariffs 2025/26 - Electricity',
    effectiveDate: '2025-07-01',
    expiryDate: '2026-06-30',
  },
  {
    provider: 'joburg_water',
    providerLabel: 'Johannesburg Water',
    serviceTypes: ['water', 'sanitation'],
    financialYear: '2025/26',
    // Same consolidated tariffs document
    primaryUrl: 'https://joburg.org.za/documents_/Documents/Amendment%20of%20Tariff%20Charges/Consolidated-Tariffs-FY20252026.FINAL.pdf',
    fallbackUrls: [
      'https://joburg.org.za/documents_/Documents/2025-26_BUDGET-BOOK.pdf',
    ],
    documentType: 'tariff_schedule',
    category: 'TARIFF',
    expectedTitle: 'City of Johannesburg Consolidated Tariffs 2025/26 - Water & Sanitation',
    effectiveDate: '2025-07-01',
    expiryDate: '2026-06-30',
  },
  {
    provider: 'coj',
    providerLabel: 'City of Johannesburg',
    serviceTypes: ['rates'],
    financialYear: '2025/26',
    // Same consolidated tariffs document
    primaryUrl: 'https://joburg.org.za/documents_/Documents/Amendment%20of%20Tariff%20Charges/Consolidated-Tariffs-FY20252026.FINAL.pdf',
    fallbackUrls: [
      'https://joburg.org.za/documents_/Documents/2025-26_BUDGET-BOOK.pdf',
    ],
    documentType: 'rates_policy',
    category: 'TARIFF',
    expectedTitle: 'City of Johannesburg Consolidated Tariffs 2025/26 - Property Rates',
    effectiveDate: '2025-07-01',
    expiryDate: '2026-06-30',
  },
  {
    provider: 'pikitup',
    providerLabel: 'Pikitup',
    serviceTypes: ['refuse'],
    financialYear: '2025/26',
    // Same consolidated tariffs document
    primaryUrl: 'https://joburg.org.za/documents_/Documents/Amendment%20of%20Tariff%20Charges/Consolidated-Tariffs-FY20252026.FINAL.pdf',
    fallbackUrls: [
      'https://joburg.org.za/documents_/Documents/2025-26_BUDGET-BOOK.pdf',
    ],
    documentType: 'tariff_schedule',
    category: 'TARIFF',
    expectedTitle: 'City of Johannesburg Consolidated Tariffs 2025/26 - Refuse',
    effectiveDate: '2025-07-01',
    expiryDate: '2026-06-30',
  },
];

// Previous year sources (for fallback when current year not available)
export const OFFICIAL_SOURCES_2024_25: OfficialSource[] = [
  {
    provider: 'city_power',
    providerLabel: 'City Power',
    serviceTypes: ['electricity'],
    financialYear: '2024/25',
    primaryUrl: 'https://www.citypower.co.za/customers/Pages/Tariffs.aspx',
    fallbackUrls: [],
    documentType: 'tariff_schedule',
    category: 'TARIFF',
    expectedTitle: 'City Power Electricity Tariff Schedule 2024/25',
    effectiveDate: '2024-07-01',
    expiryDate: '2025-06-30',
  },
  {
    provider: 'joburg_water',
    providerLabel: 'Johannesburg Water',
    serviceTypes: ['water', 'sanitation'],
    financialYear: '2024/25',
    primaryUrl: 'https://www.johannesburgwater.co.za/tariffs/',
    fallbackUrls: [],
    documentType: 'tariff_schedule',
    category: 'TARIFF',
    expectedTitle: 'Johannesburg Water Tariff Schedule 2024/25',
    effectiveDate: '2024-07-01',
    expiryDate: '2025-06-30',
  },
  {
    provider: 'coj',
    providerLabel: 'City of Johannesburg',
    serviceTypes: ['rates'],
    financialYear: '2024/25',
    primaryUrl: 'https://www.joburg.org.za/documents_/Pages/Key%20Documents/Tariffs/Tariffs.aspx',
    fallbackUrls: [],
    documentType: 'rates_policy',
    category: 'TARIFF',
    expectedTitle: 'City of Johannesburg Rates Policy 2024/25',
    effectiveDate: '2024-07-01',
    expiryDate: '2025-06-30',
  },
  {
    provider: 'pikitup',
    providerLabel: 'Pikitup',
    serviceTypes: ['refuse'],
    financialYear: '2024/25',
    primaryUrl: 'https://www.pikitup.co.za/tariffs/',
    fallbackUrls: [],
    documentType: 'tariff_schedule',
    category: 'TARIFF',
    expectedTitle: 'Pikitup Refuse Removal Tariff Schedule 2024/25',
    effectiveDate: '2024-07-01',
    expiryDate: '2025-06-30',
  },
];

// Get sources for a financial year
export function getOfficialSources(financialYear: string): OfficialSource[] {
  switch (financialYear) {
    case '2025/26':
      return OFFICIAL_SOURCES_2025_26;
    case '2024/25':
      return OFFICIAL_SOURCES_2024_25;
    default:
      return OFFICIAL_SOURCES_2025_26; // Default to current
  }
}

// Get source for a specific provider
export function getSourceForProvider(
  provider: string,
  financialYear: string = '2025/26'
): OfficialSource | undefined {
  const sources = getOfficialSources(financialYear);
  return sources.find((s) => s.provider === provider);
}

// Get all providers
export function getAllProviders(): string[] {
  return ['city_power', 'joburg_water', 'coj', 'pikitup'];
}

// Financial year function is re-exported from financial-year.ts at top of file
// This maintains backward compatibility for imports from this module
