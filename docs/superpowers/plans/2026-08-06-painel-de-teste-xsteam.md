# Painel de Teste XSTEAM Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace expanded test forms in an assessment with compact summaries and an accessible XSTEAM test-detail sheet that persists draft values locally without new backend calls.

**Architecture:** Move test field metadata and compact-summary derivation out of `assessment-editor.js` into a pure module. A separate sheet view owns overlay markup, focus and close behavior; the assessment editor remains the owner of assessment state, local persistence, final result collection, and global save/complete actions. The sheet only changes `assessment.draftInputs`, so existing Apps Script payloads and result rules are preserved.

**Tech Stack:** Vanilla ES modules, HTML/CSS, localStorage, IndexedDB draft storage, Node built-in test runner, service worker cache.

## Global Constraints

- Keep current test IDs, `FormData` names, `collectResult`, `buildResult`, `assessmentReadiness`, `assessmentForSave`, queue and Apps Script contracts unchanged.
- Opening, editing and closing a test sheet must make zero API calls and must not enqueue a mutation.
- Persist every test edit locally; a close only succeeds after the last local persistence succeeds.
- Do not introduce clinical images now. Render an accessible 4:3 placeholder only; future assets map `testeId` to `imageUrl` and `alt` without changing input handling.
- Use a green-black translucent scrim, not an opaque black page. The assessment is visible but inert while the sheet is open.
- Desktop: placeholder image is left of procedure. Mobile: image is above procedure. The procedure is not sticky.
- Numeric inputs retain visible unit and a 48 px minimum touch target. Bilateral attempts are compact two-column groups when width allows.
- The sheet uses `role="dialog"`, traps focus, restores focus to the origin card, supports `Esc`, close button, scrim close, and reduced motion.
- Add new static modules to `web/sw.js` and increment the current cache from `avaliacao-idosos-v15`.

---

## File Map

| File | Responsibility |
| --- | --- |
| `web/js/test-inputs.js` | Test definitions, test-scoped input names, draft replacement and summary derivation; no DOM access. |
| `web/js/views/test-sheet.js` | Overlay markup and DOM lifecycle for one test; accepts callbacks, never calls API/storage itself. |
| `web/js/views/assessment-editor.js` | Compact assessment cards, sheet opening, local draft owner, and existing global save/complete workflow. |
| `web/styles/app.css` | Sheet/scrim, compact summary cards, input grids and desktop/mobile breakpoints. |
| `web/sw.js` | Versioned static asset cache. |
| `tests/test-inputs.test.js` | Pure field, draft and summary behaviors. |
| `tests/test-sheet.test.js` | Markup/accessibility contract for the reusable sheet. |
| `tests/assessment-editor.test.js` | Editor integration contract: no expanded `<details>`, local sheet persistence and no API dependency. |
| `tests/service-worker.test.js` | Cache version and static module regression assertions. |
| `tests/xsteam-theme.test.js` | Sheet/scrim/responsive CSS regression assertions. |

## Task 1: Extract test metadata and compact summary derivation

**Files:**

- Create: `web/js/test-inputs.js`
- Create: `tests/test-inputs.test.js`
- Modify: `web/js/views/assessment-editor.js`

**Interfaces:**

- Produces `testDefinition(testId)`, `testInputNames(testId)`, `replaceTestDraftInputs(draftInputs, testId, values)`, and `testCardSummary({ testId, draftInputs, result })`.
- `testCardSummary` returns `{ state: 'empty' | 'partial' | 'complete' | 'not-completed', text, entered, total }`.
- `assessment-editor.js` consumes these helpers without changing any existing browser storage key or server payload field.

