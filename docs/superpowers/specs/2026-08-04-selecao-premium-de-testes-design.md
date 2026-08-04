# Seleção premium de testes — design

## Objetivo

Elevar todos os controles de seleção e checkbox do PWA ao padrão XSTEAM premium, corrigindo checkbox solto, desalinhamento e baixa escaneabilidade sem alterar o fluxo clínico, o modelo de dados ou a integração com Apps Script.

## Escopo aprovado

- As três listas de escolha múltipla passam a usar cartões clicáveis em toda a sua área: testes da nova avaliação, testes adicionados a um rascunho e testes incluídos no relatório PDF.
- Os checkboxes nativos continuam presentes e acessíveis, mas recebem aparência própria: quadrado de seleção, marca de confirmação, borda e superfície ativa.
- A escolha inicial e a escolha adicional mostram contador textual, iniciando em “Nenhum teste selecionado”. O botão associado informa a mesma contagem.
- A seleção do PDF mostra o contador de testes incluídos e atualiza o CTA para “Gerar relatório PDF · N testes”.
- “Não concluído” em cada teste passa a usar um toggle premium compacto, com rótulo textual e estado inequívoco; continua sendo um checkbox nativo e preserva o campo de motivo.
- Os cartões e toggles exibem somente os nomes/rótulos atuais e preservam sua ordem. Não haverá classificação, categorias, chips ou filtros nesta etapa.
- A seleção deve funcionar por toque, clique no nome/cartão e teclado; foco permanece visível em lime.
- Em mobile os cartões permanecem em uma coluna, com altura de toque confortável e sem rolagem horizontal.

## Fora de escopo

- Alterar testes disponíveis, nomes, ordem, regras clínicas ou validações existentes.
- Modificar o armazenamento local, a fila de sincronização, Apps Script ou planilha.
- Criar categorias, recomendações clínicas, busca ou seleção automática.
- Alterar os campos de medida, as regras de registro de resultados, o conteúdo do relatório ou o histórico; somente os controles de seleção do relatório e o toggle “Não concluído” recebem acabamento visual.

## Arquitetura e dados

`renderStart`, o bloco “Adicionar testes” e `report-selection` continuarão gerando os inputs atuais (`testIds`, `additionalTestIds` e `includedTestIds`) com os mesmos valores. Cada cartão será um `label`, preservando a associação nativa entre clique visual e input. Um listener de `change` calculará a quantidade selecionada pelo `FormData` do formulário e atualizará apenas contador e CTA correspondentes. A submissão continuará chamando `buildAssessmentStart`, `addSelectedTests` e `generateReport` com os mesmos valores.

Os checkboxes `*-not-completed` e `sppb-not-completed` permanecem no mesmo formulário e nomes. Eles recebem a classe visual de toggle, sem mudança em `collectResult`, `markNotCompleted` ou na exigência de motivo.

## Estados da escolha

| Estado | Listas múltiplas | Toggle “Não concluído” | Contador / CTA |
|---|---|---|---|
| nenhum selecionado | superfície card e borda discreta | desativado, rótulo visível | Nenhum teste selecionado / CTA padrão |
| seleção ativa | superfície ativa, borda lime e marca de confirmação | superfície ativa e indicação “Não concluído” | 1 teste selecionado / N testes; CTA com N |
| foco por teclado | anel lime visível no cartão | anel lime visível no toggle | sem mudança |
| erro de validação | cartões preservam escolha | motivo segue obrigatório quando ativo | mensagem atual informa o requisito faltante |

## Acessibilidade e motion

- O input não será removido da árvore de acessibilidade; será visualmente controlado sem impedir foco ou leitura por tecnologia assistiva.
- Cada cartão terá alvo mínimo de 52 px e o toggle, 44 px; ambos terão foco dentro do componente.
- A transição da seleção usará somente `background-color`, borda e transformação discreta quando a preferência do sistema permitir; em `prefers-reduced-motion`, a mudança será instantânea.

## Verificação

- Testes de marcação e desmarcação atualizam contador e rótulo dos três CTAs correspondentes.
- Regressão confirma que os valores selecionados continuam chegando a `buildAssessmentStart`, `addSelectedTests` e `generateReport`; “Não concluído” continua chegando a `collectResult`.
- Teste de CSS confirma cartões, toggles, estados selecionado/foco/mobile e que lime fica restrito à ação, foco e seleção.
- Inspeção manual no PWA publicado em desktop e celular: cartões/toggles alinhados, toque confortável e ausência de overflow em todos os quatro contextos.
