# Migração Cloudflare Free — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrar o PWA XSTEAM de Apps Script/Google Sheets para Cloudflare Pages + Worker + D1, com Google Identity Services, preservando os fluxos clínicos, offline e de PDF existentes.

**Architecture:** `web/` continua sendo um PWA estático e passa a chamar um Worker REST autenticado. O Worker valida Google ID tokens, restringe a origem, aplica regras clínicas e persiste no D1. A importação única transforma as nove abas Sheets em registros D1 com os mesmos IDs; Sheets e Apps Script permanecem somente como backup não operacional até o corte aprovado.

**Tech Stack:** HTML/CSS/JavaScript ES modules, Node `node:test`, Cloudflare Pages, Workers Free, D1 SQLite, Wrangler, Google Identity Services, IndexedDB, localStorage.

## Global Constraints

- Usar somente Cloudflare Pages Free, Workers Free e D1 Free; não introduzir R2, KV, Durable Objects ou serviço pago.
- Todo endpoint sob `/api/` exige token Google válido e e-mail em `AUTHORIZED_EMAILS`, segredo configurado fora do Git.
- `GOOGLE_CLIENT_ID` é configuração pública do navegador; nenhum segredo pode ser incluído em `web/`, Git ou migrations.
- Respostas de API usam `Cache-Control: no-store`; o service worker não armazena `/api/` nem dados pessoais.
- Preservar IDs existentes como `TEXT`, datas de avaliação como `YYYY-MM-DD` e timestamps como ISO UTC.
- Aplicar toda mudança de schema em `worker/migrations/<n>_<nome>.sql` sequencial e versionada.
- Manter `apps-script/`, `.clasp.json` e os dados Google intactos; nenhum passo os exclui ou sobrescreve.
- Escrever um teste que falha antes de cada nova regra crítica; rodar `npm test` depois de cada tarefa e a suíte inteira antes de deploy.
- Não alterar escopo clínico, visual ou PDF além do necessário para trocar a fonte de dados e autenticar chamadas.

---

## Estrutura de arquivos ao final

| Caminho | Responsabilidade |
| --- | --- |
| `worker/wrangler.jsonc` | Binding D1, origem permitida e Client ID público do Worker. |
| `worker/src/auth.js` | Verificação JWK/JWT Google e allowlist de e-mails. |
| `worker/src/http.js` | CORS, JSON seguro, erros e parse limitado de JSON. |
| `worker/src/clinical-rules.js` | Regras puras de idade, melhor tentativa, referência e snapshot. |
| `worker/src/validation.js` | Validação de pessoas, avaliações e resultados recebidos. |
| `worker/src/repository.js` | Consultas e transações D1. |
| `worker/src/index.js` | Roteamento REST autenticado. |
| `worker/migrations/0001_initial.sql` | Schema, constraints e índices. |
| `worker/migrations/0002_seed_catalog.sql` | Profissionais e catálogo inicial. |
| `scripts/export-sheets-migration.gs` | Exportação única, somente leitura, das abas de origem. |
| `scripts/import-d1.mjs` | Dry-run e carga idempotente no D1. |
| `web/js/auth-session.js` | Sessão GSI e emissão de token para o cliente API. |
| `web/js/api-client.js` | Cliente Worker REST autenticado e adaptador dos contratos da UI. |
| `web/config.js` | URLs públicas de Worker/Pages e Client ID público. |
| `web/sw.js` | Cache estritamente estático. |
| `tests/worker-*.test.js` | Contratos do Worker, D1 simulado, autenticação e importação. |
| `tests/auth-session.test.js` | Contrato de sessão Google no frontend. |
| `tests/api-client.test.js` | Requisições Bearer e mapeamento ação→rota. |
| `docs/deployment-cloudflare.md` | Publicação, secrets, importação, rollback e validação. |

## Contratos compartilhados

```js
// User autenticado após requireAuthorizedUser.
{ email: 'profissional@dominio.com', subject: 'google-subject' }

// Erro HTTP controlado.
new HttpError(401, 'UNAUTHORIZED', 'Entre com a conta Google autorizada para continuar.')

// Resposta de API.
{ ok: true, data: {}, meta: { updatedAt: '2026-08-26T12:00:00.000Z', user: { email, subject } } }
{ ok: false, error: { code: 'VALIDATION_ERROR', message: '...' } }

// Repositório de avaliação.
saveAssessment(db, payload, { complete: false })
getAssessment(db, assessmentId)
getPersonHistory(db, personId)
```

### Task 1: Preparar o Worker e os contratos HTTP

**Files:**
- Create: `worker/wrangler.jsonc`
- Create: `worker/src/http.js`
- Create: `worker/src/index.js`
- Create: `tests/worker-http.test.js`
- Modify: `package.json`

**Interfaces:**
- Produces `createWorker(dependencies)` com método `fetch(request, env)`.
- Produces `HttpError`, `jsonResponse`, `corsHeaders`, `readJsonBody`.
- Consumes `env.ALLOWED_ORIGIN` e `env.GOOGLE_CLIENT_ID`.

- [ ] **Step 1: Write the failing HTTP tests**

```js
test('permite preflight apenas para a origem Pages', async () => {
  const response = await createWorker({ authenticate: async () => ({}) }).fetch(
    new Request('https://api.example/api/people', { method: 'OPTIONS', headers: { Origin: 'https://avaliacao.pages.dev' } }),
    { ALLOWED_ORIGIN: 'https://avaliacao.pages.dev' }
  );
  assert.equal(response.status, 204);
  assert.equal(response.headers.get('access-control-allow-origin'), 'https://avaliacao.pages.dev');
});

test('recusa origem diferente antes de acessar rota protegida', async () => {
  const response = await createWorker({ authenticate: async () => ({}) }).fetch(
    new Request('https://api.example/api/people', { headers: { Origin: 'https://attacker.example' } }),
    { ALLOWED_ORIGIN: 'https://avaliacao.pages.dev' }
  );
  assert.equal(response.status, 403);
  assert.equal((await response.json()).error.code, 'ORIGIN_NOT_ALLOWED');
});
```

