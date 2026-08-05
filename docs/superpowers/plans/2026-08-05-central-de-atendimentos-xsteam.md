# Central de Atendimentos XSTEAM Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the initial people screen into an XSTEAM “Central de atendimentos” that makes a person, a local draft, and the next clinical action easy to find, while improving the assessment and history flows without inventing clinical data.

**Architecture:** Keep `people.js` as the public route entry point used by `app.js`. Add small, pure presentation helpers for the attendance directory and history month groups; the view consumes only people already loaded, local drafts, and history already cached for that person. Preserve the existing navigation token guard on every asynchronous route, and use the service-worker cache only for versioned static assets.

**Tech Stack:** Vanilla ES modules, HTML/CSS, localStorage, Google Apps Script API through the existing client, Node built-in test runner, GitHub Pages PWA.

## Global Constraints

- Preserve the public routes and function signatures consumed by `web/js/app.js`.
- Do not add a global “Avaliar” navigation entry, KPI dashboard, readiness score, category, protocol, patient image, or any clinical status that is not present in the current data.
- A draft shown in the central is only a local record with `status === 'rascunho'`; it must be resumed through the existing editor path.
- A previous assessment shown in the central is only derived from `history-cache.js`. Do not issue extra network requests when rendering the central.
- Keep `startNavigation`, `isCurrentNavigation`, and `isCurrentPage`. An asynchronous response may update the DOM only while its initiating route is still active.
- Maintain custom XSTEAM select controls; no native visible `<select>` element should reappear for app selections.
- Keep mobile touch targets at least 48 px and honor `prefers-reduced-motion`.
- When static modules change, add them to the service worker precache and increment the cache name from the current `avaliacao-idosos-v13`.

---

## File Map

| File | Responsibility |
| --- | --- |
| `web/js/views/attendance-center.js` | Pure derivation of each attendance item from person, local drafts, and cached history. |
| `web/js/views/history.js` | Pure month-grouping helper for the existing chronology. |
| `web/js/views/people.js` | Route markup and events for central, assessment selection, and history timeline. |
| `web/styles/app.css` | XSTEAM visual hierarchy, responsive directory, session cards, and sticky valid action. |
| `web/sw.js` | Versioned precache manifest. |
| `tests/attendance-center.test.js` | Unit coverage for derived summaries; no invented status. |
| `tests/history.test.js` | Unit coverage for chronological month groups. |
| `tests/people-ui.test.js` | Static integration assertions for central markup and guarded route behavior. |
| `tests/service-worker.test.js` | Precache/version regression assertions. |

## Task 1: Build the derived attendance and timeline data model

**Files:**

- Create: `web/js/views/attendance-center.js`
- Modify: `web/js/views/history.js`
- Create: `tests/attendance-center.test.js`
- Modify: `tests/history.test.js`

- [ ] **Step 1: Write failing tests for local draft priority and cached history fallback.**

  Add `tests/attendance-center.test.js` with a real person and the two only allowed signals: a local draft and a cached historical item.

  ```js
  import test from 'node:test';
  import assert from 'node:assert/strict';
  import { buildAttendanceItems } from '../web/js/views/attendance-center.js';

  test('prioritizes the newest local draft without creating a clinical status', () => {
    const [item] = buildAttendanceItems(
      [{ id: 'p-1', name: 'Ana', sex: 'feminino' }],
      [
        { id: 'old', personId: 'p-1', status: 'rascunho', updatedAt: '2026-08-01T10:00:00Z' },
        { id: 'new', personId: 'p-1', status: 'rascunho', updatedAt: '2026-08-02T10:00:00Z' },
      ],
      { 'p-1': [{ assessmentId: 'saved', date: '2026-07-20', status: 'concluido' }] },
    );

    assert.equal(item.kind, 'draft');
    assert.equal(item.draft.id, 'new');
    assert.equal(item.history, null);
  });

  test('uses only the latest cached history when no local draft exists', () => {
    const [item] = buildAttendanceItems(
      [{ id: 'p-2', name: 'Bia' }],
      [],
      { 'p-2': [
        { assessmentId: 'older', date: '2026-06-10', status: 'concluido' },
        { assessmentId: 'latest', date: '2026-07-10', status: 'rascunho' },
      ] },
    );

    assert.equal(item.kind, 'history');
    assert.equal(item.history.assessmentId, 'latest');
  });
  ```

  Extend `tests/history.test.js` with grouped chronological data:

  ```js
  import { groupHistoryByMonth } from '../web/js/views/history.js';

  test('groups an already sorted history by visible month without changing chronology', () => {
    const groups = groupHistoryByMonth([
      { assessmentId: 'a', date: '2026-08-04' },
      { assessmentId: 'b', date: '2026-08-01' },
      { assessmentId: 'c', date: '2026-07-31' },
    ]);

    assert.deepEqual(groups.map(group => group.key), ['2026-08', '2026-07']);
    assert.deepEqual(groups[0].items.map(item => item.assessmentId), ['a', 'b']);
  });
  ```

