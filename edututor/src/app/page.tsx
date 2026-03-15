import Link from 'next/link'
import { BookOpen, Mic, Brain, GraduationCap } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-8 w-8 text-brand-600" />
            <span className="text-xl font-bold text-gray-900">EduTutor</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost">Log in</Button>
            </Link>
            <Link href="/register">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-4 py-20 text-center">
          <h1 className="text-5xl font-bold tracking-tight text-gray-900">
            Your AI Tutor.
            <br />
            <span className="text-brand-600">Always ready to teach.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600">
            Voice-powered AI tutoring for Grade 8-12 South African students.
            CAPS and IEB curriculum. Past papers, quizzes, and lessons
            personalized to how your child learns best.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <Link href="/register">
              <Button size="lg" className="text-base">
                Start Learning - R100/hour
              </Button>
            </Link>
          </div>
        </section>

        {/* Features */}
        <section className="mx-auto max-w-6xl px-4 pb-20">
          <div className="grid gap-8 md:grid-cols-3">
            <div className="rounded-2xl border bg-white p-8">
              <Mic className="mb-4 h-10 w-10 text-brand-600" />
              <h3 className="mb-2 text-lg font-semibold">Voice AI Tutor</h3>
              <p className="text-gray-600">
                Talk to your tutor naturally. Ask questions, work through
                problems, and get instant explanations — all by voice.
              </p>
            </div>
            <div className="rounded-2xl border bg-white p-8">
              <Brain className="mb-4 h-10 w-10 text-brand-600" />
              <h3 className="mb-2 text-lg font-semibold">Remembers Your Child</h3>
              <p className="text-gray-600">
                The AI learns how your child likes to be taught. It adapts its
                pace, style, and examples to match their unique learning needs.
              </p>
            </div>
            <div className="rounded-2xl border bg-white p-8">
              <BookOpen className="mb-4 h-10 w-10 text-brand-600" />
              <h3 className="mb-2 text-lg font-semibold">CAPS &amp; IEB Content</h3>
              <p className="text-gray-600">
                Past papers, practice quizzes, and exam prep for all subjects.
                Aligned to the South African curriculum your child follows.
              </p>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="border-t bg-white py-20">
          <div className="mx-auto max-w-6xl px-4 text-center">
            <h2 className="text-3xl font-bold text-gray-900">Simple, Affordable Pricing</h2>
            <p className="mt-2 text-gray-600">Buy hours. Use them anytime. No subscriptions.</p>

            <div className="mt-12 grid gap-6 md:grid-cols-3 max-w-3xl mx-auto">
              <div className="rounded-2xl border-2 border-gray-200 p-8">
                <h3 className="text-lg font-semibold">1 Hour</h3>
                <p className="mt-2 text-4xl font-bold text-gray-900">R100</p>
                <p className="mt-1 text-sm text-gray-500">Try it out</p>
              </div>
              <div className="rounded-2xl border-2 border-brand-500 bg-brand-50 p-8 relative">
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-600 px-3 py-1 text-xs font-medium text-white">
                  Best Value
                </span>
                <h3 className="text-lg font-semibold">5 Hours</h3>
                <p className="mt-2 text-4xl font-bold text-gray-900">R450</p>
                <p className="mt-1 text-sm text-gray-500">Save R50</p>
              </div>
              <div className="rounded-2xl border-2 border-gray-200 p-8">
                <h3 className="text-lg font-semibold">10 Hours</h3>
                <p className="mt-2 text-4xl font-bold text-gray-900">R800</p>
                <p className="mt-1 text-sm text-gray-500">Save R200</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white py-8">
        <div className="mx-auto max-w-6xl px-4 text-center text-sm text-gray-500">
          <p>&copy; 2026 EduTutor. AI-powered tutoring for South African students.</p>
        </div>
      </footer>
    </div>
  )
}
