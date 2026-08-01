import { mutationQueue } from './storage.js';
import { request } from './api-client.js';
import { renderPeople } from './views/people.js';

const status = document.querySelector('[data-sync-status]');
function setStatus(text) { status.textContent = text; }
async function synchronize() {
  if (!navigator.onLine || !mutationQueue) return setStatus('envio pendente');
  setStatus('sincronizando');
  const result = await mutationQueue.flush(({ action, payload }) => request(action, payload).catch((error) => ({ ok: false, error })));
  setStatus(result.ok ? 'sincronizado' : 'envio pendente');
  return result;
}
window.addEventListener('online', synchronize);
window.addEventListener('offline', () => setStatus('offline · dados pendentes ficam neste aparelho'));
document.addEventListener('sync-requested', synchronize);
document.querySelector('[data-sync-now]').addEventListener('click', synchronize);
window.syncNow = synchronize;
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js');
setStatus(navigator.onLine ? 'sincronizado' : 'offline · dados pendentes ficam neste aparelho');
renderPeople(document.querySelector('#app'));
