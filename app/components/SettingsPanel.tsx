'use client';

import React from 'react';
import { X, Check, Sparkles, Zap, MessageCircle, VolumeX } from 'lucide-react';
import { useUserPreferences } from '@/lib/hooks';
import type { ToneStyle } from '@/types';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ToneOptionProps {
  id: ToneStyle;
  name: string;
  description: string;
  example: string;
  icon: React.ReactNode;
  isSelected: boolean;
  onSelect: () => void;
}

const ToneOption = ({ 
  name, 
  description, 
  example, 
  icon, 
  isSelected, 
  onSelect 
}: ToneOptionProps) => {
  return (
    <button
      onClick={onSelect}
      className={`
        w-full text-left p-4 rounded-xl border-2 transition-all duration-200
        ${isSelected 
          ? 'border-orange-300 bg-orange-50/50' 
          : 'border-stone-100 hover:border-stone-200 bg-white'
        }
      `}
    >
      <div className="flex items-start gap-3">
        {/* Selection indicator */}
        <div className={`
          w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 shrink-0
          ${isSelected 
            ? 'border-orange-400 bg-orange-400' 
            : 'border-stone-300'
          }
        `}>
          {isSelected && <Check size={12} className="text-white" strokeWidth={3} />}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`${isSelected ? 'text-orange-500' : 'text-stone-400'}`}>
              {icon}
            </span>
            <span className={`font-medium text-[15px] ${isSelected ? 'text-stone-800' : 'text-stone-600'}`}>
              {name}
            </span>
          </div>
          
          <p className="text-[13px] text-stone-500 mb-2">
            {description}
          </p>
          
          <div className="bg-stone-50 rounded-lg px-3 py-2">
            <p className="text-[12px] text-stone-400 italic leading-relaxed">
              "{example}"
            </p>
          </div>
        </div>
      </div>
    </button>
  );
};

/**
 * SettingsPanel Component
 * 
 * Modal panel for AI companion style settings
 */
const SettingsPanel = ({ isOpen, onClose }: SettingsPanelProps) => {
  const { toneStyle, updateToneStyle, isLoading } = useUserPreferences();

  const handleSelectTone = async (style: ToneStyle) => {
    try {
      await updateToneStyle(style);
    } catch (error) {
      console.error('Failed to update tone style:', error);
    }
  };

  const toneOptions: Array<{
    id: ToneStyle;
    name: string;
    description: string;
    example: string;
    icon: React.ReactNode;
  }> = [
    {
      id: 'gentle',
      name: 'Gentle Companion',
      description: 'Warm and supportive, with detailed guidance',
      example: "This task looks a bit heavy. Want me to help you shrink it into a 5-minute version?",
      icon: <Sparkles size={16} />,
    },
    {
      id: 'concise',
      name: 'Concise & Efficient',
      description: 'Direct and minimal, no emotional padding',
      example: "Try just the first step?",
      icon: <Zap size={16} />,
    },
    {
      id: 'coach',
      name: 'Coach Mode',
      description: 'Motivational and action-oriented',
      example: "This task has been sitting for a few days. Pick the smallest entry point—start now?",
      icon: <MessageCircle size={16} />,
    },
    {
      id: 'silent',
      name: 'Silent Mode',
      description: 'Minimal suggestions, only when asked',
      example: "(Prefers not to give unsolicited suggestions)",
      icon: <VolumeX size={16} />,
    },
  ];

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50"
        onClick={onClose}
      />
      
      {/* Panel */}
      <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl z-50 max-w-md mx-auto max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100 shrink-0">
          <div>
            <h2 className="text-lg font-medium text-stone-800">Settings</h2>
            <p className="text-[13px] text-stone-400 mt-0.5">Choose how Kino talks to you</p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-xl transition-colors"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          <div className="space-y-3">
            {toneOptions.map((option) => (
              <ToneOption
                key={option.id}
                {...option}
                isSelected={toneStyle === option.id}
                onSelect={() => handleSelectTone(option.id)}
              />
            ))}
          </div>
          
          {/* Info text */}
          <p className="text-[12px] text-stone-400 text-center mt-5 px-4">
            Your choice affects how AI suggestions are worded. You can change this anytime.
          </p>
        </div>
      </div>
    </>
  );
};

export default SettingsPanel;

