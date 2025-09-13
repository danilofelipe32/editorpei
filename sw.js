// sw.js
const CACHE_NAME = 'assistente-pei-pwa-cache-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/logo192.png',
  '/logo512.png',
  '/index.tsx', // The browser will request the compiled version, which will be cached on first fetch
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css',
];

// Instala o service worker e armazena os ativos essenciais no cache.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('Cache aberto');
        // Adiciona os URLs ao cache. Ignora falhas individuais para não quebrar a instalação.
        const cachePromises = urlsToCache.map(urlToCache => {
            return cache.add(urlToCache).catch(err => {
                console.warn(`Falha ao armazenar em cache ${urlToCache}:`, err);
            });
        });
        return Promise.all(cachePromises);
      })
  );
  self.skipWaiting();
});

// Intercepta as requisições de rede.
self.addEventListener('fetch', event => {
  // Ignora requisições que não são GET
  if (event.request.method !== 'GET') {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        // Se a resposta estiver no cache, retorna-a.
        if (response) {
          return response;
        }

        // Caso contrário, busca na rede.
        return fetch(event.request).then(
          function(response) {
            // Verifica se a resposta da rede é válida.
            if (!response || response.status !== 200 || (response.type !== 'basic' && response.type !== 'cors')) {
              return response;
            }

            // Clona a resposta para que possa ser usada pelo navegador e pelo cache.
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then(function(cache) {
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        );
      })
    );
});

// Ativa o service worker e limpa caches antigos.
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Deletando cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});
