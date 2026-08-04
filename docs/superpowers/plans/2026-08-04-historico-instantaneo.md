# Histórico instantâneo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mostrar o histórico salvo imediatamente e filtrar pessoas e avaliações no dispositivo.

**Architecture:** Um módulo de cache serializa o histórico por pessoa no localStorage. A tela renderiza a cópia local antes de buscar a API e atualiza a cópia quando a resposta chega.

**Tech Stack:** JavaScript ES modules, localStorage e Node.js built-in test runner.

## Global Constraints

- O cache local não envia nem altera resultados clínicos.
- A API continua sendo a fonte compartilhada de verdade.
- Filtros não disparam chamadas adicionais.

---

### Task 1: Cache e filtros locais

**Files:**
- Create: `web/js/history-cache.js`, `tests/history-cache.test.js`
- Modify: `web/js/views/people.js`, `web/styles/app.css`, `web/sw.js`

- [ ] **Step 1: Escrever testes para salvar e recuperar histórico local**

```js
assert.deepEqual(readHistoryCache(store, 'p1'), [{ assessmentId: 'a1' }]);
assert.deepEqual(filterHistory(items, { testId: 'sppb', period: 'all' }), [items[0]]);
```

- [ ] **Step 2: Confirmar falha**

Run: `node --test tests/history-cache.test.js`

Expected: módulo não encontrado.

- [ ] **Step 3: Implementar cache, busca de pessoas e filtros de histórico**

O cache usa a chave `avaliacao-idosos-history:<pessoaId>`. A tela renderiza os itens locais, busca a atualização sem bloquear e aplica filtros a itens já presentes em memória.

- [ ] **Step 4: Verificar e publicar**

Run: `npm test`

Expected: todos os testes passam.
