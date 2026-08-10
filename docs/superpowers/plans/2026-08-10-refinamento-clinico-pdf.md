# Refinamento clínico do PDF A5 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tornar o relatório A5 mais compacto, semanticamente correto e clinicamente legível, sem alterar os dados persistidos nem o fluxo de exportação.

**Architecture:** O modelo de relatório passará a distinguir valor técnico, unidade de exibição e classificação disponível. A view omitirá rótulos vazios, usará cópias breves no resumo e preservará tentativas identificadas por ordem somente no detalhamento. O CSS deixará a paginação fluir por cartão, não por domínio ou página fixa.

**Tech Stack:** ES modules nativos, CSS de impressão A5 e Node built-in test runner.

## Global Constraints

- SPPB exibe tempos em segundos para caminhada de 4 m, sentar e levantar e equilíbrio; não chamar esses dados de `score`.
- O PDF não cria classificação clínica quando não existe referência cadastrada.
- O resumo não mostra etiqueta de referência ausente; o detalhamento mostra classificação somente quando há uma classificação real.
- Tentativas ficam somente no detalhamento, identificadas como `1ª`, `2ª` e assim por diante.
- O resumo mantém o valor oficial de cada teste e usa `D`/`E` apenas como abreviações bilaterais.
- A impressão continua A5 em retrato, sem interface do PWA, e cartões não podem ser cortados entre páginas.
- A paginação não pode forçar quebra após o resumo nem impedir a quebra entre cartões de um mesmo domínio.

---

### Task 1: Corrigir o modelo clínico de exibição

**Files:**
- Modify: `web/js/report-model.js`
- Modify: `tests/report-model.test.js`

**Interfaces:**
- Consumes: os formatos local e remoto já aceitos por `buildReportModel`.
- Produces: cartões resumidos com `classification: null` quando não há referência; lados SPPB com unidade `s`; tentativas como `{ order, value }`; `summary.hasBilateral`.

- [ ] **Step 1: Write the failing model tests**

```js
test('presents SPPB components as seconds instead of a generic score', () => {
  const model = buildReportModel({
    person: { name: 'Maria', birthDate: '1954-01-01' }, assessment: { date: '2026-08-01' },
    results: [{ testId: 'sppb', status: 'concluido', unit: 'score', officialBySide: { caminhada4m: 4.43, sentarLevantar5x: 7.56, equilibrio: 10 } }],
    includedTestIds: ['sppb']
  });
  assert.equal(model.summary.cards[0].value.includes('score'), false);
  assert.deepEqual(model.technical.domains[0].tests[0].sides.map((side) => side.unit), ['s', 's', 's']);
});

test('does not create a reference badge when no classification exists', () => {
  const model = buildReportModel({ person: {}, assessment: {}, results: [{ testId: 'step-2min', status: 'concluido', officialValue: 80, unit: 'elevações' }], includedTestIds: ['step-2min'] });
  assert.equal(model.summary.cards[0].classification, null);
});
```

- [ ] **Step 2: Run the report model tests and confirm RED**

Run: `node --test tests/report-model.test.js`

Expected: FAIL because the current model emits `score` and `Sem referência cadastrada`.

- [ ] **Step 3: Implement the presentation-only normalization**

Use an SPPB side-unit map inside `report-model.js`, return `null` for absent classifications, and map attempts to explicit order/value objects. Do not modify `assessmentForSave`, Apps Script sheets or the raw stored unit.

- [ ] **Step 4: Run the focused model test and confirm GREEN**

Run: `node --test tests/report-model.test.js`

Expected: PASS.

### Task 2: Compactar a prévia e fazer a paginação fluir

**Files:**
- Modify: `web/js/views/report-preview.js`
- Modify: `web/styles/report.css`
- Modify: `tests/report-preview.test.js`

**Interfaces:**
- Consumes: o novo `buildReportModel` com classificações opcionais e tentativas ordenadas.
- Produces: resumo sem rótulo nulo, legenda bilateral quando necessária e cartões técnicos com tentativas legíveis; stylesheet sem quebra forçada de resumo ou de domínio inteiro.

- [ ] **Step 1: Write failing markup and print contract tests**

```js
test('preview omits absent classification labels and names ordered attempts', () => {
  const source = fs.readFileSync('web/js/views/report-preview.js', 'utf8');
  assert.match(source, /test\.classification \? /);
  assert.match(source, /attempt\.order/);
});

test('print CSS lets sections flow while preserving individual cards', () => {
  const css = fs.readFileSync('web/styles/report.css', 'utf8');
  assert.doesNotMatch(css, /\.report-summary\s*\{\s*break-after:\s*page/);
  assert.doesNotMatch(css, /\.report-domain\s*\{[^}]*break-inside:\s*avoid/);
  assert.match(css, /\.report-technical-card[^}]*break-inside:\s*avoid/);
});
```

- [ ] **Step 2: Run the preview tests and confirm RED**

Run: `node --test tests/report-preview.test.js`

Expected: FAIL because the current view always renders a classification and the CSS forces the unwanted breaks.

- [ ] **Step 3: Implement compact presentation and adaptive print CSS**

Render a classification pill only for non-empty values. Use concise SPPB copy in summary, `Resultado` for a single-side test, explicit ordinal attempts in technical cards, and the small `D = direita · E = esquerda` legend only when bilateral tests exist. Reduce print-only cover, headings, padding and card heights; remove `break-after: page` from the summary and `break-inside: avoid` from domains; retain it for cards and headings.

- [ ] **Step 4: Run preview tests and inspect generated output**

Run: `node --test tests/report-preview.test.js && npm test`

Expected: all tests PASS.

### Task 3: Entrega e validação visual

**Files:**
- Verify only: `web/js/report-model.js`, `web/js/views/report-preview.js`, `web/styles/report.css`

- [ ] **Step 1: Verify static constraints**

Run: `grep -nE "score|break-after:page|report-domain.*break-inside|attempt\.order|A5 portrait" web/js/report-model.js web/js/views/report-preview.js web/styles/report.css`

Expected: no rendering occurrence of generic SPPB `score`, no forced summary/domain pagination, ordinal attempts and A5 print rules present.

- [ ] **Step 2: Run full automated suite**

Run: `npm test`

Expected: PASS with zero failures.

- [ ] **Step 3: Commit the refinement**

```bash
git add web/js/report-model.js web/js/views/report-preview.js web/styles/report.css tests/report-model.test.js tests/report-preview.test.js docs/superpowers/plans/2026-08-10-refinamento-clinico-pdf.md
git commit -m "fix: refine clinical A5 report presentation"
```
