# Sincronização otimista e confiável Implementation Plan

> **Status:** registro histórico do planejamento de 04/08/2026. A implementação posterior evoluiu no branch `master`; use o código e [o contexto operacional do projeto](../../CONTEXTO_DO_PROJETO.md) como fonte atual de comportamento.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fazer a PWA responder imediatamente às ações do profissional, enquanto sincroniza dados com Google Sheets em segundo plano, sem perda, duplicação ou inversão de alterações.

**Architecture:** A PWA passa a manter o estado de trabalho e uma caixa de saída durável no IndexedDB. Cada pessoa e cada avaliação têm uma fila lógica própria: alterações de uma mesma entidade são confirmadas em ordem, enquanto uma falha em uma entidade não impede o envio de outra. O Apps Script recebe operações idempotentes, identifica reenvios pelo `operacaoId`, verifica a revisão da avaliação e grava conjuntos de linhas em lote sob `LockService`.

**Tech Stack:** HTML5, JavaScript ES modules, IndexedDB, Node.js built-in test runner, Google Apps Script V8, Google Sheets, `CacheService`, `LockService`, `clasp`.

## Global Constraints

- O Google Sheets continua sendo a fonte central de dados; somente Apps Script o altera.
- A interface deve refletir a ação localmente em até 100 ms; uma chamada de rede nunca pode bloquear formulário, cadastro ou criação de outra avaliação.
- As medições reais de 2026-08-04 são referência de UX: `getCatalog` 1,15–1,45 s, `listPeople` 1,70–3,36 s, `savePerson` 4,73 s, `getAssessment` 4,82 s e `saveAssessment` 9,20 s.
- Nenhuma avaliação pode ser concluída nem gerar PDF enquanto houver alteração local pendente ou conflito não resolvido nessa avaliação.
- Reenvio de uma mesma operação deve retornar o resultado originalmente confirmado, sem acrescentar linhas duplicadas em `Tentativas`.
- Falhas de rede e do servidor são recuperáveis automaticamente; validação e conflito devem preservar a alteração local e informar uma ação concreta.
- Não criar anamnese, diagnósticos, IA, permissões internas ou cache de respostas clínicas da API no service worker.

---

## Fluxo final de dados

```text
Toque do profissional
  -> atualiza estado da tela e rascunho IndexedDB
  -> cria/substitui operação pendente na fila da entidade
  -> mostra “alterações pendentes”
  -> agendador seleciona uma fila elegível
  -> POST idempotente para Apps Script
  -> Apps Script valida revisão, grava em lote e registra operacaoId
  -> PWA marca a operação confirmada e mostra “sincronizado”
```

Uma fila possui uma `laneKey`: `person:<pessoaId>` ou `assessment:<avaliacaoId>`. Dentro da mesma `laneKey`, a operação seguinte só é enviada depois da anterior receber confirmação. Entre lanes, o agendador pode avançar para outra entidade quando uma lane estiver aguardando retry, validação ou conflito. Na primeira entrega haverá no máximo uma requisição HTTP em voo por dispositivo: isso evita esperas concorrentes no `LockService`, mas não transforma a fila em global, pois uma lane bloqueada é pulada.

## Arquivos e responsabilidades

| Caminho | Responsabilidade |
| --- | --- |
| `apps-script/00_Config.gs` | Novo cabeçalho da aba de operações e coluna `revisao` da avaliação. |
| `apps-script/02_Repository.gs` | Leitura por execução, mapas por ID, escrita em lote e diário idempotente. |
| `apps-script/04_Assessments.gs` | `bootstrap`, gravação de avaliação por operação e resposta de conflito. |
| `apps-script/01_WebApp.gs` | Roteamento de `bootstrap` e envelope de operação de escrita. |
| `web/js/sync-queue.js` | Agendador puro por lane, coalescência, retry e classificação de falhas. |
| `web/js/storage.js` | Migração IndexedDB, armazenamento de rascunhos, snapshot e operações. |
| `web/js/sync-model.js` | Payloads com IDs estáveis para resultados e tentativas. |
| `web/js/api-client.js` | Requisições de bootstrap e de mutação com `operacaoId`/revisão. |
| `web/js/app.js` | Inicialização com overlay, restauração local e sincronização não bloqueante. |
| `web/js/views/people.js` e `web/js/views/assessment-editor.js` | Atualização otimista, indicador por registro e bloqueio de concluir/PDF. |
| `web/index.html`, `web/styles/app.css` | Tela inicial e estados visuais de sincronização. |
| `tests/sync-queue.test.js` | Contrato da ordem por lane e recuperação automática. |
| `tests/apps-script-sync.test.js` | Idempotência, revisão e escrita em lote do Apps Script. |
| `scripts/benchmark-appscript.mjs` | Medição repetível dos endpoints publicados, sem dados clínicos. |
| `docs/deployment.md` | Migração da planilha, publicação e metas de desempenho. |

