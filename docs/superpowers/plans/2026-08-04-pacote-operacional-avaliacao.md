# Pacote operacional de avaliação Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar uma ficha clínica rápida com rascunho local automático, sincronização explícita, conclusão segura, retorno por cores, histórico cronológico e relatório PDF selecionável.

**Architecture:** A avaliação permanece completa no IndexedDB; o navegador só cria mutações de rede ao tocar em Salvar ou Concluir. O Apps Script grava resultados e tentativas de modo idempotente, fornece histórico resumido e gera PDF apenas com testes escolhidos. O 2-Minute Step Test é a única regra automática de cor.

**Tech Stack:** HTML5, CSS, JavaScript ES modules, IndexedDB, Service Worker, Node.js built-in test runner, Google Apps Script V8, Google Sheets, Google Docs/Drive PDF export, clasp.

## Global Constraints

- Não adicionar marca, IA, anamnese, controle de acesso, gráficos ou comparações entre avaliações.
- Cartões começam recolhidos; abrir um fecha o anterior.
- Rascunho é automático e local; somente Salvar sincroniza.
- Conclusão exige resultado ou motivo livre para cada teste e confirmação do servidor.
- Verde: dentro/acima; amarelo: abaixo; vermelho: nunca automático; cinza: sem referência, não iniciado ou não concluído.
- Somente o 2-Minute Step Test recebe classificação automática nesta versão.
- Teste que já tenha resultado não pode ser removido; a edição apenas adiciona testes.
- PDF mostra data original e última atualização, nunca notas internas, e somente testes escolhidos.
- Preservar alterações não relacionadas já existentes no diretório de trabalho.

---

## File Structure

| Caminho | Responsabilidade |
| --- | --- |
| `web/js/storage.js` | Rascunhos e fila coalescida por avaliação. |
| `web/js/assessment-domain.js` | Prontidão para conclusão e adição de testes. |
| `web/js/result-presentation.js` | Cores, frases curtas e contadores. |
| `web/js/views/assessment-editor.js` | Acordeão, autosave, salvar e concluir. |
| `web/js/views/history.js` | Linha do tempo sem deltas. |
| `web/js/views/report-selection.js` | Seleção de testes para PDF. |
| `web/js/views/people.js` | Navegação para edição, histórico e relatório. |
| `apps-script/04_Assessments.gs` | Escrita idempotente, conclusão e resumo de histórico. |
| `apps-script/06_Report.gs` | Filtro de testes e relatório híbrido. |
| `web/sw.js` | Cache estático versionado. |

### Task 1: Tornar sincronização e conclusão confiáveis

**Files:**
- Modify: `web/js/storage.js`, `web/js/app.js`, `web/js/sync-model.js`, `web/js/assessment-domain.js`, `apps-script/02_Repository.gs`, `apps-script/04_Assessments.gs`
- Create: `tests/assessment-sync.test.js`
- Modify: `tests/storage.test.js`, `tests/apps-script-values.test.js`

**Interfaces:**
- Produces: `enqueueAssessmentMutation`, `hasPendingAssessmentMutation`, `assessmentReadiness` e tentativas idempotentes.

- [ ] **Step 1: Escrever os testes que devem falhar**

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import { createMutationQueue } from '../web/js/storage.js';
import { assessmentReadiness } from '../web/js/assessment-domain.js';

function memoryStore() {
  const values = new Map();
  return { async getAll() { return [...values.values()]; }, async put(value) { values.set(value.id, value); }, async remove(id) { values.delete(id); } };
}

test('keeps only newest pending mutation for one assessment', async () => {
  const queue = createMutationQueue(memoryStore());
  await queue.enqueueAssessment({ assessmentId: 'a1', action: 'saveAssessment', payload: { revision: 1 } });
  await queue.enqueueAssessment({ assessmentId: 'a1', action: 'saveAssessment', payload: { revision: 2 } });
  assert.deepEqual(await queue.list(), [{ id: 'assessment:a1', assessmentId: 'a1', action: 'saveAssessment', payload: { revision: 2 } }]);
});