- [ ] **Step 2: Run the focused test command and confirm it fails because the helpers do not exist.**

  Run: `node --test tests/attendance-center.test.js tests/history.test.js`

  Expected: import failures for `attendance-center.js` and/or `groupHistoryByMonth`.

- [ ] **Step 3: Implement pure helpers with deterministic sorting.**

  Create `web/js/views/attendance-center.js`:

  ```js
  function newest(items, field) {
    return [...items].sort((left, right) => String(right[field] || '').localeCompare(String(left[field] || '')))[0] || null;
  }

  export function buildAttendanceItems(people, assessments, historiesByPerson) {
    return people.map(person => {
      const draft = newest(
        assessments.filter(item => item.personId === person.id && item.status === 'rascunho'),
        'updatedAt',
      );
      const history = newest(historiesByPerson[person.id] || [], 'date');

      return {
        person,
        kind: draft ? 'draft' : history ? 'history' : 'empty',
        draft,
        history: draft ? null : history,
      };
    });
  }
  ```

  Add this export to `web/js/views/history.js`, preserving its existing `historyTimeline` export:

  ```js
  export function groupHistoryByMonth(items) {
    return items.reduce((groups, item) => {
      const key = String(item.date || '').slice(0, 7) || 'sem-data';
      const current = groups[groups.length - 1];
      if (current?.key === key) {
        current.items.push(item);
      } else {
        groups.push({ key, items: [item] });
      }
      return groups;
    }, []);
  }
  ```

  `groupHistoryByMonth` deliberately assumes `historyTimeline` has already sorted the records. This prevents a second, potentially divergent sort.

- [ ] **Step 4: Run the focused tests and the full suite.**

  Run: `node --test tests/attendance-center.test.js tests/history.test.js && npm test`

  Expected: all tests pass.

- [ ] **Step 5: Commit the data-model slice.**

  ```bash
  git add web/js/views/attendance-center.js web/js/views/history.js tests/attendance-center.test.js tests/history.test.js
  git commit -m "feat: derive attendance center summaries"
  ```

## Task 2: Render the Central de atendimentos without new API reads

**Files:**

- Modify: `web/js/views/people.js`
- Create: `tests/people-ui.test.js`

- [ ] **Step 1: Write static integration tests before changing the route markup.**

  Create `tests/people-ui.test.js` and validate the contract at the boundary where the existing view remains intentionally DOM-oriented:

  ```js
  import test from 'node:test';
  import assert from 'node:assert/strict';
  import { readFileSync } from 'node:fs';

  const source = readFileSync(new URL('../web/js/views/people.js', import.meta.url), 'utf8');

  test('people route is the central de atendimentos and has search plus creation actions', () => {
    assert.match(source, /Central de atendimentos/);
    assert.match(source, /Buscar pessoa/);
    assert.match(source, /Nova pessoa/);
  });

  test('central derives summaries locally and keeps the people navigation token', () => {
    assert.match(source, /buildAttendanceItems/);
    assert.match(source, /startNavigation\('people'\)/);
    assert.match(source, /data-resume-id/);
  });
  ```

- [ ] **Step 2: Run the new test and confirm it fails.**

  Run: `node --test tests/people-ui.test.js`

  Expected: assertions fail because the current screen still calls itself only “Pessoas” and has no attendance summary.