- [ ] **Step 1: Write failing pure behavior tests.**

  Create `tests/test-inputs.test.js`:

  ```js
  import assert from 'node:assert/strict';
  import test from 'node:test';
  import { replaceTestDraftInputs, testCardSummary, testInputNames } from '../web/js/test-inputs.js';

  test('lists only the four bilateral attempt names for Back Scratch', () => {
    assert.deepEqual(testInputNames('back-scratch'), [
      'back-scratch-direito-1', 'back-scratch-direito-2',
      'back-scratch-esquerdo-1', 'back-scratch-esquerdo-2',
    ]);
  });

  test('replaces only the open test draft values and keeps notes from the assessment', () => {
    const next = replaceTestDraftInputs(
      { testNotes: 'nota', 'back-scratch-direito-1': '8', 'chair-sit-reach-direito-1': '2' },
      'back-scratch',
      { 'back-scratch-direito-1': '12', 'back-scratch-direito-2': '11' },
    );

    assert.deepEqual(next, {
      testNotes: 'nota',
      'chair-sit-reach-direito-1': '2',
      'back-scratch-direito-1': '12',
      'back-scratch-direito-2': '11',
    });
  });

  test('summarizes incomplete, complete and non-completed test cards without classifications', () => {
    assert.deepEqual(testCardSummary({ testId: 'back-scratch', draftInputs: {}, result: null }), {
      state: 'empty', text: 'Nenhuma tentativa', entered: 0, total: 4,
    });
    assert.deepEqual(testCardSummary({ testId: 'back-scratch', draftInputs: { 'back-scratch-direito-1': '12', 'back-scratch-direito-2': '11', 'back-scratch-esquerdo-1': '8', 'back-scratch-esquerdo-2': '10' }, result: null }), {
      state: 'complete', text: 'Direito: 12 cm · Esquerdo: 10 cm', entered: 4, total: 4,
    });
    assert.deepEqual(testCardSummary({ testId: 'back-scratch', draftInputs: { 'back-scratch-not-completed': 'on', 'back-scratch-reason': 'Dor' }, result: null }), {
      state: 'not-completed', text: 'Não concluído: Dor', entered: 0, total: 4,
    });
  });
  ```

- [ ] **Step 2: Run the focused test and confirm it fails for the missing module.**

  Run: `node --test tests/test-inputs.test.js`

  Expected: `ERR_MODULE_NOT_FOUND` for `web/js/test-inputs.js`.

- [ ] **Step 3: Implement the pure test definitions and summary functions.**

  Create `web/js/test-inputs.js`. Keep field names byte-for-byte identical to current editor names:

  ```js
  export const TEST_DEFINITIONS = {
    'back-scratch': { title: 'Back Scratch', unit: 'cm', sides: ['direito', 'esquerdo'], attempts: 2, hint: 'Registre a melhor distância em cm para cada lado.' },
    'chair-sit-reach': { title: 'Chair Sit-and-Reach', unit: 'cm', sides: ['direito', 'esquerdo'], attempts: 2, hint: 'Registre a melhor distância em cm para cada perna.' },
    'step-2min': { title: '2-Minute Step Test', unit: 'elevações', sides: ['unico'], attempts: 1, hint: 'Conte as elevações do joelho direito em dois minutos.' },
    'knee-extension-isometric': { title: 'Extensão isométrica de joelho', unit: 'kgf', sides: ['direito', 'esquerdo'], attempts: 2, hint: 'Dinamômetro de tensão.' },
    'rowing-isometric': { title: 'Remada isométrica', unit: 'kgf', sides: ['direito', 'esquerdo'], attempts: 2, hint: 'Dinamômetro de tensão.' },
  };

  export function testDefinition(testId) {
    if (testId === 'sppb') return { title: 'SPPB', unit: 's', hint: 'Preencha caminhada, sentar e levantar e equilíbrio.', sides: [], attempts: 0 };
    return TEST_DEFINITIONS[testId];
  }

  export function testInputNames(testId) {
    if (testId === 'sppb') return ['sppb-gait-1', 'sppb-gait-2', 'sppb-chair', 'sppb-feet', 'sppb-semi', 'sppb-tandem'];
    const detail = testDefinition(testId);
    return detail.sides.flatMap((side) => Array.from({ length: detail.attempts }, (_, index) => `${testId}-${side}-${index + 1}`));
  }
  ```

  `replaceTestDraftInputs` must delete only `testInputNames(testId)`, `${testId}-not-completed` and `${testId}-reason` from its copy before merging `values`. For SPPB, its toggle/reason are `sppb-not-completed` and `sppb-reason`.

  `testCardSummary` must return `not-completed` first, then count nonblank attempt names. For bilateral completed records, use the highest number per side; use the lowest number for `sppb-gait-*`; do not invoke `presentationForResult` and do not return a reference classification.