test('blocks completion when a selected test has no result', () => {
  assert.deepEqual(assessmentReadiness({ testIds: ['step-2min'], results: [] }), {
    ready: false, message: 'Preencha ou informe o motivo para todos os testes selecionados'
  });
});
```

- [ ] **Step 2: Confirmar falha**

Run: `node --test tests/assessment-sync.test.js`

Expected: FAIL porque as duas funções não existem.

- [ ] **Step 3: Implementar fila coalescida e prontidão**

```js
// web/js/storage.js, dentro de createMutationQueue
async function enqueueAssessment({ assessmentId, action, payload }) {
  await store.put({ id: `assessment:${assessmentId}`, assessmentId, action, payload });
}
async function hasPendingAssessment(assessmentId) {
  return (await store.getAll()).some((item) => item.assessmentId === assessmentId);
}
```

```js
// web/js/assessment-domain.js
export function assessmentReadiness(assessment) {
  const results = assessment.results || [];
  const missing = (assessment.testIds || []).some((id) => !results.some((result) => result.testId === id));
  if (missing) return { ready: false, message: 'Preencha ou informe o motivo para todos os testes selecionados' };
  if (results.some((result) => result.status === 'naoConcluido' && !result.reason?.trim())) return { ready: false, message: 'Informe o motivo do teste não concluído' };
  return { ready: true, message: null };
}
```

Export runtime wrappers `enqueueAssessmentMutation` and `hasPendingAssessmentMutation`. They must not dispatch `sync-requested`; Save and Conclude invoke `window.syncNow()` explicitly.

- [ ] **Step 4: Tornar resultados e tentativas idempotentes**

In `web/js/sync-model.js`, include deterministic attempt IDs:

```js
tentativaId: `${assessment.id}:${result.testId}:${side}:${index + 1}`
```

In `apps-script/04_Assessments.gs`, replace `appendRow_(SHEETS.ATTEMPTS, ...)` with `updateRowById_(SHEETS.ATTEMPTS, 'tentativaId', attemptRecord)`. Preserve zero as an official value by continuing to use `fieldOrBlank_`.

Add and call this helper in `completeAssessment` before `saveAssessment(payload)`:

```js
function assessmentCanComplete_(payload) {
  const selected = payload.testesSelecionados || [];
  const results = payload.resultados || [];
  if (selected.some(function(id) { return !results.some(function(result) { return result.testeId === id; }); })) throw new Error('Preencha ou informe o motivo para todos os testes selecionados');
  results.forEach(function(result) {
    if (result.status === 'naoConcluido' && !String(result.motivoNaoConcluido || '').trim()) throw new Error('Informe o motivo do teste não concluído');
  });
}
```

- [ ] **Step 5: Verificar**

Run:

```bash
node --test tests/assessment-sync.test.js tests/storage.test.js tests/apps-script-values.test.js
node -e "const fs=require('fs'); for (const f of fs.readdirSync('apps-script').filter((n)=>n.endsWith('.gs'))) new Function(fs.readFileSync('apps-script/'+f,'utf8'));"
```

Expected: testes passam; verificação de sintaxe termina com código 0.

- [ ] **Step 6: Commit**

```bash
git add web/js/storage.js web/js/app.js web/js/sync-model.js web/js/assessment-domain.js apps-script/02_Repository.gs apps-script/04_Assessments.gs tests/assessment-sync.test.js tests/storage.test.js tests/apps-script-values.test.js
git commit -m "feat: tornar sincronização de avaliação idempotente"
```

### Task 2: Adicionar retorno por cores e ficha em acordeão

**Files:**
- Create: `web/js/result-presentation.js`, `tests/result-presentation.test.js`
- Modify: `web/js/views/assessment-editor.js`, `web/js/views/people.js`, `web/styles/app.css`, `web/sw.js`, `tests/test-forms.test.js`

**Interfaces:**
- Produces: `presentationForResult`, `sessionColorCounts` e cartões que preservam valores de rascunho ao recolher/reabrir.

- [ ] **Step 1: Escrever testes que devem falhar**

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import { presentationForResult, sessionColorCounts } from '../web/js/result-presentation.js';

const person = { sex: 'masculino', birthDate: '1962-08-04' };

test('marks below-average step test as yellow', () => {
  assert.deepEqual(presentationForResult({
    result: { testId: 'step-2min', status: 'concluido', unit: 'elevações', officialBySide: { unico: 80 } }, person, assessmentDate: '2026-08-04'
  }), { state: 'yellow', label: 'Abaixo da referência', officialText: '80 elevações' });
});

test('keeps force result gray without a reference', () => {
  assert.equal(presentationForResult({
    result: { testId: 'rowing-isometric', status: 'concluido', unit: 'kgf', officialBySide: { direito: 24 } }, person, assessmentDate: '2026-08-04'
  }).state, 'gray');
});

test('counts selected tests with no result as pending', () => {
  assert.deepEqual(sessionColorCounts({
    selectedTestIds: ['step-2min', 'sppb'], results: [{ testId: 'step-2min', status: 'concluido', unit: 'elevações', officialBySide: { unico: 80 } }], person, assessmentDate: '2026-08-04'
  }), { green: 0, yellow: 1, gray: 0, pending: 1 });
});
```

