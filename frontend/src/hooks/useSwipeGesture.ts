import { useRef, useCallback, useEffect } from 'react';

interface SwipeGestureOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onSwipeStart?: (direction: SwipeDirection | null) => void;
  onSwipeEnd?: (direction: SwipeDirection | null) => void;
  
  // Configurações de sensibilidade
  minSwipeDistance?: number;
  maxSwipeTime?: number;
  preventDefaultTouchmove?: boolean;
  
  // Direções habilitadas
  enabledDirections?: SwipeDirection[];
  
  // Callbacks de progresso
  onSwipeProgress?: (progress: number, direction: SwipeDirection | null) => void;
}

export type SwipeDirection = 'left' | 'right' | 'up' | 'down';

interface TouchData {
  startX: number;
  startY: number;
  startTime: number;
  currentX: number;
  currentY: number;
  deltaX: number;
  deltaY: number;
  direction: SwipeDirection | null;
  distance: number;
  velocity: number;
}

export const useSwipeGesture = (options: SwipeGestureOptions = {}) => {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    onSwipeStart,
    onSwipeEnd,
    onSwipeProgress,
    minSwipeDistance = 50,
    maxSwipeTime = 1000,
    preventDefaultTouchmove = true,
    enabledDirections = ['left', 'right', 'up', 'down'],
  } = options;

  const touchData = useRef<TouchData | null>(null);
  const elementRef = useRef<HTMLElement | null>(null);

  // Determinar direção do swipe
  const getSwipeDirection = useCallback((deltaX: number, deltaY: number): SwipeDirection | null => {
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);
    
    // Determinar se é horizontal ou vertical
    if (absDeltaX > absDeltaY) {
      // Movimento horizontal
      if (deltaX > 0 && enabledDirections.includes('right')) {
        return 'right';
      } else if (deltaX < 0 && enabledDirections.includes('left')) {
        return 'left';
      }
    } else {
      // Movimento vertical
      if (deltaY > 0 && enabledDirections.includes('down')) {
        return 'down';
      } else if (deltaY < 0 && enabledDirections.includes('up')) {
        return 'up';
      }
    }
    
    return null;
  }, [enabledDirections]);

  // Calcular progresso do swipe (0-1)
  const calculateProgress = useCallback((distance: number): number => {
    return Math.min(distance / minSwipeDistance, 1);
  }, [minSwipeDistance]);

  // Handler para início do touch
  const handleTouchStart = useCallback((e: TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;

    touchData.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      startTime: Date.now(),
      currentX: touch.clientX,
      currentY: touch.clientY,
      deltaX: 0,
      deltaY: 0,
      direction: null,
      distance: 0,
      velocity: 0,
    };

    onSwipeStart?.(null);
  }, [onSwipeStart]);

  // Handler para movimento do touch
  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!touchData.current) return;

    const touch = e.touches[0];
    if (!touch) return;

    const deltaX = touch.clientX - touchData.current.startX;
    const deltaY = touch.clientY - touchData.current.startY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const direction = getSwipeDirection(deltaX, deltaY);

    touchData.current = {
      ...touchData.current,
      currentX: touch.clientX,
      currentY: touch.clientY,
      deltaX,
      deltaY,
      direction,
      distance,
    };

    // Prevenir scroll padrão se necessário
    if (preventDefaultTouchmove && direction) {
      e.preventDefault();
    }

    // Callback de progresso
    if (onSwipeProgress && direction) {
      const progress = calculateProgress(distance);
      onSwipeProgress(progress, direction);
    }
  }, [getSwipeDirection, preventDefaultTouchmove, onSwipeProgress, calculateProgress]);

  // Handler para fim do touch
  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (!touchData.current) return;

    const endTime = Date.now();
    const swipeTime = endTime - touchData.current.startTime;
    const { deltaX, deltaY, distance, direction } = touchData.current;

    // Calcular velocidade (pixels por ms)
    const velocity = distance / swipeTime;
    touchData.current.velocity = velocity;

    // Verificar se é um swipe válido
    const isValidSwipe = 
      distance >= minSwipeDistance && 
      swipeTime <= maxSwipeTime && 
      direction !== null;

    if (isValidSwipe && direction) {
      // Executar callback apropriado
      switch (direction) {
        case 'left':
          onSwipeLeft?.();
          break;
        case 'right':
          onSwipeRight?.();
          break;
        case 'up':
          onSwipeUp?.();
          break;
        case 'down':
          onSwipeDown?.();
          break;
      }
    }

    onSwipeEnd?.(isValidSwipe ? direction : null);
    touchData.current = null;
  }, [minSwipeDistance, maxSwipeTime, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, onSwipeEnd]);

  // Handler para cancelamento do touch
  const handleTouchCancel = useCallback(() => {
    if (touchData.current) {
      onSwipeEnd?.(null);
      touchData.current = null;
    }
  }, [onSwipeEnd]);

  // Configurar event listeners
  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    // Adicionar event listeners
    element.addEventListener('touchstart', handleTouchStart, { passive: false });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });
    element.addEventListener('touchcancel', handleTouchCancel, { passive: true });

    // Cleanup
    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('touchcancel', handleTouchCancel);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, handleTouchCancel]);

  // Função para anexar a um elemento
  const attachToElement = useCallback((element: HTMLElement | null) => {
    elementRef.current = element;
  }, []);

  // Função para obter dados atuais do touch
  const getCurrentTouchData = useCallback((): TouchData | null => {
    return touchData.current;
  }, []);

  // Função para verificar se está fazendo swipe
  const isSwipeInProgress = useCallback((): boolean => {
    return touchData.current !== null;
  }, []);

  // Props para anexar a um elemento React
  const swipeHandlers = {
    onTouchStart: (e: React.TouchEvent) => {
      handleTouchStart(e.nativeEvent);
    },
    onTouchMove: (e: React.TouchEvent) => {
      handleTouchMove(e.nativeEvent);
    },
    onTouchEnd: (e: React.TouchEvent) => {
      handleTouchEnd(e.nativeEvent);
    },
    onTouchCancel: (e: React.TouchEvent) => {
      handleTouchCancel();
    },
  };

  return {
    // Ref para anexar ao elemento
    ref: attachToElement,
    
    // Props para anexar diretamente a um elemento React
    swipeHandlers,
    
    // Funções utilitárias
    getCurrentTouchData,
    isSwipeInProgress,
    
    // Dados atuais (para debugging)
    touchData: touchData.current,
  };
};

export default useSwipeGesture;