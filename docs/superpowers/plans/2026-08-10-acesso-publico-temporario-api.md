# Acesso da Web App por conta Google Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir a sincronização de dados de teste do GitHub Pages para a planilha privada pela Web App correta, aproveitando a sessão Google já aberta no navegador.

**Architecture:** A planilha não muda de compartilhamento. A nova implantação do tipo Web App executa como o usuário que a implantou e exige uma Conta Google. O PWA preserva sua fila local, aponta para a URL `/exec` dessa Web App e usa `credentials: 'include'` para enviar a sessão Google existente.

**Tech Stack:** Google Apps Script Web App, clasp, GitHub Pages, JavaScript nativo.

## Global Constraints

- Não alterar o compartilhamento da planilha `PWA Avaliação Idosos`.
- Não expor tokens OAuth, IDs de sessão ou conteúdos de `.clasprc.json` em saída, commits ou logs.
- Usar somente dados de teste até que o backend tenha autorização por e-mail.
- Não configurar `web/config.js` com um Executável da API: ele não atende a URL `/exec`.
- A autorização futura por e-mail é uma regra do backend; a planilha continua privada.

---

### Task 1: Criar a implantação Web App correta

**Files:**
- Modify: configuração remota da Web App `AKfycby90CjCB6Y-I6ixrbBbLZtm0oTw2_cpjzTOzYSwXC-tFyAmU9OHuizhKxGiV0Yxdnx8gw`
- No repository files changed.

**Interfaces:**
- Consumes: acesso do proprietário ao editor Apps Script.
- Produces: Web App com acesso para uma Conta Google e execução como o proprietário.

- [x] **Step 1: Criar a implantação no editor Apps Script**

No projeto Apps Script, abrir **Implantar → Nova implantação**, escolher **App da Web**, manter **Executar como: Eu**, selecionar **Qualquer pessoa com uma Conta do Google** e implantar. A URL válida termina em `/exec`.

Expected: a URL `/exec` nova é emitida; nenhum conteúdo da planilha é alterado.

- [ ] **Step 2: Verificar a rota autenticada de saúde**

Run:

```bash
curl -sSL 'https://script.google.com/macros/s/AKfycby90CjCB6Y-I6ixrbBbLZtm0oTw2_cpjzTOzYSwXC-tFyAmU9OHuizhKxGiV0Yxdnx8gw/exec?action=health'
```

Expected: JSON com `"ok":true` e `"service":"pwa-avaliacao-idosos"` quando aberta em um navegador conectado ao Google.

### Task 2: Apontar e confirmar a sincronização do PWA

**Files:**
- Verify: `web/config.js`
- Verify: planilha privada `PWA Avaliação Idosos`
- No repository files changed.

**Interfaces:**
- Consumes: Web App confirmada na Task 1 e fila local existente no navegador.
- Produces: confirmação visual de que as alterações pendentes foram removidas da fila após resposta bem-sucedida.

- [x] **Step 1: Configurar a URL e as credenciais da sessão**

Run:

```bash
curl -sSL 'https://fitmanagementels.github.io/PWA_AVALIACAO_IDOSOS/config.js'
```

Expected: `APP_API_URL` usa exatamente o deployment ID da Task 1 e o cliente usa `credentials: 'include'` para GET e POST.

- [ ] **Step 2: Sincronizar a fila de teste**

No PWA, acionar **Tentar novamente** ou **Sincronizar** uma única vez. Não cadastrar a mesma avaliação novamente.

Expected: status passa de “envio pendente” para “sincronizado” e a planilha recebe a avaliação e seus resultados uma única vez.

- [ ] **Step 3: Registrar evolução para produção**

Antes de inserir dados reais, implementar no backend uma lista explícita de e-mails autorizados. A alteração não apaga a planilha, o repositório ou a fila local.
