import React from 'react';
import { Sun, Moon } from 'lucide-react';

interface BottomNavigationProps {
  activeTab: string;
  onTabChange: (tab: 'focus' | 'reflection') => void;
}

const BottomNavigation = ({ activeTab, onTabChange }: BottomNavigationProps) => {
  return (
    <nav
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white/90 backdrop-blur-xl border-t border-stone-100/50 pt-4 pb-4 px-10 flex justify-center gap-24 items-center text-[12px] font-bold tracking-widest text-stone-300 uppercase font-heading z-20"
      style={{ paddingBottom: 'calc(1.5rem + var(--safe-area-inset-bottom))' }}
    >
      <button
        onClick={() => onTabChange('focus')}
        className={`flex flex-col items-center gap-1.5 transition-colors duration-300 ${activeTab === 'focus' ? 'text-stone-800' : 'hover:text-stone-500'}`}
      >
        <Sun
          size={18}
          strokeWidth={2}
          className={activeTab === 'focus' ? 'text-orange-400' : ''}
        />
        <span>Focus</span>
      </button>

      <button
        onClick={() => onTabChange('reflection')}
        className={`flex flex-col items-center gap-1.5 transition-colors duration-300 ${activeTab === 'reflection' ? 'text-stone-800' : 'hover:text-stone-500'}`}
      >
        <Moon
          size={18}
          strokeWidth={2}
          className={activeTab === 'reflection' ? 'text-orange-400' : ''}
        />
        <span>Reflection</span>
      </button>
    </nav>
  );
};

export default BottomNavigation;

