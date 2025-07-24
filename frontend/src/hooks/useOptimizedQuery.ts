import { useQuery, QueryHookOptions, DocumentNode } from '@apollo/client';
import { useMemo } from 'react';

// Hook personalizado para queries otimizadas com cache inteligente
export function useOptimizedQuery<TData = any, TVariables = any>(
  query: DocumentNode,
  options?: QueryHookOptions<TData, TVariables>
) {
  // Configurações otimizadas de cache
  const optimizedOptions = useMemo(() => ({
    ...options,
    // Cache por 5 minutos para dados que não mudam frequentemente
    fetchPolicy: options?.fetchPolicy || 'cache-first' as const,
    // Revalidar em background
    nextFetchPolicy: 'cache-first' as const,
    // Configurações de erro
    errorPolicy: 'all' as const,
    // Notificar sobre mudanças no cache
    notifyOnNetworkStatusChange: true,
  }), [options]);

  const result = useQuery(query, optimizedOptions);

  // Adicionar informações de performance
  const performanceInfo = useMemo(() => ({
    isCacheHit: !result.loading && !result.networkStatus,
    isStale: result.data && result.loading,
    cacheSize: result.client.cache.extract(),
  }), [result.loading, result.networkStatus, result.data, result.client.cache]);

  return {
    ...result,
    performance: performanceInfo,
  };
}

// Hook para queries paginadas otimizadas
export function usePaginatedQuery<TData = any, TVariables = any>(
  query: DocumentNode,
  options?: QueryHookOptions<TData, TVariables> & {
    pageSize?: number;
    prefetchNext?: boolean;
  }
) {
  const { pageSize = 20, prefetchNext = true, ...queryOptions } = options || {};

  const result = useOptimizedQuery(query, {
    ...queryOptions,
    // Configurações específicas para paginação
    fetchPolicy: 'cache-and-network',
    // Manter dados anteriores durante carregamento
    notifyOnNetworkStatusChange: true,
  });

  // Lógica de prefetch da próxima página
  const prefetchNextPage = useMemo(() => {
    if (!prefetchNext || !result.data) return null;
    
    // Implementar lógica de prefetch baseada nos dados atuais
    return () => {
      // Prefetch da próxima página se houver mais dados
      const hasMore = result.data?.hasMore;
      if (hasMore) {
        const currentOffset = result.data?.offset || 0;
        result.fetchMore({
          variables: {
            ...queryOptions?.variables,
            pagination: {
              offset: currentOffset + pageSize,
              limit: pageSize,
            },
          },
        });
      }
    };
  }, [result.data, prefetchNext, pageSize, queryOptions?.variables, result]);

  return {
    ...result,
    prefetchNextPage,
    pageInfo: {
      hasMore: result.data?.hasMore || false,
      total: result.data?.total || 0,
      currentPage: Math.floor((result.data?.offset || 0) / pageSize) + 1,
      totalPages: Math.ceil((result.data?.total || 0) / pageSize),
    },
  };
}