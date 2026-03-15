'use client'

import { useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { GraduationCap, Clock } from 'lucide-react'
import { VoiceControls } from '@/components/session/voice-controls'
import { Transcript } from '@/components/session/transcript'
import { useVoiceSession, type VoiceStatus } from '@/lib/voice/use-voice-session'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

interface TranscriptMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export default function SessionPage() {
  const params = useParams()
  const sessionId = params.sessionId as string

  const [messages, setMessages] = useState<TranscriptMessage[]>([])
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>('idle')
  const [elapsedMinutes, setElapsedMinutes] = useState(0)

  const handleTranscript = useCallback((text: string, role: 'user' | 'assistant') => {
    setMessages((prev) => [
      ...prev,
      { role, content: text, timestamp: new Date() },
    ])
  }, [])

  const { connect, disconnect, isConnected } = useVoiceSession({
    sessionId,
    onTranscript: handleTranscript,
    onStatusChange: setVoiceStatus,
    onError: (err) => console.error('Voice error:', err),
  })

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Link href="/subjects" className="flex items-center gap-2">
              <GraduationCap className="h-6 w-6 text-brand-600" />
              <span className="font-bold">EduTutor</span>
            </Link>
            <span className="text-sm text-gray-400">|</span>
            <span className="text-sm font-medium text-gray-700">Mathematics - Algebra</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <Clock className="h-4 w-4" />
              <span>{elapsedMinutes} min</span>
            </div>
            <VoiceControls
              status={voiceStatus}
              onConnect={connect}
              onDisconnect={disconnect}
              isConnected={isConnected}
            />
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 mx-auto w-full max-w-6xl">
        {/* Content area (left) - shows questions, diagrams, explanations */}
        <div className="flex-1 p-6">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-lg">Lesson Content</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex h-full items-center justify-center text-gray-400">
                <div className="text-center">
                  <p className="text-lg font-medium">Ready to learn!</p>
                  <p className="mt-2 text-sm">
                    Start the voice tutor to begin your lesson.
                    <br />
                    Content will appear here as you work through problems.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Transcript (right) */}
        <div className="w-96 border-l bg-white flex flex-col">
          <div className="border-b px-4 py-3">
            <h2 className="text-sm font-semibold text-gray-700">Conversation</h2>
          </div>
          <Transcript messages={messages} />
        </div>
      </div>
    </div>
  )
}
