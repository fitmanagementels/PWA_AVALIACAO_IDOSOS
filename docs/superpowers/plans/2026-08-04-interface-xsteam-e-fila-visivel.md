# Interface XSTEAM e Fila Visível Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tornar a sincronização do PWA visível e recuperável, aplicando o tema dark XSTEAM sem alterar os dados clínicos ou o contrato atual de `saveAssessment`.

**Architecture:** A fila IndexedDB passa a guardar metadados de falha por operação e expõe uma lista própria para a interface. Um controlador no `app.js` traduz a fila e a resposta da API em um estado de sincronização renderizado pela faixa persistente. O CSS troca tokens claros por quatro superfícies dark XSTEAM e trata a faixa e o painel expansível como componentes reutilizáveis.

**Tech Stack:** HTML sem framework, CSS, módulos ES, IndexedDB, Node test runner, Google Apps Script HTTP API.

## Global Constraints

- Preservar o modelo da planilha e as ações atuais `savePerson`, `createAssessment`, `saveAssessment` e `completeAssessment`.
- Nunca remover operação pendente quando a API retornar erro.
- Não expor valores clínicos no painel de pendências.
- Usar `#E2FF42` somente em CTA primário, foco e indicador prioritário.
- Manter fluxo linear e formulários operacionais sem bloquear a edição por chamadas remotas.
- Garantir alvo de toque mínimo de 44 px, `aria-live` e `prefers-reduced-motion`.

---

### Task 1: Metadados de erro e fila consultável

**Files:**
- Modify: `web/js/storage.js`
- Modify: `tests/storage.test.js`

**Interfaces:**
- Consumes: armazenamento IndexedDB `mutations` e mutações existentes `{ id, action, payload, queuedAt }`.
- Produces: `mutationQueue.markFailed(id, message)`, `mutationQueue.clearFailure(id)` e `mutationQueue.list()` com `lastError` e `lastAttemptAt` preservados.

- [ ] **Step 1: Write the failing tests**

