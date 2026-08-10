# Referências clínicas do Back Scratch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cadastrar a referência Back Scratch na aba `Referencias` e fazer o Apps Script gravar a indicação qualitativa correta em cada resultado direito ou esquerdo salvo.

**Architecture:** A aba `Referencias` continua com uma linha por versão de referência. `criteriosJson` descreve o modelo `faixas-por-sexo-e-idade`; funções puras no Apps Script selecionam a referência vigente, validam unidade/demografia e retornam uma classificação ou `null`. O salvamento de avaliação lê pessoa e referências uma única vez, calcula a classificação no servidor e persiste o texto em `Resultados.classificacao`.

**Tech Stack:** Google Sheets, Google Apps Script (ES5/ES2015 compatível), Node.js `node:test` para verificação local.

## Global Constraints

- Não alterar os cabeçalhos da aba `Referencias`: `referenciaId`, `testeId`, `versao`, `criteriosJson`, `classificacao`, `vigencia`.
- Usar os valores do print fornecido em 10/08/2026, sem estimar dados fora de 60–94 anos.
- Aplicar Back Scratch por lado, em `cm`, apenas a resultados com `status === 'concluido'` e valor numérico.
- Limites normal inferior e superior são inclusivos; abaixo e acima são estritamente externos.
- Sem faixa compatível, JSON válido, unidade compatível ou pessoa identificada: deixar `classificacao` vazia.
- Nunca sobrescrever uma classificação manual/de outro modelo quando não houver referência aplicável.
- Manter o bloqueio de escrita concorrente existente com `withLock_`.

---

### Task 1: Interpretador puro da referência por faixa

**Files:**
- Modify: `apps-script/03_ClinicalRules.gs`
- Modify: `tests/apps-script-values.test.js`

**Interfaces:**
- Consumes: linhas de `Referencias` com `testeId`, `vigencia` e `criteriosJson`.
- Produces: `classifyReferenceValue_(referenceRows, input)`, que recebe `{ testId, sex, age, value, unit, assessmentDate }` e retorna um dos rótulos do JSON ou `null`.

- [ ] **Step 1: Escrever o teste que falha para as fronteiras do Back Scratch**

Adicionar em `tests/apps-script-values.test.js` esta fixture de linha com os 14 intervalos e o teste abaixo:

