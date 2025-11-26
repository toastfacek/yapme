import React, { useState } from 'react'
import { supabase } from '@/lib/supabase'
import './AddFriend.css'

interface AddFriendProps {
  onClose: () => void
  currentUserId: string
}

export const AddFriend: React.FC<AddFriendProps> = ({ onClose, currentUserId }) => {
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!username.trim()) {
      setError('Please enter a username')
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Find user by username
      const { data: targetUser, error: findError } = await supabase
        .from('users')
        .select('id, username')
        .eq('username', username.toLowerCase().trim())
        .single()

      if (findError || !targetUser) {
        setError('User not found')
        return
      }

      if (targetUser.id === currentUserId) {
        setError("You can't add yourself")
        return
      }

      // Check if friendship already exists
      const { data: existing } = await supabase
        .from('friendships')
        .select('*')
        .or(`user_id.eq.${currentUserId},friend_id.eq.${currentUserId}`)
        .or(`user_id.eq.${targetUser.id},friend_id.eq.${targetUser.id}`)
        .single()

      if (existing) {
        setError('Friend request already sent or you are already friends')
        return
      }

      // Send friend request
      const { error: insertError } = await supabase
        .from('friendships')
        .insert({
          user_id: currentUserId,
          friend_id: targetUser.id,
          status: 'pending',
        })

      if (insertError) throw insertError

      setSuccess(true)
      setTimeout(() => {
        onClose()
        window.location.reload()
      }, 1500)
    } catch (err: any) {
      console.error('Add friend error:', err)
      setError(err.message || 'Failed to send friend request')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Add Friend</h3>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label className="form-label">Username</label>
            <input
              type="text"
              className="form-input"
              placeholder="friend_username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
              disabled={loading || success}
            />
          </div>

          {error && (
            <div className="form-error">
              {error}
            </div>
          )}

          {success && (
            <div className="form-success">
              Friend request sent! ✓
            </div>
          )}

          <button
            type="submit"
            className="button-primary"
            disabled={loading || success || !username.trim()}
          >
            {loading ? 'Sending...' : success ? 'Sent!' : 'Send Request'}
          </button>
        </form>
      </div>
    </div>
  )
}