### Task 1: Contrato de sincronização e migração da planilha

**Files:**
- Modify: `apps-script/00_Config.gs`
- Modify: `apps-script/02_Repository.gs`
- Create: `tests/apps-script-sync.test.js`

**Interfaces:**
- Produces `OPERATIONS_HEADER`, `ensureHeaders_()`, `getOperation_(operacaoId)` e `recordOperation_(operation)`.
- A aba `OperacoesSincronizacao` terá `operacaoId`, `laneKey`, `entidadeId`, `acao`, `estado`, `revisaoBase`, `revisaoResultante`, `respostaJson`, `criadoEm`, `confirmadoEm`.
- `Avaliacoes` passa a ter a coluna final `revisao`, inicializada em `1` para linhas existentes.

- [ ] **Step 1: Write the failing migration tests**

```js
test('declares a durable operation ledger and assessment revision', () => {
  const source = fs.readFileSync('apps-script/00_Config.gs', 'utf8');
  assert.match(source, /OperacoesSincronizacao/);
  assert.match(source, /'revisao'/);
});

test('returns the previously recorded response for the same operation id', () => {
  const ledger = new Map([['op-1', { operacaoId: 'op-1', respostaJson: '{"ok":true}' }]]);
  assert.deepEqual(replayOperation_(ledger, 'op-1'), { ok: true });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test tests/apps-script-sync.test.js`  
Expected: FAIL because the ledger constants and replay helper do not exist.

- [ ] **Step 3: Add the non-destructive schema migration**

```js
const SHEETS = { PEOPLE: 'Pessoas', PROFESSIONALS: 'Profissionais', ASSESSMENTS: 'Avaliacoes', RESULTS: 'Resultados', ATTEMPTS: 'Tentativas', CATALOG: 'CatalogoTestes', REFERENCES: 'Referencias', PROTOCOLS: 'Protocolos', OPERATIONS: 'OperacoesSincronizacao' };
const SHEET_HEADERS = {
  Pessoas: ['pessoaId', 'nomeCompleto', 'dataNascimento', 'sexo', 'whatsApp', 'status', 'criadoEm'],
  Profissionais: ['profissionalId', 'nome', 'ativo'],
  Avaliacoes: ['avaliacaoId', 'pessoaId', 'data', 'profissionalNome', 'status', 'testesSelecionados', 'notasTestes', 'observacoesAluno', 'criadoEm', 'ultimaAtualizacao', 'revisao'],
  Resultados: ['resultadoId', 'avaliacaoId', 'testeId', 'status', 'lado', 'valorOficial', 'unidade', 'classificacao', 'protocoloVersao', 'motivoNaoConcluido'],
  Tentativas: ['tentativaId', 'resultadoId', 'ordem', 'lado', 'valor', 'unidade', 'valida', 'criadoEm'],
  CatalogoTestes: ['testeId', 'nome', 'dominio', 'unidade', 'configuracaoJson'],
  Referencias: ['referenciaId', 'testeId', 'versao', 'criteriosJson', 'classificacao', 'vigencia'],
  Protocolos: ['protocoloId', 'testeId', 'versao', 'texto', 'configuracaoJson', 'vigencia'],
  OperacoesSincronizacao: ['operacaoId', 'laneKey', 'entidadeId', 'acao', 'estado', 'revisaoBase', 'revisaoResultante', 'respostaJson', 'criadoEm', 'confirmadoEm']
};

function ensureHeaders_(sheetName) {
  const sheet = spreadsheet_().getSheetByName(sheetName) || spreadsheet_().insertSheet(sheetName);
  const expected = SHEET_HEADERS[sheetName];
  const present = sheet.getLastRow() ? sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), expected.length)).getValues()[0] : [];
  expected.forEach(function(header, index) { if (present[index] !== header) sheet.getRange(1, index + 1).setValue(header); });
  return sheet;
}
```

