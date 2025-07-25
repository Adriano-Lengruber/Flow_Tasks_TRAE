import { useState, useEffect, useCallback, useMemo, useRef } from 'react';

// Interface para configuração do virtual scrolling
export interface VirtualScrollingConfig {
  itemCount: number;
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
  scrollTop?: number;
}

// Interface para o range visível
export interface VisibleRange {
  startIndex: number;
  endIndex: number;
  visibleStartIndex: number;
  visibleEndIndex: number;
}

// Interface para métricas de performance
export interface ScrollMetrics {
  totalHeight: number;
  visibleHeight: number;
  scrollPercentage: number;
  itemsInView: number;
  renderCount: number;
}

// Hook principal para virtual scrolling
export const useVirtualScrolling = (config: VirtualScrollingConfig) => {
  const {
    itemCount,
    itemHeight,
    containerHeight,
    overscan = 5,
    scrollTop: externalScrollTop,
  } = config;

  const [scrollTop, setScrollTop] = useState(externalScrollTop || 0);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();
  const renderCountRef = useRef(0);

  // Atualiza scrollTop quando recebido externamente
  useEffect(() => {
    if (externalScrollTop !== undefined) {
      setScrollTop(externalScrollTop);
    }
  }, [externalScrollTop]);

  // Calcula o range visível com overscan
  const visibleRange = useMemo((): VisibleRange => {
    const totalHeight = itemCount * itemHeight;
    
    if (totalHeight === 0 || containerHeight === 0) {
      return {
        startIndex: 0,
        endIndex: 0,
        visibleStartIndex: 0,
        visibleEndIndex: 0,
      };
    }

    // Índices visíveis sem overscan
    const visibleStartIndex = Math.floor(scrollTop / itemHeight);
    const visibleEndIndex = Math.min(
      itemCount - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight)
    );

    // Índices com overscan
    const startIndex = Math.max(0, visibleStartIndex - overscan);
    const endIndex = Math.min(itemCount - 1, visibleEndIndex + overscan);

    renderCountRef.current += 1;

    return {
      startIndex,
      endIndex,
      visibleStartIndex,
      visibleEndIndex,
    };
  }, [scrollTop, itemHeight, containerHeight, itemCount, overscan]);

  // Calcula métricas de performance
  const metrics = useMemo((): ScrollMetrics => {
    const totalHeight = itemCount * itemHeight;
    const scrollPercentage = totalHeight > 0 ? (scrollTop / (totalHeight - containerHeight)) * 100 : 0;
    const itemsInView = visibleRange.visibleEndIndex - visibleRange.visibleStartIndex + 1;

    return {
      totalHeight,
      visibleHeight: containerHeight,
      scrollPercentage: Math.max(0, Math.min(100, scrollPercentage)),
      itemsInView,
      renderCount: renderCountRef.current,
    };
  }, [scrollTop, itemHeight, containerHeight, itemCount, visibleRange]);

  // Função para lidar com mudanças de scroll
  const handleScroll = useCallback((newScrollTop: number) => {
    setScrollTop(newScrollTop);
    setIsScrolling(true);

    // Clear timeout anterior
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    // Define timeout para parar o estado de scrolling
    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
    }, 150);
  }, []);

  // Função para scroll para um índice específico
  const scrollToIndex = useCallback((index: number, align: 'start' | 'center' | 'end' = 'start') => {
    const clampedIndex = Math.max(0, Math.min(itemCount - 1, index));
    let targetScrollTop: number;

    switch (align) {
      case 'center':
        targetScrollTop = (clampedIndex * itemHeight) - (containerHeight / 2) + (itemHeight / 2);
        break;
      case 'end':
        targetScrollTop = (clampedIndex * itemHeight) - containerHeight + itemHeight;
        break;
      default: // 'start'
        targetScrollTop = clampedIndex * itemHeight;
    }

    const maxScrollTop = Math.max(0, (itemCount * itemHeight) - containerHeight);
    const finalScrollTop = Math.max(0, Math.min(maxScrollTop, targetScrollTop));
    
    handleScroll(finalScrollTop);
    return finalScrollTop;
  }, [itemCount, itemHeight, containerHeight, handleScroll]);

  // Função para scroll para o topo
  const scrollToTop = useCallback(() => {
    handleScroll(0);
  }, [handleScroll]);

  // Função para scroll para o final
  const scrollToBottom = useCallback(() => {
    const maxScrollTop = Math.max(0, (itemCount * itemHeight) - containerHeight);
    handleScroll(maxScrollTop);
  }, [itemCount, itemHeight, containerHeight, handleScroll]);

  // Função para scroll por offset
  const scrollBy = useCallback((offset: number) => {
    const newScrollTop = Math.max(0, scrollTop + offset);
    const maxScrollTop = Math.max(0, (itemCount * itemHeight) - containerHeight);
    const finalScrollTop = Math.min(maxScrollTop, newScrollTop);
    handleScroll(finalScrollTop);
  }, [scrollTop, itemCount, itemHeight, containerHeight, handleScroll]);

  // Função para obter o estilo de um item
  const getItemStyle = useCallback((index: number): React.CSSProperties => {
    return {
      position: 'absolute',
      top: index * itemHeight,
      left: 0,
      right: 0,
      height: itemHeight,
    };
  }, [itemHeight]);

  // Função para obter o estilo do container
  const getContainerStyle = useCallback((): React.CSSProperties => {
    return {
      position: 'relative',
      height: itemCount * itemHeight,
      width: '100%',
    };
  }, [itemCount, itemHeight]);

  // Cleanup do timeout quando o componente é desmontado
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  return {
    visibleRange,
    metrics,
    scrollTop,
    isScrolling,
    scrollToIndex,
    scrollToTop,
    scrollToBottom,
    scrollBy,
    handleScroll,
    getItemStyle,
    getContainerStyle,
  };
};

