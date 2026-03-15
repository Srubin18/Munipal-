'use client'

import { GraduationCap, Clock, TrendingUp, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

export default function DashboardPage() {
  // TODO: Fetch real data from API
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <header className="border-b bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-7 w-7 text-brand-600" />
            <span className="text-lg font-bold">EduTutor</span>
          </div>
          <nav className="flex items-center gap-4">
            <Link href="/dashboard" className="text-sm font-medium text-brand-600">
              Dashboard
            </Link>
            <Link href="/subjects" className="text-sm font-medium text-gray-600 hover:text-gray-900">
              Subjects
            </Link>
            <Button variant="ghost" size="sm">
              Log out
            </Button>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900">Welcome back!</h1>
        <p className="mt-1 text-gray-600">Here&apos;s how your learning is going.</p>

        {/* Stats */}
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Hours Remaining</CardTitle>
              <Clock className="h-5 w-5 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">4.5 hrs</div>
              <p className="text-sm text-gray-500 mt-1">
                <Link href="/billing" className="text-brand-600 hover:underline">
                  Buy more hours
                </Link>
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Sessions This Week</CardTitle>
              <BookOpen className="h-5 w-5 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">3</div>
              <p className="text-sm text-gray-500 mt-1">2 hrs 15 min total</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Avg Quiz Score</CardTitle>
              <TrendingUp className="h-5 w-5 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">72%</div>
              <p className="text-sm text-green-600 mt-1">+5% from last week</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900">Quick Start</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Link href="/subjects">
              <Card className="cursor-pointer transition-all hover:shadow-md hover:border-brand-300">
                <CardContent className="flex items-center gap-4 p-6">
                  <div className="rounded-lg bg-brand-50 p-3">
                    <BookOpen className="h-6 w-6 text-brand-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Start a Tutoring Session</h3>
                    <p className="text-sm text-gray-500">Pick a subject and topic to begin learning</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
            <Card className="cursor-pointer transition-all hover:shadow-md hover:border-brand-300">
              <CardContent className="flex items-center gap-4 p-6">
                <div className="rounded-lg bg-purple-50 p-3">
                  <TrendingUp className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Practice Quiz</h3>
                  <p className="text-sm text-gray-500">Test yourself with AI-generated questions</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