`setupSpreadsheet()` must call `ensureHeaders_()` for every sheet, preserve all existing rows and set blank existing `revisao` cells to `1`. It must never reorder existing columns or delete rows.

- [ ] **Step 4: Implement durable operation lookup and recording**

```js
function getOperation_(operacaoId) {
  return getRows_(SHEETS.OPERATIONS).find(function(row) { return row.operacaoId === operacaoId; }) || null;
}

function replayOperation_(operation) {
  return operation ? JSON.parse(operation.respostaJson) : null;
}

function recordOperation_(operation) {
  updateRowById_(SHEETS.OPERATIONS, 'operacaoId', operation);
}
```

- [ ] **Step 5: Run tests and manually migrate a disposable copy first**

Run: `node --test tests/apps-script-sync.test.js`  
Expected: PASS.

Manual: run `setupSpreadsheet()` in a copy of the production spreadsheet; confirm the ninth tab exists, old columns remain unchanged and all old assessments have revision `1`.

- [ ] **Step 6: Commit**

```bash
git add apps-script/00_Config.gs apps-script/02_Repository.gs tests/apps-script-sync.test.js
git commit -m "feat: add sync operation ledger schema"
```

### Task 2: Gravação idempotente e eficiente no Apps Script

**Files:**
- Modify: `apps-script/02_Repository.gs`
- Modify: `apps-script/04_Assessments.gs`
- Modify: `apps-script/01_WebApp.gs`
- Modify: `tests/apps-script-sync.test.js`

**Interfaces:**
- Consumes `{ operacaoId, laneKey, revisaoBase, payload }`.
- Produces `syncAssessmentOperation(request)` with envelopes `{ ok: true, data: { avaliacaoId, revisao, ultimaAtualizacao } }`, `{ ok: false, error: { code: 'CONFLICT' | 'VALIDATION_ERROR', message } }`.

- [ ] **Step 1: Write failing idempotency and conflict tests**

```js
test('replaying the same operation does not append a second attempt', () => {
  const sheet = fakeSheet();
  syncAssessmentOperation({ operacaoId: 'op-1', laneKey: 'assessment:a-1', revisaoBase: 0, payload: validAssessment('a-1') }, sheet);
  syncAssessmentOperation({ operacaoId: 'op-1', laneKey: 'assessment:a-1', revisaoBase: 0, payload: validAssessment('a-1') }, sheet);
  assert.equal(sheet.rows('Tentativas').length, 1);
});

test('rejects a new operation whose assessment revision is stale', () => {
  const response = syncAssessmentOperation({ operacaoId: 'op-2', laneKey: 'assessment:a-1', revisaoBase: 1, payload: validAssessment('a-1') }, sheetWithAssessmentRevision('a-1', 2));
  assert.equal(response.error.code, 'CONFLICT');
});
```

- [ ] **Step 2: Run the targeted test to verify it fails**

Run: `node --test tests/apps-script-sync.test.js`  
Expected: FAIL because `syncAssessmentOperation` does not exist and attempts are append-only.

- [ ] **Step 3: Replace row-by-row I/O with execution-scoped reads and batch writes**

```js
function createRepository_() {
  const book = spreadsheet_();
  const cache = {};
  return {
    rows: function(name) { if (!cache[name]) cache[name] = readRowsFromSheet_(book.getSheetByName(name)); return cache[name]; },
    upsertMany: function(name, idColumn, records) { return upsertManyById_(book.getSheetByName(name), SHEET_HEADERS[name], idColumn, records); }
  };
}

function upsertManyById_(sheet, headers, idColumn, records) {
  if (!records.length) return;
  const values = sheet.getDataRange().getValues();
  const idIndex = headers.indexOf(idColumn);
  const existing = new Map(values.slice(1).map(function(row, index) { return [row[idIndex], index + 2]; }));
  const updates = new Map();
  const inserts = [];
  records.forEach(function(record) {
    const row = headers.map(function(header) { return record[header] === undefined ? '' : record[header]; });
    const rowNumber = existing.get(record[idColumn]);
    if (rowNumber) updates.set(rowNumber, row); else inserts.push(row);
  });
  const rowNumbers = Array.from(updates.keys()).sort(function(a, b) { return a - b; });
  for (let index = 0; index < rowNumbers.length;) {
    const start = rowNumbers[index]; const rows = [updates.get(start)]; index += 1;
    while (index < rowNumbers.length && rowNumbers[index] === start + rows.length) { rows.push(updates.get(rowNumbers[index])); index += 1; }
    sheet.getRange(start, 1, rows.length, headers.length).setValues(rows);
  }
  if (inserts.length) sheet.getRange(sheet.getLastRow() + 1, 1, inserts.length, headers.length).setValues(inserts);
}
```

