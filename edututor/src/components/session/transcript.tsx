'use client'

import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

interface TranscriptMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface TranscriptProps {
  messages: TranscriptMessage[]
}

export function Transcript({ messages }: TranscriptProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [messages])

  if (messages.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-gray-400">
        <p>Start a voice session to begin your tutoring lesson</p>
      </div>
    )
  }

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((msg, i) => (
        <div
          key={i}
          className={cn(
            'flex',
            msg.role === 'user' ? 'justify-end' : 'justify-start'
          )}
        >
          <div
            className={cn(
              'max-w-[80%] rounded-2xl px-4 py-2 text-sm',
              msg.role === 'user'
                ? 'bg-brand-600 text-white rounded-br-sm'
                : 'bg-gray-100 text-gray-900 rounded-bl-sm'
            )}
          >
            <p className="text-xs font-medium mb-1 opacity-70">
              {msg.role === 'user' ? 'You' : 'Tutor'}
            </p>
            <p>{msg.content}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
