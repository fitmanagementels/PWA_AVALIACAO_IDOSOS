# Acesso público temporário da API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir a sincronização de dados de teste do GitHub Pages para a planilha privada, liberando temporariamente apenas a Web App API.

**Architecture:** A planilha não muda de compartilhamento. A implantação Web App existente do Apps Script é atualizada para `ANYONE_ANONYMOUS` e continua sendo executada como o usuário que a implantou (`USER_DEPLOYING`). O PWA preserva sua fila local e usa a mesma URL de API já publicada.

**Tech Stack:** Google Apps Script Web App, clasp, GitHub Pages, JavaScript nativo.

## Global Constraints

- Não alterar o compartilhamento da planilha `PWA Avaliação Idosos`.
- Não expor tokens OAuth, IDs de sessão ou conteúdos de `.clasprc.json` em saída, commits ou logs.
- Usar somente dados de teste enquanto a API estiver anônima.
- Não modificar arquivos de frontend ou Apps Script: a URL de API já está correta.
- A reversão futura deve alterar somente `access` para `MYSELF` ou uma opção autenticada, mantendo a mesma implantação.

---

### Task 1: Atualizar manualmente o acesso da implantação Web App existente

**Files:**
- Modify: configuração remota da implantação `AKfycbyHPSpXvbDeEDw02OjYaPX7NustEcXP9-2NHwM2rlzRtWBcAdWcJMP5nsMA_NnCcDUSuQ`
- No repository files changed.

**Interfaces:**
- Consumes: deployment ID configurado em `web/config.js` e acesso do proprietário ao editor Apps Script.
- Produces: Web App com `access: ANYONE_ANONYMOUS` e `executeAs: USER_DEPLOYING`.

- [ ] **Step 1: Editar a implantação no editor Apps Script**

No projeto Apps Script, abrir **Implantar → Gerenciar implantações**, selecionar a implantação cuja URL contém o ID configurado em `web/config.js`, clicar em **Editar**, manter **Executar como: Eu** e alterar **Quem tem acesso** para **Qualquer pessoa**. Em seguida clicar em **Implantar** e confirmar a autorização, se solicitada.

Expected: a URL `/exec` da implantação continua a mesma; nenhum conteúdo da planilha é alterado. A alteração é manual porque a API pública do Apps Script permite atualizar a versão e a descrição da implantação, mas não a configuração de acesso da Web App.

- [ ] **Step 2: Verificar a rota pública de saúde**

Run:

```bash
curl -sSL 'https://script.google.com/macros/s/AKfycbyHPSpXvbDeEDw02OjYaPX7NustEcXP9-2NHwM2rlzRtWBcAdWcJMP5nsMA_NnCcDUSuQ/exec?action=health'
```

Expected: JSON com `"ok":true` e `"service":"pwa-avaliacao-idosos"`, sem login Google.

### Task 2: Confirmar sincronização do PWA e a reversibilidade

**Files:**
- Verify: `web/config.js`
- Verify: planilha privada `PWA Avaliação Idosos`
- No repository files changed.

**Interfaces:**
- Consumes: API pública confirmada na Task 1 e fila local existente no navegador.
- Produces: confirmação visual de que as alterações pendentes foram removidas da fila após resposta bem-sucedida.

- [ ] **Step 1: Conferir a URL consumida pelo PWA**

Run:

```bash
curl -sSL 'https://fitmanagementels.github.io/PWA_AVALIACAO_IDOSOS/config.js'
```

Expected: `APP_API_URL` usa exatamente o deployment ID alterado na Task 1.

- [ ] **Step 2: Sincronizar a fila de teste**

No PWA, acionar **Tentar novamente** ou **Sincronizar** uma única vez. Não cadastrar a mesma avaliação novamente.

Expected: status passa de “envio pendente” para “sincronizado” e a planilha recebe a avaliação e seus resultados uma única vez.

- [ ] **Step 3: Registrar reversão de produção**

Para encerrar a fase de testes, atualizar a mesma implantação para acesso restrito antes de inserir dados reais e implementar autenticação Google. Alterar a permissão da Web App não altera nem apaga a planilha, o repositório ou a fila local.