Implement `upsertManyById_` fully: build a map from existing ID to sheet row, issue one `setValues` for each contiguous update range and one `setValues` for all appended rows. Do not call `appendRow()` inside loops.

- [ ] **Step 4: Make attempts stable and writes replay-safe**

```js
function syncAssessmentOperation(request) {
  return withLock_(function() {
    const prior = getOperation_(request.operacaoId);
    if (prior && prior.estado === 'confirmada') return replayOperation_(prior);
    const repository = createRepository_();
    const current = findAssessment_(repository.rows(SHEETS.ASSESSMENTS), request.payload.avaliacaoId);
    if (current && Number(request.revisaoBase) !== Number(current.revisao)) return jsonError_('CONFLICT', 'Esta avaliação foi atualizada em outro dispositivo.');
    const response = persistAssessmentSnapshot_(repository, request.payload, current);
    recordOperation_({ operacaoId: request.operacaoId, laneKey: request.laneKey, entidadeId: request.payload.avaliacaoId, acao: 'saveAssessment', estado: 'confirmada', revisaoBase: request.revisaoBase, revisaoResultante: response.data.revisao, respostaJson: JSON.stringify(response), criadoEm: new Date().toISOString(), confirmadoEm: new Date().toISOString() });
    return response;
  });
}
```

`persistAssessmentSnapshot_` must assign `revisao: current ? Number(current.revisao) + 1 : 1`, upsert assessment/results/attempts by their IDs and return the revision. `saveAssessment` delegates to this operation path; `createAssessment` remains only as a compatibility wrapper and must not be queued by the frontend.

- [ ] **Step 5: Route the new envelope and protect all write actions**

```js
const handlers = {
  syncAssessment: syncAssessmentOperation,
  savePerson: syncPersonOperation,
  completeAssessment: completeAssessmentOperation,
  generateReport: generateReport
};
```

Implement the same operation ledger pattern for `savePerson` and `completeAssessment`. `completeAssessmentOperation` must reject when the incoming revision is stale and increment the revision on success.

- [ ] **Step 6: Verify backend behavior**

Run: `node --test tests/apps-script-sync.test.js tests/apps-script-values.test.js`  
Expected: PASS, including one attempt after replay and a `CONFLICT` error for stale revision.

Manual: call the published endpoint twice with the same `operacaoId`; confirm one assessment, one result and one attempt exist.

- [ ] **Step 7: Commit**

```bash
git add apps-script/01_WebApp.gs apps-script/02_Repository.gs apps-script/04_Assessments.gs tests/apps-script-sync.test.js
git commit -m "feat: make assessment sync idempotent"
```

### Task 3: Caixa de saída por entidade no IndexedDB

**Files:**
- Create: `web/js/sync-queue.js`
- Modify: `web/js/storage.js`
- Modify: `tests/storage.test.js`
- Create: `tests/sync-queue.test.js`

**Interfaces:**
- `createSyncQueue(store, clock)` returns `enqueue(input)`, `nextEligible()`, `markConfirmed(id)`, `markRetry(id, error)`, `markBlocked(id, error)`, `pendingForLane(laneKey)` and `summary()`.
- Operation input: `{ id, laneKey, action, payload, revisionBase, entityId, createdAt }`.
- Persistent state: `pending`, `inflight`, `retry`, `blocked`, `confirmed`.

- [ ] **Step 1: Write failing lane and retry tests**

