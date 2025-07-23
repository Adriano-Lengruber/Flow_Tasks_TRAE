import { useState, useCallback } from 'react';
import { DragEndEvent, DragStartEvent, DragOverEvent } from '@dnd-kit/core';
import useToast from './useToast';
import { useEnhancedToast } from '../components/common/EnhancedToast';

interface UseDragAndDropProps {
  onTaskMove: (taskId: string, newSectionId: string) => Promise<void>;
  onTaskReorder?: (taskId: string, newIndex: number, sectionId: string) => Promise<void>;
}

interface DragState {
  activeTask: any | null;
  overId: string | null;
  isDragging: boolean;
}

export const useDragAndDrop = ({ onTaskMove, onTaskReorder }: UseDragAndDropProps) => {
  const { showSuccess, showError } = useEnhancedToast();
  const [dragState, setDragState] = useState<DragState>({
    activeTask: null,
    overId: null,
    isDragging: false,
  });
  
  const [isProcessing, setIsProcessing] = useState(false);
  const { showToast } = useToast();

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const taskData = active.data.current;
    
    setDragState({
      activeTask: taskData?.task || null,
      overId: null,
      isDragging: true,
    });
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over } = event;
    
    setDragState(prev => ({
      ...prev,
      overId: over?.id as string || null,
    }));
  }, []);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    
    setDragState({
      activeTask: null,
      overId: null,
      isDragging: false,
    });

    if (!over || active.id === over.id) {
      return;
    }

    setIsProcessing(true);
    
    try {
      const taskId = active.id as string;
      const overId = over.id as string;
      
      // Verificar se é movimento entre seções
      if (overId.startsWith('section-')) {
        const newSectionId = overId.replace('section-', '');
        const taskTitle = dragState.activeTask?.title || 'Tarefa';
        await onTaskMove(taskId, newSectionId);
        showSuccess(`Tarefa "${taskTitle}" movida com sucesso!`, '🚀');
      }
      // Verificar se é reordenação dentro da mesma seção
      else if (onTaskReorder && overId.startsWith('task-')) {
        const activeData = active.data.current;
        const overData = over.data.current;
        
        if (activeData?.sectionId === overData?.sectionId) {
          const taskTitle = dragState.activeTask?.title || 'Tarefa';
          await onTaskReorder(
            taskId,
            overData?.index || 0,
            activeData?.sectionId
          );
          showSuccess(`Tarefa "${taskTitle}" reordenada com sucesso!`, '🔄');
        }
      }
    } catch (error) {
      console.error('Erro ao mover tarefa:', error);
      showError('Erro ao mover tarefa. Tente novamente.', '❌');
    } finally {
      setIsProcessing(false);
    }
  }, [onTaskMove, onTaskReorder, showSuccess, showError]);

  const handleDragCancel = useCallback(() => {
    setDragState({
      activeTask: null,
      overId: null,
      isDragging: false,
    });
  }, []);

  const canDropInSection = useCallback((sectionId: string, taskId: string) => {
    // Lógica para determinar se uma tarefa pode ser solta em uma seção
    // Por exemplo, verificar permissões, regras de negócio, etc.
    return true;
  }, []);

  const getDropAnimation = useCallback((sectionId: string) => {
    const isOver = dragState.overId === `section-${sectionId}`;
    const canDrop = dragState.activeTask ? canDropInSection(sectionId, dragState.activeTask.id) : false;
    
    return {
      isOver,
      canDrop,
      isActive: isOver && canDrop,
    };
  }, [dragState.overId, dragState.activeTask, canDropInSection]);

  return {
    dragState,
    isProcessing,
    handlers: {
      onDragStart: handleDragStart,
      onDragOver: handleDragOver,
      onDragEnd: handleDragEnd,
      onDragCancel: handleDragCancel,
    },
    utils: {
      canDropInSection,
      getDropAnimation,
    },
  };
};

export default useDragAndDrop;