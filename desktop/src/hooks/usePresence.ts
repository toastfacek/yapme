import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

type Status = 'active' | 'away' | 'dnd' | 'offline'

const IDLE_TIMEOUT_MS = 5 * 60 * 1000 // 5 minutes

export const usePresence = (userId: string | null) => {
  const [status, setStatus] = useState<Status>('offline')
  const [isIdle, setIsIdle] = useState(false)
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null)
  const lastActivityRef = useRef<number>(Date.now())
  const isManualStatusRef = useRef(false) // Track if user manually set status

  // Load initial status from database
  useEffect(() => {
    if (!userId) {
      setStatus('offline')
      return
    }

    const loadStatus = async () => {
      const { data, error } = await supabase
        .from('users')
        .select('status')
        .eq('id', userId)
        .single()

      if (!error && data) {
        setStatus((data.status as Status) || 'offline')
        isManualStatusRef.current = data.status === 'dnd' // DND is always manual
      }
    }

    loadStatus()
  }, [userId])

  // Update status in database
  const updateStatusInDB = useCallback(async (newStatus: Status) => {
    if (!userId) return

    const { error } = await supabase
      .from('users')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', userId)

    if (error) {
      console.error('Failed to update status:', error)
    }
  }, [userId])

  // Track user activity
  const resetIdleTimer = useCallback(() => {
    lastActivityRef.current = Date.now()
    setIsIdle(false)

    // Clear existing timer
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current)
    }

    // Only auto-away if status is 'active' (not manual DND)
    if (status === 'active' && !isManualStatusRef.current) {
      idleTimerRef.current = setTimeout(() => {
        setIsIdle(true)
        setStatus('away')
        updateStatusInDB('away')
      }, IDLE_TIMEOUT_MS)
    }
  }, [status, updateStatusInDB])

  // Set up activity listeners
  useEffect(() => {
    if (!userId || status === 'dnd' || status === 'offline') return

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
    
    events.forEach(event => {
      document.addEventListener(event, resetIdleTimer, { passive: true })
    })

    // Initial timer
    resetIdleTimer()

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, resetIdleTimer)
      })
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current)
      }
    }
  }, [userId, status, resetIdleTimer])

  // Handle window focus/blur for auto status
  useEffect(() => {
    if (!userId) return

    const handleFocus = () => {
      if (status === 'away' && !isManualStatusRef.current) {
        setStatus('active')
        updateStatusInDB('active')
        resetIdleTimer()
      }
    }

    const handleBlur = () => {
      // Don't auto-away on blur, wait for idle timeout
      // This allows users to switch windows without going away
    }

    window.addEventListener('focus', handleFocus)
    window.addEventListener('blur', handleBlur)

    return () => {
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('blur', handleBlur)
    }
  }, [userId, status, resetIdleTimer, updateStatusInDB])

  // Set status manually
  const setStatusManually = useCallback(async (newStatus: Status) => {
    isManualStatusRef.current = newStatus === 'dnd' // DND is always manual
    setStatus(newStatus)
    await updateStatusInDB(newStatus)
    
    // Reset idle timer if setting to active
    if (newStatus === 'active') {
      resetIdleTimer()
    } else {
      // Clear idle timer for non-active statuses
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current)
        idleTimerRef.current = null
      }
    }
  }, [updateStatusInDB, resetIdleTimer])

  // Set offline when app closes
  useEffect(() => {
    if (!userId) return

    const handleBeforeUnload = () => {
      // Use sendBeacon for reliable status update on close
      const statusUpdate = async () => {
        await updateStatusInDB('offline')
      }
      // Fire and forget - don't await
      statusUpdate()
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      // Also update on cleanup
      if (userId) {
        updateStatusInDB('offline').catch(() => {})
      }
    }
  }, [userId, updateStatusInDB])

  return {
    status,
    isIdle,
    setStatus: setStatusManually,
  }
}

