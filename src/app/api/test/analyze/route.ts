import { NextResponse } from 'next/server';
import { parseCojBill } from '@/lib/parsers/coj-bill';
import { analyzeBill, generateActionPlan, SA_MUNICIPAL_LAW, TARIFFS } from '@/lib/core';

interface FindingCitation {
  hasSource: boolean;
  excerpt?: string;
  noSourceReason?: string;
}

interface Finding {
  title: string;
  explanation: string;
  status: string;
  impactMin: number;
  impactMax: number;
  citation: FindingCitation;
  actionSteps?: string[];
}

/**
 * Test endpoint - no auth required
 * Uses the new elegant core analysis engine that verifies bills
 * using rates FROM THE BILL (not database lookups).
 */
export async function POST(request: Request) {
  try {
    let formData;
    try {
      formData = await request.formData();
    } catch (formError) {
      console.error('FormData parsing error:', formError);
      return NextResponse.json({
        error: 'Failed to parse form data',
        details: formError instanceof Error ? formError.message : 'Unknown error',
        step: 'form_parsing',
      }, { status: 400 });
    }

    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'File required' }, { status: 400 });
    }

    console.log(`[TestAnalyze] Processing file: ${file.name}, size: ${file.size} bytes`);

    // Parse the PDF
    let arrayBuffer;
    try {
      arrayBuffer = await file.arrayBuffer();
    } catch (bufferError) {
      console.error('ArrayBuffer conversion error:', bufferError);
      return NextResponse.json({
        error: 'Failed to read file',
        details: bufferError instanceof Error ? bufferError.message : 'Unknown error',
        step: 'file_read',
      }, { status: 400 });
    }

    const buffer = Buffer.from(arrayBuffer);
    console.log(`[TestAnalyze] Buffer size: ${buffer.length} bytes`);

    let parsedBill;
    try {
      parsedBill = await parseCojBill(buffer);
      console.log(`[TestAnalyze] Parsed bill: account=${parsedBill.accountNumber}, items=${parsedBill.lineItems.length}`);
    } catch (parseError) {
      console.error('PDF parse error:', parseError);
      return NextResponse.json({
        error: 'Failed to parse PDF',
        details: parseError instanceof Error ? parseError.message : 'Unknown error',
        stack: parseError instanceof Error ? parseError.stack : undefined,
        step: 'parsing',
      }, { status: 400 });
    }

    // Run the new core analysis engine
    let analysis;
    let actionPlans;
    try {
      console.log(`[TestAnalyze] Starting core analysis...`);
      analysis = analyzeBill(parsedBill);
      actionPlans = generateActionPlan(analysis);
      console.log(`[TestAnalyze] Analysis complete: verdict=${analysis.verdict}, findings=${analysis.findings.length}`);
    } catch (analysisError) {
      console.error('Analysis error:', analysisError);
      return NextResponse.json({
        error: 'Failed to analyze bill',
        details: analysisError instanceof Error ? analysisError.message : 'Unknown error',
        stack: analysisError instanceof Error ? analysisError.stack : undefined,
        step: 'analysis',
        parsedBill: {
          accountNumber: parsedBill.accountNumber,
          billDate: parsedBill.billDate,
          lineItems: parsedBill.lineItems.length,
        },
      }, { status: 500 });
    }

    // Convert analysis to the format expected by the frontend
    const findings: Finding[] = analysis.findings.map(f => ({
      title: f.title,
      explanation: f.detail,
      status: f.severity === 'critical' ? 'LIKELY_WRONG'
            : f.severity === 'warning' ? 'CANNOT_VERIFY'
            : f.severity === 'success' ? 'VERIFIED'
            : 'NOTED',
      impactMin: f.potentialSavings ? f.potentialSavings * 100 : 0, // Convert to cents
      impactMax: f.potentialSavings ? f.potentialSavings * 100 : 0,
      citation: {
        hasSource: true, // Core engine uses hardcoded FY 2025/26 tariffs
        excerpt: f.legalBasis || `FY 2025/26 Tariffs: Residential ${TARIFFS.rates.residential}, Business ${TARIFFS.rates.business}`,
        noSourceReason: undefined,
      },
      actionSteps: f.actionSteps,
    }));

    // Add service-level findings (verified services)
    for (const service of analysis.services) {
      const statusMap = {
        verified: 'VERIFIED',
        noted: 'NOTED',
        issue: 'LIKELY_WRONG',
      };

      findings.push({
        title: `${service.name}: R${service.billed.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
        explanation: service.note || (service.consumption ? `Consumption: ${service.consumption}` : 'Charge recorded'),
        status: statusMap[service.status] || 'NOTED',
        impactMin: 0,
        impactMax: 0,
        citation: {
          hasSource: service.status === 'verified',
          excerpt: service.status === 'verified' ? getTariffSource(service.name) : undefined,
          noSourceReason: service.status === 'issue' ? service.note : undefined,
        },
      });
    }

    // Count stats
    const stats = {
      verified: findings.filter(f => f.status === 'VERIFIED').length,
      likelyWrong: findings.filter(f => f.status === 'LIKELY_WRONG').length,
      cannotVerify: findings.filter(f => f.status === 'CANNOT_VERIFY').length,
      noted: findings.filter(f => f.status === 'NOTED').length,
    };

    return NextResponse.json({
      success: true,
      parsedBill: {
        billDate: parsedBill.billDate,
        dueDate: parsedBill.dueDate,
        totalDue: parsedBill.totalDue,
        accountNumber: parsedBill.accountNumber,
        propertyInfo: parsedBill.propertyInfo,
        lineItems: parsedBill.lineItems,
        rawTextLength: parsedBill.rawText?.length || 0,
        rawTextPreview: parsedBill.rawText?.substring(0, 500) || '',
      },
      analysis: {
        verdict: analysis.verdict,
        summary: analysis.summary,
        propertyType: analysis.propertyType,
        valuation: analysis.valuation,
        units: analysis.units,
        legalContext: analysis.legalContext,
      },
      verification: {
        summary: analysis.summary,
        recommendation: analysis.verdict === 'action_needed'
          ? 'Immediate action required'
          : analysis.verdict === 'review_recommended'
          ? 'Review recommended'
          : 'No action needed',
        totalImpactMin: analysis.findings.reduce((sum, f) => sum + (f.potentialSavings || 0), 0) * 100,
        totalImpactMax: analysis.findings.reduce((sum, f) => sum + (f.potentialSavings || 0), 0) * 100,
        stats,
        findings,
      },
      actionPlans: actionPlans.map(plan => ({
        type: plan.type,
        priority: plan.priority,
        title: plan.title,
        steps: plan.steps,
        contacts: plan.contacts,
        deadline: plan.deadline,
        disputeLetter: plan.disputeLetter,
      })),
      // What makes us better than ChatGPT
      sources: {
        tariffYear: 'FY 2025/26 (1 July 2025 - 30 June 2026)',
        legalFramework: [
          'Municipal Property Rates Act 6 of 2004 (MPRA)',
          'COJ Credit Control and Debt Collection Bylaw',
          'Prescription Act 68 of 1969',
        ],
        contacts: SA_MUNICIPAL_LAW.contacts,
      },
    });
  } catch (error) {
    console.error('Test analysis error:', error);
    return NextResponse.json({
      error: 'Analysis failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

/**
 * Get tariff source citation for a service
 */
function getTariffSource(serviceName: string): string {
  const sources: Record<string, string> = {
    'Electricity': 'City Power FY 2025/26 Tariff Schedule - Stepped residential/commercial rates',
    'Water': 'Joburg Water FY 2025/26 Tariff Schedule - 8-step consumption bands',
    'Rates': `COJ Property Rates: Residential ${TARIFFS.rates.residential}/R, Business ${TARIFFS.rates.business}/R (R300k rebate for primary residence)`,
    'Sewerage': 'Joburg Water FY 2025/26 - Per-unit sewerage charge',
    'Refuse': 'Pikitup FY 2025/26 - Standard refuse collection charge',
  };
  return sources[serviceName] || 'FY 2025/26 Official Tariff Schedule';
}