- [ ] **Step 2: Run the focused test and confirm it fails because Worker files do not exist**

Run: `node --test tests/worker-http.test.js`  
Expected: failure with module-not-found for `worker/src/index.js`.

- [ ] **Step 3: Implement the minimal Worker shell**

```js
// worker/src/http.js
export class HttpError extends Error {
  constructor(status, code, message) { super(message); this.status = status; this.code = code; }
}
export function corsHeaders(request, env) {
  const origin = request.headers.get('Origin');
  if (origin && origin !== env.ALLOWED_ORIGIN) throw new HttpError(403, 'ORIGIN_NOT_ALLOWED', 'A origem desta requisição não é permitida.');
  return origin ? {
    'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN,
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
    Vary: 'Origin'
  } : {};
}
export function jsonResponse(request, env, status, payload) {
  let cors = {};
  try { cors = corsHeaders(request, env); } catch { /* no CORS header for rejected origin */ }
  return new Response(JSON.stringify(payload), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...cors } });
}
```

```js
// worker/src/index.js
import { HttpError, corsHeaders, jsonResponse } from './http.js';
export function createWorker(dependencies = {}) {
  return { async fetch(request, env) {
    try {
      const cors = corsHeaders(request, env);
      if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
      const url = new URL(request.url);
      if (url.pathname === '/health') return jsonResponse(request, env, 200, { ok: true, data: { status: 'ok' } });
      if (!url.pathname.startsWith('/api/')) throw new HttpError(404, 'NOT_FOUND', 'Rota não encontrada.');
      throw new HttpError(404, 'NOT_FOUND', 'Rota não encontrada.');
    } catch (error) {
      const known = error instanceof HttpError;
      return jsonResponse(request, env, known ? error.status : 400, { ok: false, error: { code: known ? error.code : 'INVALID_REQUEST', message: known ? error.message : 'A requisição é inválida.' } });
    }
  } };
}
export default createWorker();
```

- [ ] **Step 4: Add Worker configuration without identifiers or secrets**

```jsonc
// worker/wrangler.jsonc
{
  "$schema": "https://unpkg.com/wrangler/config-schema.json",
  "name": "pwa-avaliacao-idosos-api",
  "main": "src/index.js",
  "compatibility_date": "2026-08-26",
  "d1_databases": [{ "binding": "DB", "database_name": "pwa-avaliacao-idosos", "database_id": "REPLACE_ONLY_AFTER_D1_CREATE", "migrations_dir": "migrations" }],
  "vars": { "ALLOWED_ORIGIN": "https://REPLACE_AFTER_PAGES_DEPLOY.pages.dev", "GOOGLE_CLIENT_ID": "REPLACE_WITH_PUBLIC_GOOGLE_CLIENT_ID" }
}
```

Add scripts: `"test:worker": "node --test tests/worker-*.test.js"` and `"test": "node --test"`.

- [ ] **Step 5: Run tests**

Run: `npm test`  
Expected: existing tests plus HTTP tests pass.

- [ ] **Step 6: Commit**

```bash
git add package.json worker/wrangler.jsonc worker/src/http.js worker/src/index.js tests/worker-http.test.js
git commit -m "feat: scaffold protected Cloudflare worker"
```

### Task 2: Criar schema D1 e catálogo inicial

**Files:**
- Create: `worker/migrations/0001_initial.sql`
- Create: `worker/migrations/0002_seed_catalog.sql`
- Create: `tests/worker-schema.test.js`

**Interfaces:**
- Produces tabelas D1 listadas na especificação e índices de leitura.
- Produces os profissionais e os seis testes selecionáveis atuais.
- Consumes IDs `TEXT` vindos do Sheets e payloads em camelCase do Worker.

- [ ] **Step 1: Write failing schema assertions**

```js
test('declara relações, resultado por lado e índices do histórico', () => {
  const sql = readFileSync('worker/migrations/0001_initial.sql', 'utf8');
  assert.match(sql, /CREATE TABLE IF NOT EXISTS people/);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS assessments/);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS assessment_tests/);
  assert.match(sql, /UNIQUE\(assessment_id, test_id, side\)/);
  assert.match(sql, /CREATE INDEX IF NOT EXISTS assessments_person_date_idx/);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS migration_audit/);
});
```

- [ ] **Step 2: Run test and confirm it fails**

Run: `node --test tests/worker-schema.test.js`  
Expected: failure because migration files do not exist.

- [ ] **Step 3: Create `0001_initial.sql`**

