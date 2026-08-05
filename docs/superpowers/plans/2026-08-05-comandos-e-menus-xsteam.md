# Comandos e menus XSTEAM Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir os menus nativos do PWA por menus XSTEAM acessíveis, adicionar a assinatura visual da marca e tornar histórico e comandos mais claros sem modificar contratos clínicos ou de sincronização.

**Architecture:** Um módulo novo, `xsteam-select.js`, renderiza e controla o menu próprio, mantendo um único `input type="hidden"` com o nome e valor que os formulários atuais consomem. As views chamam o módulo para sexo, profissional e filtro do histórico; a view de histórico mantém o filtro ao abrir e voltar de uma avaliação. A barra continua estática em `index.html`, com marca e a ação de sincronização existente.

**Tech Stack:** HTML sem framework, JavaScript ES modules, CSS responsivo, Service Worker, Node.js `node:test` e Google Apps Script já existente (não modificado).

## Global Constraints

- Não alterar nomes de campos, valores, `FormData`, filas IndexedDB, chamadas `request`, schema das planilhas ou Apps Script.
- Não adicionar bibliotecas, busca, categorias, multiseleção ou carregamento remoto de opções.
- Usar a logo enviada, sem redesenho nem filtros, em `web/icons/xsteam-mark.svg`.
- O menu abre como popover ancorado no desktop e bottom sheet dark no mobile; somente um pode ficar aberto.
- Trigger e opções têm alvo de toque mínimo de 48 px; usar foco lime, `aria-haspopup="listbox"`, `aria-expanded`, `role="listbox"` e `role="option"`.
- `Enter`/espaço, setas, `Home`, `End` e `Esc` são suportados; fechar restaura foco ao trigger.
- Animações usam apenas `transform` e `opacity`, entre 180–220 ms, e são removidas com `prefers-reduced-motion`.
- A ação clínica primária continua sendo a única ação lime por tela; voltar, filtrar e sincronizar são secundárias.

---

## File structure

- Create: `web/js/views/xsteam-select.js` — markup, validação e controlador de teclado/ponteiro do select próprio.
- Create: `tests/xsteam-select.test.js` — contrato de markup, valor do campo e texto de seleção.
- Create: `web/icons/xsteam-mark.svg` — cópia exata da logo enviada pela pessoa usuária.
- Modify: `web/index.html` — lockup XSTEAM e contexto curto na barra persistente.
- Modify: `web/js/views/people.js` — sexo, profissional, filtro do histórico e retorno com filtro preservado.
- Modify: `web/styles/app.css` — barra, cards de histórico e superfícies do menu/popover/sheet.
- Modify: `web/sw.js` — nova versão e precache da logo e do módulo.
- Modify: `tests/people.test.js` — uso dos menus nas views e retorno de histórico.
- Modify: `tests/xsteam-theme.test.js` — contrato visual de menu/sheet e foco.
- Modify: `tests/service-worker.test.js` — cache v11 e assets novos.

### Task 1: Criar o componente reutilizável de menu próprio

**Files:**
- Create: `web/js/views/xsteam-select.js`
- Create: `tests/xsteam-select.test.js`

**Interfaces:**
- Consumes: opções no formato `Array<[string, string]>` e o elemento raiz da view.
- Produces: `xsteamSelectMarkup({ id, name, label, options, value, placeholder, required, dataAttribute })`, `bindXsteamSelects(root)` e `validateXsteamSelects(form)`.
- Contract: o markup contém exatamente um `input type="hidden" name="…"`; ao escolher uma opção, ele recebe o valor e emite `change` com bubbling.

- [ ] **Step 1: Write the failing test**

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import { xsteamSelectMarkup } from '../web/js/views/xsteam-select.js';

