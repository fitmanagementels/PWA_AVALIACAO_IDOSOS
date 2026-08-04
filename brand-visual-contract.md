## Orquestração BRAND
- Pedido e contexto detectado: adaptar o PWA operacional existente de avaliação funcional, com prioridade para clareza do estado de sincronização e preservação do fluxo clínico.
- Rota escolhida e justificativa: frontend existente → auditoria e somente encaminhamentos justificados, pois o PWA já possui telas, formulários e integração com Apps Script em funcionamento parcial.
- Skills executadas: brand-orquestrar-fluxo-visual; brand-auditar-e-alinhar-frontend; brand-criar-navegacao-interacao; brand-aplicar-marca-e-acabamento.
- Skills não usadas e motivo: brand-organizar-informacao-visual não foi usada: a composição linear existente já corresponde ao fluxo clínico sequencial.
- Premissas assumidas: preservar o modelo de dados, as chamadas de API e a fila local; melhorar feedback visual de carregamento, sincronização, erro e pendências.
- Pergunta pendente, se houver: nenhuma.

## Auditoria e contrato de adaptação

### Inventário e evidências
- Rotinas críticas: cadastrar pessoa; iniciar avaliação; salvar/concluir avaliação; sincronizar a fila; consultar histórico e gerar relatório.
- Estrutura, componentes e integrações: cabeçalho com ação de sincronização, conteúdo linear por tela, formulários em card, rodapé com status textual, IndexedDB para fila e Apps Script para leitura/escrita.
- Estados e viewports verificados: código e página publicada; viewport desktop e mobile foram inspecionados estruturalmente. A captura automatizada foi limitada por falha do Chrome headless no ambiente.
- Limitações da auditoria: não houve acesso à fila IndexedDB do navegador da pessoa usuária; a auditoria visual parte do CSS, HTML, screenshots compartilhados e do PWA publicado.

### Preservar
- Fluxo linear de pessoa → avaliação → resultado — reduz mudança de contexto na rotina clínica — manter as telas e rotas atuais.
- Rascunho local antes da sincronização — protege o registro contra demora de rede — não bloquear o formulário em chamadas remotas.
- Ação manual “Sincronizar” — oferece recuperação explícita — manter, mas qualificá-la com estado, pendências e erro.

### Diagnóstico priorizado
| Prioridade | Achado | Evidência | Impacto | Mudança mínima | Verificação |
|---|---|---|---|---|---|
| bloqueadoras | Falha de sincronização é exibida apenas como texto genérico no rodapé | `app.js` descarta `error.message` e usa “envio pendente” | usuário não sabe se o dado foi enviado ou por que falhou | estado de sincronização persistente, legível e acionável | simular erro e conferir causa e ação de tentativa |
| alto impacto | Tema claro e CTAs verdes conflitam com o contrato dark XSTEAM | `app.css` usa base `#f3f7f4`, cards brancos e botão `#187450` | reduz consistência de marca e contraste de estados prioritários | migrar tokens e superfícies para tema dark; reservar lime para CTA e foco | inspeção desktop/mobile e contraste visível |
| alto impacto | Ações de sincronização e de formulário não diferenciam pendente, envio, êxito e falha | rodapé tem somente uma string; botões não expõem estado assíncrono | o profissional pode repetir ações ou sair sem saber que há fila | faixa de status com contagem, estado e ação de recuperar | salvar offline e reconectar sem perder contexto |
| polimento | Cards, mensagens e vazios usam mesma superfície clara e pouca hierarquia de estado | `.empty-state`, `.form-card` e `.person-card` são similares | leitura rápida de listas e histórico fica menos clara | tokens de superfície, borda e chips sem alterar conteúdo | navegação e histórico preservados |

### Sequência de adaptação
1. Criar um estado de sincronização visível e uma recuperação não intrusiva.
2. Aplicar tema, superfícies e foco XSTEAM sem alterar dados ou contratos de API.
3. Verificar fluxos de cadastro, rascunho, histórico e sincronização em desktop e mobile.

### Encaminhamento seletivo
| Skill | Usar? | Evidência que justifica | Resultado esperado |
|---|---|---|---|
| brand-organizar-informacao-visual | Não | fluxo linear e zonas atuais já atendem a sequência clínica | preservar a composição e evitar reformulação desnecessária |
| brand-criar-navegacao-interacao | Sim | estado assíncrono, ação de recuperação e contexto de fila estão frágeis | padrão claro de sincronização, erro e tentativa novamente |
| brand-aplicar-marca-e-acabamento | Sim | tokens, superfícies, CTA e foco não seguem o contrato dark XSTEAM | acabamento dark acessível e consistente |

