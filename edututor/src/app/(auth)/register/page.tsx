'use client'

import { useState } from 'react'
import Link from 'next/link'
import { GraduationCap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export default function RegisterPage() {
  const [step, setStep] = useState<'parent' | 'student'>('parent')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Parent fields
  const [parentName, setParentName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')

  // Student fields
  const [studentName, setStudentName] = useState('')
  const [grade, setGrade] = useState('8')
  const [curriculum, setCurriculum] = useState<'CAPS' | 'IEB'>('CAPS')

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parentName,
          email,
          phone,
          password,
          studentName,
          grade: parseInt(grade),
          curriculum,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Registration failed')
      }

      window.location.href = '/onboarding'
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex items-center gap-2">
            <GraduationCap className="h-8 w-8 text-brand-600" />
            <span className="text-xl font-bold">EduTutor</span>
          </div>
          <CardTitle>Create your account</CardTitle>
          <CardDescription>
            {step === 'parent'
              ? 'Start with your details as the parent'
              : 'Now add your child\'s details'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
            )}

            {step === 'parent' ? (
              <>
                <div>
                  <label htmlFor="parentName" className="mb-1 block text-sm font-medium text-gray-700">
                    Your Name
                  </label>
                  <input
                    id="parentName"
                    type="text"
                    required
                    value={parentName}
                    onChange={(e) => setParentName(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label htmlFor="regEmail" className="mb-1 block text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <input
                    id="regEmail"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label htmlFor="phone" className="mb-1 block text-sm font-medium text-gray-700">
                    Phone (optional)
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    placeholder="+27..."
                  />
                </div>
                <div>
                  <label htmlFor="regPassword" className="mb-1 block text-sm font-medium text-gray-700">
                    Password
                  </label>
                  <input
                    id="regPassword"
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
                <Button type="button" className="w-full" onClick={() => setStep('student')}>
                  Next: Add Your Child
                </Button>
              </>
            ) : (
              <>
                <div>
                  <label htmlFor="studentName" className="mb-1 block text-sm font-medium text-gray-700">
                    Child&apos;s Name
                  </label>
                  <input
                    id="studentName"
                    type="text"
                    required
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label htmlFor="grade" className="mb-1 block text-sm font-medium text-gray-700">
                    Grade
                  </label>
                  <select
                    id="grade"
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  >
                    {[8, 9, 10, 11, 12].map((g) => (
                      <option key={g} value={g}>
                        Grade {g}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Curriculum</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="curriculum"
                        value="CAPS"
                        checked={curriculum === 'CAPS'}
                        onChange={() => setCurriculum('CAPS')}
                        className="text-brand-600 focus:ring-brand-500"
                      />
                      <span className="text-sm">CAPS</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="curriculum"
                        value="IEB"
                        checked={curriculum === 'IEB'}
                        onChange={() => setCurriculum('IEB')}
                        className="text-brand-600 focus:ring-brand-500"
                      />
                      <span className="text-sm">IEB</span>
                    </label>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button type="button" variant="outline" onClick={() => setStep('parent')}>
                    Back
                  </Button>
                  <Button type="submit" className="flex-1" disabled={loading}>
                    {loading ? 'Creating account...' : 'Create Account'}
                  </Button>
                </div>
              </>
            )}
          </form>
          <p className="mt-4 text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link href="/login" className="text-brand-600 hover:underline">
              Log in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
