import { mutationQueue } from './storage.js';
import { request } from './api-client.js';
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
  if (!navigator.onLine || !mutationQueue) return setStatus('envio pendente');
  setStatus('sincronizando');
  const result = await mutationQueue.flush(({ action, payload }) => request(action, payload).catch((error) => ({ ok: false, error })));
  setStatus(result.ok ? 'sincronizado' : 'envio pendente');
  if (result.ok) await refreshPeople().catch(() => setStatus('sincronizado · atualização compartilhada pendente'));
  return result;
}
window.addEventListener('online', () => setStatus('online · toque em Salvar para sincronizar'));
window.addEventListener('offline', () => setStatus('offline · dados pendentes ficam neste aparelho'));
document.querySelector('[data-sync-now]').addEventListener('click', synchronize);
window.syncNow = synchronize;
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js');
setStatus(navigator.onLine ? 'sincronizado' : 'offline · dados pendentes ficam neste aparelho');
renderPeople(root);
refreshPeople().catch(() => setStatus('dados locais · sincronização indisponível'));
