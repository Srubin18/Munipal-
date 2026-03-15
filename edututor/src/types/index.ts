export interface SubjectWithTopics {
  id: string
  name: string
  grade: number
  curriculum: 'CAPS' | 'IEB'
  topics: TopicSummary[]
}

export interface TopicSummary {
  id: string
  name: string
  sortOrder: number
  contentCount: number
}

export interface SessionSummary {
  id: string
  subjectName: string | null
  startedAt: string
  endedAt: string | null
  durationMinutes: number | null
  topicsCovered: string[]
}

export interface StudentProfile {
  id: string
  name: string
  grade: number
  curriculum: 'CAPS' | 'IEB'
  totalSessionMinutes: number
  avgQuizScore: number | null
  memory: {
    learningStyle: string | null
    pace: string | null
    strengths: Record<string, string>
    weaknesses: Record<string, string>
    preferences: Record<string, string>
  } | null
}

export interface BillingInfo {
  remainingMinutes: number
  remainingHours: number
  bundles: Record<
    string,
    { hours: number; priceRands: number; label: string }
  >
}
