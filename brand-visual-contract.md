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
| polimento | Nomes técnicos podem quebrar em duas linhas em telas estreitas | nomes atuais permanecem sem classificação por decisão de produto | leitura pode perder ritmo em telas pequenas | preservar o nome e usar cartões com altura mínima e quebra natural | leitura em desktop e mobile sem overflow |

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

### Aditivo — controles de seleção premium

- Trabalho recorrente e fluxo curto: escolher testes, adicionar testes e definir o conteúdo do PDF permanecem na própria tela; cada seleção atualiza sua contagem sem abrir overlay.
- Ação primária por contexto: iniciar avaliação, adicionar testes ou gerar PDF informa a contagem atual sem competir com outra ação.
- Mobile — cartões em coluna única (mínimo 52 px) e toggle “Não concluído” com alvo de 44 px; sem rolagem horizontal.
- Skills executadas neste aditivo: `brand-criar-navegacao-interacao` definiu os estados de seleção e contagem; `brand-aplicar-marca-e-acabamento` aplicou cartões/toggle, foco lime e motion reduzido.

### Aditivo — barra de comandos e menus próprios (05/08/2026)

- Trabalho recorrente e fluxo curto: pessoa → nova/retomar avaliação ou histórico; dentro do histórico, filtrar e abrir uma avaliação sem perder a pessoa, o filtro ou a posição de rolagem.
- Ação primária por contexto: somente a ação clínica principal usa lime; sincronizar, voltar e filtrar permanecem secundárias e não disputam prioridade.
- Hierarquia, retorno e contexto preservado: a barra fixa contém marca, contexto resumido e sincronização; o retorno volta à tela anterior sem redefinir a seleção ou o filtro.
- Overlays — tipo, uso e justificativa: cada menu próprio abre um popover ancorado no desktop e bottom sheet no mobile. Não há modal: selecionar profissional, sexo ou filtro é tarefa recorrente e curta.
- Mobile — a barra conserva marca e sincronização compacta; menu abre como bottom sheet de opções de 48 px+ e fecha por toque fora, escolha ou `Esc` quando houver teclado.

### Estados — barra e menus próprios
| Superfície/ação | idle | loading | success | empty | error | disabled |
|---|---|---|---|---|---|---|
| Barra de comandos | marca + contexto + sincronização resumida | indicador de sincronização existente | estado “Sincronizado” | não se aplica | estado de fila existente + tentar novamente | botão de sincronização somente durante envio |
| Menu próprio | rótulo atual e chevron | não se aplica | opção selecionada, fecha e atualiza campo | “Nenhuma opção disponível” | mantém valor anterior e informa falha de inicialização | trigger indisponível só quando a lista não existir |
| Histórico | cartões de avaliações e filtro preservado | skeleton curto só sem cache | cartão abre detalhe | convite para iniciar a primeira avaliação | mantém cache local e mostra recuperação | filtro indisponível se não houver opções |

### Motion e acessibilidade
- Transições (`transform`/`opacity`, 180–250 ms): entrada e troca de estado da faixa de sincronização; sem animação em campos ou registros clínicos.
- Comportamento com `prefers-reduced-motion`: mudança instantânea de estado, preservando ícone, texto e ação.
- Foco, teclado e toque: botão de sincronizar possui foco lime visível, rótulo textual e alvo mínimo de 44 px; mensagens usam `aria-live` sem roubar o foco.
- Menus próprios: `Enter`/espaço abre e seleciona, setas percorrem opções, `Home`/`End` saltam para extremos, `Esc` fecha e restaura o foco ao trigger; cada opção tem rótulo textual e alvo mínimo de 48 px.

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
- Controles de seleção — desktop e mobile: verificação automatizada cobre cartões, toggle, contagem e semântica dos nomes; inspeção visual publicada será confirmada após o cache v8 entrar no ar.

## Aditivo — central de atendimentos XSTEAM (05/08/2026)

### Contexto e premissas

- Requisitos considerados: a abertura do PWA deve ser uma central de atendimentos; cadastro, rascunho, avaliação e consulta permanecem rotinas clínicas; a referência visual vem das três direções fornecidas pelo Stitch.
- Premissas: somente estados que já existam localmente, no cache ou no backend podem ser exibidos; não criar score, prontidão, alerta clínico, agenda, protocolo ou métrica agregada sem dados e regra aprovados.
- Premissas de integração: a nova composição preserva a guarda contra respostas assíncronas atrasadas e só atualiza a central se ela continuar sendo a página ativa; assets novos entram no cache versionado do PWA.
- Tarefa e decisão principais: encontrar ou criar a pessoa certa e decidir entre continuar um rascunho real, iniciar nova avaliação ou consultar seu histórico.

