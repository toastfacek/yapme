import React, { useState } from 'react'
import { BuddyItem } from './BuddyItem'
import { AddFriend } from './AddFriend'
import type { Friend } from '@/types'
import './BuddyList.css'

interface BuddyListProps {
  friends: Friend[]
  selectedFriendId: string | null
  onSelectFriend: (friendId: string) => void
  currentUserId: string
}

export const BuddyList: React.FC<BuddyListProps> = ({
  friends,
  selectedFriendId,
  onSelectFriend,
  currentUserId,
}) => {
  const [showAddFriend, setShowAddFriend] = useState(false)

  const acceptedFriends = friends.filter((f) => f.friendship_status === 'accepted')
  const pendingRequests = friends.filter((f) => f.friendship_status === 'pending')

  return (
    <div className="buddy-list">
      <div className="buddy-list-header">
        <h2 className="buddy-list-title">Friends</h2>
        <button
          className="add-friend-button"
          onClick={() => setShowAddFriend(true)}
          title="Add friend"
        >
          +
        </button>
      </div>

      <div className="buddy-list-content">
        {acceptedFriends.length === 0 && pendingRequests.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">👋</div>
            <p className="empty-text">No friends yet</p>
            <button
              className="button-secondary"
              onClick={() => setShowAddFriend(true)}
            >
              Add your first friend
            </button>
          </div>
        ) : (
          <>
            {pendingRequests.length > 0 && (
              <div className="pending-section">
                <h3 className="section-title">Pending Requests</h3>
                {pendingRequests.map((friend) => (
                  <BuddyItem
                    key={friend.id}
                    friend={friend}
                    isSelected={false}
                    onSelect={() => {}}
                    isPending
                    currentUserId={currentUserId}
                  />
                ))}
              </div>
            )}

            {acceptedFriends.length > 0 && (
              <div className="friends-section">
                {acceptedFriends.map((friend) => (
                  <BuddyItem
                    key={friend.id}
                    friend={friend}
                    isSelected={selectedFriendId === friend.id}
                    onSelect={() => onSelectFriend(friend.id)}
                    isPending={false}
                    currentUserId={currentUserId}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {showAddFriend && (
        <AddFriend
          onClose={() => setShowAddFriend(false)}
          currentUserId={currentUserId}
        />
      )}
    </div>
  )
}