```js
test('keeps a failed mutation in the queue with a retry message', async () => {
  const queue = createMutationQueue(memoryStore());
  await queue.enqueue({ id: 'm1', action: 'saveAssessment', payload: {} });
  await queue.markFailed('m1', 'Profissional responsável é obrigatório');
  const [item] = await queue.list();
  assert.equal(item.id, 'm1');
  assert.equal(item.lastError, 'Profissional responsável é obrigatório');
  assert.ok(Number.isFinite(Date.parse(item.queuedAt)));
  assert.ok(Number.isFinite(Date.parse(item.lastAttemptAt)));
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `node --test tests/storage.test.js`

Expected: FAIL because `markFailed` does not exist.

- [ ] **Step 3: Implement the minimal queue metadata methods**

```js
async markFailed(id, message) {
  const mutation = (await store.getAll()).find((item) => item.id === id);
  if (!mutation) return;
  await store.put({ ...mutation, lastError: message, lastAttemptAt: new Date().toISOString() });
},
async clearFailure(id) {
  const mutation = (await store.getAll()).find((item) => item.id === id);
  if (!mutation) return;
  const { lastError, ...clean } = mutation;
  await store.put(clean);
}
```

- [ ] **Step 4: Run focused and full tests**

Run: `node --test tests/storage.test.js && npm test`

Expected: PASS with no failures.

- [ ] **Step 5: Commit**

```bash
git add web/js/storage.js tests/storage.test.js
git commit -m "feat: keep sync failure details in queue"
```

### Task 2: Controlador de sincronização e recuperação

**Files:**
- Create: `web/js/sync-status.js`
- Modify: `web/js/app.js`
- Create: `tests/sync-status.test.js`

**Interfaces:**
- Consumes: `mutationQueue.list()`, `mutationQueue.markFailed()`, `mutationQueue.clearFailure()` e `request(action, payload)`.
- Produces: `deriveSyncStatus({ online, queue, phase, error })` e `flushQueue(queue, send)` retornando `{ ok, phase, pendingCount, message, items }`.

- [ ] **Step 1: Write failing tests**

```js
test('reports the API error and keeps the failed operation pending', async () => {
  const result = await flushQueue(queueWithOneMutation(), async () => {
    throw new ApiError('VALIDATION_ERROR', 'Profissional responsável é obrigatório');
  });
  assert.equal(result.ok, false);
  assert.equal(result.phase, 'error');
  assert.equal(result.message, 'Profissional responsável é obrigatório');
  assert.equal(result.pendingCount, 1);
});
```

- [ ] **Step 2: Run focused test to verify it fails**

Run: `node --test tests/sync-status.test.js`

Expected: FAIL because `sync-status.js` does not exist.

- [ ] **Step 3: Implement the controller and connect it to `app.js`**

```js
const result = await flushQueue(mutationQueue, ({ action, payload }) => request(action, payload));
renderSyncStatus(result);
window.addEventListener('online', () => synchronize());
```

Store `error.message` with `markFailed`, keep the item in IndexedDB and rerender the status in `finally`. Do not swallow the error into an unlabelled `{ ok: false }` result.

- [ ] **Step 4: Run focused and full tests**

Run: `node --test tests/sync-status.test.js && npm test`

Expected: PASS with no failures.

- [ ] **Step 5: Commit**

```bash
git add web/js/sync-status.js web/js/app.js tests/sync-status.test.js
git commit -m "feat: show sync failures and retry queue"
```

### Task 3: Faixa persistente e painel de pendências

**Files:**
- Modify: `web/index.html`
- Create: `web/js/views/sync-panel.js`
- Modify: `web/js/app.js`
- Create: `tests/sync-panel.test.js`

**Interfaces:**
- Consumes: estado `{ phase, pendingCount, message, items, retryable }` do Task 2.
- Produces: `renderSyncPanel(root, state, { onRetry })` com `role="status"`, botão de recuperação e painel expansível sem valores clínicos.

- [ ] **Step 1: Write failing tests**

```js
test('renders a retry action and safe metadata for a failed sync item', () => {
  const markup = syncPanelMarkup({
    phase: 'error', pendingCount: 1,
    message: 'Profissional responsável é obrigatório',
    items: [{ action: 'saveAssessment', queuedAt: '2026-08-04T12:00:00.000Z', lastError: 'Profissional responsável é obrigatório' }]
  });
  assert.match(markup, /Tentar novamente/);
  assert.match(markup, /Profissional responsável é obrigatório/);
  assert.doesNotMatch(markup, /valorOficial|tentativas/);
});
```

- [ ] **Step 2: Run focused test to verify it fails**

Run: `node --test tests/sync-panel.test.js`

Expected: FAIL because `sync-panel.js` does not exist.

- [ ] **Step 3: Implement minimal markup and interaction**

```html
<section class="sync-dock" data-sync-dock aria-live="polite"></section>
```

```js
root.innerHTML = `<div class="sync-summary" role="status">...</div><details class="sync-details">...</details>`;
root.querySelector('[data-retry]')?.addEventListener('click', onRetry);
```

- [ ] **Step 4: Run focused and full tests**

Run: `node --test tests/sync-panel.test.js && npm test`

Expected: PASS with no failures.

- [ ] **Step 5: Commit**

```bash
git add web/index.html web/js/views/sync-panel.js web/js/app.js tests/sync-panel.test.js
git commit -m "feat: add visible sync pending panel"
```

### Task 4: Tema dark XSTEAM e acabamento acessível

**Files:**
- Modify: `web/styles/app.css`
- Modify: `web/index.html`
- Modify: `brand-visual-contract.md`
- Create: `tests/xsteam-theme.test.js`

**Interfaces:**
- Consumes: classes existentes de telas e componentes e markup do painel de sincronização.
- Produces: tokens CSS semânticos para `base`, `card`, `active`, `overlay`, CTA lime e foco visível.

- [ ] **Step 1: Write failing structural tests**

```js
test('uses XSTEAM dark surface tokens and reserves lime for action and focus', () => {
  const css = fs.readFileSync('web/styles/app.css', 'utf8');
  assert.match(css, /--surface-base:/);
  assert.match(css, /--surface-card:/);
  assert.match(css, /--surface-active:/);
  assert.match(css, /--surface-overlay:/);
  assert.match(css, /#E2FF42/);
  assert.match(css, /prefers-reduced-motion/);
});
```

- [ ] **Step 2: Run focused test to verify it fails**

Run: `node --test tests/xsteam-theme.test.js`

Expected: FAIL because the semantic dark tokens do not exist.

- [ ] **Step 3: Apply CSS tokens and responsive finish**

Define semantic dark tokens, update cards/fields/buttons/feedback/focus, style the sync dock and enforce a one-column mobile layout. Keep `#E2FF42` out of reading surfaces.

- [ ] **Step 4: Update the BRAND contract**

Record applied tokens, the four surfaces, desktop/mobile checks and `brand-aplicar-marca-e-acabamento` as executed.

- [ ] **Step 5: Run focused and full tests**

Run: `node --test tests/xsteam-theme.test.js && npm test && node --check web/js/app.js && node --check web/js/views/sync-panel.js`

Expected: PASS with no failures.

- [ ] **Step 6: Commit**

```bash
git add web/styles/app.css web/index.html brand-visual-contract.md tests/xsteam-theme.test.js
git commit -m "style: apply xsteam dark pwa theme"
```

### Task 5: Verificação de fluxo e publicação

**Files:**
- Modify: `web/sw.js`
- Test: `tests/service-worker.test.js`

**Interfaces:**
- Consumes: os novos assets `sync-status.js` e `views/sync-panel.js`.
- Produces: cache versionado que não entrega uma versão anterior da interface.

- [ ] **Step 1: Write failing cache asset/version assertions**

```js
assert.match(source, /sync-status\.js/);
assert.match(source, /views\/sync-panel\.js/);
assert.match(source, /avaliacao-idosos-v5/);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/service-worker.test.js`

Expected: FAIL because the cache does not include the new modules or version.

- [ ] **Step 3: Add assets and increment cache version**

Keep existing `skipWaiting`, cache cleanup and `clients.claim` behavior.

- [ ] **Step 4: Run full verification**

Run: `npm test && node --check web/js/app.js && node --check web/js/sync-status.js && node --check web/js/views/sync-panel.js && git diff --check`

Expected: PASS with no failures.

- [ ] **Step 5: Verify manual path before publish**

1. Open the PWA in a fresh browser profile.
2. Disconnect network, save an evaluation and confirm a pending item appears.
3. Reconnect and select “Tentar novamente”.
4. Confirm status becomes synchronized only after a successful API response.
5. Confirm no clinical value is rendered in the pending panel.

- [ ] **Step 6: Commit and publish after approval**

```bash
git add web/sw.js tests/service-worker.test.js
git commit -m "chore: version sync status pwa cache"
git push origin master
```
