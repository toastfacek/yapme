import { useState, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'

interface UseInviteReturn {
  isRecording: boolean
  isUploading: boolean
  inviteLink: string | null
  error: string | null
  startRecording: () => Promise<void>
  stopRecording: () => Promise<void>
  createInvite: () => Promise<string | null>
  reset: () => void
  audioBlob: Blob | null
}

export function useInvite(userId: string | null): UseInviteReturn {
  const [isRecording, setIsRecording] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  const startRecording = useCallback(async () => {
    if (!userId) {
      setError('Not authenticated')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      })

      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        setAudioBlob(blob)
        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop())
      }

      mediaRecorder.start()
      mediaRecorderRef.current = mediaRecorder
      setIsRecording(true)
      setError(null)
    } catch (err: any) {
      console.error('Failed to start recording:', err)
      setError(err.message || 'Failed to start recording')
    }
  }, [userId])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }, [isRecording])

  const generateInviteCode = (): string => {
    // Generate a short, URL-friendly code
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let code = ''
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return code
  }

  const createInvite = useCallback(async (): Promise<string | null> => {
    if (!userId || !audioBlob) {
      setError('No audio recorded')
      return null
    }

    setIsUploading(true)
    setError(null)

    try {
      // Generate unique code
      let code = generateInviteCode()
      let attempts = 0
      const maxAttempts = 10

      // Ensure code is unique (check against existing invites)
      while (attempts < maxAttempts) {
        const { data: existing } = await supabase
          .from('invites')
          .select('code')
          .eq('code', code)
          .single()

        if (!existing) {
          break // Code is unique
        }
        code = generateInviteCode()
        attempts++
      }

      if (attempts >= maxAttempts) {
        throw new Error('Failed to generate unique invite code')
      }

      // Upload audio to Supabase Storage
      const fileName = `${userId}/${code}.webm`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('invites')
        .upload(fileName, audioBlob, {
          contentType: 'audio/webm',
          upsert: false,
        })

      if (uploadError) {
        throw uploadError
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('invites')
        .getPublicUrl(fileName)

      if (!urlData?.publicUrl) {
        throw new Error('Failed to get public URL')
      }

      // Create invite record in database
      const { data: inviteData, error: dbError } = await supabase
        .from('invites')
        .insert({
          code,
          sender_id: userId,
          audio_url: urlData.publicUrl,
        })
        .select()
        .single()

      if (dbError) {
        // Clean up uploaded file if DB insert fails
        await supabase.storage.from('invites').remove([fileName])
        throw dbError
      }

      // Generate shareable link
      const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001'
      const link = `${serverUrl}/invite/${code}`
      setInviteLink(link)

      return link
    } catch (err: any) {
      console.error('Failed to create invite:', err)
      setError(err.message || 'Failed to create invite')
      return null
    } finally {
      setIsUploading(false)
    }
  }, [userId, audioBlob])

  const reset = useCallback(() => {
    setIsRecording(false)
    setIsUploading(false)
    setInviteLink(null)
    setError(null)
    setAudioBlob(null)
    audioChunksRef.current = []
    mediaRecorderRef.current = null
  }, [])

  return {
    isRecording,
    isUploading,
    inviteLink,
    error,
    startRecording,
    stopRecording,
    createInvite,
    reset,
    audioBlob,
  }
}

