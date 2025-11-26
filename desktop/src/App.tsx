import React, { useState } from 'react'
import { useAuth } from './hooks/useAuth'
import { useFriends } from './hooks/useFriends'
import { useWebRTC } from './hooks/useWebRTC'
import { LoginScreen } from './components/Auth/LoginScreen'
import { UsernameSetup } from './components/Auth/UsernameSetup'
import { TitleBar } from './components/FriendWheel/TitleBar'
import { FriendWheel } from './components/FriendWheel/FriendWheel'

function App() {
  const { user, session, loading: authLoading, signOut, refreshUser } = useAuth()
  const { friends, loading: friendsLoading } = useFriends(user?.id || null)
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null)

  console.log('🎯 App render - authLoading:', authLoading, 'user:', user?.username, 'session:', !!session)

  // WebRTC for audio
  const {
    isConnected: isWebRTCConnected,
    isTalking,
    isListening,
    error: webrtcError,
    startTalking,
    stopTalking,
  } = useWebRTC({
    userId: user?.id || null,
    selectedFriendId,
  })

  // PTT handlers
  const handlePTTStart = () => {
    startTalking()
  }

  const handlePTTEnd = () => {
    stopTalking()
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

  return (
    <div className="h-screen w-screen flex flex-col bg-bone overflow-hidden text-ink font-mono border-2 border-ink">
      <TitleBar
        currentUser={user!}
        onSignOut={signOut}
      />

      <main className="flex-1 overflow-hidden relative mt-8">
        <FriendWheel
          friends={friends}
          currentUser={user!}
          selectedFriendId={selectedFriendId}
          onSelectFriend={setSelectedFriendId}
          onStartTalking={handlePTTStart}
          onStopTalking={handlePTTEnd}
          isTalking={isTalking}
          isListening={isListening}
          isWebRTCConnected={isWebRTCConnected}
        />
      </main>

      {/* WebRTC Error Toast */}
      {webrtcError && (
        <div className="absolute bottom-4 left-4 right-4 bg-error text-white p-3 rounded border-2 border-ink shadow-hard-sm font-mono text-sm">
          ⚠️ {webrtcError}
        </div>
      )}

      {/* Listening Indicator - shown in FriendWheel now */}
    </div>
  )
}

export default App
