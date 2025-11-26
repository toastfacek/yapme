import React from 'react';
import type { User } from '../../types';

interface TitleBarProps {
  currentUser: User;
  onSignOut: () => void;
}

export const TitleBar: React.FC<TitleBarProps> = ({ currentUser, onSignOut }) => {
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
      <button
        onClick={onSignOut}
        className="no-drag text-xs px-2 py-1 hover:bg-concrete transition-colors"
        title="Sign out"
      >
        ↪
      </button>
    </div>
  );
};
