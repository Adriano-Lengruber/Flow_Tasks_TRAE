import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { FixedSizeList as List, VariableSizeList, ListOnScrollProps } from 'react-window';
import { FixedSizeListProps, VariableSizeListProps } from 'react-window';
import InfiniteLoader from 'react-window-infinite-loader';
import {
  Box,
  CircularProgress,
  Typography,
  useTheme,
  alpha,
  Skeleton,
} from '@mui/material';
import { useVirtualScrolling } from '../../hooks/useVirtualScrolling';

// Tipos para os itens da lista
export interface VirtualListItem {
  id: string | number;
  [key: string]: any;
}

// Props para o componente de item
export interface VirtualListItemProps {
  index: number;
  style: React.CSSProperties;
  data: {
    items: VirtualListItem[];
    renderItem: (item: VirtualListItem, index: number) => React.ReactNode;
    isLoading?: boolean;
    hasNextPage?: boolean;
    loadMoreItems?: (startIndex: number, stopIndex: number) => Promise<void>;
  };
}

// Componente para renderizar cada item da lista
const VirtualListItemComponent: React.FC<VirtualListItemProps> = ({ index, style, data }) => {
  const { items, renderItem, isLoading, hasNextPage } = data;
  const item = items[index];

  // Se o item não existe e estamos carregando, mostra skeleton
  if (!item && isLoading) {
    return (
      <div style={style}>
        <Box sx={{ p: 2 }}>
          <Skeleton variant="rectangular" width="100%" height={60} />
        </Box>
      </div>
    );
  }

  // Se o item não existe e não estamos carregando, não renderiza nada
  if (!item) {
    return <div style={style} />;
  }

  return (
    <div style={style}>
      {renderItem(item, index)}
    </div>
  );
};

// Props principais do componente
export interface VirtualizedListProps {
  items: VirtualListItem[];
  renderItem: (item: VirtualListItem, index: number) => React.ReactNode;
  height: number;
  itemHeight?: number | ((index: number) => number);
  width?: string | number;
  overscan?: number;
  threshold?: number;
  isLoading?: boolean;
  hasNextPage?: boolean;
  loadMoreItems?: (startIndex: number, stopIndex: number) => Promise<void>;
  onScroll?: (scrollTop: number, scrollLeft: number) => void;
  className?: string;
  emptyMessage?: string;
  loadingMessage?: string;
  errorMessage?: string;
  error?: Error | null;
  onRetry?: () => void;
}

