'use client'

import { GraduationCap } from 'lucide-react'
import { SubjectCard } from '@/components/student/subject-card'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

// TODO: Fetch from API based on student's grade and curriculum
const MOCK_SUBJECTS = [
  { id: '1', name: 'Mathematics', topicCount: 24 },
  { id: '2', name: 'Physical Sciences', topicCount: 18 },
  { id: '3', name: 'Life Sciences', topicCount: 20 },
  { id: '4', name: 'English Home Language', topicCount: 15 },
  { id: '5', name: 'Accounting', topicCount: 12 },
  { id: '6', name: 'Geography', topicCount: 16 },
  { id: '7', name: 'History', topicCount: 14 },
  { id: '8', name: 'Business Studies', topicCount: 10 },
]

export default function SubjectsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-7 w-7 text-brand-600" />
            <span className="text-lg font-bold">EduTutor</span>
          </div>
          <nav className="flex items-center gap-4">
            <Link href="/dashboard" className="text-sm font-medium text-gray-600 hover:text-gray-900">
              Dashboard
            </Link>
            <Link href="/subjects" className="text-sm font-medium text-brand-600">
              Subjects
            </Link>
            <Button variant="ghost" size="sm">
              Log out
            </Button>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900">Your Subjects</h1>
        <p className="mt-1 text-gray-600">Choose a subject to start a tutoring session</p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {MOCK_SUBJECTS.map((subject) => (
            <SubjectCard
              key={subject.id}
              id={subject.id}
              name={subject.name}
              topicCount={subject.topicCount}
            />
          ))}
        </div>
      </main>
    </div>
  )
}
