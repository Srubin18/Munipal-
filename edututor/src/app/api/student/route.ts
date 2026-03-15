import { NextRequest, NextResponse } from 'next/server'
import { getStudentProfile } from '@/lib/memory/memory-service'

/**
 * GET /api/student?id=xxx - Get student profile with memory and stats
 */
export async function GET(request: NextRequest) {
  const studentId = request.nextUrl.searchParams.get('id')
  if (!studentId) {
    return NextResponse.json({ error: 'Student ID required' }, { status: 400 })
  }

  try {
    const profile = await getStudentProfile(studentId)
    return NextResponse.json(profile)
  } catch (err) {
    console.error('Student profile error:', err)
    return NextResponse.json({ error: 'Student not found' }, { status: 404 })
  }
}