// Componente principal
export const VirtualizedList: React.FC<VirtualizedListProps> = ({
  items,
  renderItem,
  height,
  itemHeight = 80,
  width = '100%',
  overscan = 5,
  threshold = 15,
  isLoading = false,
  hasNextPage = false,
  loadMoreItems,
  onScroll,
  className,
  emptyMessage = 'Nenhum item encontrado',
  loadingMessage = 'Carregando...',
  errorMessage = 'Erro ao carregar dados',
  error = null,
  onRetry,
}) => {
  const theme = useTheme();
  const [scrollOffset, setScrollOffset] = useState(0);
  
  // Hook personalizado para virtual scrolling
  const {
    visibleRange,
    scrollToIndex,
    scrollToTop,
    isScrolling,
  } = useVirtualScrolling({
    itemCount: items.length,
    itemHeight: typeof itemHeight === 'number' ? itemHeight : 80,
    containerHeight: height,
    overscan,
  });

  // Dados para passar para os itens
  const itemData = useMemo(() => ({
    items,
    renderItem,
    isLoading,
    hasNextPage,
    loadMoreItems,
  }), [items, renderItem, isLoading, hasNextPage, loadMoreItems]);

  // Função para verificar se um item está carregado
  const isItemLoaded = useCallback((index: number) => {
    return !!items[index];
  }, [items]);

  // Função para carregar mais itens
  const handleLoadMoreItems = useCallback(async (startIndex: number, stopIndex: number) => {
    if (loadMoreItems && hasNextPage && !isLoading) {
      await loadMoreItems(startIndex, stopIndex);
    }
  }, [loadMoreItems, hasNextPage, isLoading]);

  // Função para lidar com scroll
  const handleScroll = useCallback((props: any) => {
    setScrollOffset(props.scrollTop);
    onScroll?.(props.scrollTop, props.scrollLeft || 0);
  }, [onScroll]);

  // Função para obter altura do item (para VariableSizeList)
  const getItemSize = useCallback((index: number) => {
    if (typeof itemHeight === 'function') {
      return itemHeight(index);
    }
    return itemHeight;
  }, [itemHeight]);

  // Renderização de estados especiais
  if (error) {
    return (
      <Box
        sx={{
          height,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          p: 3,
          textAlign: 'center',
        }}
      >
        <Typography color="error" variant="h6" gutterBottom>
          {errorMessage}
        </Typography>
        {onRetry && (
          <button
            onClick={onRetry}
            style={{
              marginTop: theme.spacing(2),
              padding: theme.spacing(1, 2),
              backgroundColor: theme.palette.primary.main,
              color: theme.palette.primary.contrastText,
              border: 'none',
              borderRadius: theme.shape.borderRadius,
              cursor: 'pointer',
            }}
          >
            Tentar Novamente
          </button>
        )}
      </Box>
    );
  }

  if (!isLoading && items.length === 0) {
    return (
      <Box
        sx={{
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 3,
          textAlign: 'center',
        }}
      >
        <Typography variant="body1" color="textSecondary">
          {emptyMessage}
        </Typography>
      </Box>
    );
  }

  // Determina o número total de itens (incluindo placeholders para carregamento)
  const itemCount = hasNextPage ? items.length + 1 : items.length;

  // Componente de lista com scroll infinito
  const ListComponent = loadMoreItems ? (
    <InfiniteLoader
      isItemLoaded={isItemLoaded}
      itemCount={itemCount}
      loadMoreItems={handleLoadMoreItems}
      threshold={threshold}
    >
      {({ onItemsRendered, ref }: { onItemsRendered: any; ref: any }) => {
        if (typeof itemHeight === 'function') {
          return (
            <VariableSizeList
              ref={ref}
              height={height}
              width={width}
              itemCount={itemCount}
              itemSize={getItemSize}
              itemData={itemData}
              onItemsRendered={onItemsRendered}
              onScroll={handleScroll}
              overscanCount={overscan}
              className={className}
            >
              {VirtualListItemComponent}
            </VariableSizeList>
          );
        } else {
          return (
            <List
              ref={ref}
              height={height}
              width={width}
              itemCount={itemCount}
              itemSize={itemHeight as number}
              itemData={itemData}
              onItemsRendered={onItemsRendered}
              onScroll={handleScroll}
              overscanCount={overscan}
              className={className}
            >
              {VirtualListItemComponent}
            </List>
          );
        }
      }}
    </InfiniteLoader>
  ) : (
    // Lista simples sem scroll infinito
    typeof itemHeight === 'function' ? (
      <VariableSizeList
        height={height}
        width={width}
        itemCount={itemCount}
        itemSize={getItemSize}
        itemData={itemData}
        onScroll={handleScroll}
        overscanCount={overscan}
        className={className}
      >
        {VirtualListItemComponent}
      </VariableSizeList>
    ) : (
      <List
        height={height}
        width={width}
        itemCount={itemCount}
        itemSize={itemHeight as number}
        itemData={itemData}
        onScroll={handleScroll}
        overscanCount={overscan}
        className={className}
      >
        {VirtualListItemComponent}
      </List>
    )
  );

  return (
    <Box
      sx={{
        height,
        width,
        position: 'relative',
        border: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
        borderRadius: 1,
        overflow: 'hidden',
        backgroundColor: theme.palette.background.paper,
      }}
    >
      {ListComponent}
      
      {/* Indicador de carregamento */}
      {isLoading && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: alpha(theme.palette.background.paper, 0.8),
            zIndex: 1,
          }}
        >
          <Box sx={{ textAlign: 'center' }}>
            <CircularProgress size={40} />
            <Typography variant="body2" sx={{ mt: 1 }}>
              {loadingMessage}
            </Typography>
          </Box>
        </Box>
      )}
      
      {/* Indicador de scroll */}
      {isScrolling && (
        <Box
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            backgroundColor: alpha(theme.palette.background.paper, 0.9),
            borderRadius: 1,
            px: 1,
            py: 0.5,
            zIndex: 2,
          }}
        >
          <Typography variant="caption">
            {Math.round((scrollOffset / (itemCount * (typeof itemHeight === 'number' ? itemHeight : 80))) * 100)}%
          </Typography>
        </Box>
      )}
    </Box>
  );
};

// Hook para facilitar o uso do VirtualizedList
export const useVirtualizedList = ({
  items,
  pageSize = 50,
  loadMore,
}: {
  items: VirtualListItem[];
  pageSize?: number;
  loadMore?: (page: number) => Promise<VirtualListItem[]>;
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [currentPage, setCurrentPage] = useState(0);

  const loadMoreItems = useCallback(async (startIndex: number, stopIndex: number) => {
    if (!loadMore || isLoading) return;

    try {
      setIsLoading(true);
      setError(null);
      
      const newItems = await loadMore(currentPage + 1);
      
      if (newItems.length < pageSize) {
        setHasNextPage(false);
      }
      
      setCurrentPage(prev => prev + 1);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [loadMore, isLoading, currentPage, pageSize]);

  const retry = useCallback(() => {
    setError(null);
    if (loadMore) {
      loadMoreItems(0, pageSize - 1);
    }
  }, [loadMore, loadMoreItems, pageSize]);

  return {
    isLoading,
    hasNextPage,
    error,
    loadMoreItems,
    retry,
  };
};

export default VirtualizedList;