```sql
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS people (
  id TEXT PRIMARY KEY, full_name TEXT NOT NULL, birth_date TEXT NOT NULL,
  sex TEXT NOT NULL CHECK (sex IN ('masculino','feminino')),
  whatsapp TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','arquivado')),
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS professionals (
  id TEXT PRIMARY KEY, name TEXT NOT NULL COLLATE NOCASE UNIQUE,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1))
);
CREATE TABLE IF NOT EXISTS assessments (
  id TEXT PRIMARY KEY, person_id TEXT NOT NULL REFERENCES people(id),
  assessment_date TEXT NOT NULL, professional_id TEXT NOT NULL REFERENCES professionals(id),
  status TEXT NOT NULL CHECK (status IN ('rascunho','pendenteDeSincronizacao','concluida','arquivada')),
  test_notes TEXT NOT NULL DEFAULT '', student_observations TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS assessment_tests (
  assessment_id TEXT NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  test_id TEXT NOT NULL, position INTEGER NOT NULL,
  PRIMARY KEY (assessment_id, test_id), UNIQUE (assessment_id, position)
);
CREATE TABLE IF NOT EXISTS results (
  id TEXT PRIMARY KEY, assessment_id TEXT NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  test_id TEXT NOT NULL, status TEXT NOT NULL CHECK (status IN ('concluido','naoConcluido')),
  side TEXT NOT NULL DEFAULT '', official_value REAL, unit TEXT NOT NULL DEFAULT '',
  classification TEXT NOT NULL DEFAULT '', protocol_version INTEGER NOT NULL DEFAULT 1,
  non_completion_reason TEXT NOT NULL DEFAULT '', reference_id TEXT NOT NULL DEFAULT '',
  reference_version INTEGER, reference_application_json TEXT NOT NULL DEFAULT '',
  UNIQUE(assessment_id, test_id, side)
);
CREATE TABLE IF NOT EXISTS attempts (
  id TEXT PRIMARY KEY, result_id TEXT NOT NULL REFERENCES results(id) ON DELETE CASCADE,
  ordinal INTEGER NOT NULL CHECK (ordinal > 0), side TEXT NOT NULL DEFAULT '',
  value REAL NOT NULL, unit TEXT NOT NULL, valid INTEGER NOT NULL DEFAULT 1 CHECK (valid IN (0,1)),
  created_at TEXT NOT NULL, UNIQUE(result_id, ordinal)
);
CREATE TABLE IF NOT EXISTS catalog_tests (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, domain TEXT NOT NULL, unit TEXT NOT NULL,
  configuration_json TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS references_catalog (
  id TEXT PRIMARY KEY, test_id TEXT NOT NULL, version INTEGER NOT NULL,
  criteria_json TEXT NOT NULL, classification TEXT NOT NULL, effective_on TEXT NOT NULL,
  UNIQUE(test_id, version)
);
CREATE TABLE IF NOT EXISTS protocols (
  id TEXT PRIMARY KEY, test_id TEXT NOT NULL, version INTEGER NOT NULL,
  text TEXT NOT NULL, configuration_json TEXT NOT NULL, effective_on TEXT NOT NULL,
  UNIQUE(test_id, version)
);
CREATE TABLE IF NOT EXISTS migration_audit (
  id TEXT PRIMARY KEY, source_name TEXT NOT NULL, imported_at TEXT NOT NULL,
  checksum TEXT NOT NULL, counts_json TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS assessments_person_date_idx ON assessments(person_id, assessment_date DESC, updated_at DESC);
CREATE INDEX IF NOT EXISTS assessments_status_updated_idx ON assessments(status, updated_at DESC);
CREATE INDEX IF NOT EXISTS assessment_tests_assessment_idx ON assessment_tests(assessment_id, position);
CREATE INDEX IF NOT EXISTS results_assessment_test_idx ON results(assessment_id, test_id, side);
CREATE INDEX IF NOT EXISTS attempts_result_order_idx ON attempts(result_id, ordinal);
CREATE INDEX IF NOT EXISTS references_test_effective_idx ON references_catalog(test_id, effective_on DESC, version DESC);
```

- [ ] **Step 4: Seed static professionals and catalog in `0002_seed_catalog.sql`**

Use fixed IDs `professional-elohim`, `professional-victor`, `professional-lucas`, `professional-carlos-eduardo`; seed `back-scratch`, `chair-sit-reach`, `sppb`, `step-2min`, `knee-extension-isometric`, `rowing-isometric` with the JSON configuration already represented by `web/js/test-inputs.js` and `apps-script/05_Catalog.gs`. Use `INSERT ... ON CONFLICT(id) DO UPDATE` so local/remote reapplication is safe.

- [ ] **Step 5: Run tests and local migration**

Run: `npm test && npx wrangler@latest d1 migrations apply pwa-avaliacao-idosos --local --config worker/wrangler.jsonc`  
Expected: tests pass and Wrangler reports two applied migrations.

- [ ] **Step 6: Commit**

```bash
git add worker/migrations tests/worker-schema.test.js
git commit -m "feat: add D1 assessment schema"
```

### Task 3: Portar regras clínicas e validações puras

**Files:**
- Create: `worker/src/clinical-rules.js`
- Create: `worker/src/validation.js`
- Create: `tests/worker-clinical-rules.test.js`
- Create: `tests/worker-validation.test.js`

**Interfaces:**
- Produces `ageOnDate`, `bestAttempt`, `referenceApplicationForValue`, `referenceForSavedResult`.
- Produces `validatePersonInput`, `validateAssessmentInput`, `validateCompletion`.
- Consumes critérios JSON migrados em `references_catalog` e dados de pessoa/resultado.

- [ ] **Step 1: Write failing tests for immutable reference snapshots**

```js
test('mantém a faixa já aplicada ao editar resultado antigo', () => {
  const original = referenceApplicationForValue([referenceV1], input(-14));
  const edited = referenceForSavedResult({ ...input(0), referenceApplicationJson: JSON.stringify(original) }, person, '2026-08-10', [referenceV2]);
  assert.equal(edited.referenceId, 'ref-back-scratch-v1');
  assert.deepEqual(edited.range, { min: -14, max: 0, unit: 'cm' });
});

test('recusa conclusão sem resultado ou motivo para teste selecionado', () => {
  assert.throws(() => validateCompletion({ selectedTestIds: ['sppb'], results: [] }), /Preencha ou informe/);
});
```

