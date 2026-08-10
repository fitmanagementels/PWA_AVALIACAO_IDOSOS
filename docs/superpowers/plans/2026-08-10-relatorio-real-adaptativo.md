# Relatório real e adaptativo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que o profissional selecione os testes concluídos de uma avaliação e gere, no próprio PWA, uma prévia A5 adaptativa pronta para salvar ou compartilhar como PDF.

**Architecture:** Um módulo puro transforma a pessoa, a avaliação e os resultados em um modelo de relatório agrupado por teste e domínio. Uma view independente renderiza esse modelo e aciona a impressão nativa; o fluxo de histórico passa a abrir a prévia, preferindo a cópia local da avaliação quando há sincronização pendente. O Apps Script e o gerador legado em Google Docs permanecem inalterados.

**Tech Stack:** HTML, CSS, ES modules nativos, localStorage, service worker, Node built-in test runner e Google Apps Script já existente.

## Global Constraints

- Usar somente resultados com `status === 'concluido'` tanto na seleção como no documento.
- Exibir apenas testes marcados pelo profissional; resultados não concluídos e notas internas não podem vazar ao PDF.
- Para resultado bilateral, reunir os lados no mesmo cartão/bloco do teste.
- A prévia deve poder usar a cópia `assessment:<avaliacaoId>` mais recente e indicar sincronização pendente sem bloquear a exportação.
- A exportação é client-side por `window.print()`, com `@page { size: A5 portrait; }` e sem cabeçalho, dock ou botões do PWA.
- A paginação precisa ser natural: sem número fixo de páginas, sem blocos cortados e sem páginas de preenchimento.
- Não chamar `generateReport` do Apps Script pelo novo fluxo.

---

### Task 1: Modelo puro de relatório e seleção elegível

**Files:**
- Create: `web/js/report-model.js`
- Modify: `web/js/views/report-selection.js`
- Modify: `tests/report-model.test.js`
- Modify: `tests/report-selection.test.js`

**Interfaces:**
- Consumes: `person { name, birthDate }`, `assessment { date, updatedAt, professionalName, studentObservations }`, resultados normalizados ou vindos da API e `includedTestIds: string[]`.
- Produces: `buildReportModel({ person, assessment, results, includedTestIds, isPendingSync })`, com `meta`, `summary.cards`, `summary.studentObservations` e `technical.domains`.
- Produces: `reportableResults(results)` e `defaultReportTestIds(results)`, ambas limitadas a resultados concluídos.

- [ ] **Step 1: Write the failing tests**

```js
test('groups bilateral official values into one selected test card', () => {
  const model = buildReportModel({
    person: { name: 'Maria', birthDate: '1954-08-10' },
    assessment: { date: '2026-08-10', professionalName: 'Elohim' },
    results: [
      { testId: 'knee-extension-isometric', status: 'concluido', side: 'direito', officialValue: 36, unit: 'kgf' },
      { testId: 'knee-extension-isometric', status: 'concluido', side: 'esquerdo', officialValue: 33, unit: 'kgf' }
    ],
    includedTestIds: ['knee-extension-isometric']
  });
  assert.equal(model.summary.cards[0].value, 'D 36 · E 33 kgf');
  assert.equal(model.meta.age, 72);
});

test('reportable results ignore incomplete tests and duplicate test identifiers', () => {
  assert.deepEqual(defaultReportTestIds([
    { testeId: 'step-2min', status: 'concluido' },
    { testeId: 'sppb', status: 'naoConcluido' },
    { testeId: 'step-2min', status: 'concluido' }
  ]), ['step-2min']);
});
```

- [ ] **Step 2: Run the model and selection tests to verify they fail**

Run: `node --test tests/report-model.test.js tests/report-selection.test.js`

Expected: FAIL because `web/js/report-model.js` and its grouping interface do not yet exist.

- [ ] **Step 3: Implement the smallest reusable report model**

