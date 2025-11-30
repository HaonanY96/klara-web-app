'use client';

import React, { useEffect } from 'react';
import { Star, Pin, Trash2, Calendar, Pencil } from 'lucide-react';
import { createPortal } from 'react-dom';

interface TaskContextMenuProps {
  isOpen: boolean;
  position: { x: number; y: number };
  isFocused: boolean;
  isPinned: boolean;
  onClose: () => void;
  onToggleFocused: () => void;
  onTogglePinned: () => void;
  onDelete: () => void;
  onAddDate: () => void;
  onEditTask: () => void;
}

/**
 * TaskContextMenu Component
 * 
 * Long-press context menu for mobile task actions.
 * Provides quick access to:
 * - Add/Remove from Today's Focus (MIT)
 * - Pin/Unpin task
 * - Delete task
 */
const TaskContextMenu = ({
  isOpen,
  position,
  isFocused,
  isPinned,
  onClose,
  onToggleFocused,
  onTogglePinned,
  onDelete,
  onAddDate,
  onEditTask,
}: TaskContextMenuProps) => {
  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Calculate menu position - ensure it stays within viewport
  const menuStyle: React.CSSProperties = {
    position: 'fixed',
    left: Math.min(position.x, window.innerWidth - 200),
    top: Math.min(position.y, window.innerHeight - 250),
    zIndex: 200,
  };

  const menuContent = (
    <>
      <div className="fixed inset-0 bg-black/50 z-199 animate-in fade-in duration-200" onClick={onClose} />
      
      <div 
        style={menuStyle}
        className="bg-white rounded-2xl shadow-2xl border border-stone-100 overflow-hidden min-w-[200px] animate-in zoom-in-95 fade-in duration-200 z-200"
      >
        <div className="py-1.5">
          <MenuButton
            icon={<Calendar size={18} className="text-stone-400" />}
            label="Add Date"
            onClick={() => {
              onAddDate();
              onClose();
            }}
          />
          <MenuButton
            icon={<Pencil size={18} className="text-stone-400" />}
            label="Edit Task"
            onClick={() => {
              onEditTask();
              onClose();
            }}
          />
          <div className="h-px bg-stone-100 my-1" />
          <MenuButton
            icon={
              <Star 
                size={18} 
                className={isFocused ? 'text-orange-400' : 'text-stone-400'}
                fill={isFocused ? 'currentColor' : 'none'}
                strokeWidth={1.5}
              />
            }
            label={isFocused ? "Remove from Today's Focus" : "Add to Today's Focus"}
            onClick={() => {
              onToggleFocused();
              onClose();
            }}
          />
          <MenuButton
            icon={
              <Pin 
                size={18} 
                className={isPinned ? 'text-orange-400' : 'text-stone-400'}
                fill={isPinned ? 'currentColor' : 'none'}
                strokeWidth={1.5}
              />
            }
            label={isPinned ? 'Unpin' : 'Pin to Top'}
            onClick={() => {
              onTogglePinned();
              onClose();
            }}
          />
          <div className="h-px bg-stone-100 my-1" />
          <MenuButton
            icon={<Trash2 size={18} className="text-rose-400" strokeWidth={1.5} />}
            label="Delete Task"
            destructive
            onClick={() => {
              onDelete();
              onClose();
            }}
          />
        </div>
      </div>
    </>
  );

  // Use portal to render at document body level
  if (typeof document !== 'undefined') {
    return createPortal(menuContent, document.body);
  }
  
  return null;
};

interface MenuButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  destructive?: boolean;
}

const MenuButton = ({ icon, label, onClick, destructive = false }: MenuButtonProps) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
      destructive 
        ? 'hover:bg-rose-50 active:bg-rose-100 text-rose-500' 
        : 'hover:bg-stone-50 active:bg-stone-100 text-stone-700'
    }`}
  >
    <span className={`${destructive ? 'text-rose-400' : 'text-stone-400'}`}>{icon}</span>
    <span className="text-[14px]">{label}</span>
  </button>
);

export default TaskContextMenu;
