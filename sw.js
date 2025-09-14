// sw.js
const CACHE_NAME = 'assistente-pei-pwa-cache-v4'; // Incremented cache version
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  // App source files
  './index.tsx',
  './App.tsx',
  './store.ts', // Added new store file
  './types.ts',
  './constants.tsx',
  './services/geminiService.ts',
  './services/storageService.ts',
  './components/Modal.tsx',
  './components/TextAreaWithActions.tsx',
  './components/PeiFormView.tsx',
  './components/ActivityBankView.tsx',
  './components/PeiListView.tsx',
  './components/SupportFilesView.tsx',
  './components/PrivacyPolicyView.tsx',
  './components/ActivityCard.tsx',
  // External dependencies
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css',
  'https://unpkg.com/@babel/standalone/babel.min.js',
  'https://aistudiocdn.com/react@^19.1.1',
  'https://aistudiocdn.com/react-dom@^19.1.1',
  'https://aistudiocdn.com/@google/genai@^1.19.0',
  'https://aistudiocdn.com/zustand@^4.5.4' // Added zustand to cache
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