- [ ] **Step 2: Run tests and confirm failing imports**

Run: `node --test tests/worker-clinical-rules.test.js tests/worker-validation.test.js`  
Expected: module-not-found for the two Worker modules.

- [ ] **Step 3: Implement exact rule boundaries**

```js
export function ageOnDate(birthDate, assessmentDate) {
  const [by, bm, bd] = String(birthDate).slice(0, 10).split('-').map(Number);
  const [ay, am, ad] = String(assessmentDate).slice(0, 10).split('-').map(Number);
  if (![by, bm, bd, ay, am, ad].every(Number.isFinite)) return null;
  return ay - by - Number(am < bm || (am === bm && ad < bd));
}
export function bestAttempt(values, direction) {
  const valid = values.filter(Number.isFinite);
  return valid.length ? (direction === 'lowest' ? Math.min(...valid) : Math.max(...valid)) : null;
}
```

Port the current Apps Script `referenceApplicationForValue_` semantics exactly, returning a serialized snapshot with `referenceId`, `referenceVersion`, `effectiveOn`, `source`, `sex`, `ageAtAssessment`, `ageRange`, `range`, `labels` and `classification`. When `referenceApplicationJson` exists, parse and recalculate only its classification from its own preserved range.

- [ ] **Step 4: Implement validation with stable error messages**

```js
export function validateCompletion({ selectedTestIds, results }) {
  if (selectedTestIds.some((testId) => !results.some((result) => result.testId === testId))) {
    throw new Error('Preencha ou informe o motivo para todos os testes selecionados');
  }
  for (const result of results) {
    if (result.status === 'naoConcluido' && !String(result.reason || '').trim()) {
      throw new Error('Informe o motivo do teste não concluído');
    }
  }
}
```

- [ ] **Step 5: Run full suite**

Run: `npm test`  
Expected: all legacy and Worker clinical tests pass.

- [ ] **Step 6: Commit**

```bash
git add worker/src/clinical-rules.js worker/src/validation.js tests/worker-clinical-rules.test.js tests/worker-validation.test.js
git commit -m "feat: port clinical validation rules to worker"
```

### Task 4: Implementar repositório D1 idempotente

**Files:**
- Create: `worker/src/repository.js`
- Create: `tests/worker-repository.test.js`

**Interfaces:**
- Produces `listPeople`, `savePerson`, `getPersonFlow`, `createAssessment`, `getAssessment`, `saveAssessment`, `archiveAssessment`, `deleteArchivedAssessment`, `removeAssessmentTest`, `getPersonHistory`, `listArchivedDrafts`, `getCatalog`.
- `saveAssessment(db, input, { complete })` executa escrita em lote e devolve `{ assessmentId, updatedAt, status }`.

- [ ] **Step 1: Write failing repository tests with a prepared-statement recorder**

```js
test('grava avaliação repetida sem duplicar tentativas', async () => {
  const db = recordingDb();
  await saveAssessment(db, assessmentPayload, { complete: false, now: '2026-08-26T12:00:00.000Z' });
  assert.match(db.sql.join('\n'), /INSERT INTO attempts/);
  assert.match(db.sql.join('\n'), /ON CONFLICT\(id\) DO UPDATE/);
});

test('lista histórico apenas da pessoa solicitada em ordem decrescente', async () => {
  const history = await getPersonHistory(fakeDb(rows), 'pessoa-1');
  assert.deepEqual(history.map((item) => item.assessment.id), ['a-2', 'a-1']);
});
```

- [ ] **Step 2: Run focused test and confirm failure**

Run: `node --test tests/worker-repository.test.js`  
Expected: module-not-found for `worker/src/repository.js`.

- [ ] **Step 3: Implement transactional writes**

Use `db.batch(statements)` in this sequence: upsert assessment; replace `assessment_tests`; load stored results; delete results of removed tests by cascade; upsert every submitted result by its preserved `id`; delete prior attempts for each submitted result; insert attempts once by `(result_id, ordinal)`; update assessment timestamp; when `complete` is true, mark it `concluida` and archive other active drafts for that person in the same batch. Do not use full-table scans.

```js
const UPSERT_RESULT = `INSERT INTO results (...)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
ON CONFLICT(id) DO UPDATE SET status=excluded.status, official_value=excluded.official_value,
unit=excluded.unit, classification=excluded.classification, non_completion_reason=excluded.non_completion_reason,
reference_id=excluded.reference_id, reference_version=excluded.reference_version,
reference_application_json=excluded.reference_application_json`;
```

Implement `getAssessment` as one query for assessment/person/professional, one for results, one indexed query for attempts; attach attempts by `result_id`. Implement `getPersonHistory` as indexed assessment/results queries grouped in JavaScript into the existing compact UI contract.

- [ ] **Step 4: Implement state guards**

`createAssessment` queries existing `rascunho` or `pendenteDeSincronizacao` for the person and throws `HttpError(409, 'ACTIVE_DRAFT_EXISTS', ...)` when another ID exists. Archive/delete/remove-test must check current status and preserve exact legacy error messages.

- [ ] **Step 5: Run repository and full tests**

Run: `node --test tests/worker-repository.test.js && npm test`  
Expected: both commands pass.

- [ ] **Step 6: Commit**

```bash
git add worker/src/repository.js tests/worker-repository.test.js
git commit -m "feat: persist assessments in D1"
```

### Task 5: Proteger o Worker com Google Identity Services

**Files:**
- Create: `worker/src/auth.js`
- Create: `tests/worker-auth.test.js`
- Modify: `worker/src/index.js`

