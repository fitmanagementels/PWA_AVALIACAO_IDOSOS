const CACHE = 'avaliacao-idosos-v1';
const ASSETS = ['./', './index.html', './config.js', './styles/app.css', './js/app.js', './js/api-client.js', './js/storage.js', './js/domain.js', './js/assessment-domain.js', './js/history-domain.js', './js/views/people.js', './js/views/assessment-editor.js', './js/views/history.js', './manifest.webmanifest', './icons/icon.svg'];
self.addEventListener('install', (event) => event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS))));
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (event) => { if (event.request.method !== 'GET' || event.request.url.includes('script.google.com')) return; event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request))); });
