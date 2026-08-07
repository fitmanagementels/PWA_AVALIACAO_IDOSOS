# Relatório A5 digital premium

## Objetivo

Revisar o protótipo do relatório de avaliação funcional para leitura digital em celular, tablet e desktop. O A5 continua sendo o formato de arquivo, mas deixa de simular uma folha de impressão com uma área editorial pequena no centro.

## Decisões aprovadas

- O relatório usa a página inteira como superfície de leitura, com margens internas discretas.
- A primeira página é um resumo convidativo para aluno e familiar; as páginas seguintes trazem o detalhamento técnico.
- A logo colorida XSTEAM abre o documento em um cabeçalho premium e compacto, coerente com o PWA e sem dominar a primeira página.
- O verde muito escuro organiza a marca; o amarelo-limão é reservado a acentos e à logo.
- Os cartões de resultado ocupam mais espaço vertical e equilibram a primeira página.
- Páginas técnicas usam fundo contínuo, títulos editoriais, cartões claros e uma marca d’água discreta.
- A etiqueta interna “A5 denso” não aparece no PDF.
- O rodapé conserva a data e a hora de geração, por ser útil para rastrear a versão compartilhada, além do número da página.
- Apenas testes concluídos e incluídos no relatório aparecem. A observação do profissional aparece somente quando houver conteúdo.

## Estrutura visual

### Superfície e margens

O fundo claro preenche integralmente cada página. O conteúdo respeita uma área de segurança compacta, adequada a visualizadores de PDF e sem a intenção de impressão.

### Primeira página

1. Cabeçalho de marca compacto em toda a largura útil, com logo colorida menor, nome da marca e contexto “Avaliação” discreto.
2. Título “Resumo da sessão” e breve explicação.
3. Identificação leve do aluno, data da avaliação, última atualização e profissional responsável, sem o rótulo redundante “Prontuário funcional”.
4. Grade de resultados realizados, em cartões de leitura rápida, com bordas e sombras mais discretas e maior ênfase nos valores.
5. Observações do profissional, quando preenchidas.
6. Rodapé sutil com data/hora de geração e página.

### Páginas técnicas

1. Título da seção e identificação curta do aluno/sessão na primeira página técnica.
2. Agrupamento por domínio funcional.
3. Cartões com resultado, tentativas, critério, dispositivo e referência quando aplicáveis.
4. Marca d’água de baixa opacidade, sem competir com os dados.
5. Aviso clínico curto somente na última página técnica.
6. Rodapé com data/hora de geração e página.

## Regras de conteúdo

- Nenhum resultado recebe interpretação automática genérica.
- Selos curtos como “referência”, “escore” e “sem referência” são permitidos apenas quando descrevem objetivamente a natureza do valor.
- Classificações clínicas futuras dependem da regra específica de cada teste.
- Notas internas de logística não entram no relatório.

## Verificação

- Confirmar três páginas A5 sem cortes nem cabeçalhos/rodapés do navegador.
- Abrir o PDF em visualizador desktop e em tela estreita para conferir contraste, tamanho e densidade.
- Confirmar que a primeira página usa melhor a altura disponível e que “A5 denso” não existe no arquivo final.
