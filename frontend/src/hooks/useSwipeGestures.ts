import { useEffect, useRef, useState } from 'react';

interface SwipeGestureOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  threshold?: number; // Distância mínima para considerar um swipe
  preventDefaultTouchmove?: boolean;
  delta?: number; // Diferença mínima entre início e fim do toque
}

interface TouchPosition {
  x: number;
  y: number;
}

export const useSwipeGestures = (options: SwipeGestureOptions = {}) => {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    threshold = 50,
    preventDefaultTouchmove = false,
    delta = 10,
  } = options;

  const [touchStart, setTouchStart] = useState<TouchPosition | null>(null);
  const [touchEnd, setTouchEnd] = useState<TouchPosition | null>(null);
  const elementRef = useRef<HTMLElement>(null);

  const onTouchStart = (e: TouchEvent) => {
    setTouchEnd(null); // Reset touch end
    setTouchStart({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    });
  };

  const onTouchMove = (e: TouchEvent) => {
    if (preventDefaultTouchmove) {
      e.preventDefault();
    }
    setTouchEnd({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    });
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distanceX = touchStart.x - touchEnd.x;
    const distanceY = touchStart.y - touchEnd.y;
    const isLeftSwipe = distanceX > delta;
    const isRightSwipe = distanceX < -delta;
    const isUpSwipe = distanceY > delta;
    const isDownSwipe = distanceY < -delta;

    // Verificar se o movimento foi suficiente para ser considerado um swipe
    const isHorizontalSwipe = Math.abs(distanceX) > threshold;
    const isVerticalSwipe = Math.abs(distanceY) > threshold;

    // Priorizar movimento horizontal sobre vertical se ambos forem detectados
    if (isHorizontalSwipe && Math.abs(distanceX) > Math.abs(distanceY)) {
      if (isLeftSwipe && onSwipeLeft) {
        onSwipeLeft();
      } else if (isRightSwipe && onSwipeRight) {
        onSwipeRight();
      }
    } else if (isVerticalSwipe) {
      if (isUpSwipe && onSwipeUp) {
        onSwipeUp();
      } else if (isDownSwipe && onSwipeDown) {
        onSwipeDown();
      }
    }

    // Reset touch positions
    setTouchStart(null);
    setTouchEnd(null);
  };

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    // Adicionar event listeners
    element.addEventListener('touchstart', onTouchStart, { passive: false });
    element.addEventListener('touchmove', onTouchMove, { passive: !preventDefaultTouchmove });
    element.addEventListener('touchend', onTouchEnd, { passive: true });

    // Cleanup
    return () => {
      element.removeEventListener('touchstart', onTouchStart);
      element.removeEventListener('touchmove', onTouchMove);
      element.removeEventListener('touchend', onTouchEnd);
    };
  }, [touchStart, touchEnd, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown]);

  return {
    ref: elementRef,
    touchStart,
    touchEnd,
    isSwipeInProgress: touchStart !== null && touchEnd !== null,
  };
};

export default useSwipeGestures;