// Hook para virtual scrolling com altura variável
export const useVariableVirtualScrolling = ({
  itemCount,
  getItemHeight,
  containerHeight,
  overscan = 5,
  scrollTop: externalScrollTop,
}: {
  itemCount: number;
  getItemHeight: (index: number) => number;
  containerHeight: number;
  overscan?: number;
  scrollTop?: number;
}) => {
  const [scrollTop, setScrollTop] = useState(externalScrollTop || 0);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();
  const heightCacheRef = useRef<Map<number, number>>(new Map());
  const offsetCacheRef = useRef<Map<number, number>>(new Map());

  // Cache das alturas dos itens
  const getItemHeightCached = useCallback((index: number): number => {
    if (!heightCacheRef.current.has(index)) {
      const height = getItemHeight(index);
      heightCacheRef.current.set(index, height);
    }
    return heightCacheRef.current.get(index)!;
  }, [getItemHeight]);

  // Cache dos offsets dos itens
  const getItemOffset = useCallback((index: number): number => {
    if (!offsetCacheRef.current.has(index)) {
      let offset = 0;
      for (let i = 0; i < index; i++) {
        offset += getItemHeightCached(i);
      }
      offsetCacheRef.current.set(index, offset);
    }
    return offsetCacheRef.current.get(index)!;
  }, [getItemHeightCached]);

  // Calcula altura total
  const getTotalHeight = useCallback((): number => {
    let totalHeight = 0;
    for (let i = 0; i < itemCount; i++) {
      totalHeight += getItemHeightCached(i);
    }
    return totalHeight;
  }, [itemCount, getItemHeightCached]);

  // Encontra o índice do item em uma posição específica
  const findItemIndexAtOffset = useCallback((offset: number): number => {
    let currentOffset = 0;
    for (let i = 0; i < itemCount; i++) {
      const itemHeight = getItemHeightCached(i);
      if (currentOffset + itemHeight > offset) {
        return i;
      }
      currentOffset += itemHeight;
    }
    return itemCount - 1;
  }, [itemCount, getItemHeightCached]);

  // Calcula o range visível
  const visibleRange = useMemo((): VisibleRange => {
    if (itemCount === 0 || containerHeight === 0) {
      return {
        startIndex: 0,
        endIndex: 0,
        visibleStartIndex: 0,
        visibleEndIndex: 0,
      };
    }

    const visibleStartIndex = findItemIndexAtOffset(scrollTop);
    const visibleEndIndex = findItemIndexAtOffset(scrollTop + containerHeight);

    const startIndex = Math.max(0, visibleStartIndex - overscan);
    const endIndex = Math.min(itemCount - 1, visibleEndIndex + overscan);

    return {
      startIndex,
      endIndex,
      visibleStartIndex,
      visibleEndIndex,
    };
  }, [scrollTop, containerHeight, itemCount, overscan, findItemIndexAtOffset]);

  // Função para lidar com mudanças de scroll
  const handleScroll = useCallback((newScrollTop: number) => {
    setScrollTop(newScrollTop);
    setIsScrolling(true);

    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
    }, 150);
  }, []);

  // Função para scroll para um índice específico
  const scrollToIndex = useCallback((index: number, align: 'start' | 'center' | 'end' = 'start') => {
    const clampedIndex = Math.max(0, Math.min(itemCount - 1, index));
    const itemOffset = getItemOffset(clampedIndex);
    const itemHeight = getItemHeightCached(clampedIndex);
    
    let targetScrollTop: number;

    switch (align) {
      case 'center':
        targetScrollTop = itemOffset - (containerHeight / 2) + (itemHeight / 2);
        break;
      case 'end':
        targetScrollTop = itemOffset - containerHeight + itemHeight;
        break;
      default: // 'start'
        targetScrollTop = itemOffset;
    }

    const totalHeight = getTotalHeight();
    const maxScrollTop = Math.max(0, totalHeight - containerHeight);
    const finalScrollTop = Math.max(0, Math.min(maxScrollTop, targetScrollTop));
    
    handleScroll(finalScrollTop);
    return finalScrollTop;
  }, [itemCount, containerHeight, getItemOffset, getItemHeightCached, getTotalHeight, handleScroll]);

  // Função para obter o estilo de um item
  const getItemStyle = useCallback((index: number): React.CSSProperties => {
    return {
      position: 'absolute',
      top: getItemOffset(index),
      left: 0,
      right: 0,
      height: getItemHeightCached(index),
    };
  }, [getItemOffset, getItemHeightCached]);

  // Função para obter o estilo do container
  const getContainerStyle = useCallback((): React.CSSProperties => {
    return {
      position: 'relative',
      height: getTotalHeight(),
      width: '100%',
    };
  }, [getTotalHeight]);

  // Limpa caches quando itemCount muda
  useEffect(() => {
    heightCacheRef.current.clear();
    offsetCacheRef.current.clear();
  }, [itemCount]);

  // Cleanup do timeout
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  return {
    visibleRange,
    scrollTop,
    isScrolling,
    scrollToIndex,
    handleScroll,
    getItemStyle,
    getContainerStyle,
    getItemHeight: getItemHeightCached,
    getItemOffset,
    getTotalHeight,
  };
};

// Hook para scroll infinito
export const useInfiniteScroll = ({
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  threshold = 0.8,
}: {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  threshold?: number;
}) => {
  const [shouldFetch, setShouldFetch] = useState(false);

  const handleScroll = useCallback((scrollTop: number, scrollHeight: number, clientHeight: number) => {
    const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;
    
    if (scrollPercentage >= threshold && hasNextPage && !isFetchingNextPage && !shouldFetch) {
      setShouldFetch(true);
    }
  }, [threshold, hasNextPage, isFetchingNextPage, shouldFetch]);

  useEffect(() => {
    if (shouldFetch && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
      setShouldFetch(false);
    }
  }, [shouldFetch, hasNextPage, isFetchingNextPage, fetchNextPage]);

  return {
    handleScroll,
  };
};

export default useVirtualScrolling;