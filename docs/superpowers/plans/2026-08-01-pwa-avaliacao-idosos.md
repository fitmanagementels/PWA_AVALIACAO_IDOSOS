# PWA de Avaliações de Idosos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir uma PWA móvel conectada ao Google Sheets por Apps Script para registrar avaliações de idosos, acompanhar a evolução e exportar relatórios clínicos em PDF.

**Architecture:** O frontend é uma PWA HTML/CSS/JavaScript estática e responsiva; ele usa IndexedDB para rascunhos e uma fila de sincronização. O Apps Script é a API JSON e a única camada de escrita no Google Sheets, aplicando cálculos e validações. Resultados e tentativas são dados separados, e o PDF é gerado por Apps Script a partir do estado sincronizado de uma avaliação.

**Tech Stack:** HTML5, CSS, JavaScript ES modules, IndexedDB, Web App Manifest, Service Worker, Node.js built-in test runner, Google Apps Script V8, Google Sheets, Google Drive/Docs PDF export, clasp.

## Global Constraints

- Não criar anamnese, diagnósticos, medicamentos, IA, perfis ou permissões nesta entrega.
- A base de dados é um único Google Sheets; somente Apps Script grava nele.
- Uma avaliação pode selecionar qualquer subconjunto do catálogo; SPPB é sempre um grupo único com três componentes.
- Todas as tentativas são preservadas no histórico PWA; o PDF exibe somente o resultado oficial do protocolo.
- Uma avaliação só recebe status `concluida` após resposta de sincronização confirmada pelo servidor.
- A fila offline não expira, mas a UI deve dizer que dados pendentes podem ser perdidos se o armazenamento local for removido.
- Sem referência configurada, exibir apenas medida, sem classificação clínica.
- A tabela SPPB de sentar-levantar fica sem classificação automática até validação clínica; não inferir uma regra.
- O PDF abre com resumo em linguagem simples e segue com detalhamento técnico; notas internas nunca são exportadas.

---

## File Structure

| Caminho | Responsabilidade |
| --- | --- |
| `apps-script/00_Config.gs` | IDs, nomes das abas, cabeçalhos e constantes. |
| `apps-script/01_WebApp.gs` | `doGet`, `doPost`, roteamento e respostas JSON. |
| `apps-script/02_Repository.gs` | Leitura/escrita concorrente nas abas. |
| `apps-script/03_ClinicalRules.gs` | Cálculos puros de tentativa, idade, Step Test e SPPB. |
| `apps-script/04_Assessments.gs` | Validação e serviços de pessoa/avaliação/histórico. |
| `apps-script/05_Catalog.gs` | Seed e leitura de catálogo, protocolos e referências. |
| `apps-script/06_Report.gs` | Montagem de Google Doc e exportação PDF. |
| `apps-script/Index.html` | Casca HTML que injeta o bundle PWA. |
| `web/` | Frontend estático: HTML, CSS, módulos, manifest e service worker. |
| `web/js/api-client.js` | Cliente de API, erros e mapeamento de resposta. |
| `web/js/storage.js` | IndexedDB para rascunhos e fila pendente. |
| `web/js/domain.js` | Tipos JSDoc, validações locais e funções puras de UI. |
| `web/js/views/*.js` | Telas independentes de pessoas, avaliação, histórico e relatório. |
| `tests/*.test.js` | Testes Node para regras, contrato de payload e fila offline. |
| `tests/apps-script/*.test.js` | Testes locais de `.gs` com mocks de serviços Google. |
| `docs/deployment.md` | Criação da planilha, vinculação do script, implantação e URL do PWA. |

## Task 1: Bootstrap reprodutível e contrato de dados

**Files:**
- Create: `package.json`, `appsscript.json`, `apps-script/00_Config.gs`, `tests/config.test.js`, `docs/deployment.md`
- Modify: `.gitignore`

