import { useEffect, useState, useCallback } from 'react';

interface ServiceWorkerState {
  isSupported: boolean;
  isRegistered: boolean;
  isInstalling: boolean;
  isWaiting: boolean;
  isControlling: boolean;
  updateAvailable: boolean;
  error: string | null;
}

interface ServiceWorkerActions {
  register: () => Promise<void>;
  unregister: () => Promise<void>;
  update: () => Promise<void>;
  skipWaiting: () => void;
}

interface UseServiceWorkerReturn extends ServiceWorkerState, ServiceWorkerActions {}

/**
 * Hook para gerenciar Service Worker
 * Implementa cache offline, atualizações e notificações
 */
export const useServiceWorker = (): UseServiceWorkerReturn => {
  const [state, setState] = useState<ServiceWorkerState>({
    isSupported: 'serviceWorker' in navigator,
    isRegistered: false,
    isInstalling: false,
    isWaiting: false,
    isControlling: false,
    updateAvailable: false,
    error: null
  });

  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  // Registrar Service Worker
  const register = useCallback(async () => {
    if (!state.isSupported) {
      setState(prev => ({ 
        ...prev, 
        error: 'Service Worker não é suportado neste navegador' 
      }));
      return;
    }

    try {
      setState(prev => ({ ...prev, isInstalling: true, error: null }));
      
      const reg = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });
      
      setRegistration(reg);
      
      setState(prev => ({
        ...prev,
        isRegistered: true,
        isInstalling: false,
        isControlling: !!navigator.serviceWorker.controller
      }));

      console.log('[SW Hook] Service Worker registrado com sucesso');
      
      // Configurar listeners para atualizações
      setupUpdateListeners(reg);
      
    } catch (error) {
      console.error('[SW Hook] Erro ao registrar Service Worker:', error);
      setState(prev => ({
        ...prev,
        isInstalling: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      }));
    }
  }, [state.isSupported]);

  // Desregistrar Service Worker
  const unregister = useCallback(async () => {
    if (!registration) {
      console.warn('[SW Hook] Nenhum Service Worker registrado para desregistrar');
      return;
    }

    try {
      const result = await registration.unregister();
      if (result) {
        setState(prev => ({
          ...prev,
          isRegistered: false,
          isControlling: false,
          updateAvailable: false
        }));
        setRegistration(null);
        setWaitingWorker(null);
        console.log('[SW Hook] Service Worker desregistrado com sucesso');
      }
    } catch (error) {
      console.error('[SW Hook] Erro ao desregistrar Service Worker:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Erro ao desregistrar'
      }));
    }
  }, [registration]);

  // Atualizar Service Worker
  const update = useCallback(async () => {
    if (!registration) {
      console.warn('[SW Hook] Nenhum Service Worker registrado para atualizar');
      return;
    }

    try {
      await registration.update();
      console.log('[SW Hook] Verificação de atualização iniciada');
    } catch (error) {
      console.error('[SW Hook] Erro ao verificar atualizações:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Erro ao atualizar'
      }));
    }
  }, [registration]);

  // Pular espera e ativar novo Service Worker
  const skipWaiting = useCallback(() => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
      console.log('[SW Hook] Comando skip waiting enviado');
    }
  }, [waitingWorker]);

  // Configurar listeners para atualizações
  const setupUpdateListeners = useCallback((reg: ServiceWorkerRegistration) => {
    // Listener para novo Service Worker instalando
    reg.addEventListener('updatefound', () => {
      const newWorker = reg.installing;
      if (!newWorker) return;

      setState(prev => ({ ...prev, isInstalling: true }));
      console.log('[SW Hook] Nova versão do Service Worker encontrada');

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed') {
          setState(prev => ({ ...prev, isInstalling: false }));
          
          if (navigator.serviceWorker.controller) {
            // Há um SW controlando, nova versão disponível
            setState(prev => ({ 
              ...prev, 
              updateAvailable: true,
              isWaiting: true 
            }));
            setWaitingWorker(newWorker);
            console.log('[SW Hook] Nova versão disponível');
          } else {
            // Primeira instalação
            setState(prev => ({ ...prev, isControlling: true }));
            console.log('[SW Hook] Service Worker instalado pela primeira vez');
          }
        }
      });
    });
  }, []);

  // Listener para mudanças no controller
  useEffect(() => {
    if (!state.isSupported) return;

    const handleControllerChange = () => {
      setState(prev => ({
        ...prev,
        isControlling: !!navigator.serviceWorker.controller,
        updateAvailable: false,
        isWaiting: false
      }));
      setWaitingWorker(null);
      console.log('[SW Hook] Service Worker controller mudou');
      
      // Recarregar página para usar nova versão
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, [state.isSupported]);

  // Verificar se já existe um Service Worker registrado
  useEffect(() => {
    if (!state.isSupported) return;

    navigator.serviceWorker.getRegistration().then(reg => {
      if (reg) {
        setRegistration(reg);
        setState(prev => ({
          ...prev,
          isRegistered: true,
          isControlling: !!navigator.serviceWorker.controller
        }));
        setupUpdateListeners(reg);
        console.log('[SW Hook] Service Worker já registrado encontrado');
      }
    });
  }, [state.isSupported, setupUpdateListeners]);

  // Auto-registrar em produção
  useEffect(() => {
    if (process.env.NODE_ENV === 'production' && 
        state.isSupported && 
        !state.isRegistered && 
        !state.isInstalling) {
      register();
    }
  }, [state.isSupported, state.isRegistered, state.isInstalling, register]);

  return {
    ...state,
    register,
    unregister,
    update,
    skipWaiting
  };
};

// Hook para gerenciar cache offline
export const useOfflineCache = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingOperations, setPendingOperations] = useState<any[]>([]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      console.log('[Offline Cache] Voltou online');
    };

    const handleOffline = () => {
      setIsOnline(false);
      console.log('[Offline Cache] Ficou offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const addPendingOperation = useCallback((operation: any) => {
    setPendingOperations(prev => [...prev, operation]);
    console.log('[Offline Cache] Operação adicionada à fila offline');
  }, []);

  const clearPendingOperations = useCallback(() => {
    setPendingOperations([]);
    console.log('[Offline Cache] Fila de operações offline limpa');
  }, []);

  return {
    isOnline,
    pendingOperations,
    addPendingOperation,
    clearPendingOperations
  };
};

// Hook para notificações push
export const usePushNotifications = () => {
  const [permission, setPermission] = useState<NotificationPermission>(
    'Notification' in window ? Notification.permission : 'denied'
  );
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      console.warn('[Push] Notificações não suportadas');
      return false;
    }

    const result = await Notification.requestPermission();
    setPermission(result);
    return result === 'granted';
  }, []);

  const subscribe = useCallback(async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('[Push] Push notifications não suportadas');
      return null;
    }

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        console.warn('[Push] Service Worker não registrado');
        return null;
      }

      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.REACT_APP_VAPID_PUBLIC_KEY
      });

      setSubscription(sub);
      console.log('[Push] Inscrito em push notifications');
      return sub;
    } catch (error) {
      console.error('[Push] Erro ao se inscrever:', error);
      return null;
    }
  }, []);

  const unsubscribe = useCallback(async () => {
    if (subscription) {
      await subscription.unsubscribe();
      setSubscription(null);
      console.log('[Push] Desinscrito de push notifications');
    }
  }, [subscription]);

  return {
    permission,
    subscription,
    requestPermission,
    subscribe,
    unsubscribe
  };
};