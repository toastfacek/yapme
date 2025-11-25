import React, { useState } from 'react'
import { useAuth } from './hooks/useAuth'
import { useFriends } from './hooks/useFriends'
import { LoginScreen } from './components/Auth/LoginScreen'
import { UsernameSetup } from './components/Auth/UsernameSetup'
import { BuddyList } from './components/BuddyList/BuddyList'
import { PTTButton } from './components/PTT/PTTButton'
import './App.css'

function App() {
  const { user, session, loading: authLoading, signOut, refreshUser } = useAuth()
  const { friends, loading: friendsLoading } = useFriends(user?.id || null)
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null)

  // PTT state (will be connected to WebRTC later)
  const handlePTTStart = () => {
    console.log('🎤 Start talking to:', selectedFriendId)
    // TODO: Start WebRTC audio stream
  }

  const handlePTTEnd = () => {
    console.log('🔇 Stop talking')
    // TODO: Stop WebRTC audio stream
  }

  // Loading state
  if (authLoading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner">🎙️</div>
        <p>Loading YapMe...</p>
      </div>
    )
  }

  // Not logged in
  if (!session) {
    return <LoginScreen />
  }

  // Logged in but no username set
  if (session && !user) {
    return (
      <UsernameSetup
        userId={session.user.id}
        onComplete={() => refreshUser()}
      />
    )
  }

  // Main app
  const selectedFriend = friends.find((f) => f.id === selectedFriendId)
  const isPTTEnabled = !!selectedFriend && selectedFriend.status === 'available'

  return (
    <div className="app">
      <div className="app-header">
        <div className="header-user">
          <div className="user-status">
            <div className="status-dot available" />
          </div>
          <div className="user-info">
            <div className="user-username">{user?.username}</div>
            <div className="user-status-text">Available</div>
          </div>
        </div>
        <button className="header-logout" onClick={signOut} title="Sign out">
          ↪
        </button>
      </div>

      <div className="app-content">
        <BuddyList
          friends={friends}
          selectedFriendId={selectedFriendId}
          onSelectFriend={setSelectedFriendId}
          currentUserId={user?.id || ''}
        />

        <PTTButton
          isEnabled={isPTTEnabled}
          selectedFriendName={selectedFriend?.username || null}
          onPTTStart={handlePTTStart}
          onPTTEnd={handlePTTEnd}
        />
      </div>
    </div>
  )
}

export default App
