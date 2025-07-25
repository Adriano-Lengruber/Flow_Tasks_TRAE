// Service Worker para Fusion Flow
// Implementa cache offline e otimizações de performance

const CACHE_NAME = 'fusion-flow-v2.0.0';
const STATIC_CACHE = 'fusion-flow-static-v2.0.0';
const DYNAMIC_CACHE = 'fusion-flow-dynamic-v2.0.0';
const GRAPHQL_CACHE = 'fusion-flow-graphql-v2.0.0';

// Assets estáticos para cache
const STATIC_ASSETS = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json',
  '/favicon.ico'
];

// URLs da API GraphQL
const GRAPHQL_ENDPOINT = '/graphql';

// Instalar Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Static assets cached successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Error caching static assets:', error);
      })
  );
});

// Ativar Service Worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // Remove caches antigos
            if (cacheName !== STATIC_CACHE && 
                cacheName !== DYNAMIC_CACHE && 
                cacheName !== GRAPHQL_CACHE) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Service Worker activated');
        return self.clients.claim();
      })
  );
});

// Interceptar requisições
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Ignorar URLs com esquemas não suportados
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return;
  }
  
  // GraphQL requests - Network First com fallback para cache
  if (url.pathname === GRAPHQL_ENDPOINT) {
    event.respondWith(handleGraphQLRequest(request));
    return;
  }
  
  // Static assets - Cache First
  if (isStaticAsset(request)) {
    event.respondWith(handleStaticAsset(request));
    return;
  }
  
  // Dynamic content - Stale While Revalidate
  event.respondWith(handleDynamicContent(request));
});

// Manipular requisições GraphQL
async function handleGraphQLRequest(request) {
  const cache = await caches.open(GRAPHQL_CACHE);
  
  try {
    // Tentar buscar da rede primeiro
    const networkResponse = await fetch(request.clone());
    
    if (networkResponse.ok) {
      // Cachear apenas queries GET (não mutations)
      if (request.method === 'GET' || isQueryRequest(request)) {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    }
    
    throw new Error('Network response not ok');
  } catch (error) {
    console.log('[SW] Network failed for GraphQL, trying cache...');
    
    // Fallback para cache se a rede falhar
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      console.log('[SW] Serving GraphQL from cache');
      return cachedResponse;
    }
    
    // Se não há cache, retornar erro offline
    return new Response(
      JSON.stringify({ 
        errors: [{ message: 'Offline - No cached data available' }] 
      }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Manipular assets estáticos
async function handleStaticAsset(request) {
  const cache = await caches.open(STATIC_CACHE);
  
  // Cache First - buscar do cache primeiro
  const cachedResponse = await cache.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // Se não está no cache, buscar da rede e cachear
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.error('[SW] Failed to fetch static asset:', error);
    throw error;
  }
}

// Manipular conteúdo dinâmico
async function handleDynamicContent(request) {
  const cache = await caches.open(DYNAMIC_CACHE);
  
  // Stale While Revalidate
  const cachedResponse = await cache.match(request);
  
  const fetchPromise = fetch(request)
    .then((networkResponse) => {
      if (networkResponse.ok) {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    })
    .catch(() => cachedResponse); // Fallback para cache se rede falhar
  
  // Retornar cache imediatamente se disponível, senão aguardar rede
  return cachedResponse || fetchPromise;
}

// Verificar se é asset estático
function isStaticAsset(request) {
  const url = new URL(request.url);
  return url.pathname.startsWith('/static/') ||
         url.pathname.endsWith('.js') ||
         url.pathname.endsWith('.css') ||
         url.pathname.endsWith('.png') ||
         url.pathname.endsWith('.jpg') ||
         url.pathname.endsWith('.svg') ||
         url.pathname.endsWith('.ico');
}

// Verificar se é uma query GraphQL (não mutation)
async function isQueryRequest(request) {
  if (request.method !== 'POST') return false;
  
  try {
    const body = await request.clone().text();
    const parsed = JSON.parse(body);
    
    // Verificar se é uma query (não mutation ou subscription)
    return parsed.query && 
           !parsed.query.trim().startsWith('mutation') &&
           !parsed.query.trim().startsWith('subscription');
  } catch {
    return false;
  }
}

// Background Sync para operações offline
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);
  
  if (event.tag === 'background-sync-tasks') {
    event.waitUntil(syncPendingTasks());
  }
});

// Sincronizar tarefas pendentes
async function syncPendingTasks() {
  try {
    // Buscar tarefas pendentes do IndexedDB
    const pendingTasks = await getPendingTasks();
    
    for (const task of pendingTasks) {
      try {
        await fetch('/graphql', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(task.mutation)
        });
        
        // Remover tarefa sincronizada
        await removePendingTask(task.id);
        console.log('[SW] Task synced successfully:', task.id);
      } catch (error) {
        console.error('[SW] Failed to sync task:', task.id, error);
      }
    }
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
  }
}

// Placeholder functions para IndexedDB (implementar posteriormente)
async function getPendingTasks() {
  // TODO: Implementar busca no IndexedDB
  return [];
}

async function removePendingTask(taskId) {
  // TODO: Implementar remoção do IndexedDB
  console.log('Removing task:', taskId);
}

// Notificações Push
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  const options = {
    body: event.data ? event.data.text() : 'Nova notificação do Fusion Flow',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Ver detalhes',
        icon: '/favicon.ico'
      },
      {
        action: 'close',
        title: 'Fechar',
        icon: '/favicon.ico'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('Fusion Flow', options)
  );
});

// Manipular cliques em notificações
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification click received');
  
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

console.log('[SW] Service Worker loaded successfully');