- [ ] **Step 2: Confirmar falha**

Run: `node --test tests/result-presentation.test.js`

Expected: FAIL porque o módulo não existe.

- [ ] **Step 3: Implementar regras puras de apresentação**

```js
const STEP_REFERENCES = {
  masculino: [[60,64,87,115],[65,69,86,116],[70,74,80,110],[75,79,73,109],[80,84,71,103],[85,89,59,91],[90,94,52,86]],
  feminino: [[60,64,75,107],[65,69,73,107],[70,74,68,101],[75,79,68,100],[80,84,60,91],[85,89,55,85],[90,94,44,72]]
};
function ageOnDate(birthDate, assessmentDate) {
  const birth = new Date(`${birthDate}T00:00:00Z`); const at = new Date(`${assessmentDate}T00:00:00Z`);
  return at.getUTCFullYear() - birth.getUTCFullYear() - Number(at.getUTCMonth() < birth.getUTCMonth() || (at.getUTCMonth() === birth.getUTCMonth() && at.getUTCDate() < birth.getUTCDate()));
}
function classifyStepTest({ sex, age, count }) {
  const range = STEP_REFERENCES[sex]?.find(([from, to]) => age >= from && age <= to);
  if (!range || !Number.isFinite(count)) return null;
  return count < range[2] ? 'abaixo da média' : count > range[3] ? 'acima da média' : 'média';
}
function valueOf(result) { return Object.values(result.officialBySide || {})[0] ?? null; }
export function presentationForResult({ result, person, assessmentDate }) {
  if (!result) return { state: 'gray', label: 'Não iniciado', officialText: null };
  if (result.status === 'naoConcluido') return { state: 'gray', label: 'Não concluído', officialText: null };
  const value = valueOf(result);
  const officialText = value === null ? null : `${value} ${result.unit}`;
  if (result.testId !== 'step-2min') return { state: 'gray', label: 'Sem referência disponível', officialText };
  const classification = classifyStepTest({ sex: person.sex, age: ageOnDate(person.birthDate, assessmentDate), count: value });
  return classification === 'abaixo da média'
    ? { state: 'yellow', label: 'Abaixo da referência', officialText }
    : { state: 'green', label: 'Dentro da referência', officialText };
}
export function sessionColorCounts({ selectedTestIds, results, person, assessmentDate }) {
  return selectedTestIds.reduce((counts, testId) => {
    const result = results.find((item) => item.testId === testId);
    if (!result) counts.pending += 1;
    else counts[presentationForResult({ result, person, assessmentDate }).state] += 1;
    return counts;
  }, { green: 0, yellow: 0, gray: 0, pending: 0 });
}
```

