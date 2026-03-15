import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'EduTutor - AI Voice Tutoring for SA Students',
  description:
    'AI-powered voice tutoring for Grade 8-12 South African students. CAPS and IEB curriculum. Past papers, quizzes, and personalized learning.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-gray-50 font-sans">{children}</body>
    </html>
  )
}