```js
export function buildReportModel({ person, assessment, results, includedTestIds, isPendingSync = false }) {
  const selected = groupCompletedResults(results, includedTestIds);
  return {
    meta: { name: person.name, age: ageAt(person.birthDate, assessment.date), date: assessment.date, updatedAt: assessment.updatedAt, professionalName: assessment.professionalName, isPendingSync },
    summary: { cards: selected.map(toSummaryCard), studentObservations: assessment.studentObservations?.trim() || null },
    technical: { domains: groupByDomain(selected) }
  };
}
```

Normalize both API keys (`testeId`, `lado`, `valorOficial`, `unidade`, `classificacao`) and local keys (`testId`, `side`, `officialValue`, `unit`, `classification`) before grouping. Keep `attempts` inside technical entries only; never copy `testNotes` into the returned model.

- [ ] **Step 4: Run the focused tests**

Run: `node --test tests/report-model.test.js tests/report-selection.test.js`

Expected: PASS.

- [ ] **Step 5: Commit the model unit**

```bash
git add web/js/report-model.js web/js/views/report-selection.js tests/report-model.test.js tests/report-selection.test.js
git commit -m "feat: model adaptive report data"
```

### Task 2: Prévia A5 e stylesheet de impressão

**Files:**
- Create: `web/js/views/report-preview.js`
- Create: `web/styles/report.css`
- Modify: `web/index.html`
- Modify: `web/sw.js`
- Create: `tests/report-preview.test.js`
- Modify: `tests/service-worker.test.js`

**Interfaces:**
- Consumes: `renderReportPreview(root, { person, assessment, results, includedTestIds, isPendingSync, onBack })`.
- Depends on: `buildReportModel` from `web/js/report-model.js`, `formatDateBr` and `formatDateTimeBr`.
- Produces: a report preview that calls `window.print()` only on `[data-report-print]`, and returns through `onBack` on `[data-report-back]`.

- [ ] **Step 1: Write failing view and CSS contract tests**

```js
test('report preview is an independent view with native print and a back action', () => {
  const source = fs.readFileSync('web/js/views/report-preview.js', 'utf8');
  assert.match(source, /export function renderReportPreview/);
  assert.match(source, /window\.print\(\)/);
  assert.match(source, /data-report-back/);
});

test('print stylesheet defines adaptive A5 output and hides PWA controls', () => {
  const css = fs.readFileSync('web/styles/report.css', 'utf8');
  assert.match(css, /@page\s*\{\s*size:\s*A5 portrait/);
  assert.match(css, /@media print/);
  assert.match(css, /break-inside:\s*avoid/);
});
```

- [ ] **Step 2: Run the preview contract tests to verify they fail**

Run: `node --test tests/report-preview.test.js tests/service-worker.test.js`

Expected: FAIL because the view, stylesheet and static-cache entries are absent.

- [ ] **Step 3: Render the adaptive document and print only the document**

```js
export function renderReportPreview(root, options) {
  const model = buildReportModel(options);
  root.innerHTML = `<section class="report-preview-screen">${reportDocumentMarkup(model)}</section>`;
  root.querySelector('[data-report-back]').onclick = () => options.onBack();
  root.querySelector('[data-report-print]').onclick = () => window.print();
}
```

The markup must include: compact XSTEAM cover, person/date/professional context, optional pending-sync note, summary result cards, optional professional observations, and technical blocks grouped by domain. Use escaped user-provided text in every interpolated field. The CSS must define the screen preview and the A5 print version, isolate itself with `report-*` classes, keep cards and technical blocks intact with `break-inside: avoid`, and hide `.app-header`, `.sync-dock`, `.report-preview-actions` on print.

- [ ] **Step 4: Register assets and verify tests**

Add `<link rel="stylesheet" href="styles/report.css">` and cache `./js/report-model.js`, `./js/views/report-preview.js`, and `./styles/report.css` in `web/sw.js`.

Run: `node --test tests/report-preview.test.js tests/service-worker.test.js`

Expected: PASS.

- [ ] **Step 5: Commit the document renderer unit**

```bash
git add web/index.html web/sw.js web/js/views/report-preview.js web/js/report-model.js web/styles/report.css tests/report-preview.test.js tests/service-worker.test.js
git commit -m "feat: add A5 report preview and print layout"
```

