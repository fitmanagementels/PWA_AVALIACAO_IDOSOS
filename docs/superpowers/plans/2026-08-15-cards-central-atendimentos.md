# Cards da Central de Atendimentos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir a tabela contínua da Central de Atendimentos por cards individuais, com identidade, estado e ação claramente associados a cada pessoa.

**Architecture:** `attendanceRowMarkup` continuará recebendo os mesmos itens de `buildAttendanceItems`, mas emitirá a composição de card em vez de uma linha de tabela. O CSS substituirá o contêiner tabular por uma pilha com espaços entre cards e adaptará o interior de cada card de uma coluna no mobile para duas áreas no desktop. Não haverá alteração nas requisições, fila local, atributos `data-*` nem funções de navegação.

**Tech Stack:** JavaScript ES modules, CSS responsivo, Node test runner.

## Global Constraints

- Tema dark XSTEAM; `#E2FF42` apenas em CTA principal e foco visível.
- Mobile em coluna única, sem rolagem horizontal e alvos de toque de no mínimo 48px.
- Não alterar os contratos de `buildAttendanceItems`, API, IndexedDB ou atributos de ação existentes.
- Não criar chamadas extras ao backend.

---

### Task 1: Cards operacionais da lista de atendimentos

**Files:**
- Modify: `tests/people-ui.test.js`
- Modify: `web/js/views/people.js:82-88`
- Modify: `web/styles/app.css:69-104`

**Interfaces:**
- Consumes: `attendanceRowMarkup({ person, kind, draft, history })` e seus atributos `data-id`, `data-resume-id`, `data-remote-resume-id` e `data-start-id`.
- Produces: markup `.attendance-card`, `.attendance-card__identity` e `.attendance-card__next-step`, mantendo os mesmos destinos de clique.

- [x] **Step 1: Write the failing test**

```js
test('renders each attendance as a separated operational card', () => {
  assert.match(source, /class="attendance-card"/);
  assert.match(source, /attendance-card__identity/);
  assert.match(source, /attendance-card__next-step/);
  assert.doesNotMatch(source, /class="attendance-row"/);
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `node --test tests/people-ui.test.js`

Expected: FAIL because `attendanceRowMarkup` still emits `attendance-row`.

- [x] **Step 3: Write minimal implementation**

```js
function attendanceCardMarkup(person, nextStep) {
  return `<article class="attendance-card">
    <button class="attendance-card__identity" data-id="${person.id}">…</button>
    <div class="attendance-card__next-step">${nextStep}</div>
  </article>`;
}
```

Replace each branch of `attendanceRowMarkup` with this structure while retaining the pre-existing action data attributes and labels.

- [x] **Step 4: Apply responsive card surfaces**

```css
.attendance-directory { border:0; background:transparent; box-shadow:none; }
.attendance-directory__list { gap:12px; }
.attendance-card { display:grid; overflow:hidden; border:1px solid var(--border); border-radius:16px; background:var(--surface-card); }
.attendance-card__identity { min-height:92px; display:grid; gap:7px; padding:18px; text-align:left; }
.attendance-card__next-step { display:grid; gap:10px; padding:14px 18px 18px; border-top:1px solid var(--border); }
@media (min-width:760px) { .attendance-card { grid-template-columns:minmax(0, 1.1fr) minmax(290px, .9fr); } .attendance-card__next-step { border-top:0; border-left:1px solid var(--border); } }
```

- [x] **Step 5: Run focused tests**

Run: `node --test tests/people-ui.test.js tests/xsteam-theme.test.js`

Expected: PASS.

- [x] **Step 6: Run regression suite and inspect whitespace**

Run: `git diff --check && npm test`

Expected: no whitespace errors and all tests PASS.

- [ ] **Step 7: Commit**

```bash
git add web/js/views/people.js web/styles/app.css tests/people-ui.test.js docs/superpowers/plans/2026-08-15-cards-central-atendimentos.md
git commit -m "feat: organize attendance directory into cards"
```
