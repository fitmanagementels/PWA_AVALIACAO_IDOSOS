# Seleção premium de testes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tornar todos os checkboxes do PWA controles XSTEAM premium, com cartões para escolhas múltiplas, toggle para “Não concluído” e feedback de contagem, sem alterar os dados enviados ou as regras clínicas.

**Architecture:** Um módulo puro de controles de seleção centraliza o HTML acessível e a cópia singular/plural para não repetir a mesma lógica nas telas de início, adição e PDF. As telas existentes continuam proprietárias dos dados e eventos de submissão; apenas chamam o módulo ao renderizar e ao receber `change`. CSS dá aparência aos inputs nativos sem removê-los da árvore de acessibilidade.

**Tech Stack:** HTML gerado em ES modules, CSS nativo, `node:test`, IndexedDB/localStorage existentes, GitHub Pages e service worker.

## Global Constraints

- Preservar `testIds`, `additionalTestIds`, `includedTestIds`, `*-not-completed` e `sppb-not-completed` com seus valores e contratos atuais.
- Não alterar regras clínicas, `buildAssessmentStart`, `addSelectedTests`, `collectResult`, `generateReport`, Apps Script ou planilha.
- Não criar categorias, chips, filtros ou classificação de testes.
- Usar `#E2FF42` apenas em ação primária, foco e estado de seleção; manter as quatro superfícies XSTEAM existentes.
- Cartões têm alvo mínimo de 52 px; toggles têm 44 px; nenhuma rolagem horizontal em mobile.
- Preservar suporte a teclado, foco visível e `prefers-reduced-motion`.

---

## File Structure

| Arquivo | Responsabilidade |
|---|---|
| `web/js/views/selection-controls.js` | HTML reutilizável de cartões/toggles e texto de contador/CTA. Não conhece dados clínicos. |
| `web/js/views/people.js` | Usa cartões e contadores na nova avaliação e no seletor de PDF; preserva submissões existentes. |
| `web/js/views/assessment-editor.js` | Usa cartões na adição de testes e toggle no estado “Não concluído”. |
| `web/styles/app.css` | Aparência, foco, mobile e motion dos novos controles. |
| `web/sw.js` | Cacheia o novo módulo por meio de uma nova versão de cache. |
| `tests/selection-controls.test.js` | Regressão do HTML, cópia e contagem dos controles reutilizáveis. |
| `tests/people.test.js` | Protege o uso de cartões/contadores nas escolhas de início e PDF. |
| `tests/assessment-editor.test.js` | Protege cartão de adição e toggle de não conclusão. |
| `tests/xsteam-theme.test.js` | Protege tokens, estados visuais e fallback de movimento. |
| `tests/service-worker.test.js` | Protege a nova versão do cache e o novo asset. |

## Task 1: Criar controles de seleção reutilizáveis

**Files:**
- Create: `web/js/views/selection-controls.js`
- Create: `tests/selection-controls.test.js`

**Interfaces:**
- Produces: `selectionCardsMarkup({ name, items, selectedIds })`, `selectionSummary(count, action)`, `bindSelectionSummary(form, options)`.
- `items` é uma lista de pares `[id, label]`; `options` contém `inputName`, `summarySelector`, `buttonSelector`, `idleLabel` e `selectedLabel`.

- [ ] **Step 1: Write the failing test**

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import { selectionCardsMarkup, selectionSummary } from '../web/js/views/selection-controls.js';

test('renders selected cards without changing checkbox names or values', () => {
  const markup = selectionCardsMarkup({
    name: 'testIds',
    items: [['sppb', 'SPPB'], ['step-2min', '2-Minute Step Test']],
    selectedIds: ['sppb']
  });
  assert.match(markup, /class="selection-card"/);
  assert.match(markup, /name="testIds" value="sppb" checked/);
  assert.match(markup, /name="testIds" value="step-2min"/);
});

