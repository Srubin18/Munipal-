// Must match Prisma FindingStatus enum
export type FindingStatus = 'VERIFIED' | 'LIKELY_WRONG' | 'CANNOT_VERIFY';

export type CheckType = 'tariff' | 'meter' | 'arithmetic';

export interface Citation {
  hasSource: boolean;
  // Link to KnowledgeDocument - REQUIRED when hasSource=true
  knowledgeDocumentId?: string;
  knowledgeChunkId?: string;
  // Link to specific TariffRule used for calculation
  tariffRuleId?: string;
  // Source reference within document
  sourcePageNumber?: number;
  // Relevant excerpt from the source
  excerpt?: string;
  // Explanation when hasSource=false
  noSourceReason?: string;
}

export interface Finding {
  checkType: CheckType;
  checkName: string;
  status: FindingStatus;
  confidence: number; // 0-100
  title: string;
  explanation: string;
  impactMin?: number; // ZAR cents
  impactMax?: number; // ZAR cents
  citation: Citation;
  // Full calculation breakdown (for UI expansion)
  calculationBreakdown?: {
    consumption?: { value: number; unit: string };
    bands?: Array<{
      range: string;
      usage: number;
      rate: number;
      amount: number;
      ruleSource: string;
    }>;
    fixedCharges?: Array<{
      name: string;
      amount: number;
      ruleSource: string;
    }>;
    subtotal: number;
    vat?: { rate: number; amount: number };
    total: number;
    tariffRuleId: string;
    financialYear: string;
    customerCategory: string;
  };
}

export interface VerificationResult {
  findings: Finding[];
  summary: {
    verified: number;
    likelyWrong: number;
    unknown: number;
  };
  totalImpactMin: number;
  totalImpactMax: number;
  recommendation: 'do_nothing' | 'handle_yourself' | 'let_munipal_handle';
}