```js
test('keeps two edits to one assessment in chronological order', async () => {
  const queue = createSyncQueue(memoryStore(), fixedClock());
  await queue.enqueue(op('one', 'assessment:a-1'));
  await queue.enqueue(op('two', 'assessment:a-1'));
  assert.equal((await queue.nextEligible()).id, 'one');
  await queue.markInflight('one');
  assert.equal(await queue.nextEligible(), null);
  await queue.markConfirmed('one');
  assert.equal((await queue.nextEligible()).id, 'two');
});

test('a blocked lane does not prevent another assessment from sending', async () => {
  const queue = createSyncQueue(memoryStore(), fixedClock());
  await queue.enqueue(op('a', 'assessment:a-1'));
  await queue.enqueue(op('b', 'assessment:b-1'));
  await queue.markBlocked('a', { code: 'VALIDATION_ERROR' });
  assert.equal((await queue.nextEligible()).id, 'b');
});

test('coalesces only pending snapshots from the same assessment', async () => {
  const queue = createSyncQueue(memoryStore(), fixedClock());
  await queue.enqueue(op('first', 'assessment:a-1', { notes: 'A' }));
  await queue.enqueue(op('second', 'assessment:a-1', { notes: 'B' }));
  assert.deepEqual((await queue.pendingForLane('assessment:a-1')).map((item) => item.payload.notes), ['B']);
});
```

- [ ] **Step 2: Run queue tests to verify they fail**

Run: `node --test tests/sync-queue.test.js`  
Expected: FAIL because `sync-queue.js` does not exist.

- [ ] **Step 3: Implement pure queue semantics**

```js
export function retryAt(attempts, now) {
  return new Date(now.getTime() + [5_000, 15_000, 60_000, 300_000][Math.min(attempts, 3)]).toISOString();
}

export function classifySyncError(error) {
  if (error.code === 'VALIDATION_ERROR' || error.code === 'CONFLICT') return 'blocked';
  return 'retry';
}
```

`enqueue` may replace an existing `pending` operation only when it has the same `laneKey` and action `syncAssessment`; it must never replace `inflight`, `retry` or `blocked` operations. A replacement retains the original operation ID only when it has never been sent. `nextEligible` chooses the earliest pending/retry operation whose lane has no older unconfirmed operation and whose `nextAttemptAt` has passed.

- [ ] **Step 4: Migrate IndexedDB without dropping drafts or old mutations**

```js
const request = indexedDB.open('avaliacao-idosos', 2);
request.onupgradeneeded = () => {
  const db = request.result;
  const mutations = request.transaction.objectStore('mutations');
  if (!mutations.indexNames.contains('laneKey')) mutations.createIndex('laneKey', 'laneKey');
  if (!mutations.indexNames.contains('state')) mutations.createIndex('state', 'state');
  if (!db.objectStoreNames.contains('snapshots')) db.createObjectStore('snapshots', { keyPath: 'key' });
};
```

When listing old mutations, normalize them to `laneKey: 'legacy:' + payload.avaliacaoId`, `state: 'pending'`, `attempts: 0`, `createdAt: queuedAt`. Add `saveSnapshot(key, data)` and `getSnapshot(key)` for the last confirmed bootstrap response.

- [ ] **Step 5: Verify queue behavior**

Run: `node --test tests/storage.test.js tests/sync-queue.test.js`  
Expected: PASS; a network failure retains data, an invalid lane blocks only itself, and another lane proceeds.

- [ ] **Step 6: Commit**

```bash
git add web/js/storage.js web/js/sync-queue.js tests/storage.test.js tests/sync-queue.test.js
git commit -m "feat: add durable per-entity sync queue"
```

### Task 4: IDs estáveis, cliente de API e coordenador de sincronização

**Files:**
- Modify: `web/js/sync-model.js`
- Modify: `web/js/api-client.js`
- Modify: `web/js/app.js`
- Modify: `tests/sync-model.test.js`
- Modify: `tests/sync-queue.test.js`

**Interfaces:**
- `assessmentForSync(assessment, revisionBase)` returns `{ action: 'syncAssessment', laneKey, revisionBase, payload }`.
- `runSyncCycle(queue, send, onState)` sends one eligible operation, schedules the next cycle and never throws to a click handler.
- `requestBootstrap()` calls `GET ?action=bootstrap`.

- [ ] **Step 1: Write failing stable-ID and non-blocking-cycle tests**

