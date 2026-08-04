# Seleção premium de testes — design

## Objetivo

Elevar a escolha de testes da nova avaliação ao padrão XSTEAM premium, corrigindo checkbox solto, desalinhamento e baixa escaneabilidade sem alterar o fluxo clínico, o modelo de dados ou a integração com Apps Script.

## Escopo aprovado

- Cada teste passa a ser um cartão clicável em toda a sua área.
- O checkbox nativo continua presente e acessível, mas recebe aparência própria: quadrado de seleção, marca de confirmação, borda e superfície ativa.
- Um contador textual informa a quantidade selecionada, iniciando em “Nenhum teste selecionado”.
- O CTA único informa a mesma contagem: “Iniciar avaliação” sem seleção e “Iniciar avaliação · N testes” após a escolha.
- Os cartões exibem somente os nomes atuais e preservam sua ordem. Não haverá classificação, categorias, chips ou filtros nesta etapa.
- A seleção deve funcionar por toque, clique no nome/cartão e teclado; foco permanece visível em lime.
- Em mobile os cartões permanecem em uma coluna, com altura de toque confortável e sem rolagem horizontal.

## Fora de escopo

- Alterar testes disponíveis, nomes, ordem, regras clínicas ou validação de início.
- Modificar o armazenamento local, a fila de sincronização, Apps Script ou planilha.
- Criar categorias, recomendações clínicas, busca ou seleção automática.
- Alterar a tela de registro de resultados, o relatório ou o histórico.

## Arquitetura e dados

`renderStart` continuará gerando inputs `name="testIds"` com os mesmos `value` atuais. O cartão será um `label`, portanto manterá a associação nativa entre o clique visual e o input. Um listener de `change` no formulário calculará `FormData(form).getAll('testIds').length` e atualizará apenas o contador e o rótulo do CTA. A submissão continuará chamando `buildAssessmentStart` com esses mesmos valores.

## Estados da escolha

| Estado | Cartão | Contador | CTA |
|---|---|---|---|
| nenhum selecionado | superfície card e borda discreta | Nenhum teste selecionado | Iniciar avaliação |
| seleção ativa | superfície ativa, borda lime e marca de confirmação | 1 teste selecionado / N testes selecionados | Iniciar avaliação · N testes |
| foco por teclado | anel lime visível no cartão | sem mudança | sem mudança |
| erro de validação | cartões preservam escolha | preserva contagem | mensagem atual de formulário informa que falta selecionar um teste |

## Acessibilidade e motion

- O input não será removido da árvore de acessibilidade; será visualmente controlado sem impedir foco ou leitura por tecnologia assistiva.
- Cada cartão terá alvo mínimo de 52 px e foco dentro do componente.
- A transição da seleção usará somente `background-color`, borda e transformação discreta quando a preferência do sistema permitir; em `prefers-reduced-motion`, a mudança será instantânea.

## Verificação

- Teste de marcação e desmarcação atualiza contador e rótulo do CTA.
- Regressão confirma que os valores selecionados continuam chegando a `buildAssessmentStart`.
- Teste de CSS confirma estados selecionado/foco/mobile e que lime fica restrito à ação, foco e seleção.
- Inspeção manual no PWA publicado em desktop e celular: cartões alinhados, toque confortável e ausência de overflow.