- [ ] **Step 4: Replace local `TEST_DETAILS` usage with the shared definition.**

  In `web/js/views/assessment-editor.js`, import:

  ```js
  import { replaceTestDraftInputs, testCardSummary, testDefinition, testInputNames } from '../test-inputs.js';
  ```

  Remove the private `TEST_DETAILS` object only after `collectResult` reads `testDefinition(id)` and converts `detail.sides.length > 1` to the old bilateral behavior. Preserve the existing SPPB branch exactly.

- [ ] **Step 5: Run focused and full tests.**

  Run: `node --test tests/test-inputs.test.js tests/assessment-editor.test.js && npm test`

  Expected: all tests pass.

- [ ] **Step 6: Commit the pure model slice.**

  ```bash
  git add web/js/test-inputs.js web/js/views/assessment-editor.js tests/test-inputs.test.js
  git commit -m "feat: derive compact test summaries"
  ```

## Task 2: Build the accessible sheet as an isolated view

**Files:**

- Create: `web/js/views/test-sheet.js`
- Create: `tests/test-sheet.test.js`

**Interfaces:**

- Produces `openTestSheet({ origin, testId, definition, draftInputs, result, summary, persist, onClose })`.
- `persist(values)` is supplied by the editor and returns `Promise<void>` after local persistence; this view must never import `request`, `storage`, or queue functions.
- `onClose()` is supplied by the editor to refresh the compact card only after a successful local save.

- [ ] **Step 1: Write failing markup and isolation tests.**

  Create `tests/test-sheet.test.js`:

  ```js
  import assert from 'node:assert/strict';
  import test from 'node:test';
  import { testSheetMarkup } from '../web/js/views/test-sheet.js';

  test('renders an accessible test sheet with left visual placeholder and compact attempt fields', () => {
    const markup = testSheetMarkup({
      testId: 'back-scratch',
      definition: { title: 'Back Scratch', unit: 'cm', hint: 'Registre a melhor distância em cm para cada lado.' },
      fields: '<label>Tentativa 1<input name="back-scratch-direito-1"></label>',
      summary: { text: 'Nenhuma tentativa' },
    });

    assert.match(markup, /role="dialog"/);
    assert.match(markup, /aria-modal="true"/);
    assert.match(markup, /test-sheet__visual/);
    assert.match(markup, /Imagem de referência/);
    assert.match(markup, /test-sheet__procedure/);
    assert.match(markup, /data-test-sheet-save/);
  });

  test('keeps the sheet independent from remote APIs and queue operations', async () => {
    const source = await import('node:fs/promises').then((fs) => fs.readFile('web/js/views/test-sheet.js', 'utf8'));
    assert.doesNotMatch(source, /api-client|enqueueAssessmentMutation|queueMutation|request\(/);
    assert.match(source, /origin\.focus\(\)/);
    assert.match(source, /event\.key === 'Escape'/);
  });
  ```

- [ ] **Step 2: Run the focused test and confirm it fails.**

  Run: `node --test tests/test-sheet.test.js`

  Expected: `ERR_MODULE_NOT_FOUND` for `web/js/views/test-sheet.js`.

