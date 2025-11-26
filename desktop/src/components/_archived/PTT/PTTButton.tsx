import React, { useState, useEffect, useCallback } from 'react'
import './PTTButton.css'

interface PTTButtonProps {
  isEnabled: boolean
  selectedFriendName: string | null
  onPTTStart: () => void
  onPTTEnd: () => void
}

export const PTTButton: React.FC<PTTButtonProps> = ({
  isEnabled,
  selectedFriendName,
  onPTTStart,
  onPTTEnd,
}) => {
  const [isPressed, setIsPressed] = useState(false)
  const [isSpacebarHeld, setIsSpacebarHeld] = useState(false)

  const handlePTTStart = useCallback(() => {
    if (!isEnabled || isPressed) return
    setIsPressed(true)
    onPTTStart()
    // Play click sound (TODO: add actual sound file)
    console.log('🎤 PTT Started')
  }, [isEnabled, isPressed, onPTTStart])

  const handlePTTEnd = useCallback(() => {
    if (!isPressed) return
    setIsPressed(false)
    onPTTEnd()
    // Play release sound (TODO: add actual sound file)
    console.log('🔇 PTT Ended')
  }, [isPressed, onPTTEnd])

  // Keyboard PTT (spacebar)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !isSpacebarHeld && isEnabled) {
        e.preventDefault()
        setIsSpacebarHeld(true)
        handlePTTStart()
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' && isSpacebarHeld) {
        e.preventDefault()
        setIsSpacebarHeld(false)
        handlePTTEnd()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [isEnabled, isSpacebarHeld, handlePTTStart, handlePTTEnd])

  // Mouse PTT
  const handleMouseDown = () => {
    if (!isEnabled) return
    handlePTTStart()
  }

  const handleMouseUp = () => {
    handlePTTEnd()
  }

  return (
    <div className="ptt-container">
      <div className="ptt-info">
        {!isEnabled && !selectedFriendName && (
          <p className="ptt-hint">Select a friend to talk</p>
        )}
        {selectedFriendName && (
          <p className="ptt-target">
            Talking to <span className="target-name">{selectedFriendName}</span>
          </p>
        )}
      </div>

      <button
        className={`ptt-button ${isPressed ? 'pressed' : ''} ${!isEnabled ? 'disabled' : ''}`}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        disabled={!isEnabled}
      >
        <div className="ptt-icon">🎙️</div>
        <div className="ptt-label">
          {isPressed ? 'Talking...' : 'Hold to Talk'}
        </div>
      </button>

      <div className="ptt-hint-text">
        <p className="text-xs text-tertiary">
          Hold spacebar or click button
        </p>
      </div>
    </div>
  )
}