**Interfaces:**
- Produces `requireAuthorizedUser(request, env, dependencies)`.
- Requires `env.GOOGLE_CLIENT_ID` and secret `env.AUTHORIZED_EMAILS` as comma-separated, lowercase-normalized e-mails.
- Worker receives dependency injection `verifyToken` in tests and production defaults to Google JWK verification.

- [ ] **Step 1: Write failing authentication tests**

```js
test('aceita e-mail verificado presente na allowlist', () => {
  const user = validateGoogleClaims(claims('elo@xsteam.com'), { GOOGLE_CLIENT_ID: 'client', AUTHORIZED_EMAILS: 'elo@xsteam.com,victor@xsteam.com' });
  assert.deepEqual(user, { email: 'elo@xsteam.com', subject: '123' });
});
test('rejeita token sem email_verified', () => {
  assert.throws(() => validateGoogleClaims({ ...claims('elo@xsteam.com'), email_verified: false }, env), /requisitos/);
});
test('rejeita todas as rotas api sem Bearer token', async () => {
  const response = await createWorker().fetch(new Request('https://api.example/api/people'), env);
  assert.equal(response.status, 401);
});
```

- [ ] **Step 2: Run tests and verify missing implementation failure**

Run: `node --test tests/worker-auth.test.js`  
Expected: module-not-found for `worker/src/auth.js`.

- [ ] **Step 3: Implement verification**

Port the proven Dashboard Financeiro pattern: parse base64url JWT, require `alg === 'RS256'`, fetch Google JWKS from `https://www.googleapis.com/oauth2/v3/certs`, cache it for five minutes in `caches.default`, import JWK with `RSASSA-PKCS1-v1_5`/SHA-256 and verify signature. Validate issuer `accounts.google.com` or `https://accounts.google.com`, audience, `exp`, `sub`, `email_verified` and allowlist membership.

```js
function authorizedEmails(raw) {
  return new Set(String(raw || '').split(',').map((email) => email.trim().toLowerCase()).filter(Boolean));
}
if (!authorizedEmails(env.AUTHORIZED_EMAILS).has(String(claims.email).toLowerCase())) {
  throw new HttpError(403, 'FORBIDDEN', 'Esta conta Google não tem acesso à avaliação funcional.');
}
```

- [ ] **Step 4: Call authentication for every `/api/` path**

In `createWorker`, run `const user = await authenticate(request, env, dependencies)` after preflight/origin validation and before route matching. Pass `{ user }` into `meta`; keep `/health` outside `/api/` and data-free.

- [ ] **Step 5: Run tests**

Run: `npm test`  
Expected: all authentication and existing tests pass.

- [ ] **Step 6: Commit**

```bash
git add worker/src/auth.js worker/src/index.js tests/worker-auth.test.js
git commit -m "feat: protect worker API with Google identity"
```

### Task 6: Expor todas as rotas REST da avaliação

**Files:**
- Modify: `worker/src/index.js`
- Create: `tests/worker-api.test.js`

**Interfaces:**
- Consumes repository interfaces from Task 4 and `requireAuthorizedUser` from Task 5.
- Produces all routes in the approved API table with identical data semantics to the current PWA.

- [ ] **Step 1: Write failing route tests**

```js
test('retorna pessoas e meta da identidade autenticada', async () => {
  const worker = createWorker({ authenticate: async () => ({ email: 'elo@xsteam.com', subject: '1' }), listPeople: async () => [{ id: 'p1' }] });
  const response = await worker.fetch(apiRequest('/api/people'), env);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).meta.user.email, 'elo@xsteam.com');
});
test('encaminha remoção de teste apenas para rota DELETE exata', async () => {
  const response = await worker.fetch(apiRequest('/api/assessments/a1/tests/sppb', { method: 'DELETE' }), env);
  assert.equal(response.status, 200);
});
```

- [ ] **Step 2: Run route tests and confirm 404 failures**

Run: `node --test tests/worker-api.test.js`  
Expected: test failure because routes are not mapped yet.

- [ ] **Step 3: Add route parser and bounded JSON input**

```js
const assessmentMatch = url.pathname.match(/^\/api\/assessments\/([^/]+)$/);
const assessmentTestMatch = url.pathname.match(/^\/api\/assessments\/([^/]+)\/tests\/([^/]+)$/);
const personHistoryMatch = url.pathname.match(/^\/api\/people\/([^/]+)\/history$/);
```

Use `decodeURIComponent` only after matching. `readJsonBody` must reject bodies greater than 256 KiB and invalid/non-object JSON with `400 INVALID_REQUEST`. Call repository methods by injected dependencies first, then production defaults, so every route remains unit-testable without a real D1 binding.

- [ ] **Step 4: Preserve UI payload compatibility in one frontend adapter boundary**

The Worker returns camelCase models: `id`, `personId`, `date`, `professionalName`, `testIds`, `results`, `attempts`, `updatedAt`. The frontend adapter created in Task 8 owns conversion to/from any current Portuguese Apps Script fields; repository code must never receive `pessoaId`, `avaliacaoId` or `resultadoId`.

- [ ] **Step 5: Run tests**

Run: `npm test`  
Expected: routes, authentication, repository and legacy UI tests pass.

- [ ] **Step 6: Commit**

```bash
git add worker/src/index.js tests/worker-api.test.js
git commit -m "feat: add assessment REST API"
```

### Task 7: Criar exportação única e importador D1 verificável

**Files:**
- Create: `scripts/export-sheets-migration.gs`
- Create: `scripts/import-d1.mjs`
- Create: `tests/import-d1.test.js`
- Create: `docs/migration-data-template.json`

