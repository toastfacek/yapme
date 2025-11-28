import React, { useState, useEffect } from 'react'
import { useInvite } from '../hooks/useInvite'

interface InviteModalProps {
  isOpen: boolean
  onClose: () => void
  userId: string | null
}

export const InviteModal: React.FC<InviteModalProps> = ({
  isOpen,
  onClose,
  userId,
}) => {
  const {
    isRecording,
    isUploading,
    inviteLink,
    error,
    startRecording,
    stopRecording,
    createInvite,
    reset,
    audioBlob,
  } = useInvite(userId)

  const [audioUrl, setAudioUrl] = useState<string | null>(null)

  // Create audio URL for preview
  useEffect(() => {
    if (audioBlob) {
      const url = URL.createObjectURL(audioBlob)
      setAudioUrl(url)
      return () => URL.revokeObjectURL(url)
    } else {
      setAudioUrl(null)
    }
  }, [audioBlob])

  // Reset when modal closes
  useEffect(() => {
    if (!isOpen) {
      reset()
      setAudioUrl(null)
    }
  }, [isOpen, reset])

  const handleCreateInvite = async () => {
    const link = await createInvite()
    if (link) {
      // Link is set in hook state
    }
  }

  const handleCopyLink = async () => {
    if (inviteLink) {
      await navigator.clipboard.writeText(inviteLink)
      // Could show a toast here
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 font-mono">
      <div className="bg-bone border-4 border-ink shadow-hard-lg w-full max-w-md mx-4 p-6 relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 w-8 h-8 bg-concrete border-2 border-ink shadow-hard-sm hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all flex items-center justify-center font-bold text-sm"
        >
          ×
        </button>

        <h2 className="text-2xl font-bold mb-4 text-ink">Invite Friend</h2>

        {!inviteLink ? (
          <>
            {/* Recording step */}
            <div className="space-y-4">
              <p className="text-sm text-ink/70 mb-4">
                Record a voice message to invite someone to YapMe
              </p>

              {/* Record button */}
              <div className="flex justify-center">
                <button
                  onMouseDown={startRecording}
                  onMouseUp={stopRecording}
                  onMouseLeave={stopRecording}
                  onTouchStart={startRecording}
                  onTouchEnd={stopRecording}
                  disabled={isUploading}
                  className={`
                    w-24 h-24 rounded-full border-4 border-ink flex items-center justify-center transition-all duration-100 relative
                    ${isRecording
                      ? 'bg-signal translate-y-1 shadow-none animate-pulse'
                      : 'bg-signal shadow-hard hover:-translate-y-0.5 cursor-pointer'}
                    ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                >
                  <div className="absolute inset-2 border border-white/20 rounded-full"></div>
                  <span className="text-white font-bold text-sm tracking-widest">
                    {isRecording ? 'REC' : 'REC'}
                  </span>
                </button>
              </div>

              <p className="text-xs text-center text-ink/60">
                {isRecording ? 'Recording... Release to stop' : 'Hold to record'}
              </p>

              {/* Audio preview */}
              {audioUrl && (
                <div className="mt-4 p-4 bg-concrete/30 border-2 border-ink rounded">
                  <p className="text-xs text-ink/70 mb-2">Preview:</p>
                  <audio controls src={audioUrl} className="w-full" />
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="mt-4 p-3 bg-red-100 border-2 border-red-500 text-red-700 text-sm">
                  {error}
                </div>
              )}

              {/* Create invite button */}
              {audioBlob && !isUploading && (
                <button
                  onClick={handleCreateInvite}
                  className="w-full mt-4 bg-signal text-ink border-3 border-ink shadow-hard hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all py-3 font-bold"
                >
                  Create Invite Link
                </button>
              )}

              {isUploading && (
                <div className="mt-4 text-center text-ink/70">
                  <p>Uploading and creating invite...</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            {/* Share link step */}
            <div className="space-y-4">
              <p className="text-sm text-ink/70 mb-4">
                Your invite link is ready! Share it with anyone.
              </p>

              {/* Link display */}
              <div className="p-4 bg-concrete/30 border-2 border-ink rounded flex items-center gap-2">
                <input
                  type="text"
                  value={inviteLink}
                  readOnly
                  className="flex-1 bg-transparent text-sm text-ink font-mono outline-none"
                />
                <button
                  onClick={handleCopyLink}
                  className="px-3 py-1 bg-signal text-ink border-2 border-ink shadow-hard-sm hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] transition-all text-xs font-bold"
                >
                  Copy
                </button>
              </div>

              <p className="text-xs text-center text-ink/60">
                When they open the link, they'll hear your message and can download YapMe to reply!
              </p>

              {/* Create another button */}
              <button
                onClick={() => {
                  reset()
                  setAudioUrl(null)
                }}
                className="w-full mt-4 bg-concrete text-ink border-2 border-ink shadow-hard-sm hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all py-2 font-bold text-sm"
              >
                Create Another Invite
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

