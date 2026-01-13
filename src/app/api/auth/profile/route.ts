import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const profileSchema = z.object({
  userId: z.string(),
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().nullable(),
  category: z.enum(['RESIDENTIAL', 'COMMERCIAL', 'BUSINESS', 'DEVELOPER']),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = profileSchema.parse(body);

    // Check if profile already exists
    const existing = await prisma.user.findUnique({
      where: { id: data.userId },
    });

    if (existing) {
      return NextResponse.json({ success: true, userId: existing.id });
    }

    // Create user profile
    const user = await prisma.user.create({
      data: {
        id: data.userId, // Use Supabase auth user ID
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        category: data.category,
      },
    });

    return NextResponse.json({ success: true, userId: user.id });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Profile creation error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
