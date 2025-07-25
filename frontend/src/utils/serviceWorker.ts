// Utilitário para registro e gerenciamento do Service Worker
// Implementa funcionalidades offline-first para Fusion Flow

const isLocalhost = Boolean(
  window.location.hostname === 'localhost' ||
  window.location.hostname === '[::1]' ||
  window.location.hostname.match(
    /^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/
  )
);

type Config = {
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
  onOffline?: () => void;
  onOnline?: () => void;
};

export function register(config?: Config) {
  if ('serviceWorker' in navigator) {
    // Aguardar carregamento da página
    window.addEventListener('load', () => {
      const swUrl = `${process.env.PUBLIC_URL}/sw.js`;

      if (isLocalhost) {
        // Em localhost, verificar se SW existe
        checkValidServiceWorker(swUrl, config);

        // Log adicional para desenvolvimento
        navigator.serviceWorker.ready.then(() => {
          console.log(
            '[SW] Esta aplicação está sendo servida cache-first por um service worker. ' +
            'Para saber mais, visite https://cra.link/PWA'
          );
        });
      } else {
        // Em produção, registrar SW
        registerValidSW(swUrl, config);
      }
    });

    // Listeners para status de conectividade
    window.addEventListener('online', () => {
      console.log('[SW] Aplicação voltou online');
      config?.onOnline?.();
      
      // Tentar sincronizar dados pendentes
      if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
        navigator.serviceWorker.ready.then(registration => {
          return (registration as any).sync.register('background-sync-tasks');
        });
      }
    });

    window.addEventListener('offline', () => {
      console.log('[SW] Aplicação ficou offline');
      config?.onOffline?.();
    });
  }
}

function registerValidSW(swUrl: string, config?: Config) {
  navigator.serviceWorker
    .register(swUrl)
    .then(registration => {
      console.log('[SW] Service Worker registrado com sucesso:', registration);
      
      registration.onupdatefound = () => {
        const installingWorker = registration.installing;
        if (installingWorker == null) {
          return;
        }
        
        installingWorker.onstatechange = () => {
          if (installingWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              // Nova versão disponível
              console.log('[SW] Nova versão do Service Worker disponível');
              config?.onUpdate?.(registration);
            } else {
              // Primeira instalação
              console.log('[SW] Conteúdo cacheado para uso offline');
              config?.onSuccess?.(registration);
            }
          }
        };
      };
    })
    .catch(error => {
      console.error('[SW] Erro ao registrar Service Worker:', error);
    });
}

function checkValidServiceWorker(swUrl: string, config?: Config) {
  // Verificar se o service worker pode ser encontrado
  fetch(swUrl, {
    headers: { 'Service-Worker': 'script' },
  })
    .then(response => {
      // Verificar se existe e se é um JS válido
      const contentType = response.headers.get('content-type');
      if (
        response.status === 404 ||
        (contentType != null && contentType.indexOf('javascript') === -1)
      ) {
        // Service Worker não encontrado, recarregar página
        navigator.serviceWorker.ready.then(registration => {
          registration.unregister().then(() => {
            window.location.reload();
          });
        });
      } else {
        // Service Worker encontrado, registrar normalmente
        registerValidSW(swUrl, config);
      }
    })
    .catch(() => {
      console.log('[SW] Sem conexão com internet. Aplicação rodando em modo offline.');
    });
}

export function unregister() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then(registration => {
        registration.unregister();
        console.log('[SW] Service Worker desregistrado');
      })
      .catch(error => {
        console.error('[SW] Erro ao desregistrar Service Worker:', error);
      });
  }
}

// Utilitários para comunicação com Service Worker
export class ServiceWorkerMessenger {
  private static instance: ServiceWorkerMessenger;
  private messageHandlers: Map<string, (data: any) => void> = new Map();

  private constructor() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', this.handleMessage.bind(this));
    }
  }

  static getInstance(): ServiceWorkerMessenger {
    if (!ServiceWorkerMessenger.instance) {
      ServiceWorkerMessenger.instance = new ServiceWorkerMessenger();
    }
    return ServiceWorkerMessenger.instance;
  }

  // Enviar mensagem para Service Worker
  async sendMessage(type: string, data?: any): Promise<void> {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      if (registration.active) {
        registration.active.postMessage({ type, data });
      }
    }
  }

  // Registrar handler para mensagens do Service Worker
  onMessage(type: string, handler: (data: any) => void): void {
    this.messageHandlers.set(type, handler);
  }

  // Remover handler de mensagem
  offMessage(type: string): void {
    this.messageHandlers.delete(type);
  }

  private handleMessage(event: MessageEvent): void {
    const { type, data } = event.data;
    const handler = this.messageHandlers.get(type);
    if (handler) {
      handler(data);
    }
  }

  // Limpar cache antigo
  async cleanCache(): Promise<void> {
    await this.sendMessage('CLEAN_CACHE');
  }

  // Verificar status de conectividade
  isOnline(): boolean {
    return navigator.onLine;
  }

  // Forçar atualização do Service Worker
  async updateServiceWorker(): Promise<void> {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      await registration.update();
    }
  }
}

// Cache API helpers
export class CacheManager {
  private static readonly CACHE_PREFIX = 'fusion-flow';

  // Verificar se item está no cache
  static async isCached(url: string, cacheName?: string): Promise<boolean> {
    if (!('caches' in window)) return false;
    
    const cache = await caches.open(cacheName || `${this.CACHE_PREFIX}-dynamic-v2.0.0`);
    const response = await cache.match(url);
    return !!response;
  }

  // Adicionar item ao cache manualmente
  static async addToCache(url: string, response: Response, cacheName?: string): Promise<void> {
    if (!('caches' in window)) return;
    
    const cache = await caches.open(cacheName || `${this.CACHE_PREFIX}-dynamic-v2.0.0`);
    await cache.put(url, response);
  }

  // Remover item do cache
  static async removeFromCache(url: string, cacheName?: string): Promise<boolean> {
    if (!('caches' in window)) return false;
    
    const cache = await caches.open(cacheName || `${this.CACHE_PREFIX}-dynamic-v2.0.0`);
    return await cache.delete(url);
  }

  // Obter tamanho total do cache
  static async getCacheSize(): Promise<number> {
    if (!('caches' in window)) return 0;
    
    const cacheNames = await caches.keys();
    let totalSize = 0;
    
    for (const cacheName of cacheNames) {
      if (cacheName.includes(this.CACHE_PREFIX)) {
        const cache = await caches.open(cacheName);
        const keys = await cache.keys();
        
        for (const request of keys) {
          const response = await cache.match(request);
          if (response) {
            const blob = await response.blob();
            totalSize += blob.size;
          }
        }
      }
    }
    
    return totalSize;
  }

  // Limpar todos os caches da aplicação
  static async clearAllCaches(): Promise<void> {
    if (!('caches' in window)) return;
    
    const cacheNames = await caches.keys();
    const fusionFlowCaches = cacheNames.filter(name => name.includes(this.CACHE_PREFIX));
    
    await Promise.all(
      fusionFlowCaches.map(cacheName => caches.delete(cacheName))
    );
  }
}

// Verificar capacidades do navegador
export const browserCapabilities = {
  serviceWorker: 'serviceWorker' in navigator,
  cacheAPI: 'caches' in window,
  backgroundSync: 'serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype,
  pushNotifications: 'serviceWorker' in navigator && 'PushManager' in window,
  indexedDB: 'indexedDB' in window,
  webShare: 'share' in navigator,
  clipboard: 'clipboard' in navigator
};

console.log('[SW Utils] Browser capabilities:', browserCapabilities);