```js
const BACK_SCRATCH_CRITERIA = {
  modelo: 'faixas-por-sexo-e-idade',
  unidade: 'cm',
  aplicarPorLado: true,
  rotulos: { abaixo: 'Abaixo da média', normal: 'Normal', acima: 'Acima da média' },
  faixas: [
    { sexo: 'masculino', idadeMin: 60, idadeMax: 64, normalMin: -16.5, normalMax: 0 },
    { sexo: 'masculino', idadeMin: 65, idadeMax: 69, normalMin: -19.1, normalMax: -2.5 },
    { sexo: 'masculino', idadeMin: 70, idadeMax: 74, normalMin: -20.3, normalMax: -2.5 },
    { sexo: 'masculino', idadeMin: 75, idadeMax: 79, normalMin: -22.9, normalMax: -5.1 },
    { sexo: 'masculino', idadeMin: 80, idadeMax: 84, normalMin: -24.1, normalMax: -5.1 },
    { sexo: 'masculino', idadeMin: 85, idadeMax: 89, normalMin: -25.4, normalMax: -7.6 },
    { sexo: 'masculino', idadeMin: 90, idadeMax: 94, normalMin: -26.7, normalMax: -10.2 },
    { sexo: 'feminino', idadeMin: 60, idadeMax: 64, normalMin: -7.6, normalMax: 3.8 },
    { sexo: 'feminino', idadeMin: 65, idadeMax: 69, normalMin: -8.9, normalMax: 3.8 },
    { sexo: 'feminino', idadeMin: 70, idadeMax: 74, normalMin: -10.2, normalMax: 2.5 },
    { sexo: 'feminino', idadeMin: 75, idadeMax: 79, normalMin: -12.7, normalMax: 1.3 },
    { sexo: 'feminino', idadeMin: 80, idadeMax: 84, normalMin: -14, normalMax: 0 },
    { sexo: 'feminino', idadeMin: 85, idadeMax: 89, normalMin: -17.8, normalMax: -2.5 },
    { sexo: 'feminino', idadeMin: 90, idadeMax: 94, normalMin: -20.3, normalMax: -2.5 }
  ],
  fonte: 'Tabela de referência fornecida pelo responsável do projeto em 10/08/2026'
};

function backScratchReferenceRow() {
  return { referenciaId: 'ref-back-scratch-v1', testeId: 'back-scratch', versao: 1, criteriosJson: JSON.stringify(BACK_SCRATCH_CRITERIA), classificacao: 'qualitativa-3-faixas', vigencia: '2026-08-10' };
}

test('classifies Back Scratch from the active sex and age reference', () => {
  const classifyReferenceValue = backendHelper('classifyReferenceValue_');
  const rows = [backScratchReferenceRow()];
  const input = (sex, age, value) => ({ testId: 'back-scratch', sex, age, value, unit: 'cm', assessmentDate: '2026-08-10' });

  assert.equal(classifyReferenceValue(rows, input('masculino', 60, -16.6)), 'Abaixo da média');
  assert.equal(classifyReferenceValue(rows, input('masculino', 60, -16.5)), 'Normal');
  assert.equal(classifyReferenceValue(rows, input('masculino', 60, 0)), 'Normal');
  assert.equal(classifyReferenceValue(rows, input('masculino', 60, 0.1)), 'Acima da média');
  assert.equal(classifyReferenceValue(rows, input('feminino', 80, -14)), 'Normal');
  assert.equal(classifyReferenceValue(rows, input('feminino', 80, 0.1)), 'Acima da média');
  assert.equal(classifyReferenceValue(rows, input('feminino', 95, -2)), null);
  assert.equal(classifyReferenceValue(rows, { ...input('feminino', 80, -2), unit: 'kgf' }), null);
});
```

- [ ] **Step 2: Rodar o teste para confirmar a falha**

Run: `node --test tests/apps-script-values.test.js`

Expected: FAIL porque `classifyReferenceValue_` ainda não existe.

- [ ] **Step 3: Implementar seleção de versão e regra de três faixas**

Adicionar em `apps-script/03_ClinicalRules.gs` as funções abaixo. Elas não acessam a planilha; recebem linhas já lidas e podem ser testadas em Node.

```js
function referenceDateKey_(value) {
  if (value instanceof Date) return [value.getFullYear(), String(value.getMonth() + 1).padStart(2, '0'), String(value.getDate()).padStart(2, '0')].join('-');
  return String(value || '').slice(0, 10);
}

function activeReference_(rows, testId, assessmentDate) {
  const date = referenceDateKey_(assessmentDate);
  return (rows || []).filter(function(row) {
    return row.testeId === testId && referenceDateKey_(row.vigencia) <= date;
  }).sort(function(a, b) {
    return referenceDateKey_(b.vigencia).localeCompare(referenceDateKey_(a.vigencia)) || Number(b.versao || 0) - Number(a.versao || 0);
  })[0] || null;
}

function classifyReferenceValue_(referenceRows, input) {
  const reference = activeReference_(referenceRows, input.testId, input.assessmentDate);
  if (!reference || !Number.isFinite(input.value)) return null;
  let criteria;
  try { criteria = JSON.parse(reference.criteriosJson || '{}'); } catch (_) { return null; }
  if (criteria.modelo !== 'faixas-por-sexo-e-idade' || criteria.unidade !== input.unit) return null;
  const range = (criteria.faixas || []).find(function(item) {
    return item.sexo === input.sex && input.age >= item.idadeMin && input.age <= item.idadeMax;
  });
  if (!range) return null;
  if (input.value < range.normalMin) return criteria.rotulos && criteria.rotulos.abaixo || null;
  if (input.value > range.normalMax) return criteria.rotulos && criteria.rotulos.acima || null;
  return criteria.rotulos && criteria.rotulos.normal || null;
}
```