- [ ] **Step 3: Implement `testSheetMarkup` and `openTestSheet`.**

  The markup shape must be:

  ```js
  export function testSheetMarkup({ testId, definition, fields, summary }) {
    return `<div class="test-sheet-layer" data-test-sheet-layer>
      <button class="test-sheet-scrim" type="button" aria-label="Fechar ${escapeHtml(definition.title)}"></button>
      <section class="test-sheet" role="dialog" aria-modal="true" aria-labelledby="test-sheet-title-${escapeHtml(testId)}" tabindex="-1">
        <header class="test-sheet__header"><div><p class="eyebrow">REGISTRO DO TESTE</p><h2 id="test-sheet-title-${escapeHtml(testId)}">${escapeHtml(definition.title)}</h2></div><button class="secondary" type="button" data-test-sheet-close aria-label="Fechar">×</button></header>
        <div class="test-sheet__intro"><figure class="test-sheet__visual"><span aria-hidden="true">▧</span><figcaption>Imagem de referência<br><small>Inserir referência do teste</small></figcaption></figure><div class="test-sheet__procedure"><h3>Como executar</h3><p>${escapeHtml(definition.hint)}</p><span class="state-chip neutral">Unidade: ${escapeHtml(definition.unit)}</span></div></div>
        <form data-test-sheet-form>${fields}<p class="result-caption" data-test-sheet-summary>${escapeHtml(summary.text)}</p><p class="form-message" data-test-sheet-message aria-live="polite"></p><button type="submit" data-test-sheet-save>Salvar e voltar</button></form>
      </section>
    </div>`;
  }
  ```

  `openTestSheet` appends this layer to `document.body`, remembers `origin`, captures the previously focused element, focuses the dialog, and traps `Tab` between its first/last focusable elements. It gathers `new FormData(sheetForm)` on input/change and serializes persistence through one recoverable promise chain:

  ```js
  let pendingSave = Promise.resolve();
  const save = () => {
    const values = Object.fromEntries(new FormData(sheetForm));
    const currentSave = pendingSave
      .catch(() => undefined)
      .then(() => persist(values));
    pendingSave = currentSave;
    return currentSave;
  };
  ```

  Close/scrim/`Esc` await `save()` first. If it rejects, render the message in `[data-test-sheet-message]`, keep the layer open and leave all field values untouched. The next input, explicit retry, or close attempt must create a new persistence attempt after the failed one; a rejected promise must never poison the save chain. On success, remove the layer, call `onClose()`, and call `origin.focus()`.

- [ ] **Step 4: Implement test-specific field markup without changing names.**

  Export `testFieldsMarkup({ testId, definition, draftInputs })` from the same view. It must render:

  - `notCompletedToggle` and reason first;
  - a `.test-attempt-group` for each bilateral side with two `.compact-number-field` controls;
  - one compact control for `step-2min`;
  - SPPB subgroups for caminhada (two fields), sentar/levantar (one) and equilíbrio (three).

  Every numeric input keeps its existing `name`, `inputmode="decimal"`, current draft `value`, a visible unit suffix, and an associated label. When `Não concluído` is checked, toggle a `data-not-completed="true"` attribute on the form; CSS disables measurement controls visually, while the result rule still validates the reason on global completion.

- [ ] **Step 5: Run focused tests.**

  Run: `node --test tests/test-sheet.test.js`

  Expected: all tests pass.

- [ ] **Step 6: Commit the sheet view.**

  ```bash
  git add web/js/views/test-sheet.js tests/test-sheet.test.js
  git commit -m "feat: add local test detail sheet"
  ```

## Task 3: Integrate sheets with assessment state and global save rules

**Files:**

- Modify: `web/js/views/assessment-editor.js`
- Modify: `tests/assessment-editor.test.js`

**Interfaces:**

- Consumes `openTestSheet`, `testFieldsMarkup`, `testCardSummary`, `replaceTestDraftInputs`, `testDefinition`, and `testInputNames`.
- The editor owns `persistAssessment()` and passes a test-scoped `persist(values)` callback to the sheet.
- The editor continues to call `collectResult(id, data)` only during the existing global save/complete submit.

- [ ] **Step 1: Write failing editor integration tests.**

  Replace the old closed-`details` assertion in `tests/assessment-editor.test.js` with:

  ```js
  test('renders compact test cards and opens the local detail sheet instead of expanded details', () => {
    assert.match(source, /class="test-summary-card"/);
    assert.match(source, /openTestSheet/);
    assert.match(source, /testCardSummary/);
    assert.doesNotMatch(source, /<details class="test-card"/);
  });

  test('keeps global save based on the accumulated local test draft inputs', () => {
    assert.match(source, /draftInputs: assessment\.draftInputs/);
    assert.match(source, /replaceTestDraftInputs/);
    assert.match(source, /collectResult\(id, data\)/);
    assert.doesNotMatch(source, /request\(/);
  });
  ```

