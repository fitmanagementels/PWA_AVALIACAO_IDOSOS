# Painel de teste XSTEAM — especificação de design

**Data:** 06/08/2026  
**Status:** design aprovado; plano técnico preparado.

## Objetivo

Substituir o formulário expansível dentro de cada cartão de teste por um painel contextual de preenchimento. A tela principal da avaliação passa a mostrar somente resumos compactos dos testes, reduzindo a poluição visual e preparando a interface para a futura anamnese.

## Limites e preservações

- Manter o modelo atual de avaliações, resultados, tentativas, rascunho local, fila de sincronização e Apps Script.
- Não criar chamadas de backend ao abrir, preencher ou fechar um painel de teste.
- Não alterar regras de cálculo: melhor tentativa, SPPB, teste não concluído e conclusão da avaliação continuam usando as regras existentes.
- Manter o salvamento local a cada alteração. A ação do painel não deve aguardar sincronização remota.
- Não incluir imagem clínica agora. Cada teste terá apenas um placeholder padronizado para inserção posterior de uma referência visual.

## Fluxo de trabalho recorrente

1. Profissional entra em uma avaliação em rascunho.
2. Vê os cartões compactos de todos os testes, cada um com estado e resumo de tentativas.
3. Toca em um cartão para abrir o painel daquele teste.
4. Consulta o procedimento e a referência visual, registra os valores ou marca “Não concluído”.
5. O rascunho é persistido localmente enquanto digita.
6. Toca em “Salvar e voltar”; o painel fecha e o cartão de origem é atualizado sem mudar a posição da lista.
7. Ao final da sessão, usa os CTAs existentes “Salvar e sincronizar” ou “Concluir avaliação”.

Há uma única ação primária dentro do painel: **Salvar e voltar**. Ela persiste localmente, atualiza o resumo e fecha o painel; não compete com a sincronização da avaliação inteira.

## Navegação e overlay

### Tipo escolhido

Usar uma **sheet contextual de teste**, não uma nova rota e não um modal de confirmação. Ela é uma camada de detalhe recorrente sobre a avaliação e interrompe menos o trabalho porque preserva a tela, os demais testes e a posição de rolagem.

### Gatilho, conteúdo e fechamento

| Aspecto | Decisão |
|---|---|
| Abrir | tocar no cartão inteiro ou no comando textual “Abrir” |
| Fundo | scrim verde-preto translúcido; a avaliação continua discernível, porém inativa |
| Desktop | painel central amplo, com largura limitada e rolagem interna quando necessário |
| Mobile | sheet alta, com área de toque segura, transformada para quase tela cheia |
| Fechar | `×`, `Esc`, botão “Salvar e voltar”, voltar da sheet ou toque no scrim |
| Segurança ao fechar | valores já foram salvos localmente; se o persistir localmente falhar, exibir erro no painel e não fechá-lo silenciosamente |
| Retorno | restaurar foco no cartão que abriu o painel e manter a posição de rolagem da avaliação |

O cabeçalho e o procedimento não ficam fixos: rolam naturalmente com o conteúdo do painel. Isso dá espaço máximo aos campos sem perder contexto no início do teste.

## Organização do painel

### Desktop

```text
[ Nome do teste · estado                                      fechar × ]

[ IMAGEM DE REFERÊNCIA 4:3 ] [ Procedimento ]
[ placeholder para inserir ] [ instrução curta e unidade ]

[ Não concluído ]

DIREITO
[ tentativa 1 ] [ tentativa 2 ]

ESQUERDO
[ tentativa 1 ] [ tentativa 2 ]

[ resumo calculado ]                              [ Salvar e voltar ]
```

- A imagem fica sempre à esquerda no desktop.
- O placeholder tem proporção 4:3, borda discreta, rótulo textual “Imagem de referência” e instrução “Inserir referência do teste”.
- Procedimento ao lado direito: título, orientação curta já existente no catálogo do teste e unidade usada.
- Campos numéricos de tentativas são compactos, com rótulo acima e unidade como sufixo visual. Não usam largura integral quando o valor esperado é curto.
- Em testes bilaterais, cada lado é uma subseção; tentativas ficam lado a lado. No teste único, a grade usa apenas os campos necessários.
- O SPPB permanece um painel próprio, organizado em subgrupos “Caminhada”, “Sentar e levantar” e “Equilíbrio”, com campos curtos em grade; não será forçado ao desenho bilateral.

