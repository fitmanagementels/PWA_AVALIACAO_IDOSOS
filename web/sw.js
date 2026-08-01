const CACHE = 'avaliacao-idosos-v1';
const ASSETS = ['./', './index.html', './styles/app.css', './js/app.js', './js/api-client.js', './js/storage.js', './manifest.webmanifest', './icons/icon.svg'];
self.addEventListener('install', (event) => event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS))));
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (event) => { if (event.request.method !== 'GET' || event.request.url.includes('script.google.com')) return; event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request))); });
