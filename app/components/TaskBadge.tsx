'use client';

import React from 'react';
import type { NudgeType } from '@/types';
import { getNudgeBadgeInfo } from '@/types';

interface TaskBadgeProps {
  type: NudgeType;
  onClick?: () => void;
}

/**
 * TaskBadge Component
 * 
 * Displays a small badge indicator for task nudges.
 * Based on PRD 4.1.11.2 Badge Display Rules.
 */
const TaskBadge = ({ type, onClick }: TaskBadgeProps) => {
  const badgeInfo = getNudgeBadgeInfo(type);
  
  if (!badgeInfo) return null;

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      className={`
        inline-flex items-center justify-center
        w-6 h-6 rounded-full text-[11px]
        transition-all duration-200
        hover:scale-110 hover:shadow-sm
        ${badgeInfo.colorClass}
      `}
      title={badgeInfo.tooltip}
      aria-label={badgeInfo.tooltip}
    >
      {badgeInfo.icon}
    </button>
  );
};

export default TaskBadge;

