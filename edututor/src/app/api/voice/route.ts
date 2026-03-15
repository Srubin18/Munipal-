import { NextRequest, NextResponse } from 'next/server'
import { buildRealtimeConfig, getRealtimeHeaders, getRealtimeUrl } from '@/lib/voice/realtime-client'
import { buildTutorSystemPrompt } from '@/lib/tutor/system-prompt'
import { prisma } from '@/lib/db/prisma'

/**
 * API route to get an ephemeral token for the OpenAI Realtime API.
 * The client uses this to establish a direct WebSocket connection.
 */
export async function POST(request: NextRequest) {
  try {
    const { sessionId, studentId, subject, topic } = await request.json()

    if (!studentId || !subject || !topic) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Load student data and memory
    const student = await prisma.student.findUniqueOrThrow({
      where: { id: studentId },
      include: { memory: true },
    })

    // Build the tutor system prompt with student memory
    const systemPrompt = buildTutorSystemPrompt(
      student.name,
      student.grade,
      student.curriculum,
      subject,
      topic,
      student.memory
    )

    // Get OpenAI Realtime config
    const config = buildRealtimeConfig(systemPrompt)

    // Create a session record
    const session = await prisma.session.create({
      data: {
        studentId,
        subjectName: subject,
        topicsCovered: [topic],
      },
    })

    return NextResponse.json({
      sessionId: session.id,
      realtimeUrl: getRealtimeUrl(config.model),
      realtimeHeaders: getRealtimeHeaders(),
      realtimeConfig: config,
    })
  } catch (err) {
    console.error('Voice session error:', err)
    return NextResponse.json(
      { error: 'Failed to create voice session' },
      { status: 500 }
    )
  }
}
