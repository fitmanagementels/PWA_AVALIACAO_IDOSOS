# Navegação assíncrona segura — plano de implementação

> **Para agentes de implementação:** subskill obrigatória: usar `executing-plans` tarefa por tarefa. Os passos são rastreados por checkboxes.

**Objetivo:** impedir que uma resposta de rede tardia leve o PWA para uma tela que o profissional já abandonou, sem descartar os dados recebidos que possam alimentar o cache local.

**Arquitetura:** um módulo pequeno mantém uma versão monotônica da navegação. Cada renderização de página inicia um token; uma callback assíncrona pode atualizar o DOM somente quando o token que ela capturou ainda for o atual. O histórico continua gravando a resposta em `localStorage` antes dessa verificação; a sincronização global atualiza a lista de pessoas somente quando a rota visível é `people`.

**Tecnologias:** JavaScript ES modules, Web Storage, PWA com service worker, Node test runner. Nenhuma dependência nova.

## Restrições globais

- Preservar os menus e a identidade XSTEAM existentes.
- Não mudar contratos do Apps Script, armazenamento IndexedDB nem esquema do Google Sheets.
- Não criar worktree; executar no `master`, conforme preferência explícita do usuário.
- Não acrescentar biblioteca; o guard é um módulo ES puro.
- Uma resposta abandonada pode terminar e atualizar cache, mas nunca pode renderizar nem alterar mensagem da rota atual.

---

### Tarefa 1: Criar guard de navegação testável

**Arquivos:**
- Criar: `web/js/navigation-guard.js`
- Criar: `tests/navigation-guard.test.js`

**Interface produzida:**

```js
export function startNavigation(page) // retorna { id: number, page: string }
export function isCurrentNavigation(token) // retorna boolean
export function isCurrentPage(page) // retorna boolean
```

- [x] **Passo 1: Escrever o teste que falha.**

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import { isCurrentNavigation, isCurrentPage, startNavigation } from '../web/js/navigation-guard.js';

test('invalidates a previous screen token when navigation advances', () => {
  const history = startNavigation('history');
  assert.equal(isCurrentNavigation(history), true);

  const person = startNavigation('person');
  assert.equal(isCurrentNavigation(history), false);
  assert.equal(isCurrentNavigation(person), true);
  assert.equal(isCurrentPage('person'), true);
});
```

- [x] **Passo 2: Confirmar a falha inicial.**

```bash
node --test tests/navigation-guard.test.js
```

Resultado esperado: falha `ERR_MODULE_NOT_FOUND` para `web/js/navigation-guard.js`.

- [x] **Passo 3: Implementar o módulo mínimo.**

```js
let sequence = 0;
let current = { id: 0, page: 'initial' };

export function startNavigation(page) {
  current = { id: ++sequence, page };
  return current;
}

export function isCurrentNavigation(token) {
  return token?.id === current.id && token?.page === current.page;
}

export function isCurrentPage(page) {
  return current.page === page;
}
```

- [x] **Passo 4: Confirmar a aprovação.**

```bash
node --test tests/navigation-guard.test.js
```

Resultado esperado: um teste aprovado.

### Tarefa 2: Aplicar tokens às rotas e carregamentos do PWA

**Arquivos:**
- Modificar: `web/js/views/people.js`
- Modificar: `web/js/app.js`
- Modificar: `tests/people-history.test.js`
- Criar: `tests/app-navigation.test.js`

**Interface consumida:** `startNavigation`, `isCurrentNavigation` e `isCurrentPage` da Tarefa 1.

- [x] **Passo 1: Adicionar testes de integração estática que falham.**

```js
// tests/people-history.test.js
assert.match(source, /import \{ isCurrentNavigation, startNavigation \} from '\.\.\/navigation-guard\.js';/);
assert.match(source, /const navigation = startNavigation\('history'\);/);
assert.match(source, /writeHistoryCache\(localStorage, person\.id, assessments\);\s*if \(!isCurrentNavigation\(navigation\)\) return;/);
assert.match(source, /startNavigation\('assessment-history'\)/);

// tests/app-navigation.test.js
assert.match(source, /import \{ isCurrentPage \} from '\.\/navigation-guard\.js';/);
assert.match(source, /if \(isCurrentPage\('people'\)\) renderPeople\(root\);/);
```

- [x] **Passo 2: Executar e confirmar a falha antes da integração.**

```bash
node --test tests/navigation-guard.test.js tests/people-history.test.js tests/app-navigation.test.js
```

Resultado esperado: falha nas novas asserções de source, pois `people.js` e `app.js` ainda não conhecem o guard.

- [x] **Passo 3: Capturar token em todas as transições de página.**

Em `web/js/views/people.js`, importar o guard e iniciar a rota nos entry points: `renderPeople` (`people`), `renderPersonForm` (`person-form`), `renderPerson` (`person`), `renderStart` (`assessment-start`), `renderHistory` (`history`) e `renderAssessmentHistory` (`assessment-history`). Ao abrir o editor diretamente, iniciar `assessment-editor` antes de chamar `renderAssessmentEditor`.

```js
import { isCurrentNavigation, startNavigation } from '../navigation-guard.js';