test('creates singular, plural and empty selection copy', () => {
  assert.deepEqual(selectionSummary(0, 'Iniciar avaliação'), { count: 'Nenhum teste selecionado', action: 'Iniciar avaliação' });
  assert.deepEqual(selectionSummary(1, 'Gerar relatório PDF'), { count: '1 teste selecionado', action: 'Gerar relatório PDF · 1 teste' });
  assert.deepEqual(selectionSummary(3, 'Adicionar testes'), { count: '3 testes selecionados', action: 'Adicionar testes · 3 testes' });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/selection-controls.test.js`

Expected: FAIL because `selection-controls.js` does not exist.

- [ ] **Step 3: Write minimal implementation**

```js
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

export function selectionCardsMarkup({ name, items, selectedIds = [] }) {
  return items.map(([id, label]) => {
    const selected = selectedIds.includes(id);
    return `<label class="selection-card"><input class="selection-input" type="checkbox" name="${escapeHtml(name)}" value="${escapeHtml(id)}"${selected ? ' checked' : ''}><span class="selection-control" aria-hidden="true">✓</span><span>${escapeHtml(label)}</span></label>`;
  }).join('');
}

export function selectionSummary(count, action) {
  const noun = count === 1 ? 'teste' : 'testes';
  return { count: count ? `${count} ${noun} selecionado${count === 1 ? '' : 's'}` : 'Nenhum teste selecionado', action: count ? `${action} · ${count} ${noun}` : action };
}

export function bindSelectionSummary(form, { inputName, summarySelector, buttonSelector, idleLabel, selectedLabel = idleLabel }) {
  const update = () => {
    const count = form.querySelectorAll(`input[name="${inputName}"]:checked`).length;
    const copy = selectionSummary(count, count ? selectedLabel : idleLabel);
    form.querySelector(summarySelector).textContent = copy.count;
    form.querySelector(buttonSelector).textContent = copy.action;
  };
  form.addEventListener('change', update);
  update();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/selection-controls.test.js`

Expected: PASS with 2 tests.

- [ ] **Step 5: Commit**

```bash
git add web/js/views/selection-controls.js tests/selection-controls.test.js
git commit -m "feat: add reusable premium selection controls"
```

## Task 2: Aplicar cartões e contadores no início e no PDF

**Files:**
- Modify: `web/js/views/people.js`
- Modify: `tests/people.test.js`

**Interfaces:**
- Consumes: `selectionCardsMarkup` e `bindSelectionSummary` da Task 1.
- Produces: seleção inicial e de PDF visualmente premium, mantendo `FormData` e ações existentes.

- [ ] **Step 1: Write the failing test**

```js
import fs from 'node:fs';

test('uses premium selection controls for the new assessment and PDF report', () => {
  const source = fs.readFileSync('web/js/views/people.js', 'utf8');
  assert.match(source, /selectionCardsMarkup/);
  assert.match(source, /bindSelectionSummary/);
  assert.match(source, /data-selection-summary="start"/);
  assert.match(source, /data-selection-summary="report"/);
  assert.match(source, /Gerar relatório PDF ·/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/people.test.js`

Expected: FAIL because the selection module and data attributes are not yet referenced.

- [ ] **Step 3: Write minimal implementation**

Add imports in `people.js`:

```js
import { bindSelectionSummary, selectionCardsMarkup } from './selection-controls.js';
```

In `renderStart`, replace the checkbox mapping with this structure, retaining `name="testIds"` through the helper:

```js
<fieldset class="selection-group"><legend>Testes</legend>
  <p class="selection-summary" data-selection-summary="start"></p>
  <div class="selection-list">${selectionCardsMarkup({ name: 'testIds', items: TESTS })}</div>
</fieldset>
<button data-selection-action="start">Iniciar avaliação</button>
```

Immediately after selecting the form, bind it:

```js
bindSelectionSummary(form, {
  inputName: 'testIds', summarySelector: '[data-selection-summary="start"]',
  buttonSelector: '[data-selection-action="start"]',
  idleLabel: 'Iniciar avaliação'
});
```

In the PDF form, use `selectionCardsMarkup` with `name: 'includedTestIds'` and `selectedIds: selected`, add `data-selection-summary="report"` and `data-selection-action="report"`, then bind with `idleLabel: 'Gerar relatório PDF'` and `selectedLabel: 'Gerar relatório PDF'`. Preserve the existing `new FormData(event.currentTarget).getAll('includedTestIds')` call unchanged.

- [ ] **Step 4: Run tests to verify it passes**

Run: `node --test tests/people.test.js tests/selection-controls.test.js`

Expected: PASS with the existing domain tests plus the new integration assertion.

- [ ] **Step 5: Commit**

```bash
git add web/js/views/people.js tests/people.test.js
git commit -m "feat: apply premium selection to assessment and report"
```

## Task 3: Aplicar cartões de adição e toggle de não conclusão

**Files:**
- Modify: `web/js/views/assessment-editor.js`
- Modify: `tests/assessment-editor.test.js`

**Interfaces:**
- Consumes: `selectionCardsMarkup` e `bindSelectionSummary` da Task 1.
- Produces: cartão para `additionalTestIds` e toggle visual para `*-not-completed`, preservando `collectResult`.

- [ ] **Step 1: Write the failing test**

```js
test('uses premium cards for added tests and toggles for non-completed tests', () => {
  assert.match(source, /selectionCardsMarkup\(\{ name: 'additionalTestIds'/);
  assert.match(source, /data-selection-summary="additional"/);
  assert.match(source, /class="selection-toggle"/);
  assert.match(source, /name="sppb-not-completed"/);
  assert.match(source, /name="\$\{id\}-not-completed"/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/assessment-editor.test.js`

Expected: FAIL because the editor still emits `check-option` for additions and `not-completed` for native checkboxes.

- [ ] **Step 3: Write minimal implementation**

Import the helper, replace the `additionalTestIds` mapping inside `<details class="add-tests">` with a `.selection-list` generated by `selectionCardsMarkup`, and add:

```js
<p class="selection-summary" data-selection-summary="additional"></p>
<button class="secondary" type="button" data-add-tests data-selection-action="additional">Adicionar testes selecionados</button>
```

After creating `form`, call:

```js
bindSelectionSummary(form, {
  inputName: 'additionalTestIds', summarySelector: '[data-selection-summary="additional"]',
  buttonSelector: '[data-selection-action="additional"]',
  idleLabel: 'Adicionar testes selecionados', selectedLabel: 'Adicionar testes'
});
```

Replace each “Não concluído” label with this same native input/name, wrapped in a visual toggle:

```js
<label class="selection-toggle"><input type="checkbox" name="${id}-not-completed"${checkedAttribute(inputs, `${id}-not-completed`)}><span class="toggle-track" aria-hidden="true"><span></span></span><span>Não concluído</span></label>
```

For SPPB, keep the exact name `sppb-not-completed`. Do not touch `collectResult`.

- [ ] **Step 4: Run tests to verify it passes**

Run: `node --test tests/assessment-editor.test.js tests/assessment-validation.test.js tests/selection-controls.test.js`

Expected: PASS; the existing validation cases for a missing non-completion reason remain green.

- [ ] **Step 5: Commit**

```bash
git add web/js/views/assessment-editor.js tests/assessment-editor.test.js
git commit -m "feat: style additional tests and completion toggles"
```

## Task 4: Aplicar acabamento XSTEAM responsivo aos controles

**Files:**
- Modify: `web/styles/app.css`
- Modify: `tests/xsteam-theme.test.js`

**Interfaces:**
- Consumes: classes `selection-group`, `selection-list`, `selection-card`, `selection-input`, `selection-control`, `selection-summary`, `selection-toggle` e `toggle-track` das Tasks 1–3.
- Produces: cartões/toggles acessíveis nos temas desktop e mobile.

- [ ] **Step 1: Write the failing test**

```js
test('styles premium selection cards and binary toggles accessibly', () => {
  const css = fs.readFileSync('web/styles/app.css', 'utf8');
  assert.match(css, /\.selection-card/);
  assert.match(css, /\.selection-card:has\(input:checked\)/);
  assert.match(css, /\.selection-toggle/);
  assert.match(css, /\.selection-input:focus-visible/);
  assert.match(css, /min-height:\s*52px/);
  assert.match(css, /@media \(max-width: 480px\)/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/xsteam-theme.test.js`

Expected: FAIL because these selectors do not exist.

- [ ] **Step 3: Write minimal implementation**

Add CSS that makes every card a 52 px+ flex label, hides only the visual checkbox appearance (`appearance: none`) while retaining focus, and uses `:has(input:checked)` to apply `--surface-active`, lime border and lime confirmation mark. Style `.selection-toggle` as a 44 px flex label with `.toggle-track`; `input:checked + .toggle-track` moves its thumb using `transform: translateX(...)`. Use a `@supports not selector(:has(*))` fallback that colors `.selection-input:checked` without removing functional selection. Keep all transform transitions inside the existing `prefers-reduced-motion: no-preference` block.

- [ ] **Step 4: Run tests to verify it passes**

Run: `node --test tests/xsteam-theme.test.js`

Expected: PASS with the original XSTEAM token test and the new control-state test.

- [ ] **Step 5: Commit**

```bash
git add web/styles/app.css tests/xsteam-theme.test.js
git commit -m "style: polish premium selection controls"
```

## Task 5: Disponibilizar offline, validar e publicar

**Files:**
- Modify: `web/sw.js`
- Modify: `tests/service-worker.test.js`
- Modify: `brand-visual-contract.md`

**Interfaces:**
- Consumes: novo módulo `./js/views/selection-controls.js`.
- Produces: PWA com cache de versão nova e contrato BRAND atualizado com a evidência final.

- [ ] **Step 1: Write the failing test**

```js
test('caches the premium selection module in a new application shell', () => {
  const source = fs.readFileSync('web/sw.js', 'utf8');
  assert.match(source, /const CACHE = 'avaliacao-idosos-v7';/);
  assert.match(source, /views\/selection-controls\.js/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/service-worker.test.js`

Expected: FAIL because the cache is still v6 and does not cache the helper.

- [ ] **Step 3: Write minimal implementation**

Set `const CACHE = 'avaliacao-idosos-v7';`, add `./js/views/selection-controls.js` to `ASSETS`, and update `brand-visual-contract.md` to record that `brand-criar-navegacao-interacao` and `brand-aplicar-marca-e-acabamento` were executed for this addendum. Record desktop/mobile manual validation as pending until verified after deploy.

- [ ] **Step 4: Run complete verification**

Run: `npm test && node --check web/js/views/selection-controls.js && node --check web/js/views/people.js && node --check web/js/views/assessment-editor.js && git diff --check`

Expected: exit code 0; no Node test failures, syntax errors or whitespace errors.

- [ ] **Step 5: Commit**

```bash
git add web/sw.js tests/service-worker.test.js brand-visual-contract.md
git commit -m "chore: cache premium selection controls"
```

- [ ] **Step 6: Publish and verify live PWA**

```bash
git push origin master
curl -sSL https://fitmanagementels.github.io/PWA_AVALIACAO_IDOSOS/sw.js | head -3
```

Expected: push accepted and the published service worker reports `avaliacao-idosos-v7` with `selection-controls.js` in `ASSETS`.

## Self-review

- Spec coverage: Tasks 1–3 cover all three multiple-choice lists and both non-completion checkbox variants; Task 4 covers accessibility, dark premium finish, mobile and reduced motion; Task 5 covers offline delivery and published verification.
- Varredura de pendências: não há marcadores de trabalho indefinido; cada tarefa inclui caminhos, teste inicialmente falho, comando esperado, implementação concreta e commit.
- Interface consistency: Task 1 produces `selectionCardsMarkup`, `selectionSummary` and `bindSelectionSummary`; Tasks 2 and 3 consume the first and third names exactly; Task 5 caches the exact module path created in Task 1.
