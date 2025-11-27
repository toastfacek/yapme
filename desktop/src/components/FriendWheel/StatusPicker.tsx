import React, { useState, useRef, useEffect } from 'react'
import type { UserStatus } from '@/types'

interface StatusPickerProps {
  currentStatus: UserStatus
  onStatusChange: (status: UserStatus) => void
}

const statusConfig: Record<UserStatus, { label: string; color: string; icon: string }> = {
  active: { label: 'Active', color: 'bg-led', icon: '●' },
  away: { label: 'Away', color: 'bg-yellow-500', icon: '○' },
  dnd: { label: 'Do Not Disturb', color: 'bg-red-500', icon: '⛔' },
  offline: { label: 'Offline', color: 'bg-concrete', icon: '○' },
}

export const StatusPicker: React.FC<StatusPickerProps> = ({
  currentStatus,
  onStatusChange,
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const currentConfig = statusConfig[currentStatus]

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-2 py-1 bg-bone border border-ink shadow-hard-sm hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
        title="Change status"
      >
        <div className={`w-2 h-2 rounded-full ${currentConfig.color} border border-ink/50`}></div>
        <span className="text-[10px] font-bold uppercase">{currentConfig.label}</span>
        <span className="text-[8px]">▼</span>
      </button>

      {isOpen && (
        <div className="absolute bottom-full left-0 mb-1 bg-bone border-2 border-ink shadow-hard z-50 min-w-[140px]">
          {(Object.keys(statusConfig) as UserStatus[]).map((status) => {
            const config = statusConfig[status]
            const isSelected = status === currentStatus
            return (
              <button
                key={status}
                onClick={() => {
                  onStatusChange(status)
                  setIsOpen(false)
                }}
                className={`w-full text-left px-3 py-2 text-[10px] font-bold uppercase flex items-center gap-2 hover:bg-signal/20 transition-colors ${
                  isSelected ? 'bg-signal/30' : ''
                }`}
              >
                <div className={`w-2 h-2 rounded-full ${config.color} border border-ink/50`}></div>
                <span>{config.label}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