- [ ] **Step 3: Integrate the pure model into `renderPeople`.**

  At the import block, add:

  ```js
  import { buildAttendanceItems } from './attendance-center.js';
  import { readHistoryCache } from '../history-cache.js';
  ```

  In `renderPeople(root)`, retain `startNavigation('people')` as its first operational action. Build the inputs only from memory/local storage; do not call `api`:

  ```js
  const people = read();
  const assessments = Object.keys(localStorage)
    .filter(key => key.startsWith('assessment:'))
    .map(key => JSON.parse(localStorage.getItem(key)))
    .filter(Boolean);
  const historiesByPerson = Object.fromEntries(
    people.map(person => [person.id, readHistoryCache(localStorage, person.id)]),
  );
  const attendance = buildAttendanceItems(people, assessments, historiesByPerson);
  ```

  Replace the current screen title/list section with this semantic structure, keeping the existing `data-new`, `data-person-search`, and `data-id` event contracts:

  ```html
  <section class="attendance-hero" aria-labelledby="attendance-title">
    <p class="eyebrow">CENTRAL DE ATENDIMENTOS</p>
    <div class="attendance-hero__heading">
      <div>
        <h1 id="attendance-title">Atendimentos</h1>
        <p>Localize uma pessoa ou retome um registro deste aparelho.</p>
      </div>
      <button class="primary" type="button" data-new>Nova pessoa</button>
    </div>
    <label class="search-field"><span class="sr-only">Buscar pessoa</span>
      <input type="search" data-person-search placeholder="Buscar pessoa" autocomplete="off">
    </label>
  </section>
  <section class="attendance-directory" aria-label="Pessoas cadastradas">
    <div class="attendance-directory__header"><span>Pessoa</span><span>Próximo passo</span></div>
    <div class="attendance-directory__list" data-attendance-list></div>
  </section>
  ```

  Render each item as an entire keyboard-accessible `<button class="attendance-row" data-id="…">`. It must show only:

  - the existing name and concise birth/sex profile;
  - `Retomar rascunho` and a local-only description when `kind === 'draft'`, plus `data-resume-id` on the inner action;
  - the date/status from the cached history when `kind === 'history'`;
  - `Iniciar nova avaliação` when `kind === 'empty'`.

  Never show counts, readiness, score, or a “clinical status”. In the click handler, check `[data-resume-id]` before generic `[data-id]` so retaking the draft invokes `resumeLatestDraft(root, person)` rather than changing route by accident. Search filters the already built `attendance` array and does not perform a request.

- [ ] **Step 4: Keep existing person detail behavior intact.**

  Leave the generic row click navigation to `renderPerson(root, person)`, which retains “Nova avaliação”, “Retomar rascunho”, and “Histórico”. The central is a faster entry point, not a second competing workflow.

- [ ] **Step 5: Run integration tests and the suite.**

  Run: `node --test tests/people-ui.test.js && npm test`

  Expected: the old person route, form, edit, and history tests remain green.

- [ ] **Step 6: Commit the central route slice.**

  ```bash
  git add web/js/views/people.js tests/people-ui.test.js
  git commit -m "feat: add xsteam attendance center"
  ```

## Task 3: Improve the session-selection and history hierarchy using existing data

**Files:**

- Modify: `web/js/views/people.js`
- Modify: `web/js/views/selection-controls.js`
- Modify: `tests/people-ui.test.js`
- Modify: `tests/selection-controls.test.js`

- [ ] **Step 1: Add failing tests for the valid-selection state.**

  Add a pure helper to `selection-controls.js` so its behavior is testable without a browser DOM:

  ```js
  export function selectionActionState(selectedCount) {
    return {
      selectedCount,
      isReady: selectedCount > 0,
      label: selectedCount ? `Iniciar avaliação (${selectedCount})` : 'Selecione ao menos um teste',
    };
  }
  ```

  In `tests/selection-controls.test.js`:

  ```js
  test('only marks the primary assessment action ready after a test is selected', () => {
    assert.deepEqual(selectionActionState(0), {
      selectedCount: 0,
      isReady: false,
      label: 'Selecione ao menos um teste',
    });
    assert.equal(selectionActionState(2).isReady, true);
  });
  ```

  Extend `people-ui.test.js` to assert that `people.js` calls `groupHistoryByMonth` and gives the submit control a stable `data-selection-ready` state.

- [ ] **Step 2: Run focused tests and confirm the new expectations fail.**

  Run: `node --test tests/selection-controls.test.js tests/people-ui.test.js`

- [ ] **Step 3: Update the assessment selection interaction.**

  Refactor `bindSelectionSummary` to consume `selectionActionState(count)`. On every checkbox change it must:

  ```js
  const state = selectionActionState(count);
  button.textContent = state.label;
  button.dataset.selectionReady = String(state.isReady);
  button.disabled = !state.isReady;
  ```

  In the start-assessment markup, keep the current card inputs and labels so `FormData` keeps working. Add a session subtitle under the professional selector, give the selection list a visual heading/count target, and keep the same submit action. Do not add classifications or test categories.

- [ ] **Step 4: Render cached history as a readable month timeline.**

  Import `groupHistoryByMonth` beside the existing timeline/filter helpers. After `historyTimeline` and `filterHistory`, group the items and render:

  ```html
  <section class="history-timeline" aria-label="Avaliações anteriores">
    <h2 class="history-month">Agosto de 2026</h2>
    <button class="history-entry" type="button" data-history-id="…">
      <strong>04/08/2026</strong>
      <span>Profissional · rascunho · 2 testes</span>
      <span class="history-entry__tests">Back Scratch · SPPB</span>
    </button>
  </section>
  ```

  The visible month text uses `Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' })` from each group key. Keep the custom test filter (`bindXsteamSelects`), its active value, existing `data-history-id` events, and all `isCurrentNavigation(navigation)` checks. The timeline must be an alternate presentation of the same history array, not a new endpoint.