test('renders one hidden field that preserves the form name and current value', () => {
  const markup = xsteamSelectMarkup({
    id: 'professional', name: 'professionalName', label: 'Profissional',
    options: [['', 'Selecione'], ['Elohim', 'Elohim']], value: 'Elohim', required: true
  });
  assert.match(markup, /type="hidden" name="professionalName" value="Elohim"/);
  assert.match(markup, /aria-haspopup="listbox"/);
  assert.match(markup, /role="listbox"/);
  assert.match(markup, /role="option" aria-selected="true"/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/xsteam-select.test.js`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `xsteam-select.js`.

- [ ] **Step 3: Write minimal implementation**

```js
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

export function xsteamSelectMarkup({ id, name, label, options, value = '', placeholder = 'Selecione', required = false, dataAttribute = '' }) {
  const selected = options.find(([optionValue]) => optionValue === value);
  const selectedLabel = selected?.[1] || placeholder;
  const optionsMarkup = options.map(([optionValue, optionLabel]) => `<button type="button" role="option" data-xsteam-option value="${escapeHtml(optionValue)}" aria-selected="${optionValue === value}">${escapeHtml(optionLabel)}</button>`).join('');
  return `<div class="xsteam-select" data-xsteam-select${required ? ' data-xsteam-required' : ''}><span class="xsteam-select__label" id="${escapeHtml(id)}-label">${escapeHtml(label)}</span><input type="hidden" name="${escapeHtml(name)}" value="${escapeHtml(value)}"${dataAttribute ? ` ${dataAttribute}` : ''}><button type="button" class="xsteam-select__trigger" data-xsteam-trigger aria-labelledby="${escapeHtml(id)}-label ${escapeHtml(id)}-value" aria-haspopup="listbox" aria-expanded="false"><span id="${escapeHtml(id)}-value" data-xsteam-value>${escapeHtml(selectedLabel)}</span><span aria-hidden="true">⌄</span></button><div class="xsteam-select__layer" data-xsteam-layer hidden><button class="xsteam-select__backdrop" type="button" aria-label="Fechar menu" data-xsteam-dismiss></button><div class="xsteam-select__options" role="listbox" aria-labelledby="${escapeHtml(id)}-label">${optionsMarkup}</div></div><p class="xsteam-select__error" data-xsteam-error aria-live="polite"></p></div>`;
}

export function validateXsteamSelects(form) {
  let valid = true;
  form.querySelectorAll('[data-xsteam-required]').forEach((control) => {
    const input = control.querySelector('input[type="hidden"]');
    const trigger = control.querySelector('[data-xsteam-trigger]');
    const error = control.querySelector('[data-xsteam-error]');
    const missing = !input.value;
    trigger.setAttribute('aria-invalid', String(missing));
    error.textContent = missing ? 'Selecione uma opção para continuar.' : '';
    valid &&= !missing;
  });
  return valid;
}
```

Add the following controller in the same file. It closes every other menu before opening one, sends `change` from the hidden field, and always returns focus to the trigger after a close:

```js
const controls = (root) => [...root.querySelectorAll('[data-xsteam-select]')];
const optionsFor = (control) => [...control.querySelectorAll('[data-xsteam-option]')];
const selectedIndex = (control) => Math.max(0, optionsFor(control).findIndex((option) => option.getAttribute('aria-selected') === 'true'));

function close(control, restoreFocus = true) {
  const trigger = control.querySelector('[data-xsteam-trigger]');
  control.querySelector('[data-xsteam-layer]').hidden = true;
  trigger.setAttribute('aria-expanded', 'false');
  if (restoreFocus) trigger.focus();
}

function open(root, control, index = selectedIndex(control)) {
  controls(root).filter((item) => item !== control).forEach((item) => close(item, false));
  control.querySelector('[data-xsteam-layer]').hidden = false;
  control.querySelector('[data-xsteam-trigger]').setAttribute('aria-expanded', 'true');
  optionsFor(control)[index]?.focus();
}

function choose(control, option) {
  const input = control.querySelector('input[type="hidden"]');
  const triggerValue = control.querySelector('[data-xsteam-value]');
  optionsFor(control).forEach((item) => item.setAttribute('aria-selected', String(item === option)));
  input.value = option.value;
  triggerValue.textContent = option.textContent;
  control.querySelector('[data-xsteam-trigger]').removeAttribute('aria-invalid');
  control.querySelector('[data-xsteam-error]').textContent = '';
  input.dispatchEvent(new Event('change', { bubbles: true }));
  close(control);
}

export function bindXsteamSelects(root) {
  root.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-xsteam-trigger]');
    if (trigger) return open(root, trigger.closest('[data-xsteam-select]'));
    const option = event.target.closest('[data-xsteam-option]');
    if (option) return choose(option.closest('[data-xsteam-select]'), option);
    const dismiss = event.target.closest('[data-xsteam-dismiss]');
    if (dismiss) close(dismiss.closest('[data-xsteam-select]'));
  });
  root.addEventListener('keydown', (event) => {
    const trigger = event.target.closest('[data-xsteam-trigger]');
    if (trigger && ['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(event.key)) {
      event.preventDefault();
      return open(root, trigger.closest('[data-xsteam-select]'), event.key === 'ArrowUp' ? optionsFor(trigger.closest('[data-xsteam-select]')).length - 1 : selectedIndex(trigger.closest('[data-xsteam-select]')));
    }
    const option = event.target.closest('[data-xsteam-option]');
    if (!option) return;
    const control = option.closest('[data-xsteam-select]');
    const items = optionsFor(control);
    const index = items.indexOf(option);
    if (event.key === 'Escape') { event.preventDefault(); return close(control); }
    if (['Enter', ' '].includes(event.key)) { event.preventDefault(); return choose(control, option); }
    const next = event.key === 'ArrowDown' ? index + 1 : event.key === 'ArrowUp' ? index - 1 : event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : index;
    if (next !== index) { event.preventDefault(); items[(next + items.length) % items.length]?.focus(); }
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/xsteam-select.test.js`

Expected: PASS with `1` test.

- [ ] **Step 5: Commit**

```bash
git add web/js/views/xsteam-select.js tests/xsteam-select.test.js
git commit -m "feat: add accessible xsteam select"
```

### Task 2: Integrar marca, menus e histórico preservando contexto

**Files:**
- Create: `web/icons/xsteam-mark.svg`
- Modify: `web/index.html`
- Modify: `web/js/views/people.js`
- Modify: `tests/people.test.js`

**Interfaces:**
- Consumes: `xsteamSelectMarkup`, `bindXsteamSelects` e `validateXsteamSelects` da Task 1; `PROFESSIONALS`, `TESTS`, `FormData` e `filterHistory` existentes.
- Produces: formulários que continuam emitindo `sex` e `professionalName`, e histórico que mantém `testId` ao retornar do detalhe.

- [ ] **Step 1: Write the failing tests**

```js
test('uses the reusable XSTEAM select for sex, professional and history filter', () => {
  const source = fs.readFileSync('web/js/views/people.js', 'utf8');
  assert.match(source, /xsteamSelectMarkup/);
  assert.match(source, /name: 'sex'/);
  assert.match(source, /name: 'professionalName'/);
  assert.match(source, /dataAttribute: 'data-history-test'/);
  assert.doesNotMatch(source, /<select name="sex"/);
  assert.doesNotMatch(source, /<select name="professionalName"/);
});

test('returns to the history list with the active filter after opening an assessment', () => {
  const source = fs.readFileSync('web/js/views/people.js', 'utf8');
  assert.match(source, /renderAssessmentHistory\(root, person, .*?, \(\) => renderHistoryList\(root, person, assessments, subtitle, testId\)\)/);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/people.test.js`

Expected: FAIL because the source still imports and renders native `select` elements.

- [ ] **Step 3: Write minimal integration**

Copy the supplied `User attachment.svg` byte-for-byte to `web/icons/xsteam-mark.svg`, then replace the current header with:

```html
<header class="app-header">
  <div class="brand-lockup" aria-label="XSTEAM — avaliação funcional">
    <img src="./icons/xsteam-mark.svg" width="40" height="40" alt="">
    <span><strong>XSTEAM</strong><small>Avaliação funcional</small></span>
  </div>
  <button data-sync-now class="secondary">Sincronizar</button>
</header>
```

In `people.js`, import the three Task 1 exports. Replace each native select with `xsteamSelectMarkup`: `sex` uses values `''`, `masculino`, `feminino`; `professionalName` maps `PROFESSIONALS` into `[name, name]`; and the history filter maps `TESTS` plus `['', 'Todos os testes']` and passes `dataAttribute: 'data-history-test'`. Invoke `bindXsteamSelects(root)` immediately after each view writes markup. Before reading `FormData` in the person and start submit handlers, use:

```js
if (!validateXsteamSelects(event.currentTarget)) return;
const data = new FormData(event.currentTarget);
```

Change `renderHistoryList` to accept `testId = ''`, render that selected value, register its existing `change` listener on `[data-history-test]`, and call `renderList(testId)` initially. On a history card, set `disabled`, `aria-busy="true"` and `.is-loading` while `getAssessment` is pending. Pass an `onBack` callback into `renderAssessmentHistory`; after success or error, that callback renders `renderHistoryList(root, person, assessments, subtitle, testId)`. This makes the only loading state local to the pressed card and preserves the person and filter on return.

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/people.test.js tests/xsteam-select.test.js`

Expected: PASS with all people and select tests.

- [ ] **Step 5: Commit**

```bash
git add web/icons/xsteam-mark.svg web/index.html web/js/views/people.js tests/people.test.js
git commit -m "feat: integrate xsteam commands and history filters"
```

### Task 3: Aplicar acabamento responsivo e publicar o shell offline novo

**Files:**
- Modify: `web/styles/app.css`
- Modify: `web/sw.js`
- Modify: `tests/xsteam-theme.test.js`
- Modify: `tests/service-worker.test.js`

**Interfaces:**
- Consumes: classes da Task 1 (`.xsteam-select__trigger`, `__layer`, `__options`, `__backdrop`) e header Task 2 (`.brand-lockup`).
- Produces: popover desktop e bottom sheet mobile sem aparência nativa, estados de foco/carregamento e todos os assets disponíveis offline na cache v11.

- [ ] **Step 1: Write the failing tests**

```js
test('styles XSTEAM menus as dark popovers and mobile bottom sheets', () => {
  const css = fs.readFileSync('web/styles/app.css', 'utf8');
  assert.match(css, /\.brand-lockup/);
  assert.match(css, /\.xsteam-select__trigger/);
  assert.match(css, /\.xsteam-select__options/);
  assert.match(css, /\.xsteam-select__layer\[hidden\]/);
  assert.match(css, /@media \(max-width: 600px\)/);
  assert.match(css, /min-height:\s*48px/);
  assert.match(css, /\.xsteam-select__trigger:focus-visible/);
});
```

Add this service-worker expectation:

```js
assert.match(source, /const CACHE = 'avaliacao-idosos-v11';/);
assert.match(source, /views\/xsteam-select\.js/);
assert.match(source, /icons\/xsteam-mark\.svg/);
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/xsteam-theme.test.js tests/service-worker.test.js`

Expected: FAIL because neither the new selectors nor cache v11 exist.

- [ ] **Step 3: Write minimal styling and cache update**

Add styling that keeps `.xsteam-select` relative on desktop; gives the trigger 48 px minimum height, dark `--surface-card`, chevron and lime focus; positions `__layer` under the trigger; and gives `__options` a bordered `--surface-overlay` popover with a selected option in `--surface-active` and `--focus` border. Keep the backdrop visually inert on desktop.

Inside `@media (max-width: 600px)`, make `__layer` fixed over the viewport, make `__backdrop` fill the darkened viewport, and anchor `__options` to the bottom with safe-area padding, rounded top corners and option rows of 48 px minimum. Add `.person-card.is-loading { opacity: .72; }` and a short `transform`/`opacity` transition only under `prefers-reduced-motion: no-preference`; the existing reduce block removes it.

Change the service worker exactly as follows:

```js
const CACHE = 'avaliacao-idosos-v11';
const ASSETS = [
  './', './index.html', './config.js', './styles/app.css', './js/app.js',
  './js/api-client.js', './js/storage.js', './js/sync-status.js', './js/domain.js',
  './js/date-format.js', './js/history-cache.js', './js/assessment-domain.js',
  './js/result-presentation.js', './js/sync-model.js', './js/history-domain.js',
  './js/views/people.js', './js/views/assessment-editor.js', './js/views/history.js',
  './js/views/report-selection.js', './js/views/sync-panel.js', './js/views/selection-controls.js',
  './js/views/xsteam-select.js',
  './manifest.webmanifest', './icons/icon.svg', './icons/xsteam-mark.svg'
];
```

Keep the existing activation behavior that removes every cache whose name differs from `CACHE`.

- [ ] **Step 4: Run complete verification**

Run: `npm test`

Expected: PASS with zero failures. Then serve the PWA and inspect desktop and a 390 px viewport: sex, professional and history filter use only the XSTEAM menu; `Esc` restores focus; a selected filter survives detail/back; the logo is visible; and no horizontal scrollbar appears.

- [ ] **Step 5: Commit**

```bash
git add web/styles/app.css web/sw.js tests/xsteam-theme.test.js tests/service-worker.test.js
git commit -m "style: finish xsteam command menus"
```

## Plan self-review

- Spec coverage: Task 1 implements menu contract, keyboard, validation and one-open-menu behavior; Task 2 applies it to sexo, profissional e histórico, preserves `FormData` and the history context, and adds the original logo; Task 3 implements desktop/mobile surfaces, motion, states and offline deployment.
- Scope: no backend, Sheets, Apps Script, queue or clinical-rule change is present.
- Type consistency: the three names exported by Task 1 are the exact names imported in Task 2; `data-history-test` stays on the hidden field read by the history listener.
- Placeholder scan: no placeholders, deferred implementation steps or ambiguous field names remain.
