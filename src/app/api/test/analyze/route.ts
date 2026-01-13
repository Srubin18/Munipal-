import { NextResponse } from 'next/server';
import { parseCojBill } from '@/lib/parsers/coj-bill';
import { verifyBill, generateSummary } from '@/lib/verification/engine';

/**
 * Test endpoint - no auth required
 * For creator/admin testing only
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
    const propertyValueStr = formData.get('propertyValue') as string | null;
    const propertyValue = propertyValueStr ? parseInt(propertyValueStr, 10) : undefined;

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

    // Run verification
    let verificationResult;
    try {
      console.log(`[TestAnalyze] Starting verification...`);
      verificationResult = await verifyBill(parsedBill, { propertyValue });
      console.log(`[TestAnalyze] Verification complete: ${verificationResult.findings.length} findings`);
    } catch (verifyError) {
      console.error('Verification error:', verifyError);
      return NextResponse.json({
        error: 'Failed to verify bill',
        details: verifyError instanceof Error ? verifyError.message : 'Unknown error',
        stack: verifyError instanceof Error ? verifyError.stack : undefined,
        step: 'verification',
        parsedBill: {
          accountNumber: parsedBill.accountNumber,
          billDate: parsedBill.billDate,
          lineItems: parsedBill.lineItems.length,
        },
      }, { status: 500 });
    }

    const summary = generateSummary(verificationResult);

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
      verification: {
        summary,
        recommendation: verificationResult.recommendation,
        totalImpactMin: verificationResult.totalImpactMin,
        totalImpactMax: verificationResult.totalImpactMax,
        stats: verificationResult.summary,
        findings: verificationResult.findings,
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