- [ ] **Step 4: Converter o editor em acordeão com autosave**

Render a ficha com um resumo antes dos testes:

```html
<section class="session-summary" aria-label="Resumo da sessão">
  <span class="state-chip green">${counts.green} verdes</span>
  <span class="state-chip yellow">${counts.yellow} amarelos</span>
  <span class="state-chip gray">${counts.gray} cinzas</span>
  <span class="state-chip neutral">${counts.pending} pendentes</span>
</section>
```

Change each test renderer to `<details class="test-card" data-test-id="..." data-state="...">` without the `open` attribute. Add a `toggle` listener that closes all other details when one opens.

Store current raw inputs in `assessment.draftInputs`. On every `input` and `change`, merge `Object.fromEntries(new FormData(form))`, set `updatedAt`, call both `saveDraft(assessment)` and `localStorage.setItem(...)`. When rendering, prefill inputs and checkboxes from `draftInputs`. Derive clinical results only for Save or Conclude.

For a closed card, render only the test title and a state marker. For an open completed card, append `officialText` and `label` from `presentationForResult`.

- [ ] **Step 5: Adicionar CSS e cache**

Add these exact rules to `web/styles/app.css`:

```css
.session-summary { display:flex; flex-wrap:wrap; gap:8px; margin:0 0 14px; }
.state-chip { border-radius:999px; padding:6px 9px; font-size:.78rem; font-weight:700; }
.green { background:#d8f2df; color:#175a31; } .yellow { background:#fff0c7; color:#765200; }
.gray { background:#e5e8e6; color:#52615a; } .neutral { background:#edf2ef; color:#52615a; }
.test-card { border-left:6px solid #a9b5af!important; }
.test-card[data-state="green"] { border-left-color:#27844d!important; }
.test-card[data-state="yellow"] { border-left-color:#c88a00!important; }
.test-card summary { cursor:pointer; font-weight:800; list-style:none; }
.test-card summary::-webkit-details-marker { display:none; }
```

Set `CACHE` to `avaliacao-idosos-v2` and add `./js/result-presentation.js` plus `./js/sync-model.js` to `ASSETS` in `web/sw.js`.

- [ ] **Step 6: Verificar**

Run: `node --test tests/result-presentation.test.js tests/test-forms.test.js && npm test`

Expected: todos os testes passam.

- [ ] **Step 7: Commit**

```bash
git add web/js/result-presentation.js web/js/views/assessment-editor.js web/js/views/people.js web/styles/app.css web/sw.js tests/result-presentation.test.js tests/test-forms.test.js
git commit -m "feat: adicionar ficha recolhível e retorno por cores"
```

### Task 3: Permitir adição de testes e conclusão confirmada

**Files:**
- Modify: `web/js/views/assessment-editor.js`, `web/js/assessment-domain.js`, `web/js/sync-model.js`, `web/js/app.js`, `apps-script/01_WebApp.gs`, `apps-script/04_Assessments.gs`
- Create: `tests/assessment-editing.test.js`

**Interfaces:**
- Produces: `addSelectedTests` e controles Salvar/Concluir com status confirmado.

- [ ] **Step 1: Escrever teste que deve falhar**

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import { addSelectedTests } from '../web/js/assessment-domain.js';

