import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { User, AuthState } from '@/types'

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    error: null,
  })

  // Debug log on every render
  console.log('🔄 useAuth render - loading:', authState.loading, 'user:', authState.user?.username)

  useEffect(() => {
    // Check active session
    console.log('🔐 Checking auth session...')
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('🔐 Session:', session ? 'Found' : 'None')
      if (session?.user) {
        console.log('🔐 Loading user:', session.user.id)
        loadUser(session.user.id)
      } else {
        console.log('🔐 No session, showing login')
        setAuthState({ user: null, session: null, loading: false, error: null })
      }
    }).catch((error) => {
      console.error('🔐 getSession error:', error)
      setAuthState({ user: null, session: null, loading: false, error: error.message })
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        await loadUser(session.user.id)
      } else {
        setAuthState({ user: null, session: null, loading: false, error: null })
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const loadUser = async (userId: string) => {
    try {
      console.log('👤 Loading user from database:', userId)

      // Use native fetch with AbortController for reliable timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => {
        console.log('👤 Aborting query due to timeout')
        controller.abort()
      }, 5000)

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

      console.log('👤 Fetching with native fetch...')
      const response = await fetch(
        `${supabaseUrl}/rest/v1/users?id=eq.${userId}&select=*`,
        {
          method: 'GET',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation',
          },
          signal: controller.signal,
        }
      )

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const users = await response.json()
      console.log('👤 Fetch response:', users)

      if (!users || users.length === 0) {
        console.log('👤 User not found in DB, showing username setup')
        const { data: { session } } = await supabase.auth.getSession()
        setAuthState({ user: null, session, loading: false, error: null })
        return
      }

      const data = users[0]
      console.log('👤 User loaded successfully:', data.username)

      console.log('👤 Getting session...')
      const sessionResult = await supabase.auth.getSession()
      console.log('👤 Session result:', sessionResult)
      const session = sessionResult?.data?.session || null

      const newState = { user: data as User, session, loading: false, error: null }
      console.log('👤 Setting auth state:', newState)

      // Use functional update to ensure React triggers re-render
      setAuthState(prev => {
        console.log('👤 setState callback - prev:', prev, 'new:', newState)
        return newState
      })
    } catch (err: any) {
      console.error('👤 Load user error:', err)

      // Check if it was an abort error
      if (err.name === 'AbortError') {
        console.error('👤 Query was aborted due to timeout')
      }

      // On error, still try to get session and show error state
      const { data: { session } } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }))
      setAuthState({ user: null, session: session, loading: false, error: err.message || 'Failed to load user' })
    }
  }

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      setAuthState({ user: null, session: null, loading: false, error: null })
    } catch (err: any) {
      console.error('Sign out error:', err)
      setAuthState((prev) => ({ ...prev, error: err.message }))
    }
  }

  const refreshUser = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      await loadUser(session.user.id)
    }
  }

  return {
    ...authState,
    signOut,
    refreshUser,
  }
}
