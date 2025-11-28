import React from 'react';
import type { User } from '../../types';

interface TitleBarProps {
  currentUser: User;
  onSignOut: () => void;
  missedCount?: number;
  onShowHistory?: () => void;
  onInvite?: () => void;
}

export const TitleBar: React.FC<TitleBarProps> = ({ currentUser, onSignOut, missedCount = 0, onShowHistory, onInvite }) => {
  return (
    <div className="titlebar-drag h-8 flex items-center px-2 bg-bone border-b-2 border-ink fixed top-0 w-full z-50">
      <div className="flex gap-1.5 no-drag group mr-4">
        <div className="w-2.5 h-2.5 bg-ink"></div>
      </div>
      <div className="flex-1 flex justify-center items-center">
         <span className="text-[12px] font-mono font-bold uppercase tracking-widest text-ink">
            YAPME - {currentUser.username}
         </span>
      </div>
      <div className="flex items-center gap-2">
        {onInvite && (
          <button
            onClick={onInvite}
            className="no-drag text-xs px-2 py-1 hover:bg-concrete transition-colors"
            title="Invite friend"
          >
            ✉️
          </button>
        )}
        {onShowHistory && (
          <button
            onClick={onShowHistory}
            className="no-drag text-xs px-2 py-1 hover:bg-concrete transition-colors relative"
            title="Message history"
          >
            📨
            {missedCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                {missedCount > 9 ? '9+' : missedCount}
              </span>
            )}
          </button>
        )}
        <button
          onClick={onSignOut}
          className="no-drag text-xs px-2 py-1 hover:bg-concrete transition-colors"
          title="Sign out"
        >
          ↪
        </button>
      </div>
    </div>
  );
};