- [ ] **Step 2: Run the editor test and confirm it fails.**

  Run: `node --test tests/assessment-editor.test.js`

- [ ] **Step 3: Replace expanded cards with compact summary-card buttons.**

  Replace `card(id, assessment, person)` output with a button-compatible card:

  ```js
  function testSummaryCard(id, assessment, person) {
    const result = (assessment.results || []).find((item) => item.testId === id) || null;
    const presentation = presentationForResult({ result, person, assessmentDate: assessment.date });
    const summary = testCardSummary({ testId: id, draftInputs: assessment.draftInputs, result });
    return `<button class="test-summary-card" type="button" data-open-test="${escapeHtml(id)}" data-state="${presentation.state}">
      <span><strong>${escapeHtml(testDefinition(id).title)}</strong><small>${escapeHtml(summary.text)}</small></span>
      <span class="test-summary-card__meta">${summary.entered} de ${summary.total}<b>Abrir ›</b></span>
    </button>`;
  }
  ```

  In `renderAssessmentEditor`, bind every `[data-open-test]` to `openTestSheet`. Pass `origin: button`, the result/presentation/summary, `fields: testFieldsMarkup(...)`, and a persistence callback that does exactly:

  ```js
  async (values) => {
    assessment.draftInputs = replaceTestDraftInputs(assessment.draftInputs, id, values);
    assessment.updatedAt = new Date().toISOString();
    localStorage.setItem(`assessment:${assessment.id}`, JSON.stringify(assessment));
    await saveDraft(assessment);
  }
  ```

  On successful close, capture `window.scrollY`, call `renderAssessmentEditor(root, assessment, onBack)`, then restore it in `requestAnimationFrame(() => window.scrollTo({ top: scrollY }))`.

- [ ] **Step 4: Make global notes and results read the cumulative draft state.**

  Replace the current `Object.fromEntries(new FormData(form))` assignment in `persistDraft` with a merge that only owns global fields:

  ```js
  const data = new FormData(form);
  assessment.draftInputs = {
    ...assessment.draftInputs,
    testNotes: data.get('testNotes') || '',
    studentObservations: data.get('studentObservations') || '',
  };
  ```

  Before the existing `assessment.testIds.map((id) => collectResult(id, data))` line in submit, construct `data` from all accumulated draft values:

  ```js
  const data = new FormData();
  Object.entries(assessment.draftInputs).forEach(([name, value]) => data.append(name, value));
  ```

  Keep the `testNotes` and `studentObservations` assignments, queue mutation and `window.syncNow()` path unchanged.

- [ ] **Step 5: Run editor, domain and full tests.**

  Run: `node --test tests/assessment-editor.test.js tests/assessment-editing.test.js tests/test-inputs.test.js tests/test-sheet.test.js && npm test`

  Expected: all tests pass.

- [ ] **Step 6: Commit the integration slice.**

  ```bash
  git add web/js/views/assessment-editor.js tests/assessment-editor.test.js
  git commit -m "feat: edit assessment tests in contextual sheets"
  ```

## Task 4: Apply responsive sheet styles and renew offline assets

**Files:**

- Modify: `web/styles/app.css`
- Modify: `web/sw.js`
- Modify: `tests/xsteam-theme.test.js`
- Modify: `tests/service-worker.test.js`

**Interfaces:**

- CSS consumes only `test-summary-card`, `test-sheet-layer`, `test-sheet-scrim`, `test-sheet`, `test-sheet__intro`, `test-sheet__visual`, `test-sheet__procedure`, `test-attempt-group`, and `compact-number-field` selectors emitted by Task 2/3.
- Service worker precaches `./js/test-inputs.js` and `./js/views/test-sheet.js` under `avaliacao-idosos-v16`.

