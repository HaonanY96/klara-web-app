import { useState, useCallback } from 'react';

interface UseDragAndDropReturn {
  draggedTaskId: string | null;
  handleDragStart: (e: React.DragEvent, taskId: string) => void;
  handleDragOver: (e: React.DragEvent) => void;
  handleDrop: (
    e: React.DragEvent,
    targetQuadrant: string,
    updateQuadrant: (id: string, importance: 'high' | 'low', urgency: 'high' | 'low') => Promise<void>
  ) => Promise<void>;
}

/**
 * Hook for managing drag and drop state and logic
 */
export function useDragAndDrop(): UseDragAndDropReturn {
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  const handleDragStart = useCallback((e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback(
    async (
      e: React.DragEvent,
      targetQuadrant: string,
      updateQuadrant: (id: string, importance: 'high' | 'low', urgency: 'high' | 'low') => Promise<void>
    ) => {
      e.preventDefault();
      if (!draggedTaskId) return;

      let importance: 'high' | 'low' = 'low';
      let urgency: 'high' | 'low' = 'low';

      switch (targetQuadrant) {
        case 'Do First':
          importance = 'high';
          urgency = 'high';
          break;
        case 'Schedule':
          importance = 'high';
          urgency = 'low';
          break;
        case 'Quick Tasks':
          importance = 'low';
          urgency = 'high';
          break;
        case 'Later':
          importance = 'low';
          urgency = 'low';
          break;
        default:
          return;
      }

      await updateQuadrant(draggedTaskId, importance, urgency);
      setDraggedTaskId(null);
    },
    [draggedTaskId]
  );

  return {
    draggedTaskId,
    handleDragStart,
    handleDragOver,
    handleDrop,
  };
}

