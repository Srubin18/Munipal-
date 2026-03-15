'use client'

import { Mic, MicOff, Phone, PhoneOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { type VoiceStatus } from '@/lib/voice/use-voice-session'
import { cn } from '@/lib/utils'

interface VoiceControlsProps {
  status: VoiceStatus
  onConnect: () => void
  onDisconnect: () => void
  isConnected: boolean
}

const STATUS_LABELS: Record<VoiceStatus, string> = {
  idle: 'Start Voice Tutor',
  connecting: 'Connecting...',
  connected: 'Ready - speak to your tutor',
  listening: 'Listening...',
  speaking: 'Tutor is speaking...',
  error: 'Connection error',
}

const STATUS_COLORS: Record<VoiceStatus, string> = {
  idle: 'bg-gray-100 text-gray-600',
  connecting: 'bg-yellow-100 text-yellow-700',
  connected: 'bg-green-100 text-green-700',
  listening: 'bg-blue-100 text-blue-700 animate-pulse',
  speaking: 'bg-purple-100 text-purple-700',
  error: 'bg-red-100 text-red-700',
}

export function VoiceControls({
  status,
  onConnect,
  onDisconnect,
  isConnected,
}: VoiceControlsProps) {
  return (
    <div className="flex items-center gap-4">
      <div
        className={cn(
          'rounded-full px-4 py-2 text-sm font-medium transition-colors',
          STATUS_COLORS[status]
        )}
      >
        <div className="flex items-center gap-2">
          {status === 'listening' ? (
            <Mic className="h-4 w-4" />
          ) : status === 'idle' || status === 'error' ? (
            <MicOff className="h-4 w-4" />
          ) : (
            <Mic className="h-4 w-4" />
          )}
          {STATUS_LABELS[status]}
        </div>
      </div>

      {isConnected ? (
        <Button variant="destructive" size="sm" onClick={onDisconnect}>
          <PhoneOff className="mr-2 h-4 w-4" />
          End Session
        </Button>
      ) : (
        <Button size="sm" onClick={onConnect} disabled={status === 'connecting'}>
          <Phone className="mr-2 h-4 w-4" />
          Start Voice Tutor
        </Button>
      )}
    </div>
  )
}