async function renderHistory(root, person) {
  const navigation = startNavigation('history');
  // ... renderização local imediata ...
  const response = await request('getHistorySummary', { pessoaId: person.id }, 'GET');
  const assessments = historyTimeline(response.data.map(historySummaryFromApi), person);
  writeHistoryCache(localStorage, person.id, assessments);
  if (!isCurrentNavigation(navigation)) return;
  renderHistoryList(root, person, assessments, subtitle, '', navigation);
}
```

- [x] **Passo 4: Manter a rota de histórico enquanto ela apenas atualiza a própria lista.**

`renderHistoryList` recebe `navigation`; a atualização remota o repassa. Quando o filtro muda, iniciar outro token `history` antes de renderizar localmente. Assim uma resposta que começou antes do filtro não restaura a lista nem limpa a seleção atual.

```js
function renderHistoryList(root, person, assessments, subtitle, testId = '', navigation = startNavigation('history')) {
  // ...
  root.querySelector('[data-history-test]').onchange = (event) => {
    selectedTestId = event.target.value;
    startNavigation('history');
    renderList();
  };
}
```

- [x] **Passo 5: Proteger detalhe, erros e submits.**

No detalhe, só construir o HTML e só executar `onBack` no `catch` quando `isCurrentNavigation(navigation)` for verdadeiro. Nos submits de pessoa e início da avaliação, a gravação local e `queueMutation` continuam ocorrendo; após o `await`, chamar `renderPerson` ou `renderAssessmentEditor` somente se o token do formulário ainda estiver atual. O `catch` também só escreve `.form-message` se a página ainda for atual.

```js
const navigation = startNavigation('assessment-history');
try {
  const response = await request('getAssessment', { avaliacaoId: assessmentId }, 'GET');
  if (!isCurrentNavigation(navigation)) return;
  root.innerHTML = detailMarkup;
} catch (error) {
  if (isCurrentNavigation(navigation)) onBack(`Não foi possível carregar esta avaliação: ${error.message}`);
}
```

- [x] **Passo 6: Impedir que sincronização global volte para Pessoas.**

Em `web/js/app.js`, importar `isCurrentPage`, sempre atualizar o armazenamento local após `listPeople`, e redesenhar apenas na página correspondente.

```js
const response = await request('listPeople', {}, 'GET');
replacePeopleFromApi(response.data);
if (isCurrentPage('people')) renderPeople(root);
```

- [x] **Passo 7: Executar os testes de comportamento e source.**

```bash
node --test tests/navigation-guard.test.js tests/people-history.test.js tests/people.test.js tests/app-navigation.test.js
```

Resultado esperado: todos aprovados. A resposta de `getAssessment` abandonada não possui caminho que altere `root.innerHTML`.

### Tarefa 3: Atualizar shell offline, validar e publicar

**Arquivos:**
- Modificar: `web/sw.js`
- Modificar: `tests/service-worker.test.js`

- [x] **Passo 1: Escrever a asserção que falha.**

```js
assert.match(source, /const CACHE = 'avaliacao-idosos-v12';/);
assert.match(source, /js\/navigation-guard\.js/);
```

- [x] **Passo 2: Executar e confirmar a falha.**

```bash
node --test tests/service-worker.test.js
```

Resultado esperado: falha porque a versão atual é `v11` e o asset não está no precache.

- [x] **Passo 3: Atualizar o shell offline.**

```js
const CACHE = 'avaliacao-idosos-v12';
const ASSETS = [
  // ... assets existentes ...
  './js/navigation-guard.js',
];
```

- [x] **Passo 4: Validar a alteração completa.**

```bash
npm test
git diff --check
node --check web/js/navigation-guard.js
```

Resultado esperado: todos os testes aprovados, nenhuma saída de `git diff --check`, e nenhuma saída de `node --check`.

- [ ] **Passo 5: Registrar e publicar apenas os arquivos desta mudança.**

```bash
git add docs/superpowers/plans/2026-08-05-navegacao-assincrona-segura.md web/js/navigation-guard.js web/js/views/people.js web/js/app.js web/sw.js tests/navigation-guard.test.js tests/people-history.test.js tests/app-navigation.test.js tests/service-worker.test.js
git commit -m "fix: impedir navegação por respostas atrasadas"
git push origin master
```

Não incluir os arquivos não rastreados `CONTEXTO_DO_PROJETO.*` nem o plano independente de sincronização.