- [ ] **Step 4: Rodar o teste para confirmar a aprovação**

Run: `node --test tests/apps-script-values.test.js`

Expected: PASS, incluindo as oito verificações de fronteira e ausência de referência.

- [ ] **Step 5: Commitar o interpretador isoladamente**

```bash
git add apps-script/03_ClinicalRules.gs tests/apps-script-values.test.js
git commit -m "feat: classify Back Scratch references"
```

### Task 2: Calcular e persistir a classificação no salvamento

**Files:**
- Modify: `apps-script/04_Assessments.gs`
- Modify: `tests/apps-script-values.test.js`

**Interfaces:**
- Consumes: `classifyReferenceValue_`, pessoa com `sexo`/`dataNascimento`, resultado do payload e linhas de `Referencias`.
- Produces: `classificationForSavedResult_(result, person, assessmentDate, referenceRows)`, que retorna o rótulo calculado ou a classificação recebida no payload quando não existe referência aplicável.

- [ ] **Step 1: Escrever o teste que falha para persistência por lado**

Adicionar este teste em `tests/apps-script-values.test.js`:

```js
test('uses the Back Scratch reference for each saved bilateral result', () => {
  const classificationForSavedResult = backendHelper('classificationForSavedResult_');
  const person = { sexo: 'feminino', dataNascimento: '1946-08-10' };
  const rows = [backScratchReferenceRow()];

  assert.equal(classificationForSavedResult({ testeId: 'back-scratch', status: 'concluido', valorOficial: -14, unidade: 'cm' }, person, '2026-08-10', rows), 'Normal');
  assert.equal(classificationForSavedResult({ testeId: 'back-scratch', status: 'concluido', valorOficial: 0.1, unidade: 'cm' }, person, '2026-08-10', rows), 'Acima da média');
  assert.equal(classificationForSavedResult({ testeId: 'back-scratch', status: 'naoConcluido', valorOficial: -14, unidade: 'cm', classificacao: 'preservar' }, person, '2026-08-10', rows), 'preservar');
});
```

- [ ] **Step 2: Rodar o teste para confirmar a falha**

Run: `node --test tests/apps-script-values.test.js`

Expected: FAIL porque `classificationForSavedResult_` ainda não existe.

- [ ] **Step 3: Implementar cálculo único por avaliação e integração em `saveAssessment`**

Adicionar em `apps-script/04_Assessments.gs`:

```js
function numericField_(value) {
  if (value === '' || value === null || value === undefined) return null;
  const parsed = Number(String(value).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

function classificationForSavedResult_(result, person, assessmentDate, referenceRows) {
  if (result.status !== 'concluido' || !person) return result.classificacao || '';
  const value = numericField_(result.valorOficial);
  const age = ageOnDate(person.dataNascimento, assessmentDate);
  const classification = classifyReferenceValue_(referenceRows, {
    testId: result.testeId,
    sex: person.sexo,
    age: age,
    value: value,
    unit: result.unidade,
    assessmentDate: assessmentDate
  });
  return classification || result.classificacao || '';
}
```

No início de `saveAssessment`, após `const now`, ler uma vez:

```js
const person = getRows_(SHEETS.PEOPLE).find(function(item) { return item.pessoaId === payload.pessoaId; }) || null;
const referenceRows = getRows_(SHEETS.REFERENCES);
```

Em cada `resultRecord`, substituir a atribuição de `classificacao` por:

```js
classificacao: classificationForSavedResult_(result, person, payload.data, referenceRows),
```