test('adds tests without removing tests that already have results', () => {
  const result = addSelectedTests({ testIds: ['back-scratch'], results: [{ testId: 'back-scratch' }] }, ['sppb', 'back-scratch']);
  assert.deepEqual(result.testIds, ['back-scratch', 'sppb']);
  assert.deepEqual(result.results, [{ testId: 'back-scratch' }]);
});
```

- [ ] **Step 2: Confirmar falha**

Run: `node --test tests/assessment-editing.test.js`

Expected: FAIL porque `addSelectedTests` não existe.

- [ ] **Step 3: Implementar edição e os dois controles**

```js
export function addSelectedTests(assessment, additionalTestIds) {
  return { ...assessment, testIds: [...new Set([...(assessment.testIds || []), ...additionalTestIds])] };
}
```

Add a collapsed `details.add-tests` containing only catalog tests absent from `assessment.testIds`; submitting it saves the updated draft and rerenders without removing results.

Render separate submit buttons:

```html
<button type="submit" name="action" value="save">Salvar</button>
<button type="submit" name="action" value="complete" class="secondary" data-complete>Concluir avaliação</button>
```

For Save, collect results, enqueue `saveAssessment`, call `await window.syncNow()`, and set status to `rascunho` only after `{ ok: true }`; otherwise use `pendenteDeSincronizacao`.

For Conclude, require `assessmentReadiness(assessment).ready` and no pending mutation, enqueue `completeAssessment`, call `await window.syncNow()`, then set `assessment.status = 'concluida'` only after `{ ok: true }`. Disable `[data-complete]` while offline, invalid, or pending.

- [ ] **Step 4: Verificar**

Run: `node --test tests/assessment-editing.test.js tests/assessment-sync.test.js tests/test-forms.test.js && npm test`

Expected: todos os testes passam.

- [ ] **Step 5: Commit**

```bash
git add web/js/views/assessment-editor.js web/js/assessment-domain.js web/js/sync-model.js web/js/app.js apps-script/01_WebApp.gs apps-script/04_Assessments.gs tests/assessment-editing.test.js
git commit -m "feat: permitir edição e conclusão confirmada"
```

### Task 4: Exibir histórico cronológico por cores

**Files:**
- Modify: `apps-script/04_Assessments.gs`, `web/js/sync-model.js`, `web/js/views/people.js`, `web/styles/app.css`
- Replace: `web/js/views/history.js`
- Modify: `tests/history.test.js`, `tests/sync-model.test.js`

**Interfaces:**
- Produces: `historyTimeline(items, person)` e `getHistory` com avaliação e resultados, sem tentativas, delta ou gráficos.

- [ ] **Step 1: Escrever teste que deve falhar**

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import { historyTimeline } from '../web/js/views/history.js';

test('creates newest-first timeline items without a delta', () => {
  const timeline = historyTimeline([
    { assessment: { avaliacaoId: 'a1', data: '2026-07-01', profissionalNome: 'Lucas', status: 'concluida' }, results: [] },
    { assessment: { avaliacaoId: 'a2', data: '2026-08-01', profissionalNome: 'Elohim', status: 'rascunho' }, results: [] }
  ], { sex: 'masculino', birthDate: '1962-08-04' });
  assert.deepEqual(timeline.map((item) => item.id), ['a2', 'a1']);
  assert.equal('delta' in timeline[0], false);
});
```

- [ ] **Step 2: Confirmar falha**

Run: `node --test tests/history.test.js`

Expected: FAIL porque `historyTimeline` não existe.

- [ ] **Step 3: Enriquecer a API de histórico**

Replace `getHistory` with:

```js
function getHistory(params) {
  const results = getRows_(SHEETS.RESULTS);
  const assessments = getRows_(SHEETS.ASSESSMENTS)
    .filter(function(item) { return item.pessoaId === params.pessoaId; })
    .sort(function(a, b) { return String(b.data).localeCompare(String(a.data)); });
  return jsonOk_(assessments.map(function(assessment) {
    return { assessment: assessment, results: results.filter(function(result) { return result.avaliacaoId === assessment.avaliacaoId; }) };
  }));
}
```

