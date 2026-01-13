import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const propertySchema = z.object({
  accountNumber: z.string().min(1),
  streetAddress: z.string().min(1),
  suburb: z.string().min(1),
  postalCode: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const data = propertySchema.parse(body);

    // Check if account already exists
    const existing = await prisma.property.findUnique({
      where: { accountNumber: data.accountNumber },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'This account number is already registered' },
        { status: 400 }
      );
    }

    const property = await prisma.property.create({
      data: {
        userId: user.id,
        accountNumber: data.accountNumber,
        streetAddress: data.streetAddress,
        suburb: data.suburb,
        postalCode: data.postalCode || null,
      },
    });

    return NextResponse.json({ success: true, propertyId: property.id });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Property creation error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
