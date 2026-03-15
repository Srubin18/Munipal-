import { prisma } from '@/lib/db/prisma'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

interface ConversationTurn {
  role: 'user' | 'assistant'
  content: string
}

/**
 * Analyzes a completed tutoring session and updates the student's persistent memory.
 * Called at the end of each session to extract learning insights.
 */
export async function analyzeAndUpdateMemory(
  studentId: string,
  sessionId: string,
  conversation: ConversationTurn[]
): Promise<void> {
  const student = await prisma.student.findUniqueOrThrow({
    where: { id: studentId },
    include: { memory: true },
  })

  const currentMemory = student.memory

  // Use Claude to analyze the session and extract learning observations
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: `You analyze tutoring sessions to extract observations about a student's learning patterns. Output ONLY valid JSON.`,
    messages: [
      {
        role: 'user',
        content: `Analyze this tutoring conversation and extract observations about the student's learning.

Current student profile:
- Learning style: ${currentMemory?.learningStyle || 'unknown'}
- Pace: ${currentMemory?.pace || 'unknown'}
- Known strengths: ${JSON.stringify(currentMemory?.strengths || {})}
- Known weaknesses: ${JSON.stringify(currentMemory?.weaknesses || {})}

Conversation:
${conversation.map((t) => `${t.role}: ${t.content}`).join('\n')}

Return JSON:
{
  "learningStyle": "visual|auditory|reading|kinesthetic|null",
  "pace": "slow|medium|fast|null",
  "observations": [
    { "key": "observation_type", "value": "description" }
  ],
  "strengths": { "topic": "evidence" },
  "weaknesses": { "topic": "evidence" },
  "preferences": { "key": "value" }
}

Only include fields where you have new evidence. Use null for unchanged fields.`,
      },
    ],
  })

  const textBlock = response.content.find((block) => block.type === 'text')
  if (!textBlock) return

  const analysis = JSON.parse(textBlock.text)

  // Update student memory profile
  const updateData: Record<string, unknown> = {}
  if (analysis.learningStyle) updateData.learningStyle = analysis.learningStyle
  if (analysis.pace) updateData.pace = analysis.pace
  if (analysis.strengths && Object.keys(analysis.strengths).length > 0) {
    const existingStrengths = (currentMemory?.strengths as Record<string, string>) || {}
    updateData.strengths = { ...existingStrengths, ...analysis.strengths }
  }
  if (analysis.weaknesses && Object.keys(analysis.weaknesses).length > 0) {
    const existingWeaknesses = (currentMemory?.weaknesses as Record<string, string>) || {}
    updateData.weaknesses = { ...existingWeaknesses, ...analysis.weaknesses }
  }
  if (analysis.preferences && Object.keys(analysis.preferences).length > 0) {
    const existingPrefs = (currentMemory?.preferences as Record<string, string>) || {}
    updateData.preferences = { ...existingPrefs, ...analysis.preferences }
  }

  if (Object.keys(updateData).length > 0) {
    await prisma.studentMemory.upsert({
      where: { studentId },
      create: { studentId, ...updateData },
      update: updateData,
    })
  }

  // Store individual observations as memory entries
  if (analysis.observations?.length > 0) {
    await prisma.memoryEntry.createMany({
      data: analysis.observations.map((obs: { key: string; value: string }) => ({
        studentId,
        sessionId,
        key: obs.key,
        value: obs.value,
      })),
    })
  }
}

/**
 * Get a summary of a student's learning profile for display in dashboards.
 */
export async function getStudentProfile(studentId: string) {
  const student = await prisma.student.findUniqueOrThrow({
    where: { id: studentId },
    include: {
      memory: true,
      sessions: {
        orderBy: { startedAt: 'desc' },
        take: 10,
      },
      quizResults: {
        orderBy: { completedAt: 'desc' },
        take: 10,
      },
    },
  })

  const totalSessionMinutes = student.sessions.reduce(
    (sum, s) => sum + (s.durationMinutes || 0),
    0
  )
  const avgQuizScore =
    student.quizResults.length > 0
      ? student.quizResults.reduce((sum, r) => sum + r.score, 0) / student.quizResults.length
      : null

  return {
    ...student,
    totalSessionMinutes,
    avgQuizScore,
    recentSessions: student.sessions,
    recentQuizzes: student.quizResults,
  }
}