```js
test('assigns a repeatable id to each attempt in an assessment snapshot', () => {
  const payload = assessmentForSync(assessmentWithOneAttempt('a-1'), 0).payload;
  assert.equal(payload.resultados[0].tentativas[0].tentativaId, 'a-1:step-2min:unico:1');
});

test('continues with another eligible lane after a retryable failure', async () => {
  const sent = [];
  await runSyncCycle(queueWithRetryingAAndPendingB(), async (op) => { sent.push(op.id); return { ok: true }; }, () => {});
  assert.deepEqual(sent, ['b']);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test tests/sync-model.test.js tests/sync-queue.test.js`  
Expected: FAIL because attempt IDs and the coordinator are absent.

- [ ] **Step 3: Extend the serialized assessment snapshot**

```js
tentativas: (result.attempts || []).filter(bySide).map((attempt, index) => ({
  tentativaId: `${assessment.id}:${result.testId}:${side}:${index + 1}`,
  ordem: index + 1,
  lado: side === 'unico' ? '' : side,
  valor: attempt.value,
  unidade: result.unit,
  valida: true
}))
```

Include `revisao: assessment.revision || 0` in local assessment objects returned from the API. `assessmentForSync` must preserve a client-generated assessment ID, so first save is an upsert rather than a separate `createAssessment` dependency.

- [ ] **Step 4: Implement API envelopes and a fire-and-forget coordinator**

```js
export async function sendOperation(operation) {
  return request(operation.action, {
    operacaoId: operation.id,
    laneKey: operation.laneKey,
    revisaoBase: operation.revisionBase,
    payload: operation.payload
  });
}

export function requestBootstrap() { return request('bootstrap', {}, 'GET'); }
```

In `app.js`, replace `mutationQueue.flush()` with a `scheduleSync()` function. It must set one timer for a 2-second quiet period after editing, run immediately on `online` and the explicit sync button, and call `runSyncCycle` without `await` from DOM event handlers. On confirmation, update the local revision from the API result. On retry, render the pending count; on blocked state, retain the local draft and render “ação necessária”.

- [ ] **Step 5: Verify the coordinator**

Run: `node --test tests/sync-model.test.js tests/sync-queue.test.js`  
Expected: PASS; no request is sent out of lane order and a different lane remains eligible after failure.

- [ ] **Step 6: Commit**

```bash
git add web/js/sync-model.js web/js/api-client.js web/js/app.js tests/sync-model.test.js tests/sync-queue.test.js
git commit -m "feat: sync optimistic snapshots by lane"
```

### Task 5: Bootstrap consolidado e inicialização sem tela vazia

**Files:**
- Modify: `apps-script/04_Assessments.gs`
- Modify: `apps-script/01_WebApp.gs`
- Modify: `web/index.html`
- Modify: `web/styles/app.css`
- Modify: `web/js/app.js`
- Modify: `tests/apps-script-sync.test.js`

**Interfaces:**
- `bootstrap()` returns `{ people, professionals, catalog, catalogVersion, updatedAt }`.
- PWA boot state is one of `loading`, `cached`, `ready`, `degraded`.

- [ ] **Step 1: Write a failing bootstrap shape test**

```js
test('bootstrap returns only data required for the first screen', () => {
  const response = bootstrap(fakeRepository());
  assert.deepEqual(Object.keys(response.data).sort(), ['catalog', 'catalogVersion', 'people', 'professionals', 'updatedAt']);
  assert.equal('assessments' in response.data, false);
});
```

- [ ] **Step 2: Run the targeted test to verify it fails**

Run: `node --test tests/apps-script-sync.test.js`  
Expected: FAIL because `bootstrap` is not routed.

- [ ] **Step 3: Implement one initial API call and configuration cache**

```js
function bootstrap() {
  const repository = createRepository_();
  const catalog = getCachedCatalog_();
  return jsonOk_({
    people: repository.rows(SHEETS.PEOPLE).filter(function(person) { return person.status !== 'arquivado'; }),
    professionals: repository.rows(SHEETS.PROFESSIONALS).filter(function(item) { return item.ativo; }),
    catalog: catalog.tests,
    catalogVersion: catalog.version,
    updatedAt: new Date().toISOString()
  });
}
```

