'use client';

import React, { useEffect, useState } from 'react';
import { X, Clock, Download, Settings, User, Info } from 'lucide-react';
import Link from 'next/link';
import SettingsPanel from './SettingsPanel';

interface AppMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  href?: string;
  onClick?: () => void;
  comingSoon?: boolean;
}

const MenuItem = ({ icon, label, href, onClick, comingSoon }: MenuItemProps) => {
  const content = (
    <div className={`
      flex items-center gap-4 px-5 py-3.5 
      transition-colors rounded-xl mx-2
      ${comingSoon 
        ? 'text-stone-300 cursor-not-allowed' 
        : 'text-stone-600 hover:bg-stone-100 active:bg-stone-200 cursor-pointer'
      }
    `}>
      <span className="text-stone-400">{icon}</span>
      <span className="text-[15px] font-medium">{label}</span>
      {comingSoon && (
        <span className="ml-auto text-[10px] uppercase tracking-wider text-stone-300 bg-stone-100 px-2 py-0.5 rounded-full">
          Soon
        </span>
      )}
    </div>
  );

  if (href && !comingSoon) {
    return (
      <Link href={href} onClick={onClick}>
        {content}
      </Link>
    );
  }

  return (
    <button onClick={comingSoon ? undefined : onClick} className="w-full text-left">
      {content}
    </button>
  );
};

/**
 * AppMenu Component
 * 
 * Side panel menu with navigation and settings
 */
const AppMenu = ({ isOpen, onClose }: AppMenuProps) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when menu is open
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  const handleOpenSettings = () => {
    setIsSettingsOpen(true);
  };

  const handleCloseSettings = () => {
    setIsSettingsOpen(false);
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`
          fixed inset-0 bg-black/20 backdrop-blur-sm z-40
          transition-opacity duration-300
          ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}
        `}
        onClick={onClose}
      />
      
      {/* Side Panel */}
      <div 
        className={`
          fixed top-0 left-0 h-full w-72 bg-white shadow-2xl z-50
          transform transition-transform duration-300 ease-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-12 pb-6 border-b border-stone-100">
          <h2 className="text-xl font-medium text-orange-400 font-heading">Kino</h2>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-xl transition-colors"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>
        
        {/* Menu Items */}
        <nav className="py-4">
          {/* Primary Actions */}
          <div className="mb-2">
            <MenuItem
              icon={<Clock size={20} strokeWidth={1.5} />}
              label="History"
              href="/history"
              onClick={onClose}
            />
            <MenuItem
              icon={<Download size={20} strokeWidth={1.5} />}
              label="Export Data"
              href="/export"
              onClick={onClose}
            />
          </div>
          
          {/* Divider */}
          <div className="h-px bg-stone-100 mx-5 my-3" />
          
          {/* Secondary Actions */}
          <div>
            <MenuItem
              icon={<Settings size={20} strokeWidth={1.5} />}
              label="Settings"
              onClick={handleOpenSettings}
            />
            <MenuItem
              icon={<User size={20} strokeWidth={1.5} />}
              label="Account"
              comingSoon
            />
            <MenuItem
              icon={<Info size={20} strokeWidth={1.5} />}
              label="About"
              comingSoon
            />
          </div>
        </nav>
        
        {/* Settings Panel */}
        <SettingsPanel 
          isOpen={isSettingsOpen} 
          onClose={handleCloseSettings} 
        />
        
        {/* Footer */}
        <div className="absolute bottom-8 left-0 right-0 px-5">
          <p className="text-[11px] text-stone-300 text-center">
            Kino v0.1.0
          </p>
        </div>
      </div>
    </>
  );
};

export default AppMenu;