## Navegação e interação
- Trabalho recorrente e fluxo curto: escolher pessoa → iniciar ou retomar avaliação → salvar localmente → confirmar estado de sincronização. A chamada remota nunca deve impedir a continuidade do preenchimento.
- Ação primária por contexto: “Salvar e sincronizar” no formulário; “Sincronizar agora” na faixa persistente quando houver pendência ou erro.
- Hierarquia, retorno e contexto preservado: manter a navegação por telas já existente; a faixa de sincronização não troca de tela e não apaga campos, fila ou posição de rolagem.
- Overlays — tipo, uso e justificativa: nenhum modal. O painel de pendências é expansível junto à faixa de sincronização e mantém a tela clínica visível; não depende de toast como único registro.
- Mobile — destinos, ação e transformação de overlays: faixa fixa acima da borda segura inferior, com texto curto e botão alcançável; em desktop fica alinhada ao conteúdo, sem deslocar a ação clínica principal.

### Estados
| Superfície/ação | idle | loading | success | empty | error | disabled |
|---|---|---|---|---|---|---|
| Faixa de sincronização | “Tudo sincronizado” | “Enviando alterações…” | “Alterações enviadas” por breve confirmação | “Sem alterações pendentes” | mensagem do backend + “Tentar novamente” | botão desabilitado somente durante envio |
| Salvar avaliação | “Salvar e sincronizar” | “Salvando localmente…” | “Rascunho salvo e sincronizado” | não se aplica | “Rascunho protegido neste aparelho. [causa]” | somente enquanto o próprio envio estiver ativo |
| Lista de pessoas | conteúdo local ou compartilhado | esqueleto breve na carga inicial | lista atualizada | instrução para cadastrar a primeira pessoa | aviso de dados locais e ação de sincronizar | não se aplica |

### Motion e acessibilidade
- Transições (`transform`/`opacity`, 180–250 ms): entrada e troca de estado da faixa de sincronização; sem animação em campos ou registros clínicos.
- Comportamento com `prefers-reduced-motion`: mudança instantânea de estado, preservando ícone, texto e ação.
- Foco, teclado e toque: botão de sincronizar possui foco lime visível, rótulo textual e alvo mínimo de 44 px; mensagens usam `aria-live` sem roubar o foco.

## Marca e acabamento
- Voz visual aplicada: dark premium operacional, com contraste alto e sem ornamentação concorrente.
- Tema final e proporção dark (mínimo 60%): tema integralmente dark.
- Uso permitido de #E2FF42 — marca/foco/ação/métrica: CTA primário, foco visível e indicador de envio.
- Uso de geometria e efeitos: sem geometria decorativa; blur restrito à faixa fixa de sincronização.

### Tokens aplicados
| Categoria | Token | Valor | Uso |
|---|---|---|---|
| Superfície | `--surface-base` | `#07110f` | página |
| Superfície | `--surface-card` | `#101d1a` | cartões e formulários |
| Superfície | `--surface-active` | `#172a25` | seleção e painel |
| Superfície | `--surface-overlay` | `#0d1815` | faixa fixa |
| Ação/foco | `--focus` | `#E2FF42` | CTA e foco de teclado |

### Quatro superfícies
| Nível | Token | Luminância/borda | Conteúdo |
|---|---|---|---|
| base | `--surface-base` | mais escura | página |
| card | `--surface-card` | borda `--border` | formulários e listas |
| ativo | `--surface-active` | luminância intermediária | hover e pendências |
| overlay | `--surface-overlay` | backdrop e borda | faixa de sincronização |

### Verificação final
- Desktop — contraste, foco, dados e estados: cobertos por tokens, foco e testes estruturais; captura automatizada permanece limitada pelo Chrome headless do ambiente.
- Mobile — ordem, alcance, legibilidade, overflow e overlays: CSS reduz cabeçalho, faixa e ações para uma coluna até 480 px.
- Motion com `transform`/`opacity`: somente faixa e painel de sincronização.
- `prefers-reduced-motion`: transições e animações não essenciais são removidas.
- Pendências restantes: validação manual em navegador real antes da publicação.
