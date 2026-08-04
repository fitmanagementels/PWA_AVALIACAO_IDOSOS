## Orquestração BRAND
- Pedido e contexto detectado: aprimorar a seleção de testes do PWA operacional existente, mantendo o padrão XSTEAM, sem classificação dos testes e sem mudar o fluxo clínico.
- Rota escolhida e justificativa: frontend existente → auditoria → navegação/interação → acabamento, pois o problema observado está no controle de seleção e nos seus estados, não na arquitetura das telas.
- Skills executadas: brand-orquestrar-fluxo-visual; brand-auditar-e-alinhar-frontend; brand-criar-navegacao-interacao; brand-aplicar-marca-e-acabamento.
- Skills não usadas e motivo: brand-organizar-informacao-visual não foi usada: a composição linear existente já corresponde ao fluxo clínico sequencial.
- Premissas assumidas: preservar o modelo de dados, as chamadas de API, a fila local e os nomes/ordem dos testes; cartões substituem a aparência do checkbox, mas mantêm os inputs nativos e a submissão atual.
- Pergunta pendente, se houver: nenhuma.

## Auditoria e contrato de adaptação

### Aditivo — todos os controles de seleção (04/08/2026)

#### Inventário e evidências
- Rotinas críticas: profissional escolhe testes antes da avaliação, adiciona testes ao rascunho, escolhe testes do PDF e marca “Não concluído” quando necessário; os dados seguem sem mudança de contrato.
- Estrutura, componentes e integrações: `renderStart`, `assessment-editor` e seleção de relatório usam os mesmos `label.check-option`; os dados seguem para `buildAssessmentStart`, `addSelectedTests`, `collectResult` e `generateReport`.
- Estados e viewports verificados: desktop publicado na captura enviada; código/CSS para mobile. Não foi possível capturar o viewport móvel real neste ambiente.
- Limitações da auditoria: a captura representa o estado sem teste selecionado; seleção múltipla será protegida por testes estruturais e validação manual no PWA publicado.

#### Preservar
- Seleção múltipla, data e profissional — são entradas exigidas pela criação da sessão — manter `name="testIds"`, `additionalTestIds`, `includedTestIds`, valores e validações existentes.
- CTAs de iniciar, adicionar e gerar PDF — já materializam os próximos passos corretos — mantê-los como ações dominantes, apenas qualificando-os com a contagem escolhida.
- Sem modal/drawer — escolher testes é uma rotina curta e linear — manter a pessoa na mesma tela.

#### Diagnóstico priorizado
| Prioridade | Achado | Evidência | Impacto | Mudança mínima | Verificação |
|---|---|---|---|---|---|
| bloqueadoras | Nenhuma | seleção funcional e o formulário preserva o contrato de dados | — | não aplicar reformulação estrutural | regressão dos testes atuais |
| alto impacto | Checkbox nativo aparece isolado e os nomes ficam distantes no desktop | captura enviada e `check-option` reutilizada no início, adição e PDF | toque, associação visual e leitura por varredura ficam lentos em todos os locais | transformar cada `label` em cartão selecionável, com controle customizado e área inteira acionável | clicar em texto/cartão alterna seleção e mantém `FormData` |
| alto impacto | Não existe feedback resumido da seleção antes das ações primárias | `fieldset`, adição e relatório não expõem contagem | profissional não confirma rapidamente o escopo da sessão ou do PDF | contador textual e rótulo dinâmico de cada CTA | zero, um e múltiplos testes informam a mesma contagem |
| alto impacto | “Não concluído” é um checkbox visualmente comum dentro de uma rotina crítica | `not-completed` usa input nativo ao lado do texto | estado binário pode passar despercebido e não orienta o preenchimento do motivo | toggle compacto com rótulo e estado ativo visível | teclado, toque e exigência de motivo preservados |
| polimento | Testes não têm contexto funcional durante a escolha | nomes técnicos em lista plana | mais esforço para localizar o teste desejado | chip discreto de domínio funcional; sem alterar nomes ou ordem | leitura em desktop e mobile sem overflow |

#### Sequência de adaptação
1. Aplicar cartões de seleção e toggles sem mudar inputs, valores ou submissão.
2. Atualizar contadores e CTAs no mesmo evento de `change`, incluindo foco visível e estados vazios.
3. Verificar os quatro contextos por teclado, toque, desktop e mobile; preservar `prefers-reduced-motion`.

#### Encaminhamento seletivo
| Skill | Usar? | Evidência que justifica | Resultado esperado |
|---|---|---|---|
| brand-organizar-informacao-visual | Não | a tela continua linear, um card focal e uma ação primária; o defeito é do componente de escolha | evitar mudança desnecessária de estrutura |
| brand-criar-navegacao-interacao | Sim | seleção, contador e CTA precisam refletir estado e ter alvos de toque corretos | escolha imediata, legível e recuperável |
| brand-aplicar-marca-e-acabamento | Sim | checkbox nativo e estado selecionado não expressam as superfícies/tokens XSTEAM | componente dark premium com foco e contraste |

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
