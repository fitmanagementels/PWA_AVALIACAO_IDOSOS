# Comandos e menus XSTEAM — design

## Objetivo

Tornar a navegação e os comandos do PWA mais premium, fluidos e consistentes com XSTEAM, eliminando menus nativos dependentes do tema do navegador e introduzindo a logo enviada como assinatura da aplicação.

## Escopo aprovado

- Inserir a logo original enviada em `web/icons/xsteam-mark.svg`, sem filtros ou redesenho, na barra persistente do aplicativo.
- Reorganizar o cabeçalho em uma barra de comandos: marca, contexto curto da tela e sincronização como ação secundária.
- Substituir todos os selects atuais por um componente reutilizável de menu próprio: sexo no cadastro, profissional na nova avaliação e filtro de testes no histórico.
- No desktop, o menu abre em popover ancorado ao trigger; no celular, abre em bottom sheet escuro.
- Preservar os nomes, valores, `FormData`, validações, ações do Apps Script, filas locais e regras clínicas atuais.
- Tornar avaliações do histórico cartões de comando mais escaneáveis, com data, resumo de estado, foco/pressionamento visível e carregamento localizado.

## Fora de escopo

- Criar categorias, busca, multiseleção ou carregamento remoto de opções.
- Alterar dados de pessoas, avaliações, relatórios, planilhas ou Apps Script.
- Transformar a rotina em uma navegação por modal ou adicionar animação decorativa.

## Estrutura de interação

### Barra de comandos

O cabeçalho persistente contém o símbolo XSTEAM à esquerda, o nome do produto/contexto e o comando de sincronização à direita. A tela continua responsável por seu título clínico; a barra não duplica nomes de pessoas ou avaliações. “Voltar” fica junto ao título da tela como ação secundária.

### Menu próprio reutilizável

O componente recebe `name`, opções `[value, label]`, valor inicial e rótulo. Ele mantém um `input type="hidden"` com o mesmo `name` que o select atual para que `FormData` e validações continuem recebendo o mesmo valor. O trigger usa `aria-haspopup="listbox"`, `aria-expanded`, texto da opção atual e chevron; a lista usa `role="listbox"` e opções com `role="option"`.

No desktop a lista aparece abaixo do trigger sem mudar de rota. Em viewport móvel, a mesma lista é mostrada em uma camada de bottom sheet com fundo escurecido; clicar fora, escolher uma opção ou pressionar `Esc` fecha a camada. Apenas um menu pode permanecer aberto.

### Histórico

O filtro de teste utiliza o mesmo menu próprio. A seleção filtra localmente a lista já carregada, preservando a pessoa e os itens no cache. Cada cartão de avaliação é um botão de largura total: data em evidência, profissional/status e resumo de cores; ao pressionar, mostra estado ativo breve e somente o cartão acionado entra em carregamento.

## Estados e acessibilidade

| Contexto | idle | loading | success | empty | error | disabled |
|---|---|---|---|---|---|---|
| Menu próprio | valor atual | não se aplica | atualiza valor e fecha | texto de ausência | mantém seleção anterior | sem opções |
| Cartão de histórico | resumo legível | cartão acionado indica abertura | exibe detalhe | convite para primeira avaliação | cache/recuperação no contexto | não se aplica |
| Sincronização | estado existente | envio existente | confirmação existente | sem pendências | retry existente | durante envio |

- Teclado: `Enter`/espaço, setas, `Home`, `End` e `Esc`; foco retorna ao trigger ao fechar.
- Toque: trigger e opções com pelo menos 48 px.
- Motion: apenas `opacity` e `transform`, 180–220 ms; instantâneo com `prefers-reduced-motion`.
- O lime `#E2FF42` fica reservado para foco, CTA clínica, seleção ativa e marca.

## Verificação

- Testes do componente comprovam que os valores submetidos por `FormData` permanecem iguais.
- Testes de views cobrem profissional, sexo e filtro usando o componente reutilizável.
- Teste de CSS cobre popover, bottom sheet, foco, redução de movimento e ausência de scroll horizontal.
- Inspeção manual em desktop e mobile confirma menu sem aparência do navegador, navegação com teclado e logo legível.
