import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db/prisma'
import { createSupabaseAdmin } from '@/lib/db/supabase'

const registerSchema = z.object({
  parentName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  password: z.string().min(8),
  studentName: z.string().min(1),
  grade: z.number().int().min(8).max(12),
  curriculum: z.enum(['CAPS', 'IEB']),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = registerSchema.parse(body)

    const supabase = createSupabaseAdmin()

    // Create auth user in Supabase
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
    })

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: authError?.message || 'Failed to create account' },
        { status: 400 }
      )
    }

    // Create parent and student in database
    const parent = await prisma.parent.create({
      data: {
        email: data.email,
        name: data.parentName,
        phone: data.phone || null,
        authId: authData.user.id,
        students: {
          create: {
            name: data.studentName,
            grade: data.grade,
            curriculum: data.curriculum,
            memory: {
              create: {
                preferences: {},
                strengths: {},
                weaknesses: {},
              },
            },
          },
        },
      },
      include: { students: true },
    })

    return NextResponse.json({
      success: true,
      parentId: parent.id,
      studentId: parent.students[0].id,
    })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 })
    }
    console.error('Registration error:', err)
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 })
  }
}