**Interfaces:**
- `exportMigrationData()` retorna JSON com `schemaVersion`, `exportedAt`, `sheets` e `counts`.
- `node scripts/import-d1.mjs --input <arquivo> --dry-run` devolve relatório sem escrever.
- `node scripts/import-d1.mjs --input <arquivo> --remote` usa Wrangler/D1 somente após dry-run aprovado.

- [ ] **Step 1: Write failing import tests**

```js
test('normaliza datas Sheets e preserva IDs e snapshot de referência', () => {
  const report = validateExport(fixture);
  assert.equal(report.ok, true);
  assert.equal(report.normalized.people[0].id, 'pessoa-1');
  assert.equal(report.normalized.results[0].referenceApplicationJson, fixture.sheets.Resultados[0].referenciaAplicadaJson);
});
test('dry-run rejeita tentativa sem resultado pai', () => {
  assert.throws(() => validateExport(orphanAttemptFixture), /Tentativa sem resultado/);
});
```

- [ ] **Step 2: Run test and confirm module-not-found**

Run: `node --test tests/import-d1.test.js`  
Expected: failure because `scripts/import-d1.mjs` does not exist.

- [ ] **Step 3: Implement read-only Apps Script export**

```js
function exportMigrationData() {
  const names = ['Pessoas','Profissionais','Avaliacoes','Resultados','Tentativas','CatalogoTestes','Referencias','Protocolos','HistoricoResumo'];
  const sheets = names.reduce(function(acc, name) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
    const values = sheet ? sheet.getDataRange().getValues() : [];
    const headers = values[0] || [];
    acc[name] = values.slice(1).map(function(row) { return headers.reduce(function(record, header, index) {
      const value = row[index];
      record[header] = value instanceof Date ? value.toISOString() : value;
      return record;
    }, {}); });
    return acc;
  }, {});
  return JSON.stringify({ schemaVersion: 1, exportedAt: new Date().toISOString(), sheets: sheets, counts: Object.fromEntries(Object.entries(sheets).map(function(entry) { return [entry[0], entry[1].length]; })) });
}
```

Do not grant the export function write scopes and do not modify any source row.

- [ ] **Step 4: Implement validation and idempotent import**

`validateExport` checks expected headers, unique IDs, valid JSON in `testesSelecionados`, `criteriosJson`, `configuracaoJson` and `referenciaAplicadaJson`, valid result→assessment and attempt→result relationships. `--dry-run` prints a JSON report containing `counts`, `invalidRows`, `orphanRows`, `checksum` and exits non-zero on any violation. `--remote` refuses to run without `--approved-checksum <checksum>` equal to dry-run output.

Use SQLite `INSERT ... ON CONFLICT(id) DO UPDATE` and import in dependency order: professionals, people, catalog, references, protocols, assessments, assessment_tests, results, attempts. Do not import `HistoricoResumo`; compare it to generated summary counts only. Insert exactly one `migration_audit` row after a successful remote import.

- [ ] **Step 5: Run tests and safe dry run**

Run: `npm test && node scripts/import-d1.mjs --input docs/migration-data-template.json --dry-run`  
Expected: tests pass; template reports zero rows and a deterministic checksum.

- [ ] **Step 6: Commit**

```bash
git add scripts/export-sheets-migration.gs scripts/import-d1.mjs tests/import-d1.test.js docs/migration-data-template.json
git commit -m "feat: add verified Sheets to D1 importer"
```

### Task 8: Adicionar sessão Google e cliente REST ao PWA

**Files:**
- Create: `web/js/auth-session.js`
- Modify: `web/index.html`
- Modify: `web/config.js`
- Modify: `web/js/api-client.js`
- Create: `tests/auth-session.test.js`
- Modify: `tests/api-client.test.js`

**Interfaces:**
- Produces `initializeGoogleSession({ clientId, onSignedIn, onError })` and `getIdentityToken()`.
- `request(action, payload, method)` remains the public API used by existing views, but maps actions to Worker REST routes and sends `Authorization: Bearer <token>`.

- [ ] **Step 1: Write failing frontend auth tests**

```js
test('enviam Bearer token para a API Worker', async () => {
  const calls = [];
  globalThis.window = { APP_API_URL: 'https://api.example', getIdentityToken: async () => 'google-token' };
  globalThis.fetch = async (_url, options) => { calls.push(options); return { json: async () => ({ ok: true, data: [] }) }; };
  await request('listPeople', {}, 'GET');
  assert.equal(calls[0].headers.Authorization, 'Bearer google-token');
});
```

- [ ] **Step 2: Run tests and confirm current anonymous contract fails**

Run: `node --test tests/api-client.test.js tests/auth-session.test.js`  
Expected: current client lacks `Authorization` and session module.

- [ ] **Step 3: Load GSI and expose public configuration**

```html
<script src="https://accounts.google.com/gsi/client" async defer></script>
<script src="./config.js"></script>
<script type="module" src="./js/app.js"></script>
```

```js
// web/config.js; values are public configuration, never secrets.
window.APP_API_URL = 'https://REPLACE_AFTER_WORKER_DEPLOY.workers.dev';
window.GOOGLE_CLIENT_ID = 'REPLACE_WITH_PUBLIC_GOOGLE_CLIENT_ID';
```

- [ ] **Step 4: Implement token session and API mapping**

`auth-session.js` stores the credential only in module memory, initializes `google.accounts.id.initialize`, calls `prompt`, and exposes an async token getter. On a `401`, `api-client.js` asks the session to prompt once again; it never stores the token in IndexedDB or localStorage.