`getCachedCatalog_()` may use `CacheService` for catalog/protocol/reference configuration for 10 minutes. Do not place `people`, assessments, results or attempts in server cache. Add `bootstrap` to `doGet`.

- [ ] **Step 4: Add an honest initial loading screen and local fallback**

```html
<section id="boot-screen" aria-live="polite">
  <div class="boot-card"><p class="eyebrow">AVALIAÇÃO FUNCIONAL</p><h1>Preparando seus dados</h1><div class="loading-bar" aria-hidden="true"></div><p data-boot-message>Conectando à base compartilhada…</p></div>
</section>
```

At startup, show the overlay before the first API request. If `getSnapshot('bootstrap')` exists, render its people beneath the overlay with “última versão disponível; atualizando”. Hide the overlay only after fresh bootstrap succeeds, or show a recoverable “não foi possível atualizar” state with local snapshot and `Sincronizar agora`. Do not show a fictitious percentage; use an indeterminate animation and, after 8 seconds, the factual message “A conexão está demorando mais que o normal”.

- [ ] **Step 5: Verify initial flow**

Run: `node --test tests/apps-script-sync.test.js tests/storage.test.js`  
Expected: PASS.

Manual: throttle the network, launch the PWA once without local data, confirm the loading screen persists; launch again with a saved snapshot, confirm known data appears before the refresh completes.

- [ ] **Step 6: Commit**

```bash
git add apps-script/01_WebApp.gs apps-script/04_Assessments.gs web/index.html web/styles/app.css web/js/app.js tests/apps-script-sync.test.js
git commit -m "feat: add consolidated pwa bootstrap"
```

### Task 6: Atualização otimista nas telas e barreiras clínicas

**Files:**
- Modify: `web/js/views/people.js`
- Modify: `web/js/views/assessment-editor.js`
- Modify: `web/js/views/history.js`
- Modify: `web/js/app.js`
- Modify: `tests/people.test.js`
- Modify: `tests/sync-model.test.js`

**Interfaces:**
- `queueAssessmentSnapshot(assessment)` persists the local draft then schedules `syncAssessment`.
- `getLaneState('assessment:' + id)` returns `synced`, `pending`, `retry` or `blocked`.
- Completion and report action accept only `synced`.

- [ ] **Step 1: Write failing UI-model tests**

```js
test('saving an assessment queues one current snapshot instead of a create then save pair', async () => {
  const calls = [];
  await saveDraftAndQueue(sampleAssessment(), async (operation) => calls.push(operation));
  assert.deepEqual(calls.map((item) => item.action), ['syncAssessment']);
});

test('does not allow completion while an assessment lane is pending', () => {
  assert.equal(canFinalizeAssessment({ laneState: 'pending' }), false);
  assert.equal(canFinalizeAssessment({ laneState: 'synced' }), true);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/people.test.js tests/sync-model.test.js`  
Expected: FAIL because these helpers and state checks do not exist.

- [ ] **Step 3: Remove network waits from save/create interactions**

Replace the `createAssessment` queue call in `renderStart` with a local draft plus `queueAssessmentSnapshot`. Replace the assessment editor’s `queueMutation('saveAssessment', ...)` with the same helper. Both handlers must first update local state/IndexedDB, render the next screen or success message immediately, then invoke `scheduleSync()` without awaiting HTTP.

Use the following copy consistently:

```text
synced: "Sincronizado na planilha"
pending: "Alterações salvas neste aparelho · aguardando envio"
retry: "Alterações preservadas · nova tentativa agendada"
blocked validation: "Revise os campos destacados para sincronizar"
blocked conflict: "Esta avaliação mudou em outro dispositivo · revisão necessária"
```

- [ ] **Step 4: Add per-record status and finalization guard**

On the person card and draft header, render a compact status badge from `getLaneState`. The header footer presents the global count, such as `3 alterações pendentes em 2 avaliações`, with an accessible sync button. `completeAssessment` and `generateReport` must test the local lane state before calling the API; show a message explaining that the professional can keep editing, but must synchronize before concluding or exporting the final PDF.

- [ ] **Step 5: Verify everyday user flows**

Run: `npm test`  
Expected: PASS with zero failures.

Manual:

