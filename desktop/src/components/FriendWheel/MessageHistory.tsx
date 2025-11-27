import React from 'react'
import type { Message } from '@/hooks/useMessages'
import type { Friend } from '@/types'

interface MessageHistoryProps {
  messages: Message[]
  friends: Friend[]
  currentUserId: string
  onSelectFriend: (id: string) => void
  onClose: () => void
}

const formatDuration = (ms: number): string => {
  const seconds = Math.floor(ms / 1000)
  if (seconds < 1) return '<1s'
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}m ${remainingSeconds}s`
}

const formatTime = (dateString: string): string => {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

export const MessageHistory: React.FC<MessageHistoryProps> = ({
  messages,
  friends,
  currentUserId,
  onSelectFriend,
  onClose,
}) => {
  const getFriend = (userId: string): Friend | undefined => {
    return friends.find((f) => f.id === userId)
  }

  const getMessageLabel = (message: Message): string => {
    const friend = getFriend(
      message.sender_id === currentUserId ? message.recipient_id : message.sender_id
    )
    return friend?.username || 'Unknown'
  }

  const isSent = (message: Message): boolean => {
    return message.sender_id === currentUserId
  }

  return (
    <div className="fixed inset-0 bg-ink/50 backdrop-blur-sm flex items-center justify-center z-[60]" onClick={onClose}>
      <div className="bg-bone border-2 border-ink shadow-hard p-6 w-96 max-h-[80vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-mono font-bold uppercase">Message History</h3>
          <button onClick={onClose} className="text-2xl hover:text-signal transition-colors">×</button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2">
          {messages.length === 0 ? (
            <div className="text-center text-ink/40 text-sm py-8">
              No messages yet
            </div>
          ) : (
            messages.map((message) => {
              const friendName = getMessageLabel(message)
              const sent = isSent(message)
              const friend = getFriend(
                sent ? message.recipient_id : message.sender_id
              )

              return (
                <button
                  key={message.id}
                  onClick={() => {
                    if (friend) {
                      onSelectFriend(friend.id)
                      onClose()
                    }
                  }}
                  className={`w-full text-left p-3 border-2 border-ink hover:bg-signal/20 transition-colors ${
                    message.status === 'missed' && !sent ? 'bg-red-500/20 border-red-500' : ''
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm">
                        {sent ? '→' : '←'} {friendName}
                      </span>
                      {message.status === 'missed' && !sent && (
                        <span className="text-[10px] bg-red-500 text-white px-1 py-0.5 font-bold">MISSED</span>
                      )}
                    </div>
                    <span className="text-[10px] text-ink/60 font-mono">
                      {formatTime(message.created_at)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-ink/60">
                    <span>{formatDuration(message.duration_ms)}</span>
                    <span>•</span>
                    <span className="uppercase">{message.status}</span>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