### Mobile

- A imagem ocupa toda a largura disponível e aparece antes do procedimento.
- Campos de mesma etapa ocupam duas colunas quando conservarem alvo mínimo de 48 px; em telas menores, passam para uma coluna sem rolagem horizontal.
- “Salvar e voltar” fica ao fim natural da sheet. Não é fixo, pois o rascunho local já protege a digitação e a tela já possui uma faixa fixa de sincronização.
- O retorno do sistema/navegador fecha apenas a sheet e devolve o foco ao cartão; só volta para a pessoa se nenhuma sheet estiver aberta.

## Cartões compactos da avaliação

Cada cartão fechado apresenta somente informação derivada dos valores já locais:

- nome do teste e marcador textual/visual de estado;
- melhor resultado por lado, quando houver valor suficiente;
- progresso de tentativas, como “2 de 4 tentativas preenchidas”;
- motivo resumido quando “Não concluído” estiver marcado;
- comando “Abrir” com indicador direcional.

Não exibir todos os campos, instruções longas ou classificações no cartão fechado. O resumo é calculado de `draftInputs` enquanto a avaliação ainda é rascunho e de `results` depois que os dados foram materializados para salvar/concluir.

## Estados

| Superfície/ação | Idle | Loading | Success | Empty | Error | Disabled |
|---|---|---|---|---|---|---|
| Cartão de teste | título, estado e resumo | indicador discreto durante persistência local | resumo atualizado ao fechar | “Nenhuma tentativa” + abrir | aviso de rascunho local indisponível | não se aplica |
| Sheet de teste | procedimento, placeholder e campos | “Salvando neste aparelho…” sem bloquear digitação | “Alterações salvas neste aparelho” antes de fechar | campos vazios e orientação | mensagem persistente + “Tentar salvar novamente” | “Salvar e voltar” somente enquanto persistência estiver em andamento |
| Não concluído | toggle desligado e campos ativos | não se aplica | motivo salvo localmente | motivo vazio | validação textual se tentar concluir sem motivo | campos de medição visualmente inativos quando toggle ligado |
| Placeholder visual | moldura com rótulo e ícone neutro | não se aplica | futura imagem exibida | “Inserir referência do teste” | imagem indisponível, com texto alternativo preservado | não se aplica |

## Acessibilidade e motion

- A sheet terá `role="dialog"`, nome acessível com o nome do teste, foco inicial no título/primeiro controle e foco contido enquanto estiver aberta.
- `Esc`, botão fechar e toque no scrim fecham a sheet após a persistência local atual; o foco retorna ao cartão originador.
- Todo controle possui rótulo textual; campos numéricos mantêm unidade visível e alvo de toque mínimo de 48 px.
- O placeholder terá texto alternativo inicial, sem apresentar uma imagem inventada como se fosse instrução clínica.
- Abertura/fechamento usa apenas `opacity` e `transform` em 180–250 ms. Com `prefers-reduced-motion`, a troca ocorre instantaneamente e os mesmos estados textuais permanecem visíveis.

## Dados, sincronização e testes futuros

- O painel reutiliza os mesmos nomes de campos e o mesmo `FormData` atual. Não muda payloads para Apps Script nem colunas da planilha.
- `persistDraft` mantém o rascunho em localStorage e IndexedDB durante edição; sincronização continua ocorrendo somente no CTA global de salvar/concluir e na fila existente.
- Um futuro catálogo visual pode mapear `testeId → imageUrl/alt`, sem alterar o componente de entrada; até lá, o placeholder é intencional.
- Testes automatizados devem cobrir: abrir/fechar preservando valores e foco; resumos de tentativas em vazio/parcial/completo/não concluído; SPPB separado; campos bilaterais em grade; bloqueio de fechamento quando a persistência local falhar; ausência de chamadas de API durante o fluxo do painel.

## Critérios de aceite

1. Nenhum formulário completo de teste permanece aberto na tela principal da avaliação.
2. Cada cartão mostra resumo real e suficiente para decidir qual teste abrir.
3. O painel exibe imagem-placeholder à esquerda no desktop e acima no mobile.
4. Valores digitados persistem ao fechar/reabrir o painel e ao navegar entre testes.
5. A avaliação pode ser salva/concluída com os mesmos dados e regras existentes.
6. A sheet é utilizável por toque, teclado e com redução de movimento.
