import React, { useState } from 'react'
import { supabase } from '@/lib/supabase'

export const LoginScreen: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleGoogleLogin = async () => {
    try {
      setLoading(true)
      setError(null)

      // Use http://localhost:5173 for dev (Vite dev server)
      // In production, use a custom protocol or handle differently
      const redirectTo = import.meta.env.DEV
        ? 'http://localhost:5173'
        : 'yapme://auth-callback'

      console.log('🔐 Attempting login with redirectTo:', redirectTo)

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
        },
      })

      if (error) throw error
    } catch (err: any) {
      console.error('❌ Login error:', err)
      setError(err.message || 'Failed to login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-bone">
      <div className="w-96 p-8 bg-concrete border-2 border-ink shadow-hard">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🎙️</div>
          <h1 className="text-3xl font-mono font-bold uppercase mb-2">YapMe</h1>
          <p className="text-sm text-ink/60">Voice-only buddy list</p>
        </div>

        <button
          className="w-full py-3 bg-signal text-white font-bold border-2 border-ink shadow-hard-sm hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleGoogleLogin}
          disabled={loading}
        >
          {loading ? 'Connecting...' : 'Continue with Google'}
        </button>

        {error && (
          <div className="mt-4 p-3 bg-error text-white border-2 border-ink text-sm">
            {error}
          </div>
        )}

        <div className="mt-6 text-center">
          <p className="text-sm text-ink/60">
            Push-to-talk with your friends instantly
          </p>
        </div>
      </div>
    </div>
  )
}
