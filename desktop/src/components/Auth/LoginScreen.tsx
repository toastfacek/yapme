import React, { useState } from 'react'
import { supabase } from '@/lib/supabase'
import './LoginScreen.css'

export const LoginScreen: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleGoogleLogin = async () => {
    try {
      setLoading(true)
      setError(null)

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      })

      if (error) throw error
    } catch (err: any) {
      console.error('Login error:', err)
      setError(err.message || 'Failed to login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-screen">
      <div className="login-content">
        <div className="login-logo">
          <div className="logo-icon">🎙️</div>
          <h1 className="logo-text">YapList</h1>
          <p className="logo-tagline">Voice-only buddy list</p>
        </div>

        <div className="login-actions">
          <button
            className="button-primary"
            onClick={handleGoogleLogin}
            disabled={loading}
          >
            {loading ? 'Connecting...' : 'Continue with Google'}
          </button>

          {error && (
            <div className="login-error">
              {error}
            </div>
          )}
        </div>

        <div className="login-footer">
          <p className="text-sm text-tertiary">
            Push-to-talk with your friends instantly
          </p>
        </div>
      </div>
    </div>
  )
}
