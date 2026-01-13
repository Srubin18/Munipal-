import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/db';
import { verifyBill, generateSummary } from '@/lib/verification/engine';
import { generateCaseNumber } from '@/lib/utils';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const billId = params.id;

    // Get bill with property
    const bill = await prisma.bill.findFirst({
      where: {
        id: billId,
        property: {
          userId: user.id,
        },
      },
      include: {
        property: true,
        lineItems: true,
      },
    });

    if (!bill) {
      return NextResponse.json({ error: 'Bill not found' }, { status: 404 });
    }

    // Build parsed bill from stored data
    const parsedBill = {
      billDate: bill.billDate,
      dueDate: bill.dueDate,
      periodStart: bill.periodStart,
      periodEnd: bill.periodEnd,
      totalDue: bill.totalDue,
      previousBalance: bill.previousBalance,
      currentCharges: bill.currentCharges,
      vatAmount: bill.vatAmount,
      accountNumber: bill.property.accountNumber,
      lineItems: bill.lineItems.map((item) => ({
        serviceType: item.serviceType as any,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        amount: item.amount,
        tariffCode: item.tariffCode,
        isEstimated: item.isEstimated,
      })),
      rawText: '',
    };

    // Run verification
    const result = await verifyBill(parsedBill);
    const summary = generateSummary(result);

    // Create case with findings
    const caseRecord = await prisma.case.create({
      data: {
        caseNumber: generateCaseNumber(),
        userId: user.id,
        propertyId: bill.propertyId,
        billId: bill.id,
        status: 'FINDINGS_READY',
        summary,
        estimatedImpactMin: result.totalImpactMin,
        estimatedImpactMax: result.totalImpactMax,
        findings: {
          create: result.findings.map((f) => ({
            checkType: f.checkType,
            checkName: f.checkName,
            status: f.status,
            confidence: f.confidence,
            title: f.title,
            explanation: f.explanation,
            impactMin: f.impactMin || null,
            impactMax: f.impactMax || null,
            hasSource: f.citation.hasSource,
            knowledgeDocumentId: f.citation.knowledgeDocumentId || null,
            knowledgeChunkId: f.citation.knowledgeChunkId || null,
            excerpt: f.citation.excerpt || null,
            noSourceReason: f.citation.noSourceReason || null,
          })),
        },
        actions: {
          create: {
            type: 'CASE_CREATED',
            description: 'Bill analysis completed',
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      caseId: caseRecord.id,
      summary: result.summary,
      recommendation: result.recommendation,
    });
  } catch (error) {
    console.error('Analysis error:', error);
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 });
  }
}
