export function createMutationQueue(store) {
  return {
    async enqueue(mutation) { await store.put({ ...mutation, queuedAt: mutation.queuedAt || new Date().toISOString() }); },
    async enqueueAssessment({ assessmentId, action, payload }) {
      await store.put({ id: `assessment:${assessmentId}`, assessmentId, action, payload });
    },
    async hasPendingAssessment(assessmentId) {
      return (await store.getAll()).some((item) => item.assessmentId === assessmentId);
    },
    async list() { return (await store.getAll()).sort((a, b) => String(a.queuedAt || '').localeCompare(String(b.queuedAt || ''))); },
    async flush(send) {
      for (const mutation of await this.list()) {
        const response = await send(mutation);
        if (!response.ok) return response;
        await store.remove(mutation.id);
      }
      return { ok: true };
    }
  };
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('avaliacao-idosos', 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      db.createObjectStore('mutations', { keyPath: 'id' });
      db.createObjectStore('drafts', { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function indexedStore(name) {
  return {
    async getAll() { const db = await openDatabase(); return new Promise((resolve, reject) => { const request = db.transaction(name).objectStore(name).getAll(); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); }); },
    async put(value) { const db = await openDatabase(); return new Promise((resolve, reject) => { const request = db.transaction(name, 'readwrite').objectStore(name).put(value); request.onsuccess = () => resolve(); request.onerror = () => reject(request.error); }); },
    async remove(id) { const db = await openDatabase(); return new Promise((resolve, reject) => { const request = db.transaction(name, 'readwrite').objectStore(name).delete(id); request.onsuccess = () => resolve(); request.onerror = () => reject(request.error); }); }
  };
}

export const mutationQueue = typeof indexedDB === 'undefined' ? null : createMutationQueue(indexedStore('mutations'));
export async function saveDraft(draft) { return indexedStore('drafts').put({ ...draft, savedAt: new Date().toISOString() }); }
export async function getDraft(id) { return (await indexedStore('drafts').getAll()).find((draft) => draft.id === id) || null; }

export async function queueMutation(action, payload) {
  if (!mutationQueue) throw new Error('Este navegador não oferece armazenamento local para sincronização.');
  await mutationQueue.enqueue({ id: crypto.randomUUID(), action, payload });
}

export async function enqueueAssessmentMutation(assessmentId, action, payload) {
  if (!mutationQueue) throw new Error('Este navegador não oferece armazenamento local para sincronização.');
  await mutationQueue.enqueueAssessment({ assessmentId, action, payload });
}

export async function hasPendingAssessmentMutation(assessmentId) {
  return mutationQueue ? mutationQueue.hasPendingAssessment(assessmentId) : false;
}