Isso classifica cada linha bilateral separadamente e mantém qualquer classificação enviada pelo cliente quando a referência não se aplica.

- [ ] **Step 4: Rodar os testes de backend e sintaxe**

Run: `node --test tests/apps-script-values.test.js && node -e "const fs=require('fs'); for (const f of fs.readdirSync('apps-script').filter((n)=>n.endsWith('.gs'))) new Function(fs.readFileSync('apps-script/'+f,'utf8'));"`

Expected: PASS e nenhuma exceção de sintaxe.

- [ ] **Step 5: Commitar a persistência**

```bash
git add apps-script/04_Assessments.gs tests/apps-script-values.test.js
git commit -m "feat: persist clinical reference classifications"
```

### Task 3: Semear a linha oficial sem preenchimento manual

**Files:**
- Modify: `apps-script/04_Assessments.gs`
- Modify: `tests/apps-script-values.test.js`

**Interfaces:**
- Consumes: `updateRowById_`, `SHEETS.REFERENCES` e a especificação Back Scratch v1.
- Produces: `backScratchReferenceRecord_()` e `seedBackScratchReference()`, idempotentes e seguros para novas execuções.

- [ ] **Step 1: Escrever o teste que falha para o registro oficial**

Adicionar em `tests/apps-script-values.test.js`:

```js
test('builds the exact active Back Scratch reference record', () => {
  const record = backendHelper('backScratchReferenceRecord_')();
  const criteria = JSON.parse(record.criteriosJson);
  assert.deepEqual(
    { id: record.referenciaId, test: record.testeId, version: record.versao, kind: record.classificacao, start: record.vigencia },
    { id: 'ref-back-scratch-v1', test: 'back-scratch', version: 1, kind: 'qualitativa-3-faixas', start: '2026-08-10' }
  );
  assert.equal(criteria.faixas.length, 14);
  assert.deepEqual(criteria.faixas[0], { sexo: 'masculino', idadeMin: 60, idadeMax: 64, normalMin: -16.5, normalMax: 0 });
  assert.deepEqual(criteria.faixas.at(-1), { sexo: 'feminino', idadeMin: 90, idadeMax: 94, normalMin: -20.3, normalMax: -2.5 });
});
```

- [ ] **Step 2: Rodar o teste para confirmar a falha**

Run: `node --test tests/apps-script-values.test.js`

Expected: FAIL porque `backScratchReferenceRecord_` ainda não existe.

- [ ] **Step 3: Implementar a seed idempotente**

Adicionar em `apps-script/04_Assessments.gs`:

```js
function backScratchReferenceRecord_() {
  return {
    referenciaId: 'ref-back-scratch-v1',
    testeId: 'back-scratch',
    versao: 1,
    criteriosJson: JSON.stringify({
      modelo: 'faixas-por-sexo-e-idade', unidade: 'cm', aplicarPorLado: true,
      rotulos: { abaixo: 'Abaixo da média', normal: 'Normal', acima: 'Acima da média' },
      faixas: [
        { sexo: 'masculino', idadeMin: 60, idadeMax: 64, normalMin: -16.5, normalMax: 0 },
        { sexo: 'masculino', idadeMin: 65, idadeMax: 69, normalMin: -19.1, normalMax: -2.5 },
        { sexo: 'masculino', idadeMin: 70, idadeMax: 74, normalMin: -20.3, normalMax: -2.5 },
        { sexo: 'masculino', idadeMin: 75, idadeMax: 79, normalMin: -22.9, normalMax: -5.1 },
        { sexo: 'masculino', idadeMin: 80, idadeMax: 84, normalMin: -24.1, normalMax: -5.1 },
        { sexo: 'masculino', idadeMin: 85, idadeMax: 89, normalMin: -25.4, normalMax: -7.6 },
        { sexo: 'masculino', idadeMin: 90, idadeMax: 94, normalMin: -26.7, normalMax: -10.2 },
        { sexo: 'feminino', idadeMin: 60, idadeMax: 64, normalMin: -7.6, normalMax: 3.8 },
        { sexo: 'feminino', idadeMin: 65, idadeMax: 69, normalMin: -8.9, normalMax: 3.8 },
        { sexo: 'feminino', idadeMin: 70, idadeMax: 74, normalMin: -10.2, normalMax: 2.5 },
        { sexo: 'feminino', idadeMin: 75, idadeMax: 79, normalMin: -12.7, normalMax: 1.3 },
        { sexo: 'feminino', idadeMin: 80, idadeMax: 84, normalMin: -14, normalMax: 0 },
        { sexo: 'feminino', idadeMin: 85, idadeMax: 89, normalMin: -17.8, normalMax: -2.5 },
        { sexo: 'feminino', idadeMin: 90, idadeMax: 94, normalMin: -20.3, normalMax: -2.5 }
      ],
      fonte: 'Tabela de referência fornecida pelo responsável do projeto em 10/08/2026'
    }),
    classificacao: 'qualitativa-3-faixas',
    vigencia: '2026-08-10'
  };
}

function seedBackScratchReference() {
  return withLock_(function() {
    const record = backScratchReferenceRecord_();
    updateRowById_(SHEETS.REFERENCES, 'referenciaId', record);
    return jsonOk_(record);
  });
}
```