**Interfaces:**
- Produces `SHEETS`, `HEADERS`, `ASSESSMENT_STATUS`, `RESULT_STATUS` e o comando `npm test` usados pelas tarefas seguintes.

- [ ] **Step 1: Write the failing contract test**

```js
// tests/config.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { ASSESSMENT_STATUS, RESULT_STATUS, SHEETS } from '../shared/config.js';

test('declares the persistent entities and valid statuses', () => {
  assert.deepEqual(ASSESSMENT_STATUS, ['rascunho', 'pendenteDeSincronizacao', 'concluida']);
  assert.deepEqual(RESULT_STATUS, ['concluido', 'naoConcluido']);
  assert.deepEqual(Object.values(SHEETS), ['Pessoas', 'Profissionais', 'Avaliacoes', 'Resultados', 'Tentativas', 'CatalogoTestes', 'Referencias', 'Protocolos']);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/config.test.js`  
Expected: FAIL because `shared/config.js` does not exist.

- [ ] **Step 3: Create setup and the shared constants**

```json
// package.json
{
  "private": true,
  "type": "module",
  "scripts": { "test": "node --test", "test:watch": "node --test --watch" },
  "devDependencies": { "@google/clasp": "^2.4.2" }
}
```

```js
// shared/config.js
export const ASSESSMENT_STATUS = ['rascunho', 'pendenteDeSincronizacao', 'concluida'];
export const RESULT_STATUS = ['concluido', 'naoConcluido'];
export const SHEETS = Object.freeze({
  PEOPLE: 'Pessoas', PROFESSIONALS: 'Profissionais', ASSESSMENTS: 'Avaliacoes',
  RESULTS: 'Resultados', ATTEMPTS: 'Tentativas', CATALOG: 'CatalogoTestes',
  REFERENCES: 'Referencias', PROTOCOLS: 'Protocolos'
});
```

```js
// apps-script/00_Config.gs
const SHEETS = { PEOPLE: 'Pessoas', PROFESSIONALS: 'Profissionais', ASSESSMENTS: 'Avaliacoes', RESULTS: 'Resultados', ATTEMPTS: 'Tentativas', CATALOG: 'CatalogoTestes', REFERENCES: 'Referencias', PROTOCOLS: 'Protocolos' };
const ASSESSMENT_STATUS = ['rascunho', 'pendenteDeSincronizacao', 'concluida'];
const RESULT_STATUS = ['concluido', 'naoConcluido'];
```

Add `.clasp.json` to `.gitignore`; use `npx clasp create --type webapp --title "PWA Avaliação Idosos"` only when the spreadsheet and Google account are available. Document the generated `scriptId` in the local, ignored `.clasp.json`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/config.test.js`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add .gitignore package.json appsscript.json apps-script/00_Config.gs shared/config.js tests/config.test.js docs/deployment.md
git commit -m "chore: bootstrap elderly assessment pwa"
```

## Task 2: Catálogo, referências e regras clínicas puras

**Files:**
- Create: `shared/clinical-rules.js`, `apps-script/03_ClinicalRules.gs`, `apps-script/05_Catalog.gs`, `tests/clinical-rules.test.js`

**Interfaces:**
- Consumes: `RESULT_STATUS`.
- Produces `pickBestAttempt`, `ageOnDate`, `classifyStepTest`, `scoreGait4m`, `scoreStaticBalance` and `INITIAL_CATALOG`.

- [ ] **Step 1: Write failing boundary tests**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { pickBestAttempt, ageOnDate, scoreGait4m } from '../shared/clinical-rules.js';

