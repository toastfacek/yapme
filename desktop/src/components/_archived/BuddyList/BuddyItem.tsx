import React from 'react'
import { supabase } from '@/lib/supabase'
import type { Friend } from '@/types'
import './BuddyItem.css'

interface BuddyItemProps {
  friend: Friend
  isSelected: boolean
  onSelect: () => void
  isPending: boolean
  currentUserId: string
}

export const BuddyItem: React.FC<BuddyItemProps> = ({
  friend,
  isSelected,
  onSelect,
  isPending,
  currentUserId,
}) => {
  const handleAccept = async () => {
    try {
      await supabase
        .from('friendships')
        .update({ status: 'accepted' })
        .eq('id', friend.friendship_id)

      // Reload friends list
      window.location.reload()
    } catch (err) {
      console.error('Accept friend error:', err)
    }
  }

  const handleDecline = async () => {
    try {
      await supabase
        .from('friendships')
        .delete()
        .eq('id', friend.friendship_id)

      // Reload friends list
      window.location.reload()
    } catch (err) {
      console.error('Decline friend error:', err)
    }
  }

  if (isPending) {
    return (
      <div className="buddy-item pending">
        <div className="buddy-info">
          <div className="buddy-username">{friend.username}</div>
          <div className="buddy-status-text">Friend request</div>
        </div>
        <div className="pending-actions">
          <button className="accept-button" onClick={handleAccept}>
            ✓
          </button>
          <button className="decline-button" onClick={handleDecline}>
            ✕
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`buddy-item ${isSelected ? 'selected' : ''} ${friend.status}`}
      onClick={onSelect}
    >
      <div className="status-indicator">
        <div className={`status-dot ${friend.status}`} />
      </div>
      <div className="buddy-info">
        <div className="buddy-username">{friend.username}</div>
        <div className="buddy-status-text">
          {friend.status === 'available' ? 'Available' : 'Offline'}
        </div>
      </div>
    </div>
  )
}