Map actions: `listPeople→GET /api/people`, `savePerson→POST/PATCH /api/people`, `getPersonFlow→GET /api/people/:id/flow`, `getHistorySummary→GET /api/people/:id/history`, `createAssessment→POST /api/assessments`, `getAssessment→GET /api/assessments/:id`, `saveAssessment→PUT /api/assessments/:id`, `completeAssessment→POST /api/assessments/:id/complete`, `archiveAssessment→POST /api/assessments/:id/archive`, `removeAssessmentTest→DELETE /api/assessments/:id/tests/:testId`, `deleteArchivedAssessment→DELETE /api/assessments/:id`, `listArchivedDrafts→GET /api/assessments?status=arquivada`, `getCatalog→GET /api/catalog`.

Keep `AbortController`, 15-second timeout, pending queue semantics and existing `ApiError` codes. Remove Apps Script runtime and anonymous request code only after Worker contract tests pass.

- [ ] **Step 5: Run tests**

Run: `npm test`  
Expected: API requests have Bearer token and legacy view tests still pass through the adapter.

- [ ] **Step 6: Commit**

```bash
git add web/index.html web/config.js web/js/auth-session.js web/js/api-client.js tests/auth-session.test.js tests/api-client.test.js
git commit -m "feat: authenticate PWA requests with Google identity"
```

### Task 9: Preservar offline e blindar o service worker

**Files:**
- Modify: `web/js/app.js`
- Modify: `web/sw.js`
- Modify: `tests/service-worker.test.js`
- Modify: `tests/app-navigation.test.js`

**Interfaces:**
- Existing `mutationQueue`, local drafts and navigation guards remain unchanged.
- Service worker only responds to same-origin static asset requests listed in `ASSETS`.

- [ ] **Step 1: Write failing safety tests**

```js
test('service worker não intercepta API Cloudflare nem domínios externos', () => {
  const source = readFileSync('web/sw.js', 'utf8');
  assert.match(source, /url\.origin !== self\.location\.origin/);
  assert.match(source, /url\.pathname\.startsWith\('\/api\/'\)/);
  assert.doesNotMatch(source, /script\.google\.com/);
});
```

- [ ] **Step 2: Run test and confirm old Google-only exclusion fails**

Run: `node --test tests/service-worker.test.js`  
Expected: assertion failure for the old `script.google.com` condition.

- [ ] **Step 3: Implement static-only fetch strategy**

```js
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)));
});
```

Increment the cache version and include `./js/auth-session.js` in `ASSETS`. Do not add dynamic pages, report contents, people data, API URLs or identity responses to `ASSETS`.

- [ ] **Step 4: Keep optimistic UI non-blocking**

In `app.js`, do not call a remote refresh before `renderPeople(root)`. Treat `401` as `sessão Google necessária` in the sync dock without deleting IndexedDB records. Existing navigation token checks must remain around all async refreshes.

- [ ] **Step 5: Run tests**

Run: `npm test`  
Expected: service worker, navigation and queue tests pass.

- [ ] **Step 6: Commit**

```bash
git add web/js/app.js web/sw.js tests/service-worker.test.js tests/app-navigation.test.js
git commit -m "fix: keep clinical API out of service worker cache"
```

### Task 10: Atualizar documentação e deploy Cloudflare

**Files:**
- Create: `docs/deployment-cloudflare.md`
- Modify: `README.md` if present, otherwise `docs/deployment.md`
- Create: `web/_headers`
- Create: `.github/workflows/deploy-cloudflare-pages.yml`
- Create: `tests/deployment-cloudflare.test.js`

**Interfaces:**
- Pages deploys only `web/`; Worker is deployed independently by Wrangler.
- `_headers` permits GSI script while disallowing framing and MIME sniffing.

- [ ] **Step 1: Write failing deployment checks**

```js
test('documenta secrets fora do Git e deploy D1 antes do Worker', () => {
  const doc = readFileSync('docs/deployment-cloudflare.md', 'utf8');
  assert.match(doc, /wrangler secret put AUTHORIZED_EMAILS/);
  assert.match(doc, /d1 migrations apply pwa-avaliacao-idosos --remote/);
  assert.match(doc, /pages deploy web/);
  assert.doesNotMatch(doc, /AUTHORIZED_EMAILS=.*@/);
});
```

- [ ] **Step 2: Run test and confirm missing document failure**

Run: `node --test tests/deployment-cloudflare.test.js`  
Expected: file-not-found.

- [ ] **Step 3: Write the operational deployment guide**

Include exact order:

```bash
npx wrangler@latest login
npx wrangler@latest d1 create pwa-avaliacao-idosos
npx wrangler@latest d1 migrations apply pwa-avaliacao-idosos --remote --config worker/wrangler.jsonc
npx wrangler@latest secret put AUTHORIZED_EMAILS --config worker/wrangler.jsonc
npx wrangler@latest deploy --config worker/wrangler.jsonc
npx wrangler@latest pages deploy web --project-name pwa-avaliacao-idosos
```

Require adding the returned Pages URL to `ALLOWED_ORIGIN`, the returned Worker URL to `web/config.js`, and the Pages URL to Google OAuth Authorized JavaScript origins. The guide must include the import dry-run/checksum sequence and rollback: restore the previous `web/config.js` API URL, redeploy Pages, do not delete D1 or Sheets.

- [ ] **Step 4: Add static security headers**

```text
/*
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: geolocation=(), microphone=(), camera=()
  Content-Security-Policy: default-src 'self'; script-src 'self' https://accounts.google.com; connect-src 'self' https://accounts.google.com https://REPLACE_AFTER_WORKER_DEPLOY.workers.dev; img-src 'self' data:; style-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'
```

- [ ] **Step 5: Run tests**

Run: `npm test`  
Expected: complete suite passes including deployment documentation checks.

- [ ] **Step 6: Commit**

