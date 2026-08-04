# Interface XSTEAM e fila de sincronização

## Objetivo

Aplicar o tema dark XSTEAM em todo o PWA de avaliação funcional e tornar a sincronização compreensível, recuperável e não bloqueante. O profissional continua registrando dados de imediato; quando algo não chegar à planilha, o app mostra o estado, a causa e a pendência sem esconder o formulário.

## Escopo aprovado

- Tema dark XSTEAM em todas as telas existentes.
- Faixa fixa de sincronização para os estados diário: sincronizado, enviando, pendente, erro e offline.
- Painel expansível de pendências na própria faixa, aberto somente quando houver itens aguardando ou falhados.
- Mensagem do Apps Script preservada no estado de erro, com ação “Tentar novamente”.
- Contagem de pendências e horário da última tentativa.
- Preservação das rotas, formulários, IndexedDB, chamadas atuais da API e dados clínicos.

Fica fora do escopo: alterar o modelo da planilha, excluir itens da fila, criar um novo destino de navegação ou transformar o PWA em dashboard.

## Fluxo do profissional

1. Preenche uma pessoa ou avaliação; os dados são salvos no dispositivo imediatamente.
2. O app adiciona a operação à fila e apresenta “Enviando” sem bloquear a edição.
3. Em sucesso, remove a operação e confirma “Tudo sincronizado”.
4. Em falha, mantém a operação, mostra a causa retornada pela API e habilita “Tentar novamente”.
5. Ao expandir a faixa, o profissional vê quantidade, ação, horário, estado e causa de cada pendência, sem sair da tela atual.
6. Ao voltar a ter conexão ou abrir o app, a fila tenta enviar novamente; se a falha persistir, a pendência continua visível.

## Estrutura visual

- `body`: superfície base dark.
- Cabeçalho: superfície ativa, nome do produto e ação secundária de sincronizar.
- Conteúdo: cartões dark com bordas sutis; uma ação primária lime por contexto.
- Campos: superfície interna escura, texto legível, foco lime e mensagens de validação visíveis.
- Faixa de sincronização: superfície overlay fixa acima da área segura inferior; estado textual, ícone sem depender apenas de cor e botão de recuperação.
- Painel de pendências: expansão da faixa, não modal; desktop limitado à largura do conteúdo e mobile em coluna única.

## Estado de sincronização

```js
{
  phase: 'synced' | 'sending' | 'pending' | 'error' | 'offline',
  pendingCount: Number,
  lastAttemptAt: ISODate | null,
  message: String,
  retryable: Boolean,
  items: [{ id, action, queuedAt, message }]
}
```

- A fila é a fonte da contagem e dos itens.
- Um erro de API mantém a operação e armazena uma mensagem segura para exibição.
- Uma operação bem-sucedida é removida da fila.
- O painel nunca mostra valores clínicos, somente metadados de sincronização.

## Acessibilidade e comportamento responsivo

- Faixa com `role="status"` e mensagens `aria-live="polite"`; erro crítico é anunciado sem roubar o foco.
- Botões com alvo mínimo de 44 px, foco lime com contraste alto e texto explícito.
- No mobile, ações ficam em uma coluna e a faixa respeita `safe-area-inset-bottom`.
- Motion restrita a `opacity` e `transform` em 180–250 ms; removida com `prefers-reduced-motion`.

## Testes e verificação

- Teste unitário para fila: falha mantém item e expõe a mensagem; nova tentativa bem-sucedida remove o item.
- Teste de renderização/estrutura para a faixa e o painel, incluindo texto de erro e contagem.
- Verificação manual: salvar offline, reconectar, falhar por validação e reenviar; conferir que o rascunho permanece editável e a planilha recebe somente após êxito.
- Verificação visual desktop e mobile: contraste, foco, ausência de overflow horizontal e CTA lime restrito à ação primária.

## Critérios de aceite

- Nenhuma falha aparece somente como “envio pendente”; a causa e a recuperação ficam disponíveis.
- O profissional não perde campos nem muda de tela ao sincronizar.
- A fila mostra claramente se há dados apenas locais.
- Tema dark XSTEAM é aplicado em todas as telas sem usar lime como fundo recorrente de leitura.
- Fluxos de pessoa, avaliação, histórico e relatório continuam operacionais.
