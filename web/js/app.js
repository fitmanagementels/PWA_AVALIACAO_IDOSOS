import { mutationQueue } from './storage.js';
import { request } from './api-client.js';
import { flushQueue, pendingStatus } from './sync-status.js';
import { renderPeople, replacePeopleFromApi } from './views/people.js';

const status = document.querySelector('[data-sync-status]');
const root = document.querySelector('#app');
function setStatus(text) { status.textContent = text; }
async function refreshPeople() {
  if (!navigator.onLine) return;
  const response = await request('listPeople', {}, 'GET');
  replacePeopleFromApi(response.data);
  renderPeople(root);
}
async function synchronize() {
  if (!mutationQueue) return setStatus('sincronização indisponível neste navegador');
  if (!navigator.onLine) return setStatus('offline · alterações protegidas neste aparelho');
  setStatus('sincronizando');
  const result = await flushQueue(mutationQueue, ({ action, payload }) => request(action, payload));
  setStatus(result.message);
  if (result.ok) await refreshPeople().catch(() => setStatus('sincronizado · atualização compartilhada pendente'));
  return result;
}
window.addEventListener('online', synchronize);
window.addEventListener('offline', async () => setStatus((await pendingStatus(mutationQueue, 'offline', 'offline · alterações protegidas neste aparelho')).message));
document.querySelector('[data-sync-now]').addEventListener('click', synchronize);
window.syncNow = synchronize;
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js');
setStatus(navigator.onLine ? 'sincronizado' : 'offline · dados pendentes ficam neste aparelho');
renderPeople(root);
refreshPeople().catch(() => setStatus('dados locais · sincronização indisponível'));
if (navigator.onLine) synchronize();
