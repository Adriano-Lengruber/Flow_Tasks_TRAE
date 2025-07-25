import React, { useState, useCallback, useEffect } from 'react';
import { Box, Button, Typography, CircularProgress, Alert } from '@mui/material';
import { usePaginatedQuery } from '../../hooks/useOptimizedQuery';
import { DocumentNode } from '@apollo/client';

interface PaginationInfo {
  hasMore: boolean;
  total: number;
  currentPage: number;
  totalPages: number;
}

interface PaginatedListProps<T> {
  query: DocumentNode;
  variables?: Record<string, any>;
  pageSize?: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  renderEmpty?: () => React.ReactElement;
  renderError?: (error: any) => React.ReactElement;
  renderLoading?: () => React.ReactElement;
  dataPath: string; // Caminho para os dados na resposta (ex: 'projectsPaginated')
  enableInfiniteScroll?: boolean;
  enablePrefetch?: boolean;
  className?: string;
  title?: string;
}

export function PaginatedList<T = any>({
  query,
  variables = {},
  pageSize = 20,
  renderItem,
  renderEmpty,
  renderError,
  renderLoading,
  dataPath,
  enableInfiniteScroll = true,
  enablePrefetch = true,
  className,
  title,
}: PaginatedListProps<T>): JSX.Element {
  const [currentOffset, setCurrentOffset] = useState(0);
  const [allItems, setAllItems] = useState<T[]>([]);

  const { data, loading, error, fetchMore, prefetchNextPage, pageInfo } = usePaginatedQuery(
    query,
    {
      variables: {
        ...variables,
        pagination: {
          offset: currentOffset,
          limit: pageSize,
        },
      },
      pageSize,
      prefetchNext: enablePrefetch,
    }
  );

  // Extrair dados usando o dataPath
  const paginatedData = data?.[dataPath];
  const items = paginatedData?.items || [];
  const total = paginatedData?.total || 0;
  const hasMore = paginatedData?.hasMore || false;

  // Atualizar lista de itens quando novos dados chegarem
  useEffect(() => {
    if (items.length > 0) {
      if (currentOffset === 0) {
        // Primeira página ou reset
        setAllItems(items);
      } else {
        // Páginas subsequentes - adicionar aos existentes
        setAllItems(prev => [...prev, ...items]);
      }
    }
  }, [items, currentOffset]);

  // Carregar mais itens
  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;

    const newOffset = currentOffset + pageSize;
    setCurrentOffset(newOffset);

    try {
      await fetchMore({
        variables: {
          ...variables,
          pagination: {
            offset: newOffset,
            limit: pageSize,
          },
        },
      });
    } catch (err) {
      console.error('Erro ao carregar mais itens:', err);
    }
  }, [hasMore, loading, currentOffset, pageSize, fetchMore, variables]);

  // Infinite scroll
  useEffect(() => {
    if (!enableInfiniteScroll) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
      const isNearBottom = scrollTop + clientHeight >= scrollHeight - 1000;

      if (isNearBottom && hasMore && !loading) {
        loadMore();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [enableInfiniteScroll, hasMore, loading, loadMore]);

  // Prefetch da próxima página quando o usuário está próximo do final
  useEffect(() => {
    if (enablePrefetch && prefetchNextPage && allItems.length > pageSize * 0.8) {
      prefetchNextPage();
    }
  }, [enablePrefetch, prefetchNextPage, allItems.length, pageSize]);

  // Reset quando variáveis mudarem
  useEffect(() => {
    setCurrentOffset(0);
    setAllItems([]);
  }, [JSON.stringify(variables)]);

  // Renderização de estados
  if (error) {
    return renderError ? renderError(error) : (
      <Alert severity="error">
        Erro ao carregar dados: {error.message}
      </Alert>
    );
  }

  if (loading && allItems.length === 0) {
    return renderLoading ? renderLoading() : (
      <Box display="flex" justifyContent="center" p={3}>
        <CircularProgress />
      </Box>
    );
  }

  if (allItems.length === 0) {
    return renderEmpty ? renderEmpty() : (
      <Box textAlign="center" p={3}>
        <Typography variant="body1" color="textSecondary">
          Nenhum item encontrado
        </Typography>
      </Box>
    );
  }

  return (
    <Box className={className}>
      {title && (
        <Typography variant="h6" gutterBottom>
          {title} ({total} {total === 1 ? 'item' : 'itens'})
        </Typography>
      )}
      
      {/* Lista de itens */}
      <Box>
        {allItems.map((item, index) => (
          <Box key={`item-${index}`}>
            {renderItem(item, index)}
          </Box>
        ))}
      </Box>

      {/* Indicador de carregamento */}
      {loading && allItems.length > 0 && (
        <Box display="flex" justifyContent="center" p={2}>
          <CircularProgress size={24} />
          <Typography variant="body2" sx={{ ml: 1 }}>
            Carregando mais itens...
          </Typography>
        </Box>
      )}

      {/* Botão carregar mais (se infinite scroll estiver desabilitado) */}
      {!enableInfiniteScroll && hasMore && (
        <Box display="flex" justifyContent="center" p={2}>
          <Button
            variant="outlined"
            onClick={loadMore}
            disabled={loading}
          >
            {loading ? 'Carregando...' : 'Carregar Mais'}
          </Button>
        </Box>
      )}

      {/* Informações de paginação */}
      <Box display="flex" justifyContent="center" p={1}>
        <Typography variant="caption" color="textSecondary">
          Mostrando {allItems.length} de {total} itens
          {pageInfo && (
            <> • Página {pageInfo.currentPage} de {pageInfo.totalPages}</>
          )}
        </Typography>
      </Box>
    </Box>
  );
}

export default PaginatedList;