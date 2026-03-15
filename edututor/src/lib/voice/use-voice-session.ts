'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

interface UseVoiceSessionOptions {
  sessionId: string
  onTranscript?: (text: string, role: 'user' | 'assistant') => void
  onError?: (error: string) => void
  onStatusChange?: (status: VoiceStatus) => void
}

export type VoiceStatus = 'idle' | 'connecting' | 'connected' | 'listening' | 'speaking' | 'error'

export function useVoiceSession({
  sessionId,
  onTranscript,
  onError,
  onStatusChange,
}: UseVoiceSessionOptions) {
  const [status, setStatus] = useState<VoiceStatus>('idle')
  const wsRef = useRef<WebSocket | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)

  const updateStatus = useCallback(
    (newStatus: VoiceStatus) => {
      setStatus(newStatus)
      onStatusChange?.(newStatus)
    },
    [onStatusChange]
  )

  const connect = useCallback(async () => {
    try {
      updateStatus('connecting')

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaStreamRef.current = stream

      // Create audio context
      const audioContext = new AudioContext({ sampleRate: 24000 })
      audioContextRef.current = audioContext

      // Connect to our WebSocket proxy endpoint
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const ws = new WebSocket(
        `${protocol}//${window.location.host}/api/voice?sessionId=${sessionId}`
      )
      wsRef.current = ws

      ws.onopen = () => {
        updateStatus('connected')
        startAudioCapture(stream, ws)
      }

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data)
        handleServerMessage(data)
      }

      ws.onerror = () => {
        onError?.('Voice connection error')
        updateStatus('error')
      }

      ws.onclose = () => {
        updateStatus('idle')
        cleanup()
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to connect'
      onError?.(message)
      updateStatus('error')
    }
  }, [sessionId, updateStatus, onError])

  const disconnect = useCallback(() => {
    wsRef.current?.close()
    cleanup()
    updateStatus('idle')
  }, [updateStatus])

  function cleanup() {
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop())
    mediaStreamRef.current = null
    audioContextRef.current?.close()
    audioContextRef.current = null
  }

  function startAudioCapture(stream: MediaStream, ws: WebSocket) {
    const audioContext = audioContextRef.current!
    const source = audioContext.createMediaStreamSource(stream)
    const processor = audioContext.createScriptProcessor(4096, 1, 1)

    source.connect(processor)
    processor.connect(audioContext.destination)

    processor.onaudioprocess = (e) => {
      if (ws.readyState !== WebSocket.OPEN) return
      const inputData = e.inputBuffer.getChannelData(0)
      // Convert float32 to int16 PCM
      const pcm16 = new Int16Array(inputData.length)
      for (let i = 0; i < inputData.length; i++) {
        const s = Math.max(-1, Math.min(1, inputData[i]))
        pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff
      }
      // Convert to base64
      const bytes = new Uint8Array(pcm16.buffer)
      const binary = String.fromCharCode(...bytes)
      const base64 = btoa(binary)

      ws.send(
        JSON.stringify({
          type: 'input_audio_buffer.append',
          audio: base64,
        })
      )
    }
  }

  function handleServerMessage(data: Record<string, unknown>) {
    switch (data.type) {
      case 'response.audio_transcript.delta':
        onTranscript?.(data.delta as string, 'assistant')
        updateStatus('speaking')
        break
      case 'input_audio_buffer.speech_started':
        updateStatus('listening')
        break
      case 'conversation.item.input_audio_transcription.completed':
        onTranscript?.(data.transcript as string, 'user')
        break
      case 'response.done':
        updateStatus('connected')
        break
    }
  }

  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [disconnect])

  return {
    status,
    connect,
    disconnect,
    isConnected: status !== 'idle' && status !== 'error',
  }
}
