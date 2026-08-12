# Fluxo instantâneo e limpeza segura Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tornar conclusão e retorno de relatório imediatos, permitir retirada segura de testes em rascunho e administrar rascunhos arquivados.

**Architecture:** A fila IndexedDB continua como fonte durável de mutações e a tela muda após persistência local, sem aguardar rede. O Apps Script recebe ações pequenas e protegidas por status para remoção de teste e eliminação permanente de rascunho arquivado.

**Tech Stack:** JavaScript ES modules, IndexedDB, Service Worker, Node test runner, Google Apps Script e Google Sheets.

## Global Constraints

- Nunca bloquear navegação clínica esperando resposta do Apps Script.
- Nunca apagar avaliação concluída por essas ações.
- Remover teste ou rascunho somente após confirmação explícita.
- Persistir mutações antes de alterar a interface e manter falhas na fila.
- Não alterar a URL do GitHub Pages nem a URL `/exec` da App da Web.

---

### Task 1: Navegação imediata e fila consolidada

**Files:**
- Modify: `web/js/views/assessment-editor.js`, `web/js/views/report-preview.js`, `web/js/app.js`
- Test: `tests/assessment-editor.test.js`, `tests/report-preview.test.js`

**Interfaces:**
- Consumes `enqueueAssessmentMutation(assessmentId, action, payload)` e `window.syncNow()`.
- Produces conclusão local imediata e `window.scheduleSync()` não bloqueante.

- [ ] Escrever teste que garante que concluir chama retorno antes da promessa de sincronização resolver.
- [ ] Rodar `node --test tests/assessment-editor.test.js` e confirmar falha.
- [ ] Persistir status local `concluida`, enfileirar `completeAssessment`, chamar retorno e disparar `scheduleSync()` sem `await`.
- [ ] Escrever teste que garante que o voltar do relatório apenas chama o retorno local.
- [ ] Rodar os testes específicos e `npm test`.
- [ ] Commit `fix: make assessment navigation optimistic`.

### Task 2: Retirada confirmada de teste em rascunho

**Files:**
- Modify: `web/js/views/assessment-editor.js`, `web/js/assessment-domain.js`, `web/js/sync-model.js`, `apps-script/01_WebApp.gs`, `apps-script/04_Assessments.gs`
- Test: `tests/assessment-editor.test.js`, `tests/apps-script-values.test.js`

**Interfaces:**
- Produces `removeAssessmentTest({ avaliacaoId, testeId })`.
- Consumes apenas avaliações `rascunho` ou `pendenteDeSincronizacao`.

- [ ] Escrever teste para retirada local limpar id, resultados e campos do teste, preservando os demais.
- [ ] Rodar teste e confirmar falha.
- [ ] Adicionar confirmação no cartão, fechar por padrão o bloco de adição e enfileirar o salvamento consolidado.
- [ ] Implementar ação Apps Script que rejeita avaliações concluídas, remove resultados/tentativas do teste e atualiza resumo.
- [ ] Rodar testes específicos e `npm test`.
- [ ] Commit `feat: remove tests from active draft`.

### Task 3: Arquivo de rascunhos e exclusão permanente

**Files:**
- Modify: `web/js/views/people.js`, `web/js/views/sync-panel.js`, `apps-script/01_WebApp.gs`, `apps-script/04_Assessments.gs`, `web/js/app.js`, `web/sw.js`
- Test: `tests/people-ui.test.js`, `tests/apps-script-values.test.js`, `tests/service-worker.test.js`

**Interfaces:**
- Produces GET `listArchivedDrafts()` e POST `deleteArchivedAssessment({ avaliacaoId })`.
- Consumes somente avaliações com status `arquivada`.

- [ ] Escrever teste para ícone de arquivo, listagem e confirmação de exclusão.
- [ ] Rodar teste e confirmar falha.
- [ ] Implementar listagem leve de arquivados com pessoa, data e profissional.
- [ ] Implementar exclusão transacional de avaliação, resultados, tentativas e resumo, rejeitando status diferente de `arquivada`.
- [ ] Atualizar cache do service worker.
- [ ] Rodar `npm test`, conferir `git diff --check` e publicar.
- [ ] Commit `feat: manage archived drafts`.

### Task 4: Implantação e verificação completa

**Files:**
- Modify: somente os arquivos concluídos nas tarefas anteriores.
- Test: suíte completa e consulta ao endpoint público.

- [ ] Enviar código Apps Script com `clasp push --force`.
- [ ] Atualizar a implantação App da Web existente para nova versão, sem criar URL nova.
- [ ] Confirmar ações no endpoint e assets novos no GitHub Pages.
- [ ] Testar manualmente: concluir offline, voltar da prévia, retirar teste e excluir arquivado.
