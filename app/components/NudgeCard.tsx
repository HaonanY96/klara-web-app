'use client';

import React, { useState, useMemo } from 'react';
import { Clock, Sparkles, Calendar, Trash2, X } from 'lucide-react';
import type { NudgeType, NudgeAction } from '@/types';
import { getNudgeTexts, DISMISS_TEXTS, type NudgeCardTexts } from '@/lib/nudges';

interface NudgeCardProps {
  type: NudgeType;
  taskId: string;
  onAction: (action: NudgeAction) => void;
  onDismiss: () => void;
}

/**
 * NudgeCard Component
 * 
 * Displays a gentle nudge card with suggested actions.
 * Based on PRD 4.1.11.5 Nudge Card Design.
 * 
 * Copy is sourced from lib/nudges/nudgeCopy.ts for easy updates.
 * Follows tone guide: calm, gentle, no guilt, low pressure.
 */
const NudgeCard = ({ type, taskId, onAction, onDismiss }: NudgeCardProps) => {
  const [showDismissFollowup, setShowDismissFollowup] = useState(false);
  
  // Get texts from centralized corpus
  const texts = useMemo(() => getNudgeTexts(type), [type]);

  const handleDismiss = () => {
    setShowDismissFollowup(true);
    // Auto-hide followup after 3 seconds
    setTimeout(() => {
      setShowDismissFollowup(false);
      onDismiss();
    }, 3000);
  };

  const handleShowLess = () => {
    onAction('show_less');
    setShowDismissFollowup(false);
    onDismiss();
  };

  // Dismiss followup message
  if (showDismissFollowup) {
    return (
      <div className="bg-stone-50 rounded-lg px-3 py-2 text-[12px] text-stone-500 flex items-center justify-between animate-in fade-in duration-200">
        <span>{DISMISS_TEXTS.confirmation}</span>
        <button
          onClick={handleShowLess}
          className="text-stone-400 hover:text-stone-600 underline underline-offset-2"
        >
          {DISMISS_TEXTS.showLess}
        </button>
      </div>
    );
  }

  // Get card style config based on type
  const cardConfig = getCardConfig(type);

  return (
    <div className={`${cardConfig.bgClass} rounded-xl p-3 space-y-2.5 animate-in fade-in slide-in-from-top-2 duration-300`}>
      <div className="flex items-start gap-2">
        {cardConfig.icon}
        <div className="flex-1">
          <p className="text-[13px] text-stone-600 leading-relaxed">
            {texts.message}
            <br />
            <span className="text-stone-400">{texts.subMessage}</span>
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="text-stone-300 hover:text-stone-400 transition-colors"
          aria-label="Dismiss"
        >
          <X size={14} />
        </button>
      </div>
      
      <div className="flex flex-wrap gap-1.5 pt-1">
        {renderActions(type, texts, onAction, handleDismiss)}
      </div>
    </div>
  );
};

/**
 * Get card visual configuration based on nudge type
 */
function getCardConfig(type: NudgeType): { bgClass: string; icon: React.ReactNode } {
  switch (type) {
    case 'overdue':
      return {
        bgClass: 'bg-orange-50/60 border border-orange-100/50',
        icon: <Clock size={14} className="text-orange-400 mt-0.5 shrink-0" />,
      };
    case 'needs_breakdown':
      return {
        bgClass: 'bg-violet-50/40 border border-violet-100/50',
        icon: <Sparkles size={14} className="text-violet-400 mt-0.5 shrink-0" />,
      };
    case 'long_pending':
      return {
        bgClass: 'bg-stone-50 border border-stone-100',
        icon: <span className="text-[14px] mt-0.5">💭</span>,
      };
    case 'repeatedly_postponed':
      return {
        bgClass: 'bg-blue-50/40 border border-blue-100/50',
        icon: <span className="text-[14px] mt-0.5">🔄</span>,
      };
    default:
      return {
        bgClass: 'bg-stone-50 border border-stone-100',
        icon: null,
      };
  }
}

/**
 * Render action buttons based on nudge type
 */
function renderActions(
  type: NudgeType, 
  texts: NudgeCardTexts, 
  onAction: (action: NudgeAction) => void,
  handleDismiss: () => void
): React.ReactNode {
  switch (type) {
    case 'overdue':
      return (
        <>
          <NudgeActionButton onClick={() => onAction('set_new_date')} variant="primary">
            <Calendar size={11} />
            {texts.actions.setNewDate}
          </NudgeActionButton>
          <NudgeActionButton onClick={() => onAction('break_down')}>
            <Sparkles size={11} />
            {texts.actions.breakDown}
          </NudgeActionButton>
          <NudgeActionButton onClick={() => onAction('let_go')} variant="danger">
            <Trash2 size={11} />
            {texts.actions.letGo}
          </NudgeActionButton>
        </>
      );
      
    case 'needs_breakdown':
      return (
        <>
          <NudgeActionButton onClick={() => onAction('break_down')} variant="primary">
            <Sparkles size={11} />
            {texts.actions.breakDown}
          </NudgeActionButton>
          <NudgeActionButton onClick={handleDismiss}>
            {texts.actions.notNow}
          </NudgeActionButton>
        </>
      );
      
    case 'long_pending':
      return (
        <>
          <NudgeActionButton onClick={() => onAction('set_new_date')} variant="primary">
            <Calendar size={11} />
            {texts.actions.giveDate}
          </NudgeActionButton>
          <NudgeActionButton onClick={() => onAction('break_down')}>
            <Sparkles size={11} />
            {texts.actions.breakDown}
          </NudgeActionButton>
          <NudgeActionButton onClick={() => onAction('let_go')} variant="danger">
            {texts.actions.letGo}
          </NudgeActionButton>
        </>
      );
      
    case 'repeatedly_postponed':
      return (
        <>
          <NudgeActionButton onClick={() => onAction('break_down')} variant="primary">
            <Sparkles size={11} />
            {texts.actions.breakDown}
          </NudgeActionButton>
          <NudgeActionButton onClick={() => onAction('set_new_date')}>
            <Calendar size={11} />
            {texts.actions.setFirmDate}
          </NudgeActionButton>
          <NudgeActionButton onClick={() => onAction('let_go')} variant="danger">
            {texts.actions.letGo}
          </NudgeActionButton>
        </>
      );
      
    default:
      return null;
  }
}

// Internal button component for consistent styling
interface NudgeActionButtonProps {
  onClick: () => void;
  variant?: 'default' | 'primary' | 'danger';
  children: React.ReactNode;
}

const NudgeActionButton = ({ 
  onClick, 
  variant = 'default', 
  children 
}: NudgeActionButtonProps) => {
  const baseClasses = "flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors";
  
  const variantClasses = {
    default: "bg-white/80 text-stone-500 hover:bg-white hover:text-stone-600 border border-stone-100",
    primary: "bg-orange-100/80 text-orange-600 hover:bg-orange-100",
    danger: "bg-rose-50/80 text-rose-400 hover:bg-rose-50 hover:text-rose-500",
  };

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`${baseClasses} ${variantClasses[variant]}`}
    >
      {children}
    </button>
  );
};

export default NudgeCard;