In `web/js/sync-model.js`, add `resultFromApi(result)` and make `assessmentFromApi` accept this shape without breaking the existing single-assessment detail response.

- [ ] **Step 4: Implementar modelo e tela**

```js
import { presentationForResult } from '../result-presentation.js';

function apiResultToEditorResult(result) {
  return {
    testId: result.testeId,
    status: result.status,
    unit: result.unidade,
    officialBySide: result.status === 'concluido' ? { [result.lado || 'unico']: Number(result.valorOficial) } : {}
  };
}

export function historyTimeline(items, person) {
  return items.map(({ assessment, results }) => ({
    id: assessment.avaliacaoId,
    date: assessment.data,
    professionalName: assessment.profissionalNome,
    status: assessment.status,
    counts: results.reduce((counts, result) => {
      const state = presentationForResult({ result: apiResultToEditorResult(result), person, assessmentDate: assessment.data }).state;
      counts[state] += 1;
      return counts;
    }, { green: 0, yellow: 0, gray: 0 })
  })).sort((a, b) => String(b.date).localeCompare(String(a.date)));
}
```

Move `renderHistory` from `people.js` to `history.js`. Each timeline button displays date, professional, status and color counts. Keep the detail action. Do not render any previous value, delta, graph, asymmetry or comparison message.

- [ ] **Step 5: Verificar**

Run: `node --test tests/history.test.js tests/sync-model.test.js tests/result-presentation.test.js && npm test`

Expected: todos os testes passam.

- [ ] **Step 6: Commit**

```bash
git add apps-script/04_Assessments.gs web/js/sync-model.js web/js/views/history.js web/js/views/people.js web/styles/app.css tests/history.test.js tests/sync-model.test.js
git commit -m "feat: exibir histórico cronológico por cores"
```

### Task 5: Selecionar testes e filtrar o relatório PDF

**Files:**
- Create: `web/js/views/report-selection.js`, `tests/report-selection.test.js`
- Modify: `web/js/views/people.js`, `apps-script/01_WebApp.gs`, `apps-script/06_Report.gs`, `shared/report-model.js`, `tests/report-model.test.js`

**Interfaces:**
- Produces: `defaultIncludedTestIds(results)` e `generateReport({ avaliacaoId, includedTestIds })`.

- [ ] **Step 1: Escrever teste que deve falhar**

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import { defaultIncludedTestIds } from '../web/js/views/report-selection.js';