- [ ] **Step 1: Write failing cache and visual contract tests.**

  In `tests/service-worker.test.js` change the expected cache and add the two modules:

  ```js
  assert.match(source, /const CACHE = 'avaliacao-idosos-v16';/);
  assert.match(source, /\.\/js\/test-inputs\.js/);
  assert.match(source, /\.\/js\/views\/test-sheet\.js/);
  ```

  Add to `tests/xsteam-theme.test.js`:

  ```js
  test('styles the contextual test sheet with a translucent scrim and responsive compact grids', () => {
    const css = fs.readFileSync('web/styles/app.css', 'utf8');
    assert.match(css, /\.test-sheet-layer/);
    assert.match(css, /\.test-sheet-scrim/);
    assert.match(css, /\.test-sheet__visual/);
    assert.match(css, /\.test-attempt-group/);
    assert.match(css, /@media \(min-width: 760px\)/);
    assert.match(css, /@media \(max-width: 759px\)/);
  });
  ```

- [ ] **Step 2: Run focused tests and confirm they fail.**

  Run: `node --test tests/service-worker.test.js tests/xsteam-theme.test.js`

- [ ] **Step 3: Add the sheet visual system at the end of `app.css`.**

  Required behavior:

  ```css
  .test-sheet-layer { position:fixed; z-index:60; inset:0; display:grid; place-items:center; padding:24px; }
  .test-sheet-scrim { position:absolute; inset:0; border:0; border-radius:0; background:#020705ba; }
  .test-sheet { position:relative; width:min(920px, 100%); max-height:calc(100dvh - 48px); overflow:auto; padding:22px; border:1px solid var(--border); border-radius:22px; background:var(--surface-card); box-shadow:0 28px 80px #000b; }
  .test-sheet__intro { display:grid; grid-template-columns:minmax(220px, .8fr) minmax(0, 1fr); gap:18px; }
  .test-sheet__visual { aspect-ratio:4 / 3; display:grid; place-items:center; margin:0; border:1px dashed #426258; border-radius:16px; color:var(--text-secondary); background:var(--surface-overlay); text-align:center; }
  .test-attempt-group { display:grid; grid-template-columns:repeat(2, minmax(0, 1fr)); gap:10px; }
  .compact-number-field input { min-height:48px; text-align:center; }
  ```

  Add `.test-summary-card` with 68 px minimum height, state border, secondary summary and visible “Abrir ›”. On desktop keep visual left and attempt pairs side-by-side. Under 759 px, align the layer at the bottom, make the sheet near-full-height with top corners, collapse intro and attempt groups to one column when necessary, and keep the sync dock visually behind the sheet. Add sheet/scrim transitions using only opacity/transform, while the global reduced-motion rule continues to remove them.

- [ ] **Step 4: Update service worker cache and asset list.**

  ```js
  const CACHE = 'avaliacao-idosos-v16';
  // Add './js/test-inputs.js' and './js/views/test-sheet.js' to ASSETS.
  ```

  Do not alter the existing Apps Script GET bypass or fetch strategy.

- [ ] **Step 5: Run complete verification and manual acceptance.**

  Run: `npm test && node --check web/js/test-inputs.js && node --check web/js/views/test-sheet.js && node --check web/js/views/assessment-editor.js && git diff --check`

  Manually confirm, at mobile and desktop widths:

  1. opening a test leaves the assessment behind the translucent scrim;
  2. image placeholder is left on desktop and top on mobile;
  3. Escape, close, scrim and mobile back restore the opening card and preserve values;
  4. no network request is triggered by typing or closing the sheet;
  5. a complete assessment continues to save and synchronize through the existing global buttons.

- [ ] **Step 6: Commit final styles and PWA cache.**

  ```bash
  git add web/styles/app.css web/sw.js tests/xsteam-theme.test.js tests/service-worker.test.js
  git commit -m "style: add responsive xsteam test sheets"
  ```

## Final Delivery

- [ ] Confirm `git status --short --branch` contains no unintended tracked changes and do not add unrelated context files.
- [ ] Run `npm test` after the final commit.
- [ ] Push implementation commits to `master` only when the user authorizes deployment, then confirm the published service worker exposes cache `avaliacao-idosos-v16`.
