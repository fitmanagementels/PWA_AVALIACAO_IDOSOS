const keyFor = (personId) => `avaliacao-idosos-history:${personId}`;

export function readHistoryCache(store, personId) {
  try { return JSON.parse(store.getItem(keyFor(personId)) || '[]'); } catch (_) { return []; }
}

export function writeHistoryCache(store, personId, items) {
  store.setItem(keyFor(personId), JSON.stringify(items));
}

export function filterHistory(items, { testId = '' } = {}) {
  return (items || []).filter((item) => !testId || (item.testIds || []).includes(testId));
}