test('selects concluded tests and leaves non-concluded tests unchecked', () => {
  assert.deepEqual(defaultIncludedTestIds([
    { testId: 'sppb', status: 'concluido' },
    { testId: 'step-2min', status: 'naoConcluido' },
    { testId: 'back-scratch', status: 'concluido' }
  ]), ['sppb', 'back-scratch']);
});
```

- [ ] **Step 2: Confirmar falha**

Run: `node --test tests/report-selection.test.js`

Expected: FAIL porque o módulo não existe.

- [ ] **Step 3: Implementar seletor no PWA**

```js
export function defaultIncludedTestIds(results) {
  return [...new Set(results.filter((result) => result.status === 'concluido').map((result) => result.testId))];
}
export function renderReportSelection(root, { assessment, results, onCancel, onGenerate }) {
  const selected = new Set(defaultIncludedTestIds(results));
  const testIds = [...new Set(results.map((result) => result.testId))];
  root.innerHTML = `<form class="form-card"><h2>Testes incluídos</h2>${testIds.map((testId) => `<label class="check-option"><input type="checkbox" name="includedTestIds" value="${testId}" ${selected.has(testId) ? 'checked' : ''}><span>${testId}</span></label>`).join('')}<button>Gerar PDF com testes selecionados</button><button type="button" class="secondary" data-cancel>Cancelar</button><p class="form-message"></p></form>`;
  root.querySelector('[data-cancel]').onclick = onCancel;
  root.querySelector('form').onsubmit = (event) => { event.preventDefault(); const ids = new FormData(event.currentTarget).getAll('includedTestIds'); if (!ids.length) { root.querySelector('.form-message').textContent = 'Selecione ao menos um teste para o relatório'; return; } onGenerate(ids); };
}
```

Replace the direct report call in the detail view with `renderReportSelection`. The button text is `Gerar PDF com testes selecionados`; an empty selection displays `Selecione ao menos um teste para o relatório`.

- [ ] **Step 4: Filtrar e renderizar no Apps Script**

```js
function generateReport(payload) {
  if (!Array.isArray(payload.includedTestIds) || !payload.includedTestIds.length) return jsonError_('VALIDATION_ERROR', 'Selecione ao menos um teste para o relatório');
  const loaded = getAssessment({ avaliacaoId: payload.avaliacaoId });
  if (!loaded.ok) return loaded;
  const results = loaded.data.results.filter(function(result) { return payload.includedTestIds.indexOf(result.testeId) !== -1; });
  // usar results filtrados para o modelo e para o PDF
}
```

Map raw IDs to `INITIAL_CATALOG` names. Extend the model with:

```js
reportMeta: {
  assessmentDate: assessment.data,
  updatedAt: assessment.ultimaAtualizacao,
  includedTestNames: [...new Set(results.map((result) => testName_(result.testeId)))]
}
```

The summary page must show person, original date, last update date, short colored result phrases and optional `observacoesAluno`. The technical page begins after `appendPageBreak()`, includes professional, `Testes incluídos neste relatório: ...`, and table columns `Teste`, `Lado`, `Resultado`, `Referência / motivo`. Do not render `notasTestes`.

- [ ] **Step 5: Estender testes e verificar**

```js
test('exposes original and last-update dates in the report metadata', () => {
  const model = buildReportModel({
    person: { name: 'Maria' },
    assessment: { date: '2026-08-01', updatedAt: '2026-08-03T10:00:00Z', professionalName: 'Elohim' },
    results: [{ testId: 'step-2min', status: 'concluido', officialValue: 81, unit: 'elevações' }]
  });
  assert.equal(model.reportMeta.assessmentDate, '2026-08-01');
  assert.equal(model.reportMeta.updatedAt, '2026-08-03T10:00:00Z');
});
```

Run: `node --test tests/report-selection.test.js tests/report-model.test.js && npm test`

Expected: todos os testes passam.

- [ ] **Step 6: Commit**

```bash
git add web/js/views/report-selection.js web/js/views/people.js apps-script/01_WebApp.gs apps-script/06_Report.gs shared/report-model.js tests/report-selection.test.js tests/report-model.test.js
git commit -m "feat: selecionar testes no relatório clínico"
```

### Task 6: Atualizar cache, publicar e executar aceite

**Files:**
- Modify: `web/sw.js`, `docs/deployment.md`
- Create: `tests/e2e-pacote-operacional.md`

**Interfaces:**
- Produces: PWA atualizável e roteiro manual para validar planilha e PDF.

- [ ] **Step 1: Criar o roteiro de aceite manual**

Create `tests/e2e-pacote-operacional.md` with these checkboxes:

```markdown
# Aceite manual — pacote operacional

