import assert from 'node:assert/strict';
import test from 'node:test';
import { filterHistory, readHistoryCache, writeHistoryCache } from '../web/js/history-cache.js';

function memoryStore() {
  const values = new Map();
  return { getItem(key) { return values.get(key) || null; }, setItem(key, value) { values.set(key, value); } };
}

test('stores and retrieves a local history for one person', () => {
  const store = memoryStore();
  writeHistoryCache(store, 'p1', [{ assessmentId: 'a1', testIds: ['sppb'] }]);
  assert.deepEqual(readHistoryCache(store, 'p1'), [{ assessmentId: 'a1', testIds: ['sppb'] }]);
});

test('filters a loaded history by its selected test without a new request', () => {
  const items = [{ assessmentId: 'a1', testIds: ['sppb'] }, { assessmentId: 'a2', testIds: ['step-2min'] }];
  assert.deepEqual(filterHistory(items, { testId: 'sppb' }), [items[0]]);
});