```bash
git add docs/deployment-cloudflare.md docs/deployment.md web/_headers .github/workflows/deploy-cloudflare-pages.yml tests/deployment-cloudflare.test.js
git commit -m "docs: add Cloudflare deployment runbook"
```

### Task 11: Homologar a importação e executar o corte

**Files:**
- Modify: `worker/wrangler.jsonc` only with non-secret D1 ID/origin/client configuration
- Modify: `web/config.js` only with public Worker URL and Google Client ID
- Create: `docs/migration-reports/<yyyy-mm-dd>-d1-import.json`

**Interfaces:**
- Consumes a verified JSON exported in Task 7 and an approved checksum.
- Produces a production Worker URL and Pages URL validated with an authorized Google account.

- [ ] **Step 1: Export source without changes**

In the current Apps Script project, run `exportMigrationData()`, copy the returned JSON into a local file outside Git, then execute:

```bash
node scripts/import-d1.mjs --input /safe/path/pwa-avaliacao-export.json --dry-run
```

Expected: `ok: true`, zero invalid/orphan rows and a checksum.

- [ ] **Step 2: Create production D1 and apply migrations**

```bash
npx wrangler@latest d1 create pwa-avaliacao-idosos
npx wrangler@latest d1 migrations apply pwa-avaliacao-idosos --remote --config worker/wrangler.jsonc
```

Expected: Cloudflare returns a D1 ID; paste only this non-secret ID into `worker/wrangler.jsonc`.

- [ ] **Step 3: Import after checksum approval**

```bash
node scripts/import-d1.mjs --input /safe/path/pwa-avaliacao-export.json --remote --approved-checksum '<checksum-from-dry-run>'
```

Expected: output counts equal source counts except `HistoricoResumo`, which is reported as derived, and one `migration_audit` row is inserted.

- [ ] **Step 4: Configure Google and Worker secrets**

Create/update a Google OAuth Web client. Add the final Pages production origin under Authorized JavaScript origins. Set the public Client ID in `worker/wrangler.jsonc` and `web/config.js`; set only the real authorized team addresses through:

```bash
npx wrangler@latest secret put AUTHORIZED_EMAILS --config worker/wrangler.jsonc
```

- [ ] **Step 5: Deploy and validate production**

```bash
npx wrangler@latest deploy --config worker/wrangler.jsonc
npx wrangler@latest pages deploy web --project-name pwa-avaliacao-idosos
curl -i https://<worker>.workers.dev/api/people
```

Expected: unauthenticated `/api/people` returns 401, while `/health` returns 200 without clinical data. In the PWA, login with an allowed account and validate: people list, new assessment, offline draft, synchronization, reopening/editing attempts, complementing tests, completion, history, report preview and Save as PDF.

- [ ] **Step 6: Record and commit non-sensitive report**

Store only counts, checksum, migration names, URLs and validation timestamp in `docs/migration-reports/<yyyy-mm-dd>-d1-import.json`; do not store exported records, emails, tokens, D1 ID if policy forbids it, or any clinical data.

```bash
git add worker/wrangler.jsonc web/config.js docs/migration-reports
git commit -m "chore: configure Cloudflare production migration"
```

### Task 12: Verificação final e handoff

**Files:**
- Modify: `docs/CONTEXTO_DO_PROJETO.md`
- Modify: `docs/deployment.md`

**Interfaces:**
- Produces documentação que descreve D1 como base operacional e Apps Script/Sheets como backup histórico não operacional.

- [ ] **Step 1: Run full automated suite**

Run: `npm test`  
Expected: zero failures.

- [ ] **Step 2: Verify migrations and Worker route protection**

Run:

```bash
npx wrangler@latest d1 migrations list pwa-avaliacao-idosos --remote --config worker/wrangler.jsonc
curl -sS -o /dev/null -w '%{http_code}\n' https://<worker>.workers.dev/api/people
curl -sS https://<worker>.workers.dev/health
```

Expected: migrations `0001_initial.sql` and `0002_seed_catalog.sql` applied; `/api/people` returns `401`; `/health` returns an `ok` JSON without people data.

- [ ] **Step 3: Verify production PWA in browser**

Use an allowed Google account and verify: sign-in, list/search person, WhatsApp link, start subset of tests, local save, offline queue, online sync, edit saved attempts, add test, archive/delete draft, history filter, reference label only when available, report selection and A5 Save as PDF.

- [ ] **Step 4: Update current architecture documentation**

Replace operational references to GitHub Pages/Apps Script/Sheets/Drive with Pages/Worker/D1/native print. Explicitly document that Sheets and Apps Script are retained untouched as backup during the agreed observation period and not called by production PWA.

- [ ] **Step 5: Final commit and handoff**

```bash
git add docs/CONTEXTO_DO_PROJETO.md docs/deployment.md
git commit -m "docs: record Cloudflare migration handoff"
git status --short
```

Expected: clean working tree. Report the Pages URL, Worker URL, applied migrations, imported counts, migrated functions, short operating instructions and any remaining limitations.

## Plan self-review

- **Spec coverage:** Tasks 1–2 cover Worker/D1 setup; Tasks 3–6 cover business rules, data and protected API; Tasks 7 and 11 cover reversible import/cutover; Tasks 8–9 cover PWA/auth/offline; Task 10 covers secure deployment; Task 12 covers verification and documentation.
- **No accidental data deletion:** no task runs deletion in Apps Script, Sheets, Drive or D1 during cutover.
- **Type consistency:** backend uses camelCase contracts; only the migration importer maps legacy Portuguese Sheets headers. Every API route is authenticated, while `/health` is intentionally outside `/api/`.
- **Free-plan compliance:** storage is D1 only, static delivery is Pages, and PDF remains client-side.
