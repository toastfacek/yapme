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

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        loadUser(session.user.id)
      } else {
        setAuthState({ user: null, session: null, loading: false, error: null })
      }
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
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        // User doesn't exist in our users table yet
        if (error.code === 'PGRST116') {
          const { data: { session } } = await supabase.auth.getSession()
          setAuthState({ user: null, session, loading: false, error: null })
          return
        }
        throw error
      }

      const { data: { session } } = await supabase.auth.getSession()
      setAuthState({ user: data as User, session, loading: false, error: null })
    } catch (err: any) {
      console.error('Load user error:', err)
      setAuthState({ user: null, session: null, loading: false, error: err.message })
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