### Task 3: Histórico, dados locais pendentes e seleção que abre a prévia

**Files:**
- Modify: `web/js/views/people.js`
- Modify: `tests/people.test.js`
- Modify: `tests/api-endpoint.test.js`

**Interfaces:**
- Consumes: `renderReportPreview`, `defaultReportTestIds`, `hasPendingAssessmentMutation`, `localStorage` record `assessment:<assessmentId>`.
- Produces: “Exportar relatório PDF” que lista apenas testes concluídos, abre a prévia sem chamar `request('generateReport')`, e mantém a página atual se uma leitura antiga terminar depois da navegação.

- [ ] **Step 1: Write failing workflow tests**

```js
test('opens the local adaptive preview rather than the legacy report endpoint', () => {
  const source = fs.readFileSync('web/js/views/people.js', 'utf8');
  assert.match(source, /renderReportPreview/);
  assert.match(source, /hasPendingAssessmentMutation/);
  assert.doesNotMatch(source, /request\('generateReport'/);
});

test('builds the report selection only from concluded result identifiers', () => {
  const source = fs.readFileSync('web/js/views/people.js', 'utf8');
  assert.match(source, /selectionCardsMarkup\(\{[\s\S]*items:\s*selected\.map/);
});
```

- [ ] **Step 2: Run workflow tests to verify they fail**

Run: `node --test tests/people.test.js tests/api-endpoint.test.js`

Expected: FAIL because the history flow still invokes `generateReport`.

- [ ] **Step 3: Replace the legacy report call with the local preview flow**

```js
const selected = defaultReportTestIds(results);
const selectedItems = selected.map((id) => [id, testName(id)]);
reportForm.onsubmit = (event) => {
  event.preventDefault();
  const includedTestIds = new FormData(event.currentTarget).getAll('includedTestIds');
  const local = readLocalAssessment(assessment.id);
  const pending = hasPendingAssessmentMutation(assessment.id);
  startNavigation('report-preview');
  renderReportPreview(root, {
    person,
    assessment: pending && local ? local : assessment,
    results: pending && local?.results?.length ? local.results : results,
    includedTestIds,
    isPendingSync: pending,
    onBack: () => renderAssessmentHistory(root, person, assessment.id, onBack)
  });
};
```

If `selectedItems` is empty, render a concise message instead of a selection form. Keep the existing `isCurrentNavigation` check after the async `getAssessment`, and use a new navigation token before opening the preview so an old fetch cannot overwrite the current view.

- [ ] **Step 4: Run the complete test suite**

Run: `npm test`

Expected: PASS.

- [ ] **Step 5: Commit the integrated report flow**

```bash
git add web/js/views/people.js tests/people.test.js tests/api-endpoint.test.js
git commit -m "feat: open adaptive report from assessment history"
```

### Task 4: Verificação de entrega

**Files:**
- Verify only: `web/index.html`, `web/js/views/people.js`, `web/js/views/report-preview.js`, `web/styles/report.css`, `web/sw.js`

**Interfaces:**
- Consumes: the three completed units.
- Produces: evidência de que o relatório pode ser aberto e impresso sem afetar a sincronização ou o histórico.

- [ ] **Step 1: Check syntax and static asset references**

Run: `node --check web/js/report-model.js && node --check web/js/views/report-preview.js && node --check web/js/views/people.js`

Expected: no output and exit code 0.

- [ ] **Step 2: Run all automated tests**

Run: `npm test`

Expected: PASS with zero failing tests.

- [ ] **Step 3: Inspect print rules and forbidden legacy call**

Run: `grep -nE "@page|A5 portrait|break-inside|generateReport|window.print" web/styles/report.css web/js/views/people.js web/js/views/report-preview.js`

Expected: A5, `break-inside` and `window.print` present; `generateReport` absent from `people.js`.

- [ ] **Step 4: Commit any final test or cache correction**

```bash
git add web/sw.js web/index.html web/styles/report.css tests
git commit -m "test: verify adaptive report delivery"
```