1. Turn off network, create a person and start an assessment; verify each screen advances immediately.
2. Make three edits in one assessment; verify only its latest pending snapshot remains to send.
3. Create a second person while the first has an invalid pending operation; verify the second remains usable and later synchronizes.
4. Try PDF/conclusion while pending; verify both are blocked with the correct message.
5. Restore network; verify statuses change only after the server response.

- [ ] **Step 6: Commit**

```bash
git add web/js/views/people.js web/js/views/assessment-editor.js web/js/views/history.js web/js/app.js tests/people.test.js tests/sync-model.test.js
git commit -m "feat: keep assessment interactions instant while syncing"
```

### Task 7: Medição, implantação e aceitação de desempenho

**Files:**
- Create: `scripts/benchmark-appscript.mjs`
- Create: `tests/benchmark-appscript.test.js`
- Modify: `docs/deployment.md`
- Modify: `package.json`

**Interfaces:**
- `npm run benchmark:appscript -- <WEB_APP_URL>` prints JSON lines with action, HTTP status, duration and response byte count.

- [ ] **Step 1: Write a failing command-shape test**

```js
test('benchmark script requires a web app url and does not post data', async () => {
  const result = await runBenchmark([]);
  assert.equal(result.exitCode, 2);
  assert.match(result.stderr, /WEB_APP_URL/);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/benchmark-appscript.test.js`  
Expected: FAIL because the runner script does not exist.

- [ ] **Step 3: Implement a read-only benchmark runner**

```js
const actions = ['health', 'bootstrap', 'listPeople', 'getCatalog'];
for (const action of actions) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const started = performance.now();
    const response = await fetch(`${baseUrl}?${new URLSearchParams({ action })}`);
    const body = await response.text();
    console.log(JSON.stringify({ action, attempt, status: response.status, durationMs: Math.round(performance.now() - started), bytes: body.length }));
  }
}
```

The runner must refuse POST requests and must never create benchmark people or assessments. Add the package script `"benchmark:appscript": "node scripts/benchmark-appscript.mjs"`.

- [ ] **Step 4: Document deployment checks and targets**

Add a section to `docs/deployment.md` that requires, after deployment: run `setupSpreadsheet()` once; run `npm test`; run the read-only benchmark against `/exec`; capture the output in the release note; and validate these targets on the real account:

| Metric | Target | Failure action |
| --- | --- | --- |
| First useful screen | p95 ≤ 10 s | keep loader visible and inspect bootstrap/server logs |
| `bootstrap` | p95 ≤ 8 s | inspect whole-sheet reads and payload size |
| `syncAssessment` confirmation | p95 ≤ 10 s | UI stays optimistic; inspect batch writes and operation ledger |
| Click feedback | ≤ 100 ms | fix local rendering/persistence before network work |

- [ ] **Step 5: Verify and publish**

Run: `npm test && npm run benchmark:appscript -- "$WEB_APP_URL"`  
Expected: all unit tests pass; benchmark prints only `GET` JSON lines.

Manual: deploy to a test spreadsheet, test offline/reconnect/replay/conflict with two browser profiles, then promote only after confirming exactly one row per stable attempt ID.

- [ ] **Step 6: Commit**

```bash
git add scripts/benchmark-appscript.mjs tests/benchmark-appscript.test.js docs/deployment.md package.json
git commit -m "docs: add apps script performance benchmark"
```

## Plan self-review

- **Coverage:** Tasks 1–2 make the Sheets/App Script path idempotent, revision-aware and batched. Tasks 3–4 implement durable per-entity queues, automatic recovery and non-blocking client calls. Tasks 5–6 create an honest loading experience and instant UI with clinical synchronization barriers. Task 7 measures the live system without polluting clinical data.
- **Measured-latency response:** the 1–9 second real calls are never awaited by a form transition; they are surfaced only as synchronization status. The bootstrap overlay covers the expected first-load wait without showing an empty application.
- **Failure isolation:** queue order is guaranteed inside each person/assessment lane. A retry, validation failure or conflict blocks only its lane and preserves its full local payload; the scheduler continues with other eligible lanes.
- **No placeholder scan:** the plan defines file paths, operation fields, status transitions, test names, commands and acceptance criteria without unfinished markers.
- **Type consistency:** frontend `operacaoId`, `laneKey`, `revisaoBase` and stable `tentativaId` are passed unchanged to the backend ledger and return a `revisao` used by the next snapshot.
