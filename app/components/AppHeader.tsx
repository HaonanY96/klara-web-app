'use client';

import React from 'react';
import { Menu } from 'lucide-react';

interface AppHeaderProps {
  onMenuOpen: () => void;
  isAIOnline?: boolean;
  stateLabel?: string;
  /** Show loading text instead of title when app is loading */
  isAppLoading?: boolean;
  /** Custom loading label; defaults to "Loading..." */
  loadingLabel?: string;
  /** Whether the app is in sorting mode */
  isSorting?: boolean;
  /** Handler to exit sorting mode */
  onExitSort?: () => void;
}

/**
 * AppHeader Component
 *
 * Top navigation bar with:
 * - Hamburger menu (left)
 * - Klara title centered (acts as AI status indicator)
 * - Date below
 */
const AppHeader = ({
  onMenuOpen,
  isAIOnline = true,
  stateLabel,
  isAppLoading = false,
  loadingLabel = 'Loading...',
  isSorting = false,
  onExitSort,
}: AppHeaderProps) => {
  // Format date on client side
  const [formattedDate, setFormattedDate] = React.useState('');
  // Pick a stable loading label per mount (or use provided)
  const [runtimeLoadingLabel] = React.useState(() => {
    if (loadingLabel) return loadingLabel;
    const presets = ['Getting things ready…', 'Warming up…', 'Almost there…', 'Loading Klara…'];
    return presets[Math.floor(Math.random() * presets.length)];
  });

  React.useEffect(() => {
    const formatter = new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
    setFormattedDate(formatter.format(new Date()));
  }, []);

  return (
    <header
      className="fixed top-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-xl px-5 pb-4 max-w-md mx-auto"
      style={{ paddingTop: 'calc(2.5rem + var(--safe-area-inset-top))' }}
    >
      {/* Top bar with menu and title */}
      <div className="grid grid-cols-3 items-center mb-1">
        {/* Menu button */}
        <div className="flex items-center justify-start">
          <button
            onClick={onMenuOpen}
            className="w-10 h-10 -ml-2 flex items-center justify-center text-stone-400 hover:text-stone-600 transition-colors rounded-xl hover:bg-stone-100"
            aria-label="Open menu"
          >
            <Menu size={22} strokeWidth={1.5} />
          </button>
        </div>

        {/* Centered title - AI status indicator or loading */}
        <div className="flex items-center justify-center">
          <h1
            className={`text-2xl font-normal tracking-tight transition-colors duration-300 font-brand ${
              isAIOnline ? 'text-brand' : 'text-slate-400'
            }`}
            title={isAIOnline ? 'AI is online' : 'AI is offline'}
          >
            {isAppLoading ? runtimeLoadingLabel : 'Klara'}
          </h1>
        </div>

        {/* Date or Done button when sorting */}
        <div className="flex items-center justify-end">
          {isSorting ? (
            <button
              onClick={onExitSort}
              className="text-[12px] font-semibold text-orange-500 hover:text-orange-600 px-3 py-1 rounded-lg hover:bg-orange-50 transition-colors"
            >
              Done
            </button>
          ) : (
            <div className="text-[11px] font-medium tracking-wider text-stone-400 font-heading italic opacity-80">
              {formattedDate}
            </div>
          )}
        </div>
      </div>

      {stateLabel && (
        <div className="mt-2 flex items-center justify-center gap-2 text-[12px] text-stone-500">
          <span className="px-2 py-1 rounded-full bg-stone-100 text-stone-600">{stateLabel}</span>
        </div>
      )}
    </header>
  );
};

export default AppHeader;
