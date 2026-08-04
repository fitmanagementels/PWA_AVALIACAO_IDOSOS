# Formatação brasileira de datas e horários Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Exibir as datas do PWA no formato brasileiro sem deslocar datas clínicas por fuso horário.

**Architecture:** Um módulo puro recebe valores ISO e produz texto de data ou de data e hora. As telas usam esse módulo, sem modificar o valor original armazenado.

**Tech Stack:** JavaScript ES modules e Node.js built-in test runner.

## Global Constraints

- Nascimento e data de avaliação mostram apenas `dd/MM/aaaa`.
- Carimbos de evento mostram `dd/MM/aaaa às HH:mm` no horário local.
- Datas puras preservam o mesmo dia presente no texto ISO.

---

### Task 1: Formatar e exibir datas brasileiras

**Files:**
- Create: `web/js/date-format.js`, `tests/date-format.test.js`
- Modify: `web/js/views/people.js`, `web/sw.js`

**Interfaces:**
- Produces `formatDateBr(value)` e `formatDateTimeBr(value)`.

- [ ] **Step 1: Escrever o teste que falha**

```js
assert.equal(formatDateBr('1999-05-29T03:00:00.000Z'), '29/05/1999');
assert.equal(formatDateTimeBr('2026-08-04T17:05:00.000Z'), '04/08/2026 às 17:05');
```

- [ ] **Step 2: Confirmar falha**

Run: `node --test tests/date-format.test.js`

Expected: módulo não encontrado.

- [ ] **Step 3: Implementar o módulo e substituir a data bruta nas telas de pessoas**

```js
export function formatDateBr(value) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : '—';
}
```

Importar `formatDateBr` em `people.js`, aplicar na lista e no cabeçalho da pessoa, e adicionar o módulo ao cache.

- [ ] **Step 4: Verificar e publicar**

Run: `npm test`

Expected: todos os testes passam.

Commit: `git commit -m "feat: formatar datas no padrão brasileiro"`