- [ ] **Step 5: Run focused and full tests.**

  Run: `node --test tests/selection-controls.test.js tests/people-ui.test.js tests/history.test.js && npm test`

  Expected: all pass.

- [ ] **Step 6: Commit the interaction slice.**

  ```bash
  git add web/js/views/people.js web/js/views/selection-controls.js tests/people-ui.test.js tests/selection-controls.test.js
  git commit -m "feat: refine assessment and history flow"
  ```

## Task 4: Apply the premium XSTEAM responsive system and renew offline assets

**Files:**

- Modify: `web/styles/app.css`
- Modify: `web/sw.js`
- Modify: `tests/service-worker.test.js`
- Modify: `tests/people-ui.test.js`

- [ ] **Step 1: Add failing regression assertions for the new static asset and cache version.**

  In `tests/service-worker.test.js`, change the expected cache to `avaliacao-idosos-v14` and add:

  ```js
  assert.match(source, /\.\/js\/views\/attendance-center\.js/);
  ```

  In `people-ui.test.js`, assert the central CSS hooks exist in the stylesheet source (`attendance-hero`, `attendance-row`, and `history-timeline`).

- [ ] **Step 2: Run the affected tests and confirm they fail.**

  Run: `node --test tests/service-worker.test.js tests/people-ui.test.js`

- [ ] **Step 3: Add scoped visual rules at the end of `app.css`.**

  Use the existing XSTEAM tokens and append a component block rather than rewriting unrelated styles. The required behavior is:

  ```css
  .attendance-hero { display:grid; gap:16px; margin-block:8px 24px; }
  .attendance-hero__heading { display:flex; align-items:end; justify-content:space-between; gap:16px; }
  .attendance-directory { border:1px solid var(--line); border-radius:20px; background:var(--surface-2); overflow:hidden; }
  .attendance-row { width:100%; min-height:72px; display:grid; grid-template-columns:minmax(0,1fr) auto; gap:12px; text-align:left; }
  .attendance-row:focus-visible, .history-entry:focus-visible { outline:3px solid var(--lime); outline-offset:-3px; }
  .test-option { min-height:64px; }
  .history-timeline { display:grid; gap:10px; }
  ```

  Complete the block with:

  - `48px` minimum height for every interactive attendance row, history entry, selection card, and primary action;
  - opaque four-level dark surfaces, restrained borders, no glossy gradients or decorative shadows;
  - lime only for the main CTA, focus, selected test card, active dot, and very compact eyebrow;
  - selected test cards with an obvious check state and border, while untouched cards stay calm;
  - `.assessment-submit[data-selection-ready="true"]` sticky only on small screens, above the sync dock; not sticky while invalid;
  - a `@media (min-width: 760px)` directory header and aligned two-column row layout; mobile hides only the redundant header, not information;
  - a `@media (max-width: 759px)` single-column row layout; no horizontal scrolling;
  - `@media (prefers-reduced-motion: reduce)` disables only nonessential transitions.

  Use the actual current CSS custom-property names. If `--surface-2` or `--line` does not exist, reference their existing equivalent instead of introducing an unconnected token.

- [ ] **Step 4: Update the service worker manifest.**

  Change only the version and required asset list:

  ```js
  const CACHE = 'avaliacao-idosos-v14';
  // add './js/views/attendance-center.js' to ASSETS
  ```

  Do not cache live API requests as static files and do not change the current network strategy for the Apps Script endpoint.

- [ ] **Step 5: Run full verification.**

  Run: `npm test`

  Then serve `web/` locally and manually verify at mobile and desktop widths:

  1. Central loads from existing bootstrapped people without a second API call.
  2. Search, `Nova pessoa`, row selection, and draft resume follow the existing routes.
  3. A selected test enables and pins the assessment action; clearing it disables/unpins it.
  4. History selection filter remains active after opening and returning from a detail.
  5. Navigate away while the history/detail request is pending; its late response does not overwrite the current screen.
  6. Reload after deploy and confirm the service worker fetches `v14` rather than serving the old shell.

- [ ] **Step 6: Commit the finishing slice.**

  ```bash
  git add web/styles/app.css web/sw.js tests/service-worker.test.js tests/people-ui.test.js
  git commit -m "style: polish xsteam attendance experience"
  ```

## Final Verification and Delivery

- [ ] Run `git status --short --branch`; confirm only intentional changes are present and do not add unrelated context files.
- [ ] Run `npm test` from a clean working tree after the final commit.
- [ ] Verify GitHub Pages after the push with a hard refresh/service-worker update, using existing people, one local draft, and one cached/synced history record.
- [ ] Push only the committed implementation to `master` when the user authorizes deployment, then report the resulting commit and the behavior verified.
