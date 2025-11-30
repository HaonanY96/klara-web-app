'use client';

import React from 'react';
import { Menu } from 'lucide-react';

interface AppHeaderProps {
  onMenuOpen: () => void;
  isAIOnline?: boolean;
}

/**
 * AppHeader Component
 * 
 * Top navigation bar with:
 * - Hamburger menu (left)
 * - Kino title centered (acts as AI status indicator)
 * - Date below
 */
const AppHeader = ({ onMenuOpen, isAIOnline = true }: AppHeaderProps) => {
  // Format date on client side
  const [formattedDate, setFormattedDate] = React.useState('');
  
  React.useEffect(() => {
    setFormattedDate(
      new Date().toLocaleDateString('en-US', { 
        weekday: 'long', 
        month: 'long', 
        day: 'numeric' 
      })
    );
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-xl px-5 pb-4 max-w-md mx-auto" style={{ paddingTop: 'calc(2.5rem + var(--safe-area-inset-top))' }}>
      {/* Top bar with menu and title */}
      <div className="flex items-center justify-between mb-1">
        {/* Menu button */}
        <button
          onClick={onMenuOpen}
          className="w-10 h-10 -ml-2 flex items-center justify-center text-stone-400 hover:text-stone-600 transition-colors rounded-xl hover:bg-stone-100"
          aria-label="Open menu"
        >
          <Menu size={22} strokeWidth={1.5} />
        </button>
        
        {/* Centered title - AI status indicator */}
        <h1 
          className={`text-2xl font-medium tracking-tight font-heading transition-colors duration-300 ${
            isAIOnline ? 'text-orange-400' : 'text-slate-400'
          }`}
          title={isAIOnline ? 'AI is online' : 'AI is offline'}
        >
          Kino
        </h1>
        
        {/* Spacer for balance */}
        <div className="w-10" />
      </div>
      
      {/* Date */}
      <div className="text-center">
        <div className="text-[11px] font-medium tracking-wider text-stone-400 uppercase font-heading italic opacity-80">
          {formattedDate}
        </div>
      </div>
    </header>
  );
};

export default AppHeader;

