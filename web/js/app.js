import { hasPendingAssessmentMutation, mutationQueue } from './storage.js';
import { request } from './api-client.js';
import { flushQueue, pendingStatus } from './sync-status.js';
import { renderSyncPanel } from './views/sync-panel.js';
import { renderPeople, replacePeopleFromApi } from './views/people.js';
import { reconcileLocalAssessmentStatus } from './views/attendance-center.js';
import { isCurrentPage } from './navigation-guard.js';

const status = document.querySelector('[data-sync-status]');
const syncDock = document.querySelector('[data-sync-dock]');
const root = document.querySelector('#app');
let syncPromise = null;
function setStatus(text) { status.textContent = text; }
function renderStatus(state) { setStatus(state.message); renderSyncPanel(syncDock, state, { onRetry: synchronize }); }
function localAssessments() {
  return Object.keys(localStorage).filter((key) => key.startsWith('assessment:')).map((key) => {
    try { return JSON.parse(localStorage.getItem(key)); } catch (_) { return null; }
  }).filter(Boolean);
}
async function reconcileSettledLocalDrafts() {
  for (const assessment of localAssessments()) {
    if (assessment.status !== 'rascunho' && assessment.status !== 'pendenteDeSincronizacao') continue;
    if (await hasPendingAssessmentMutation(assessment.id)) continue;
    try {
      const response = await request('getAssessment', { avaliacaoId: assessment.id }, 'GET');
      const reconciled = reconcileLocalAssessmentStatus(assessment, response.data.assessment.status);
      if (reconciled !== assessment) localStorage.setItem(`assessment:${assessment.id}`, JSON.stringify(reconciled));
    } catch (_) {
      // Sem confirmação remota, o rascunho local permanece intacto.
    }
  }
}
async function refreshPeople() {
  if (!navigator.onLine) return;
  const response = await request('listPeople', {}, 'GET');
  replacePeopleFromApi(response.data);
  await reconcileSettledLocalDrafts();
  if (isCurrentPage('people')) renderPeople(root);
}
async function synchronizeQueue() {
  if (!mutationQueue) return renderStatus({ phase: 'error', pendingCount: 0, message: 'sincronização indisponível neste navegador', items: [] });
  if (!navigator.onLine) return renderStatus(await pendingStatus(mutationQueue, 'offline', 'offline · alterações protegidas neste aparelho'));
  renderStatus(await pendingStatus(mutationQueue, 'sending', 'Enviando alterações…'));
  const result = await flushQueue(mutationQueue, ({ action, payload }) => request(action, payload));
  renderStatus(result);
  if (result.ok) await refreshPeople().catch(() => setStatus('sincronizado · atualização compartilhada pendente'));
  return result;
}
function synchronize() {
  if (syncPromise) return syncPromise;
  syncPromise = synchronizeQueue().finally(() => { syncPromise = null; });
  return syncPromise;
}
window.addEventListener('online', synchronize);
window.addEventListener('offline', async () => {
  if (!mutationQueue) return renderStatus({ phase: 'error', pendingCount: 0, message: 'sincronização indisponível neste navegador', items: [] });
  renderStatus(await pendingStatus(mutationQueue, 'offline', 'offline · alterações protegidas neste aparelho'));
});
document.querySelector('[data-sync-now]').addEventListener('click', synchronize);
window.syncNow = synchronize;
window.scheduleSync = () => queueMicrotask(() => { synchronize().catch(() => {}); });
if (window.APP_RUNTIME !== 'apps-script' && 'serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js');
renderStatus({ phase: navigator.onLine ? 'synced' : 'offline', pendingCount: 0, message: navigator.onLine ? 'Tudo sincronizado' : 'offline · alterações protegidas neste aparelho', items: [] });
renderPeople(root);
refreshPeople().catch(() => setStatus('dados locais · sincronização indisponível'));
if (navigator.onLine) synchronize();
