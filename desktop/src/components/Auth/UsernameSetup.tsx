import React, { useState } from 'react'
import { supabase } from '@/lib/supabase'

interface UsernameSetupProps {
  userId: string
  onComplete: () => void
}

export const UsernameSetup: React.FC<UsernameSetupProps> = ({ userId, onComplete }) => {
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const validateUsername = (value: string): boolean => {
    return /^[a-zA-Z0-9_]{3,20}$/.test(value)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateUsername(username)) {
      setError('Username must be 3-20 characters (letters, numbers, underscore)')
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Check if username is available
      const { data: existing } = await supabase
        .from('users')
        .select('username')
        .eq('username', username.toLowerCase())
        .single()

      if (existing) {
        setError('Username already taken')
        return
      }

      // Create user record
      const { error: insertError } = await supabase
        .from('users')
        .insert({
          id: userId,
          username: username.toLowerCase(),
          status: 'available',
        })

      if (insertError) throw insertError

      onComplete()
    } catch (err: any) {
      console.error('Username setup error:', err)
      setError(err.message || 'Failed to set username')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-bone">
      <div className="w-96 p-8 bg-concrete border-2 border-ink shadow-hard">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">👋</div>
          <h2 className="text-2xl font-mono font-bold uppercase mb-2">Choose your username</h2>
          <p className="text-sm text-ink/60">
            Your friends will add you with this name
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex border-2 border-ink bg-bone overflow-hidden">
            <div className="px-3 py-2 bg-concrete border-r-2 border-ink flex items-center">
              <span className="text-sm font-mono text-ink/60">yapme.xyz/</span>
            </div>
            <input
              type="text"
              className="flex-1 px-3 py-2 bg-bone focus:outline-none font-mono"
              placeholder="username"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              autoFocus
              disabled={loading}
              maxLength={20}
            />
          </div>

          {error && (
            <div className="p-3 bg-error text-white border-2 border-ink text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3 bg-signal text-white font-bold border-2 border-ink shadow-hard-sm hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all disabled:opacity-50 disabled:cursor-not-allowed uppercase"
            disabled={loading || !username}
          >
            {loading ? 'Creating...' : 'Continue'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-xs text-ink/60">
            3-20 characters • letters, numbers, underscore
          </p>
        </div>
      </div>
    </div>
  )
}
