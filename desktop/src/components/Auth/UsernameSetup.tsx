import React, { useState } from 'react'
import { supabase } from '@/lib/supabase'
import './UsernameSetup.css'

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
    <div className="username-setup">
      <div className="setup-content">
        <div className="setup-header">
          <div className="setup-icon">👋</div>
          <h2 className="setup-title">Choose your username</h2>
          <p className="setup-subtitle">
            Your friends will add you with this name
          </p>
        </div>

        <form onSubmit={handleSubmit} className="setup-form">
          <div className="input-group">
            <div className="input-prefix">yapme.xyz/</div>
            <input
              type="text"
              className="input-username"
              placeholder="username"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              autoFocus
              disabled={loading}
              maxLength={20}
            />
          </div>

          {error && (
            <div className="setup-error">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="button-primary"
            disabled={loading || !username}
          >
            {loading ? 'Creating...' : 'Continue'}
          </button>
        </form>

        <div className="setup-hint">
          <p className="text-xs text-tertiary">
            3-20 characters • letters, numbers, underscore
          </p>
        </div>
      </div>
    </div>
  )
}
