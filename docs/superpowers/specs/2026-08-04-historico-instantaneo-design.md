# Histórico instantâneo e busca local

## Objetivo

Permitir que o profissional navegue por pessoas e históricos sem esperar a planilha, mantendo os dados compartilhados atualizados em segundo plano.

## Fluxo

- A lista de pessoas recebe um campo de busca local por nome.
- Cada histórico de pessoa é salvo no dispositivo após uma resposta válida da API.
- Ao abrir o histórico, o app mostra imediatamente o último conteúdo salvo e informa que está atualizando.
- A consulta à planilha continua em segundo plano. Se houver dados novos, substitui a lista e atualiza o cache.
- Sem cache, a tela mantém o estado de carregamento atual.
- O histórico inclui filtros locais por teste e período; não faz novas chamadas à API.

## Limites

- Dados detalhados de uma avaliação continuam sendo solicitados apenas ao abrir aquela avaliação.
- Cache é uma cópia operacional local, não substitui a planilha compartilhada.
- Nenhuma alteração é feita nos dados clínicos, nas regras de cor ou no relatório.
