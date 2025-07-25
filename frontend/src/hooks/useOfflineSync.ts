// Hook para gerenciar funcionalidades offline e sincronização
// Integra Service Worker com estado React para experiência offline-first

import { useState, useEffect, useCallback, useRef } from 'react';
import { ServiceWorkerMessenger, CacheManager } from '../utils/serviceWorker';
import useToast from './useToast';

interface OfflineState {
  isOnline: boolean;
  isServiceWorkerReady: boolean;
  pendingOperations: number;
  cacheSize: number;
  lastSyncTime: Date | null;
}

interface PendingOperation {
  id: string;
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  entity: 'PROJECT' | 'TASK' | 'COMMENT';
  data: any;
  timestamp: Date;
  retryCount: number;
}

interface UseOfflineSyncOptions {
  enableNotifications?: boolean;
  maxRetries?: number;
  syncInterval?: number;
  enableCacheMetrics?: boolean;
}

export function useOfflineSync(options: UseOfflineSyncOptions = {}) {
  const {
    enableNotifications = true,
    maxRetries = 3,
    syncInterval = 30000, // 30 segundos
    enableCacheMetrics = true
  } = options;

  const { showToast } = useToast();
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const messengerRef = useRef<ServiceWorkerMessenger | null>(null);

  const [state, setState] = useState<OfflineState>({
    isOnline: navigator.onLine,
    isServiceWorkerReady: false,
    pendingOperations: 0,
    cacheSize: 0,
    lastSyncTime: null
  });

  const [pendingOps, setPendingOps] = useState<PendingOperation[]>([]);

  // Inicializar Service Worker Messenger
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      messengerRef.current = ServiceWorkerMessenger.getInstance();
      
      // Verificar se SW está pronto
      navigator.serviceWorker.ready.then(() => {
        setState(prev => ({ ...prev, isServiceWorkerReady: true }));
        
        if (enableNotifications) {
          showToast('Aplicação pronta para uso offline', 'success');
        }
      });

      // Configurar handlers de mensagens do SW
      messengerRef.current.onMessage('BACKGROUND_SYNC_COMPLETE', handleSyncComplete);
      messengerRef.current.onMessage('CACHE_UPDATED', handleCacheUpdate);
    }

    return () => {
      if (messengerRef.current) {
        messengerRef.current.offMessage('BACKGROUND_SYNC_COMPLETE');
        messengerRef.current.offMessage('CACHE_UPDATED');
      }
    };
  }, [enableNotifications, showToast]);

  // Monitorar status de conectividade
  useEffect(() => {
    const handleOnline = () => {
      setState(prev => ({ ...prev, isOnline: true }));
      
      if (enableNotifications) {
        showToast('Conexão restaurada - Sincronizando dados...', 'info');
      }
      
      // Tentar sincronizar operações pendentes
      syncPendingOperations();
    };

    const handleOffline = () => {
      setState(prev => ({ ...prev, isOnline: false }));
      
      if (enableNotifications) {
        showToast('Modo offline ativado - Suas alterações serão sincronizadas quando voltar online', 'warning');
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [enableNotifications, showToast]);

  // Atualizar métricas de cache periodicamente
  useEffect(() => {
    if (enableCacheMetrics) {
      updateCacheMetrics();
      
      const interval = setInterval(updateCacheMetrics, 60000); // A cada minuto
      return () => clearInterval(interval);
    }
  }, [enableCacheMetrics]);

  // Sincronização periódica quando online
  useEffect(() => {
    if (state.isOnline && pendingOps.length > 0) {
      syncIntervalRef.current = setInterval(() => {
        syncPendingOperations();
      }, syncInterval);
    } else {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
    }

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [state.isOnline, pendingOps.length, syncInterval]);

  // Handlers para mensagens do Service Worker
  const handleSyncComplete = useCallback((data: any) => {
    setState(prev => ({ ...prev, lastSyncTime: new Date() }));
    
    if (enableNotifications) {
      showToast('Sincronização concluída', 'success');
    }
  }, [enableNotifications, showToast]);

  const handleCacheUpdate = useCallback(() => {
    updateCacheMetrics();
  }, []);

  // Atualizar métricas de cache
  const updateCacheMetrics = useCallback(async () => {
    try {
      const size = await CacheManager.getCacheSize();
      setState(prev => ({ ...prev, cacheSize: size }));
    } catch (error) {
      console.error('[OfflineSync] Erro ao obter tamanho do cache:', error);
    }
  }, []);

  // Adicionar operação pendente
  const addPendingOperation = useCallback((operation: Omit<PendingOperation, 'id' | 'timestamp' | 'retryCount'>) => {
    const newOp: PendingOperation = {
      ...operation,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      retryCount: 0
    };

    setPendingOps(prev => [...prev, newOp]);
    setState(prev => ({ ...prev, pendingOperations: prev.pendingOperations + 1 }));

    // Se estiver online, tentar sincronizar imediatamente
    if (state.isOnline) {
      setTimeout(() => syncPendingOperations(), 1000);
    }

    return newOp.id;
  }, [state.isOnline]);

  // Remover operação pendente
  const removePendingOperation = useCallback((operationId: string) => {
    setPendingOps(prev => prev.filter(op => op.id !== operationId));
    setState(prev => ({ ...prev, pendingOperations: Math.max(0, prev.pendingOperations - 1) }));
  }, []);

  // Sincronizar operações pendentes
  const syncPendingOperations = useCallback(async () => {
    if (!state.isOnline || pendingOps.length === 0) return;

    const operationsToSync = [...pendingOps];
    
    for (const operation of operationsToSync) {
      try {
        await executeOperation(operation);
        removePendingOperation(operation.id);
        
        console.log('[OfflineSync] Operação sincronizada:', operation.id);
      } catch (error) {
        console.error('[OfflineSync] Erro ao sincronizar operação:', operation.id, error);
        
        // Incrementar contador de tentativas
        setPendingOps(prev => 
          prev.map(op => 
            op.id === operation.id 
              ? { ...op, retryCount: op.retryCount + 1 }
              : op
          )
        );

        // Remover se excedeu máximo de tentativas
        if (operation.retryCount >= maxRetries) {
          removePendingOperation(operation.id);
          
          if (enableNotifications) {
            showToast(`Falha ao sincronizar ${operation.entity.toLowerCase()}: ${operation.type}`, 'error');
          }
        }
      }
    }

    setState(prev => ({ ...prev, lastSyncTime: new Date() }));
  }, [state.isOnline, pendingOps, maxRetries, enableNotifications, showToast]);

  // Executar operação específica
  const executeOperation = async (operation: PendingOperation): Promise<void> => {
    // Aqui você implementaria a lógica específica para cada tipo de operação
    // Por exemplo, fazer requisições GraphQL para CREATE, UPDATE, DELETE
    
    const { type, entity, data } = operation;
    
    // Simular execução da operação
    // Em uma implementação real, você faria as requisições GraphQL apropriadas
    console.log(`[OfflineSync] Executando ${type} ${entity}:`, data);
    
    // Exemplo de implementação:
    // switch (entity) {
    //   case 'PROJECT':
    //     return await executeProjectOperation(type, data);
    //   case 'TASK':
    //     return await executeTaskOperation(type, data);
    //   case 'COMMENT':
    //     return await executeCommentOperation(type, data);
    // }
    
    // Por enquanto, simular sucesso
    await new Promise(resolve => setTimeout(resolve, 100));
  };

  // Forçar sincronização manual
  const forcSync = useCallback(async () => {
    if (!state.isOnline) {
      if (enableNotifications) {
        showToast('Não é possível sincronizar offline', 'warning');
      }
      return;
    }

    await syncPendingOperations();
    
    if (messengerRef.current) {
      await messengerRef.current.sendMessage('FORCE_SYNC');
    }
  }, [state.isOnline, syncPendingOperations, enableNotifications, showToast]);

  // Limpar cache
  const clearCache = useCallback(async () => {
    try {
      await CacheManager.clearAllCaches();
      await updateCacheMetrics();
      
      if (enableNotifications) {
        showToast('Cache limpo com sucesso', 'success');
      }
    } catch (error) {
      console.error('[OfflineSync] Erro ao limpar cache:', error);
      
      if (enableNotifications) {
        showToast('Erro ao limpar cache', 'error');
      }
    }
  }, [updateCacheMetrics, enableNotifications, showToast]);

  // Obter estatísticas detalhadas
  const getStats = useCallback(() => {
    return {
      ...state,
      pendingOperationsList: pendingOps,
      cacheSizeFormatted: formatBytes(state.cacheSize),
      isFullyFunctional: state.isOnline && state.isServiceWorkerReady
    };
  }, [state, pendingOps]);

  return {
    // Estado
    isOnline: state.isOnline,
    isServiceWorkerReady: state.isServiceWorkerReady,
    pendingOperations: state.pendingOperations,
    cacheSize: state.cacheSize,
    lastSyncTime: state.lastSyncTime,
    
    // Operações
    addPendingOperation,
    removePendingOperation,
    syncPendingOperations,
    forceSync: forcSync,
    clearCache,
    
    // Utilitários
    getStats,
    pendingOperationsList: pendingOps
  };
}

// Utilitário para formatar bytes
function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Hook simplificado para verificação de conectividade
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}