import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { caseId, paymentRef } = await request.json();

    // Verify case belongs to user
    const caseRecord = await prisma.case.findFirst({
      where: {
        id: caseId,
        userId: user.id,
      },
    });

    if (!caseRecord) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    // TODO: Verify payment with Paystack
    // For MVP, accept any payment reference

    // Update case with payment
    await prisma.case.update({
      where: { id: caseId },
      data: {
        status: 'ACTIVE',
        pricePaid: 34900, // R349 in cents
        paymentRef,
        paidAt: new Date(),
        actions: {
          create: {
            type: 'CASE_CREATED',
            description: 'Payment received. Case is now active.',
          },
        },
      },
    });

    // Queue dispute drafting (in production, this would be async)
    // For MVP, we'll create a placeholder action
    await prisma.caseAction.create({
      data: {
        caseId,
        type: 'DISPUTE_DRAFTED',
        description: 'Dispute letter drafted based on verified findings.',
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Payment confirmation error:', error);
    return NextResponse.json({ error: 'Payment failed' }, { status: 500 });
  }
}
