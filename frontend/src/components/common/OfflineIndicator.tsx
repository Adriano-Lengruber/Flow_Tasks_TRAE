// Componente para indicar status offline e gerenciar cache
// Mostra informações sobre conectividade e operações pendentes

import React, { useState } from 'react';
import { useOfflineSync, useOnlineStatus } from '../../hooks/useOfflineSync';
import useToast from '../../hooks/useToast';
import './OfflineIndicator.css';

interface OfflineIndicatorProps {
  className?: string;
  showDetails?: boolean;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({
  className = '',
  showDetails = false
}) => {
  const isOnline = useOnlineStatus();
  const {
    isServiceWorkerReady,
    pendingOperations,
    cacheSize,
    lastSyncTime,
    forceSync,
    clearCache,
    getStats
  } = useOfflineSync({ enableNotifications: false });
  
  const { showToast } = useToast();
  const [showPanel, setShowPanel] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleForceSync = async () => {
    if (!isOnline) {
      showToast('Não é possível sincronizar offline', 'warning');
      return;
    }

    setIsSyncing(true);
    try {
      await forceSync();
      showToast('Sincronização concluída', 'success');
    } catch (error) {
      showToast('Erro na sincronização', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleClearCache = async () => {
    setIsClearing(true);
    try {
      await clearCache();
      showToast('Cache limpo com sucesso', 'success');
    } catch (error) {
      showToast('Erro ao limpar cache', 'error');
    } finally {
      setIsClearing(false);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatTime = (date: Date | null): string => {
    if (!date) return 'Nunca';
    return new Intl.DateTimeFormat('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(date);
  };

  const getStatusColor = (): string => {
    if (!isServiceWorkerReady) return 'gray';
    if (!isOnline) return 'orange';
    if (pendingOperations > 0) return 'yellow';
    return 'green';
  };

  const getStatusText = (): string => {
    if (!isServiceWorkerReady) return 'Inicializando...';
    if (!isOnline) return 'Offline';
    if (pendingOperations > 0) return `${pendingOperations} pendente(s)`;
    return 'Online';
  };

  const getStatusIcon = (): string => {
    if (!isServiceWorkerReady) return '⏳';
    if (!isOnline) return '📴';
    if (pendingOperations > 0) return '🔄';
    return '🟢';
  };

  return (
    <div className={`offline-indicator ${className}`}>
      {/* Indicador principal */}
      <div 
        className={`status-badge status-${getStatusColor()}`}
        onClick={() => setShowPanel(!showPanel)}
        title={`Status: ${getStatusText()} - Clique para detalhes`}
      >
        <span className="status-icon">{getStatusIcon()}</span>
        {showDetails && (
          <span className="status-text">{getStatusText()}</span>
        )}
      </div>

      {/* Painel de detalhes */}
      {showPanel && (
        <div className="offline-panel">
          <div className="panel-header">
            <h3>Status da Aplicação</h3>
            <button 
              className="close-btn"
              onClick={() => setShowPanel(false)}
              aria-label="Fechar painel"
            >
              ✕
            </button>
          </div>

          <div className="panel-content">
            {/* Status de conectividade */}
            <div className="status-section">
              <h4>Conectividade</h4>
              <div className="status-item">
                <span className="label">Status da rede:</span>
                <span className={`value ${isOnline ? 'online' : 'offline'}`}>
                  {isOnline ? '🟢 Online' : '🔴 Offline'}
                </span>
              </div>
              <div className="status-item">
                <span className="label">Service Worker:</span>
                <span className={`value ${isServiceWorkerReady ? 'ready' : 'loading'}`}>
                  {isServiceWorkerReady ? '✅ Ativo' : '⏳ Carregando'}
                </span>
              </div>
            </div>

            {/* Operações pendentes */}
            {pendingOperations > 0 && (
              <div className="status-section">
                <h4>Sincronização</h4>
                <div className="status-item">
                  <span className="label">Operações pendentes:</span>
                  <span className="value pending">{pendingOperations}</span>
                </div>
                <div className="status-item">
                  <span className="label">Última sincronização:</span>
                  <span className="value">{formatTime(lastSyncTime)}</span>
                </div>
              </div>
            )}

            {/* Cache */}
            <div className="status-section">
              <h4>Cache</h4>
              <div className="status-item">
                <span className="label">Tamanho do cache:</span>
                <span className="value">{formatBytes(cacheSize)}</span>
              </div>
            </div>

            {/* Ações */}
            <div className="panel-actions">
              <button
                className="action-btn sync-btn"
                onClick={handleForceSync}
                disabled={!isOnline || isSyncing}
                title={!isOnline ? 'Sincronização disponível apenas online' : 'Forçar sincronização'}
              >
                {isSyncing ? '🔄 Sincronizando...' : '🔄 Sincronizar'}
              </button>
              
              <button
                className="action-btn clear-btn"
                onClick={handleClearCache}
                disabled={isClearing}
                title="Limpar cache da aplicação"
              >
                {isClearing ? '🗑️ Limpando...' : '🗑️ Limpar Cache'}
              </button>
            </div>

            {/* Informações adicionais */}
            <div className="panel-info">
              <p className="info-text">
                💡 <strong>Modo Offline:</strong> Suas alterações são salvas localmente 
                e sincronizadas automaticamente quando a conexão for restaurada.
              </p>
              {!isOnline && (
                <p className="info-text warning">
                  ⚠️ Você está offline. Algumas funcionalidades podem estar limitadas.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OfflineIndicator;