### Perfil

- Tipo: PWA operacional.
- Público e frequência: profissional de avaliação funcional, em atendimentos recorrentes, predominantemente em celular e ocasionalmente em desktop.
- Justificativa: registrar ou concluir uma avaliação é a atividade dominante; overview só apoia o próximo atendimento e não pode competir com ele.

### Tema

- Escolha: dark.
- Superfícies e justificativa: base próxima de preto-esverdeado, card para lista e formulário, ativo para seleção/rascunho e overlay para menus e sheets. O lime `#E2FF42` fica restrito à marca, CTA clínica, foco e seleção ativa; o acabamento usa contraste e borda, não sombras pesadas ou gradientes.

### Densidade

- Escolha: confortável.
- Justificativa: a rotina envolve leitura e toque durante atendimento; linhas e cards preservam escaneabilidade sem os vazios excessivos de uma landing page. Desktop pode comprimir o diretório para tabela confortável quando houver muitos registros.

### Hierarquia

1. Continuar atendimento protegido — rascunho local, se existir.
2. Encontrar ou cadastrar pessoa — busca e CTA “Nova pessoa”.
3. Escolher a próxima ação na pessoa — nova avaliação, retomar rascunho ou histórico.
4. Configurar a sessão — data e profissional.
5. Selecionar testes e iniciar a avaliação.
6. Consultar cronologia e resultados salvos.

### Zonas

| Zona | Objetivo | Conteúdo | Prioridade | Componente |
|---|---|---|---|---|
| Barra de produto | Identificar XSTEAM e informar sincronização | logo, nome do produto e estado de fila | alta | barra compacta persistente |
| Continuar atendimento | Retomar somente trabalho real pendente | pessoa, data e ação de retomar rascunho local | alta quando houver rascunho | card focal operacional |
| Busca e cadastro | Encontrar ou criar pessoa | busca, filtro futuro e “Nova pessoa” | alta | zona de ação curta |
| Diretório | Escolher pessoa para atendimento | nome, dados mínimos e estado conhecido | alta | cards no mobile, tabela no desktop |
| Sessão | Configurar avaliação da pessoa selecionada | data e profissional | alta | bloco linear de formulário |
| Testes | Selecionar o escopo da sessão | cartões de seleção múltipla e contagem | alta | lista técnica + CTA fixo no fluxo |
| Histórico | Recuperar avaliações existentes | filtro por teste, mês/data, status, profissional e testes realizados | média | timeline no mobile e lista/tabela no desktop |

### Componentes

- Componente focal: card “Continuar atendimento” quando há rascunho; na ausência dele, a busca e o CTA de nova pessoa ocupam essa posição sem criar um vazio artificial.
- Fluxos lineares: pessoa → sessão → testes → avaliação; pessoa → histórico → detalhe. Não converter em seleção genérica de “protocolos”, pois o produto atual trabalha com múltiplos testes.
- Blocos de overview/bento: não aplicável na operação atual; somente um resumo de rascunhos e sincronização, baseado em dados reais, pode coexistir com o diretório.
- Dados densos — tabela ou cards e por quê: cards de pessoa e timeline no celular pela ação por toque; tabela confortável no desktop para comparar nome, idade/dados disponíveis, última avaliação conhecida e estado real.
- Estados vazios, carregamento, erro e sucesso: vazio convida a cadastrar a primeira pessoa; carregamento preserva cache e usa skeleton localizado; erro mantém registros locais e mostra recuperação; sucesso confirma a fila/sincronização sem interromper o fluxo.

### Responsividade

- Mobile em coluna única: barra, rascunho, busca/cadastro, diretório e status persistente; avaliação usa CTA inferior apenas depois de haver testes selecionados.
- Ordem das zonas no mobile: continuar atendimento → busca/cadastro → diretório → ações da pessoa → sessão → testes → histórico.
- Adaptação de dados densos: diretório vira cards com dados resumidos; histórico usa timeline agrupada por mês; filtros abrem em bottom sheet.
- Expansão para telas maiores: diretório pode usar tabela e busca/CTA na mesma linha; avaliação conserva fluxo linear em duas colunas apenas para sessão e lista de testes; histórico pode ter lista à esquerda e detalhe contextual à direita, sem criar painel analítico de métricas inexistentes.
