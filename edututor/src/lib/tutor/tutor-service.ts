import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '@/lib/db/prisma'
import { buildTutorSystemPrompt } from './system-prompt'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

interface TutorMessage {
  role: 'user' | 'assistant'
  content: string
}

export async function getTutorResponse(
  studentId: string,
  subject: string,
  topic: string,
  conversationHistory: TutorMessage[],
  userMessage: string
): Promise<string> {
  const student = await prisma.student.findUniqueOrThrow({
    where: { id: studentId },
    include: { memory: true },
  })

  const systemPrompt = buildTutorSystemPrompt(
    student.name,
    student.grade,
    student.curriculum,
    subject,
    topic,
    student.memory
  )

  const messages = [
    ...conversationHistory.map((msg) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    })),
    { role: 'user' as const, content: userMessage },
  ]

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: systemPrompt,
    messages,
  })

  const textBlock = response.content.find((block) => block.type === 'text')
  return textBlock?.text ?? 'I didn\'t quite catch that. Could you say it again?'
}

export async function updateStudentMemory(
  studentId: string,
  sessionId: string,
  observations: { key: string; value: string }[]
): Promise<void> {
  await prisma.memoryEntry.createMany({
    data: observations.map((obs) => ({
      studentId,
      sessionId,
      key: obs.key,
      value: obs.value,
    })),
  })
}

export async function generateQuiz(
  subject: string,
  topic: string,
  grade: number,
  curriculum: string,
  difficulty: 'easy' | 'medium' | 'hard',
  questionCount: number = 5
): Promise<{
  questions: {
    question: string
    options: string[]
    correctIndex: number
    explanation: string
  }[]
}> {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system: `You are a ${curriculum} curriculum expert for South African Grade ${grade} ${subject}. Generate quiz questions in JSON format only.`,
    messages: [
      {
        role: 'user',
        content: `Generate ${questionCount} ${difficulty} multiple-choice questions about "${topic}" for Grade ${grade} ${subject} (${curriculum} curriculum).

Return ONLY valid JSON in this format:
{
  "questions": [
    {
      "question": "...",
      "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "correctIndex": 0,
      "explanation": "..."
    }
  ]
}`,
      },
    ],
  })

  const textBlock = response.content.find((block) => block.type === 'text')
  const parsed = JSON.parse(textBlock?.text ?? '{"questions":[]}')
  return parsed
}
