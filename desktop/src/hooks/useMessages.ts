import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export interface Message {
  id: string
  sender_id: string
  recipient_id: string
  duration_ms: number
  status: 'sent' | 'delivered' | 'missed'
  created_at: string
}

export const useMessages = (userId: string | null) => {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) {
      setMessages([])
      setLoading(false)
      return
    }

    loadMessages()

    // Subscribe to new messages
    const channel = supabase
      .channel('messages-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `sender_id=eq.${userId}`,
        },
        () => {
          loadMessages()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `recipient_id=eq.${userId}`,
        },
        () => {
          loadMessages()
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [userId])

  const loadMessages = async () => {
    if (!userId) return

    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
        .order('created_at', { ascending: false })
        .limit(50) // Last 50 messages

      if (fetchError) throw fetchError

      setMessages((data || []) as Message[])
    } catch (err: any) {
      console.error('Load messages error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const createMessage = async (
    recipientId: string,
    durationMs: number,
    status: 'sent' | 'delivered' | 'missed' = 'sent'
  ) => {
    if (!userId) return

    try {
      const { data, error: insertError } = await supabase
        .from('messages')
        .insert({
          sender_id: userId,
          recipient_id: recipientId,
          duration_ms: durationMs,
          status,
        })
        .select()
        .single()

      if (insertError) throw insertError

      // Add to local state
      setMessages((prev) => [data as Message, ...prev])

      return data as Message
    } catch (err: any) {
      console.error('Create message error:', err)
      throw err
    }
  }

  const getMissedCount = (): number => {
    return messages.filter(
      (m) => m.recipient_id === userId && m.status === 'missed'
    ).length
  }

  const markAsRead = async (messageId: string) => {
    if (!userId) return

    try {
      const { error: updateError } = await supabase
        .from('messages')
        .update({ status: 'delivered' })
        .eq('id', messageId)
        .eq('recipient_id', userId)
        .eq('status', 'missed')

      if (updateError) throw updateError

      // Update local state
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId && m.recipient_id === userId && m.status === 'missed'
            ? { ...m, status: 'delivered' }
            : m
        )
      )
    } catch (err: any) {
      console.error('Mark as read error:', err)
    }
  }

  return {
    messages,
    loading,
    error,
    createMessage,
    getMissedCount,
    markAsRead,
    refresh: loadMessages,
  }
}