- [ ] Abrir o PWA online e confirmar que a lista de pessoas vem da planilha.
- [ ] Criar pessoa com WhatsApp e confirmar a linha na aba Pessoas.
- [ ] Iniciar avaliação com Carlos Eduardo e somente Back Scratch.
- [ ] Desligar a rede, preencher uma tentativa, recarregar e confirmar que o valor continua no cartão recolhido.
- [ ] Reconectar, tocar Salvar e confirmar linhas em Avaliacoes, Resultados e Tentativas.
- [ ] Editar a mesma avaliação, adicionar SPPB e confirmar que Back Scratch continua preservado.
- [ ] Marcar teste não concluído sem motivo e confirmar bloqueio de Concluir; informar motivo livre e confirmar liberação após Salvar.
- [ ] Concluir avaliação e confirmar status concluida em Avaliacoes.
- [ ] Abrir Histórico e confirmar data, profissional, estado e contadores por cor sem delta.
- [ ] Gerar PDF somente com testes concluídos e confirmar que não concluídos não aparecem.
- [ ] Gerar PDF incluindo um não concluído e confirmar seu motivo técnico.
- [ ] Confirmar que notas sobre testes não aparecem e observações sobre o aluno aparecem quando preenchidas.
```

- [ ] **Step 2: Atualizar service worker**

Replace the cache declaration and asset list in `web/sw.js`:

```js
const CACHE = 'avaliacao-idosos-v3';
const ASSETS = [
  './', './index.html', './config.js', './styles/app.css', './js/app.js', './js/api-client.js',
  './js/storage.js', './js/domain.js', './js/assessment-domain.js', './js/result-presentation.js',
  './js/history-domain.js', './js/sync-model.js', './js/views/people.js', './js/views/assessment-editor.js',
  './js/views/history.js', './js/views/report-selection.js', './manifest.webmanifest', './icons/icon.svg'
];
```

Do not cache API responses or the Apps Script URL.

- [ ] **Step 3: Documentar publicação**

Append this section to `docs/deployment.md`:

```markdown
## Publicação do pacote operacional

1. Execute `npm test` e confirme zero falhas.
2. Execute `npx --yes @google/clasp push --force`.
3. No Apps Script, edite a implantação Web existente, escolha a nova versão e mantenha `Executar como: eu` e `Quem tem acesso: qualquer pessoa` nesta fase sem controle de acesso.
4. Envie o frontend para `master` e aguarde o GitHub Pages.
5. Abra o PWA e faça recarga forçada (`Ctrl+Shift+R`) para receber o novo service worker.
6. Execute todos os itens de `tests/e2e-pacote-operacional.md` antes do uso com dados clínicos reais.
```

- [ ] **Step 4: Verificar antes de publicar**

Run: `npm test`, `node --check web/js/app.js`, `node --check web/js/views/assessment-editor.js`, `node --check web/js/views/history.js`, `node --check web/js/views/report-selection.js`, then:

```bash
node -e "const fs=require('fs'); for (const f of fs.readdirSync('apps-script').filter((n)=>n.endsWith('.gs'))) new Function(fs.readFileSync('apps-script/'+f,'utf8'));"
```

Expected: todos os testes passam e todos os comandos terminam com código 0.

- [ ] **Step 5: Publicar e executar o roteiro**

Run `npx --yes @google/clasp push --force`, then `git push origin master`. After both publications finish, execute every checkbox in `tests/e2e-pacote-operacional.md`. Record the Apps Script version, GitHub Actions run URL and all manual results in the final handoff.

- [ ] **Step 6: Commit**

Run: `git add web/sw.js docs/deployment.md tests/e2e-pacote-operacional.md && git commit -m "docs: adicionar aceite do pacote operacional"`

## Plan self-review

- **Spec coverage:** Task 1 implements local durability, explicit synchronization and safe conclusion. Task 2 implements the accordion, colors and local summary. Task 3 covers adding tests and the conclusion controls. Task 4 creates chronological history without comparisons. Task 5 filters the hybrid PDF. Task 6 covers the complete acceptance route.
- **Scope exclusions:** No task introduces brand work, access restrictions, IA, anamnese, graphs, comparisons or new clinical reference ranges.
- **Type consistency:** PWA models use `testId`, `assessmentId` and `includedTestIds`; Apps Script payloads convert to `testeId`, `avaliacaoId` only in `sync-model.js`; report generation receives the same `includedTestIds` named by the selector.
- **Placeholder scan:** Every task has exact files, a failing-test step, a verification command and a commit command. Known future clinical refinements are excluded by the global constraints rather than left undefined.
