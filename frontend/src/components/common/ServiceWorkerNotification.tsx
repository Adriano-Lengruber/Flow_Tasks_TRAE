import React, { useState, useEffect } from 'react';
import { useServiceWorker, useOfflineCache } from '../../hooks/useServiceWorker';

interface ServiceWorkerNotificationProps {
  className?: string;
}

/**
 * Componente para exibir notificações do Service Worker
 * Mostra status de atualização, offline/online e erros
 */
export const ServiceWorkerNotification: React.FC<ServiceWorkerNotificationProps> = ({ 
  className = '' 
}) => {
  const {
    isRegistered,
    isInstalling,
    updateAvailable,
    error,
    skipWaiting,
    update
  } = useServiceWorker();
  
  const { isOnline, pendingOperations } = useOfflineCache();
  
  const [showUpdateNotification, setShowUpdateNotification] = useState(false);
  const [showOfflineNotification, setShowOfflineNotification] = useState(false);
  const [showErrorNotification, setShowErrorNotification] = useState(false);
  const [dismissed, setDismissed] = useState({
    update: false,
    offline: false,
    error: false
  });

  // Mostrar notificação de atualização
  useEffect(() => {
    if (updateAvailable && !dismissed.update) {
      setShowUpdateNotification(true);
    }
  }, [updateAvailable, dismissed.update]);

  // Mostrar notificação offline
  useEffect(() => {
    if (!isOnline && !dismissed.offline) {
      setShowOfflineNotification(true);
    } else if (isOnline) {
      setShowOfflineNotification(false);
      setDismissed(prev => ({ ...prev, offline: false }));
    }
  }, [isOnline, dismissed.offline]);

  // Mostrar notificação de erro
  useEffect(() => {
    if (error && !dismissed.error) {
      setShowErrorNotification(true);
    }
  }, [error, dismissed.error]);

  const handleUpdateApp = () => {
    skipWaiting();
    setShowUpdateNotification(false);
    setDismissed(prev => ({ ...prev, update: true }));
  };

  const handleDismissUpdate = () => {
    setShowUpdateNotification(false);
    setDismissed(prev => ({ ...prev, update: true }));
  };

  const handleDismissOffline = () => {
    setShowOfflineNotification(false);
    setDismissed(prev => ({ ...prev, offline: true }));
  };

  const handleDismissError = () => {
    setShowErrorNotification(false);
    setDismissed(prev => ({ ...prev, error: true }));
  };

  const handleRetryUpdate = () => {
    update();
    setShowErrorNotification(false);
    setDismissed(prev => ({ ...prev, error: true }));
  };

  return (
    <div className={`service-worker-notifications ${className}`}>
      {/* Notificação de Atualização Disponível */}
      {showUpdateNotification && (
        <div className="notification notification-update">
          <div className="notification-content">
            <div className="notification-icon">🔄</div>
            <div className="notification-text">
              <h4>Nova versão disponível!</h4>
              <p>Uma nova versão do Fusion Flow está pronta. Atualize para obter as últimas melhorias.</p>
            </div>
            <div className="notification-actions">
              <button 
                className="btn btn-primary btn-sm"
                onClick={handleUpdateApp}
              >
                Atualizar Agora
              </button>
              <button 
                className="btn btn-secondary btn-sm"
                onClick={handleDismissUpdate}
              >
                Mais Tarde
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notificação de Status Offline */}
      {showOfflineNotification && (
        <div className="notification notification-offline">
          <div className="notification-content">
            <div className="notification-icon">📡</div>
            <div className="notification-text">
              <h4>Modo Offline</h4>
              <p>
                Você está offline. Suas alterações serão sincronizadas quando a conexão for restaurada.
                {pendingOperations.length > 0 && (
                  <span className="pending-count">
                    {` (${pendingOperations.length} operações pendentes)`}
                  </span>
                )}
              </p>
            </div>
            <div className="notification-actions">
              <button 
                className="btn btn-secondary btn-sm"
                onClick={handleDismissOffline}
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notificação de Erro */}
      {showErrorNotification && error && (
        <div className="notification notification-error">
          <div className="notification-content">
            <div className="notification-icon">⚠️</div>
            <div className="notification-text">
              <h4>Erro no Service Worker</h4>
              <p>{error}</p>
            </div>
            <div className="notification-actions">
              <button 
                className="btn btn-primary btn-sm"
                onClick={handleRetryUpdate}
              >
                Tentar Novamente
              </button>
              <button 
                className="btn btn-secondary btn-sm"
                onClick={handleDismissError}
              >
                Dispensar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Indicador de Status (sempre visível) */}
      <div className="status-indicator">
        {isInstalling && (
          <div className="status-item status-installing">
            <span className="status-icon">⏳</span>
            <span className="status-text">Instalando atualizações...</span>
          </div>
        )}
        
        {!isOnline && (
          <div className="status-item status-offline">
            <span className="status-icon">📡</span>
            <span className="status-text">Offline</span>
          </div>
        )}
        
        {isRegistered && isOnline && !isInstalling && (
          <div className="status-item status-online">
            <span className="status-icon">✅</span>
            <span className="status-text">Cache ativo</span>
          </div>
        )}
      </div>

      <style>{`
        .service-worker-notifications {
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 9999;
          max-width: 400px;
        }

        .notification {
          background: white;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          margin-bottom: 12px;
          overflow: hidden;
          animation: slideIn 0.3s ease-out;
        }

        .notification-update {
          border-left: 4px solid #007bff;
        }

        .notification-offline {
          border-left: 4px solid #ffc107;
        }

        .notification-error {
          border-left: 4px solid #dc3545;
        }

        .notification-content {
          padding: 16px;
          display: flex;
          align-items: flex-start;
          gap: 12px;
        }

        .notification-icon {
          font-size: 24px;
          flex-shrink: 0;
        }

        .notification-text {
          flex: 1;
        }

        .notification-text h4 {
          margin: 0 0 8px 0;
          font-size: 16px;
          font-weight: 600;
          color: #333;
        }

        .notification-text p {
          margin: 0;
          font-size: 14px;
          color: #666;
          line-height: 1.4;
        }

        .pending-count {
          font-weight: 600;
          color: #ffc107;
        }

        .notification-actions {
          display: flex;
          gap: 8px;
          margin-top: 12px;
        }

        .btn {
          padding: 6px 12px;
          border: none;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-primary {
          background: #007bff;
          color: white;
        }

        .btn-primary:hover {
          background: #0056b3;
        }

        .btn-secondary {
          background: #6c757d;
          color: white;
        }

        .btn-secondary:hover {
          background: #545b62;
        }

        .btn-sm {
          padding: 4px 8px;
          font-size: 11px;
        }

        .status-indicator {
          position: fixed;
          bottom: 20px;
          right: 20px;
          z-index: 9998;
        }

        .status-item {
          background: rgba(0, 0, 0, 0.8);
          color: white;
          padding: 8px 12px;
          border-radius: 20px;
          font-size: 12px;
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 8px;
          backdrop-filter: blur(10px);
        }

        .status-installing {
          background: rgba(255, 193, 7, 0.9);
          color: #333;
        }

        .status-offline {
          background: rgba(220, 53, 69, 0.9);
        }

        .status-online {
          background: rgba(40, 167, 69, 0.9);
        }

        .status-icon {
          font-size: 14px;
        }

        .status-text {
          font-weight: 500;
        }

        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        @media (max-width: 768px) {
          .service-worker-notifications {
            top: 10px;
            right: 10px;
            left: 10px;
            max-width: none;
          }

          .notification-content {
            padding: 12px;
          }

          .notification-actions {
            flex-direction: column;
          }

          .status-indicator {
            bottom: 10px;
            right: 10px;
          }
        }
      `}</style>
    </div>
  );
};

export default ServiceWorkerNotification;