test('selects the lower time and higher force as required by the test', () => {
  assert.equal(pickBestAttempt([6.2, 5.8], 'lowest'), 5.8);
  assert.equal(pickBestAttempt([20.1, 23.4], 'highest'), 23.4);
});
test('calculates age at evaluation date', () => assert.equal(ageOnDate('1954-08-02', '2026-08-01'), 71));
test('scores 4m gait without assigning the unresolved 8.70 boundary twice', () => {
  assert.equal(scoreGait4m(4.82), 4);
  assert.equal(scoreGait4m(6.2), 3);
  assert.equal(scoreGait4m(8.7), 2);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/clinical-rules.test.js`  
Expected: FAIL because the rules module does not exist.

- [ ] **Step 3: Implement exact pure rules and seed data**

```js
export function pickBestAttempt(values, direction) {
  const valid = values.filter(Number.isFinite);
  if (!valid.length) return null;
  return direction === 'lowest' ? Math.min(...valid) : Math.max(...valid);
}
export function ageOnDate(birthDate, evaluationDate) {
  const birth = new Date(`${birthDate}T00:00:00Z`); const at = new Date(`${evaluationDate}T00:00:00Z`);
  return at.getUTCFullYear() - birth.getUTCFullYear() - Number(
    at.getUTCMonth() < birth.getUTCMonth() || (at.getUTCMonth() === birth.getUTCMonth() && at.getUTCDate() < birth.getUTCDate())
  );
}
export function scoreGait4m(seconds) {
  if (!Number.isFinite(seconds)) return 0;
  if (seconds <= 4.82) return 4;
  if (seconds <= 6.2) return 3;
  if (seconds <= 8.7) return 2;
  return 1;
}
```

Seed a versioned catalog with IDs `back-scratch`, `chair-sit-reach`, `sppb`, `step-2min`, `knee-extension-isometric`, `rowing-isometric`; model SPPB children as `sppb-gait-4m`, `sppb-chair-stand-5x`, `sppb-static-balance`. Seed the seven male and seven female 2-minute Step Test ranges exactly from the source PDF. Mark sit-to-stand classification as `manualReviewRequired: true`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/clinical-rules.test.js`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add shared/clinical-rules.js apps-script/03_ClinicalRules.gs apps-script/05_Catalog.gs tests/clinical-rules.test.js
git commit -m "feat: add versioned clinical test catalog"
```

## Task 3: Planilha, repositório e API Apps Script

**Files:**
- Create: `apps-script/01_WebApp.gs`, `apps-script/02_Repository.gs`, `apps-script/04_Assessments.gs`, `tests/apps-script/web-app.test.js`

**Interfaces:**
- Consumes: `SHEETS`, catálogo e regras clínicas.
- Produces `doGet(e)`, `doPost(e)`, `savePerson(payload)`, `createAssessment(payload)`, `saveAssessment(payload)`, `completeAssessment(payload)`, `getHistory(personId)`.

- [ ] **Step 1: Write API contract tests with a mock SpreadsheetApp**

```js
test('rejects an assessment without a fixed professional', () => {
  const response = saveAssessment({ assessmentId: 'a1', professionalId: '', results: [] });
  assert.deepEqual(response, { ok: false, error: { code: 'VALIDATION_ERROR', message: 'Profissional responsável é obrigatório' } });
});
test('does not conclude while a queued revision is pending', () => {
  assert.equal(completeAssessment({ assessmentId: 'a1', syncState: 'pending' }).ok, false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/apps-script/web-app.test.js`  
Expected: FAIL because the service functions do not exist.

- [ ] **Step 3: Implement repository and dispatch**

```js
function jsonOk_(data) { return { ok: true, data: data, meta: { updatedAt: new Date().toISOString() } }; }
function jsonError_(code, message) { return { ok: false, error: { code: code, message: message } }; }
function withLock_(work) { const lock = LockService.getScriptLock(); lock.waitLock(30000); try { return work(); } finally { lock.releaseLock(); } }
function doPost(e) {
  const request = JSON.parse(e.postData.contents || '{}');
  const handlers = { savePerson, createAssessment, saveAssessment, completeAssessment, generateReport };
  return ContentService.createTextOutput(JSON.stringify((handlers[request.action] || unknownAction_)(request.payload || {}))).setMimeType(ContentService.MimeType.JSON);
}
```

Create all eight sheets on `setupSpreadsheet()` with the headers from the approved design. `saveAssessment` must validate IDs, selected test IDs, attempt units/laterality, non-concluded reasons and `ultimaAtualizacao`; it writes assessment, results and attempts inside `withLock_`. `doGet` dispatches `listPeople`, `getPerson`, `getAssessment`, `getHistory` and `getCatalog`.

- [ ] **Step 4: Run tests and create a disposable spreadsheet manually**

Run: `npm test -- tests/apps-script/web-app.test.js`  
Expected: PASS.

Run in Apps Script editor: `setupSpreadsheet()`  
Expected: the eight named tabs exist with one header row and four seeded professionals.

- [ ] **Step 5: Commit**

```bash
git add apps-script/01_WebApp.gs apps-script/02_Repository.gs apps-script/04_Assessments.gs tests/apps-script/web-app.test.js
git commit -m "feat: add sheets-backed assessment api"
```

## Task 4: PWA shell, API client and durable offline queue

**Files:**
- Create: `web/index.html`, `web/styles/app.css`, `web/js/app.js`, `web/js/api-client.js`, `web/js/storage.js`, `web/manifest.webmanifest`, `web/sw.js`, `web/icons/README.md`, `tests/storage.test.js`

**Interfaces:**
- Consumes: API response envelope `{ ok, data, meta }`.
- Produces `queueMutation`, `flushQueue`, `saveDraft`, `getDraft`, `syncStatus` custom event.

- [ ] **Step 1: Write failing queue tests**

```js
test('keeps a mutation until the server confirms it', async () => {
  await queueMutation({ id: 'm1', action: 'saveAssessment', payload: { assessmentId: 'a1' } });
  await flushQueue(async () => ({ ok: false, error: { code: 'NETWORK_ERROR' } }));
  assert.equal((await listPendingMutations()).length, 1);
  await flushQueue(async () => ({ ok: true, data: {} }));
  assert.equal((await listPendingMutations()).length, 0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/storage.test.js`  
Expected: FAIL because queue functions do not exist.

- [ ] **Step 3: Implement the shell and queue**

```js
export async function flushQueue(send) {
  for (const mutation of await listPendingMutations()) {
    const response = await send(mutation);
    if (!response.ok) return response;
    await deletePendingMutation(mutation.id);
  }
  window.dispatchEvent(new CustomEvent('syncStatus', { detail: 'synchronized' }));
  return { ok: true };
}
```

Register `sw.js`; cache only `index.html`, CSS, JavaScript, manifest and icons. Do not cache API responses. Create stores `drafts` and `mutations` in IndexedDB. The header must render `online`, `sincronizando`, `sincronizado` or `envio pendente`; include copy that a pending record must sync before conclusion.

- [ ] **Step 4: Run tests and inspect installation prerequisites**

Run: `npm test -- tests/storage.test.js`  
Expected: PASS.

Run: `npx serve web -l 4173` and inspect `http://localhost:4173` in a mobile viewport.  
Expected: manifest loads, service worker registers and offline shell loads after first visit.

- [ ] **Step 5: Commit**

```bash
git add web tests/storage.test.js
git commit -m "feat: add installable pwa shell and offline queue"
```

## Task 5: Cadastro, pessoas e criação de avaliação

**Files:**
- Create: `web/js/views/people.js`, `web/js/views/person-form.js`, `web/js/views/assessment-start.js`, `tests/people.test.js`
- Modify: `web/js/app.js`, `web/styles/app.css`

**Interfaces:**
- Consumes: `savePerson`, `listPeople`, `createAssessment`, `getCatalog`, `queueMutation`.
- Produces navigation routes `#/pessoas`, `#/pessoa/:id`, `#/avaliacao/:id`.

- [ ] **Step 1: Write failing validation and payload tests**

```js
test('creates a WhatsApp link only for a normalized number', () => {
  assert.equal(whatsAppUrl('5585999999999'), 'https://wa.me/5585999999999');
  assert.equal(whatsAppUrl(''), null);
});
test('starts an assessment with selected tests and a fixed professional', () => {
  assert.deepEqual(buildAssessmentStart({ personId: 'p1', professionalId: 'elohim', testIds: ['sppb', 'step-2min'] }), {
    personId: 'p1', professionalId: 'elohim', testIds: ['sppb', 'step-2min']
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/people.test.js`  
Expected: FAIL because helpers do not exist.

- [ ] **Step 3: Implement people flow**

```js
export function whatsAppUrl(number) { return /^\d{10,15}$/.test(number) ? `https://wa.me/${number}` : null; }
export function buildAssessmentStart({ personId, professionalId, testIds }) {
  if (!personId || !professionalId || !testIds.length) throw new Error('Selecione pessoa, responsável e ao menos um teste');
  return { personId, professionalId, testIds };
}
```

Render search, active/archived state, the five-field person form, WhatsApp link, menu with the four professionals and a multi-select catalog. Selecting `sppb` adds it as only `sppb`, never as optional individual children.

- [ ] **Step 4: Run tests and verify flow manually**

Run: `npm test -- tests/people.test.js`  
Expected: PASS.

Manual: create a person, choose Lucas, select SPPB plus Step Test, save offline, reconnect and verify exactly one assessment draft reaches `Avaliacoes`.

- [ ] **Step 5: Commit**

```bash
git add web/js/views web/js/app.js web/styles/app.css tests/people.test.js
git commit -m "feat: add people and assessment start flow"
```

## Task 6: Formulários clínicos, tentativas e edição

**Files:**
- Create: `web/js/views/test-forms.js`, `web/js/views/assessment-editor.js`, `tests/test-forms.test.js`
- Modify: `web/js/domain.js`, `web/js/app.js`, `apps-script/04_Assessments.gs`

**Interfaces:**
- Consumes: catálogo e `pickBestAttempt`.
- Produces `buildResult`, `markNotCompleted`, `validateAssessmentForSave`.

- [ ] **Step 1: Write failing form-rule tests**

```js
test('requires a reason when a selected test is not completed', () => {
  assert.throws(() => markNotCompleted({ testId: 'step-2min', reason: '' }), /motivo/);
});
test('keeps both knee-extension sides and chooses each side best kgf', () => {
  const result = buildResult({ testId: 'knee-extension-isometric', attempts: [{ side: 'right', value: 22 }, { side: 'right', value: 25 }, { side: 'left', value: 20 }] });
  assert.equal(result.officialBySide.right, 25);
  assert.equal(result.officialBySide.left, 20);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/test-forms.test.js`  
Expected: FAIL because editor helpers do not exist.

- [ ] **Step 3: Implement guided forms**

```js
export function markNotCompleted({ testId, reason }) {
  if (!reason?.trim()) throw new Error('Informe o motivo do teste não concluído');
  return { testId, status: 'naoConcluido', reason: reason.trim(), attempts: [] };
}
```

Implement form renderers for bilateral signed cm reach tests, SPPB grouped components, Step Test count, and bilateral kgf force tests. Show protocol text, familiarization/tentative count, units and calculated official value. Provide **Salvar rascunho**, **Editar testes** (adds catalog tests), internal test notes and exportable student observations. Persist every change to the local draft before API/queue submission.

- [ ] **Step 4: Run tests and verify edit scenario**

Run: `npm test -- tests/test-forms.test.js`  
Expected: PASS.

Manual: start with Back Scratch only; save; edit the same assessment; add SPPB; mark Step Test non-completed with “insegurança”; verify the saved result has no numeric classification.

- [ ] **Step 5: Commit**

```bash
git add web/js/views/test-forms.js web/js/views/assessment-editor.js web/js/domain.js web/js/app.js apps-script/04_Assessments.gs tests/test-forms.test.js
git commit -m "feat: add guided clinical assessment forms"
```

## Task 7: Histórico, análises e regras de conclusão

**Files:**
- Create: `web/js/views/history.js`, `tests/history.test.js`
- Modify: `shared/clinical-rules.js`, `apps-script/04_Assessments.gs`, `web/js/views/assessment-editor.js`

**Interfaces:**
- Consumes: `getHistory`, resultados oficiais e versões de protocolo.
- Produces `compareComparableResults(previous, current)` and history view models.

- [ ] **Step 1: Write failing comparison tests**

```js
test('compares only identical test, side, unit and protocol version', () => {
  assert.deepEqual(compareComparableResults({ testId: 'step-2min', side: null, unit: 'count', protocolVersion: 1, value: 80 }, { testId: 'step-2min', side: null, unit: 'count', protocolVersion: 1, value: 86 }), { comparable: true, delta: 6 });
  assert.equal(compareComparableResults({ testId: 'back-scratch', side: 'left', unit: 'cm', protocolVersion: 1, value: 2 }, { testId: 'back-scratch', side: 'right', unit: 'cm', protocolVersion: 1, value: 3 }).comparable, false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/history.test.js`  
Expected: FAIL because comparison is not implemented.

- [ ] **Step 3: Implement history and completion gate**

```js
export function compareComparableResults(previous, current) {
  const comparable = ['testId', 'side', 'unit', 'protocolVersion'].every((key) => previous?.[key] === current?.[key]);
  return comparable ? { comparable: true, delta: current.value - previous.value } : { comparable: false, delta: null };
}
```

Display chronological evaluations, official result, class/reference where valid, delta and warnings. Force asymmetry is a numeric difference only. Disable **Concluir avaliação** whenever `navigator.onLine` is false, queue has mutations for that assessment, or server rejects validation. Keep concluded assessments editable and update only `ultimaAtualizacao`.

- [ ] **Step 4: Run tests and verify a non-comparable warning**

Run: `npm test -- tests/history.test.js`  
Expected: PASS.

Manual: change a result’s side/protocol in fixture data; expected UI text: “Sem comparação: protocolo, lado ou unidade diferentes.”

- [ ] **Step 5: Commit**

```bash
git add shared/clinical-rules.js apps-script/04_Assessments.gs web/js/views/history.js web/js/views/assessment-editor.js tests/history.test.js
git commit -m "feat: add comparable assessment history"
```

## Task 8: Relatório clínico híbrido em PDF

**Files:**
- Create: `apps-script/06_Report.gs`, `web/js/views/report.js`, `tests/apps-script/report.test.js`
- Modify: `apps-script/01_WebApp.gs`, `web/js/views/assessment-editor.js`

**Interfaces:**
- Consumes: synced assessment, person, result, attempts, protocol/reference snapshot.
- Produces `generateReport({assessmentId}) -> {ok, data: {fileId, fileName, url}}`.

- [ ] **Step 1: Write failing report-model tests**

```js
test('omits internal test notes and includes student observations only when supplied', () => {
  const model = buildReportModel(fixtureAssessment({ testNotes: 'cadeira instável', studentObservations: 'Usou apoio para levantar.' }));
  assert.equal(JSON.stringify(model).includes('cadeira instável'), false);
  assert.equal(model.summary.studentObservations, 'Usou apoio para levantar.');
});
test('uses official value instead of all attempt values in the technical section', () => {
  assert.equal(buildReportModel(fixtureAssessment()).technical.results[0].value, '5,8 s');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/apps-script/report.test.js`  
Expected: FAIL because `buildReportModel` does not exist.

- [ ] **Step 3: Implement report builder and export**

```js
function generateReport(payload) {
  const model = buildReportModel(getAssessmentForReport_(payload.assessmentId));
  const doc = DocumentApp.create(`Relatório - ${model.person.name} - ${model.assessment.date}`);
  renderSummary_(doc.getBody(), model.summary);
  renderTechnical_(doc.getBody(), model.technical);
  doc.saveAndClose();
  const pdf = DriveApp.getFileById(doc.getId()).getAs(MimeType.PDF).setName(`${doc.getName()}.pdf`);
  const file = DriveApp.createFile(pdf);
  return jsonOk_({ fileId: file.getId(), fileName: file.getName(), url: file.getUrl() });
}
```

Render page 1 as accessible explanatory content/cards plus optional student observations. Add a page break; render technical table by domain with result official, unit, side, classification/reference, non-completion reasons and professional. Do not show unselected tests as failures; never include test notes; show no diagnosis. The UI calls the endpoint only after synchronization and opens the returned Drive PDF link.

- [ ] **Step 4: Run tests and inspect two real PDFs**

Run: `npm test -- tests/apps-script/report.test.js`  
Expected: PASS.

Manual: generate one report with observations and one without; inspect both on phone and A4. Expected: first page is simplified, details begin after page break, no internal notes appear.

- [ ] **Step 5: Commit**

```bash
git add apps-script/06_Report.gs apps-script/01_WebApp.gs web/js/views/report.js web/js/views/assessment-editor.js tests/apps-script/report.test.js
git commit -m "feat: export hybrid clinical assessment pdf"
```

## Task 9: Implantação, dados iniciais e verificação de ponta a ponta

**Files:**
- Modify: `docs/deployment.md`, `README.md`, `appsscript.json`
- Create: `tests/e2e-checklist.md`

**Interfaces:**
- Consumes: todas as rotas API e PWA implementadas.
- Produces: implantação reproduzível e checklist de aceite.

- [ ] **Step 1: Write the explicit acceptance checklist**

```markdown
- [ ] Criar pessoa com WhatsApp e abrir conversa.
- [ ] Iniciar rascunho com subconjunto de testes e profissional Carlos Eduardo.
- [ ] Salvar offline, recarregar e confirmar que o rascunho existe.
- [ ] Reconectar e confirmar gravação nas quatro abas de histórico.
- [ ] Retomar, adicionar SPPB e concluir somente após sincronização.
- [ ] Marcar um teste como não concluído e conferir motivo no PDF técnico.
- [ ] Conferir que notas internas não aparecem no PDF.
```

- [ ] **Step 2: Run automated suite before deployment**

Run: `npm test`  
Expected: PASS with no skipped tests.

- [ ] **Step 3: Deploy Apps Script and static PWA**

```bash
npx clasp push
npx clasp deploy --description "PWA avaliação idosos v1"
```

Set the published Apps Script URL in the frontend runtime configuration. Host `web/` at an HTTPS static origin that supports `manifest.webmanifest` and `sw.js` at the same origin. Before accepting deployment, verify one write/read request works from that origin; if the Apps Script endpoint rejects browser CORS, route PWA API requests through a same-origin serverless proxy and keep the payload/response contract unchanged.

- [ ] **Step 4: Execute the acceptance checklist**

Run: follow `tests/e2e-checklist.md` on Android/iOS and desktop Chrome.  
Expected: every item checked; no assessment is marked complete while pending.

- [ ] **Step 5: Commit**

```bash
git add README.md docs/deployment.md appsscript.json tests/e2e-checklist.md
git commit -m "docs: document pwa deployment and acceptance"
```

## Plan self-review

- **Spec coverage:** Tasks 1–3 provide Sheets, Apps Script, catalog, references and API; Tasks 4–7 implement PWA, offline recovery, people, selected tests, editing, history and completion; Task 8 delivers the two-layer PDF; Task 9 covers deployment and the complete acceptance path. Explicit clinical holds for SPPB chair stand and the two strength protocols remain protected from false automation.
- **Placeholder scan:** no unfinished work markers or undefined future task references are used. The known CORS deployment check has a defined alternate route (same-origin proxy) because Apps Script ContentService redirects responses; it does not change the application API contract.
- **Type consistency:** Assessment statuses, result statuses, response envelopes and API names match the approved design. `generateReport` is used by router, report builder and frontend route with the same `{assessmentId}` payload.
