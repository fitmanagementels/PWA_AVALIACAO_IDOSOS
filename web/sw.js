const CACHE = 'avaliacao-idosos-v31';
const ASSETS = ['./', './index.html', './config.js', './styles/app.css', './styles/report.css', './js/app.js', './js/api-client.js', './js/storage.js', './js/sync-status.js', './js/domain.js', './js/date-format.js', './js/history-cache.js', './js/assessment-domain.js', './js/result-presentation.js', './js/report-model.js', './js/sync-model.js', './js/history-domain.js', './js/navigation-guard.js', './js/test-inputs.js', './js/views/people.js', './js/views/attendance-center.js', './js/views/assessment-editor.js', './js/views/test-sheet.js', './js/views/history.js', './js/views/report-selection.js', './js/views/report-preview.js', './js/views/sync-panel.js', './js/views/selection-controls.js', './js/views/xsteam-select.js', './manifest.webmanifest', './icons/icon.svg', './icons/xsteam-mark.svg'];
self.addEventListener('install', (event) => event.waitUntil((async () => {
  const cache = await caches.open(CACHE);
  await cache.addAll(ASSETS);
  await self.skipWaiting();
})()));
self.addEventListener('activate', (event) => event.waitUntil((async () => {
  const cacheNames = await caches.keys();
  await Promise.all(cacheNames.filter((cacheName) => cacheName !== CACHE).map((cacheName) => caches.delete(cacheName)));
  await self.clients.claim();
})()));
self.addEventListener('fetch', (event) => { if (event.request.method !== 'GET' || event.request.url.includes('script.google.com')) return; event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request))); });
