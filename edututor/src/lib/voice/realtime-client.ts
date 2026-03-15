/**
 * OpenAI Realtime API client for voice tutoring sessions.
 *
 * This runs on the server and manages a WebSocket connection to OpenAI's
 * Realtime API. The client-side connects via our own WebSocket endpoint
 * which proxies audio between the browser and OpenAI.
 */

const OPENAI_REALTIME_URL = 'wss://api.openai.com/v1/realtime'

export interface RealtimeConfig {
  model?: string
  voice?: string
  instructions: string
  inputAudioTranscription?: { model: string }
  turnDetection?: {
    type: string
    threshold?: number
    prefix_padding_ms?: number
    silence_duration_ms?: number
  }
}

export function buildRealtimeConfig(tutorSystemPrompt: string): RealtimeConfig {
  return {
    model: 'gpt-4o-realtime-preview',
    voice: 'alloy',
    instructions: tutorSystemPrompt,
    inputAudioTranscription: {
      model: 'whisper-1',
    },
    turnDetection: {
      type: 'server_vad',
      threshold: 0.5,
      prefix_padding_ms: 300,
      silence_duration_ms: 500,
    },
  }
}

export function getRealtimeHeaders(): Record<string, string> {
  return {
    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    'OpenAI-Beta': 'realtime=v1',
  }
}

export function getRealtimeUrl(model: string = 'gpt-4o-realtime-preview'): string {
  return `${OPENAI_REALTIME_URL}?model=${model}`
}