- [ ] **Step 4: Rodar a validação local completa**

Run: `npm test`

Expected: PASS em toda a suíte.

- [ ] **Step 5: Commitar o semeador e a referência**

```bash
git add apps-script/04_Assessments.gs tests/apps-script-values.test.js
git commit -m "feat: seed Back Scratch clinical reference"
```

### Task 4: Aplicar na planilha e validar o fluxo compartilhado

**Files:**
- Modify: Google Apps Script implantado a partir de `apps-script/00_Config.gs`, `02_Repository.gs`, `03_ClinicalRules.gs` e `04_Assessments.gs`
- Verify: aba Google Sheets `Referencias`, célula `A2:F2`

**Interfaces:**
- Consumes: função pública de editor `seedBackScratchReference()`.
- Produces: uma única linha `ref-back-scratch-v1` preenchida e classificação salva em novas avaliações sincronizadas.

- [ ] **Step 1: Atualizar o código do projeto Apps Script e criar uma nova implantação do app da Web**

Copiar os quatro arquivos alterados para o projeto Apps Script associado à planilha. Em **Implantar → Gerenciar implantações**, editar a implantação do app da Web, selecionar **Nova versão** e implantar mantendo o mesmo nível de acesso já utilizado pelo PWA.

- [ ] **Step 2: Executar a seed uma vez no editor Apps Script**

Selecionar `seedBackScratchReference` no seletor de funções e clicar em **Executar**. Autorizar somente se o Google solicitar o acesso já necessário à planilha.

Expected: retorno `ok: true` com `referenciaId: "ref-back-scratch-v1"`.

- [ ] **Step 3: Conferir a linha sem edição manual**

Abrir `Referencias` e confirmar que há somente uma linha para `ref-back-scratch-v1`, com `testeId` igual a `back-scratch`, versão `1`, classificação `qualitativa-3-faixas` e JSON válido contendo 14 faixas.

- [ ] **Step 4: Validar uma avaliação de ponta a ponta**

Usar uma pessoa feminina de 80 anos, salvar Back Scratch direito `-14 cm` e esquerdo `0,1 cm`, sincronizar e abrir a avaliação pelo histórico. Em `Resultados`, conferir respectivamente `Normal` e `Acima da média`. Repetir a seed não deve criar segunda linha.

- [ ] **Step 5: Commit final de documentação operacional, se houver ajuste durante a implantação**

```bash
git add docs/superpowers/specs/2026-08-10-referencias-clinicas-back-scratch-design.md
git commit -m "docs: record Back Scratch reference rollout"
```
