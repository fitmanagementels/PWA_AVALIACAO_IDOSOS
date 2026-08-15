# Acabamento global — Cobalto silencioso

## Objetivo

Aplicar uma evolução visual global ao PWA XSTEAM, preservando todos os fluxos, arquitetura de informação, dados e integrações existentes. A direção substitui a presença dominante do verde do tema atual por profundidade azul-obisidiana, mantendo o lime como sinal funcional raro.

## Escopo

- Atualizar somente tokens, superfícies, bordas, texto, estados de interação, sombras e efeitos de contexto em `web/styles/app.css` e o `theme-color` do documento/manifesto.
- Aplicar o mesmo sistema às telas de atendimentos, pessoas, avaliação, histórico, relatórios, modais de teste, seletores, formulários e dock de sincronização.
- Preservar a logo original e todos os componentes, rotas, chamadas ao backend e comportamento de sincronização.
- Não alterar a estrutura de dados, APIs, filas, textos clínicos nem a hierarquia de ações já aprovada.

## Sistema de superfícies

| Nível | Token | Valor | Uso |
|---|---|---:|---|
| Base | `--surface-base` | `#06080D` | Fundo da aplicação e áreas de respiro. |
| Card | `--surface-card` | `#0E131D` | Cards, formulários, campos agrupados e conteúdo operacional. |
| Elevada | `--surface-elevated` | `#192232` | Cabeçalhos internos, detalhes expandidos e painéis de contexto. |
| Ativa | `--surface-active` | `#2A3850` | Hover, seleção persistente e controles em interação. |
| Overlay | `--surface-overlay` | `#05070C` | Menus, modal e dock translúcido. |
| Campo | `--surface-field` | `#090E15` | Inputs, selects e textareas. |

Os cartões utilizam gradiente interno de baixa amplitude, indo da superfície elevada para a superfície card. O gradiente organiza profundidade; ele não deve ser usado como decoração espalhada.

## Cor, tipografia e bordas

| Categoria | Token | Valor | Uso |
|---|---|---:|---|
| Texto primário | `--text-primary` | `#F3F6F4` | Títulos, valores e ações. |
| Texto secundário | `--text-secondary` | `#B2C0CD` | Descrições e metadados importantes. |
| Texto atenuado | `--text-muted` | `#7E90A4` | Rótulos auxiliares e informação de baixa prioridade. |
| Borda | `--border` | `#34425B` | Limites de card, divisor e controle. |
| Borda suave | `--border-subtle` | `#273347` | Separação interna e textura de baixo contraste. |
| Foco/lime | `--focus` | `#E2FF42` | Foco visível, marca, CTA principal e métrica prioritária. |
| Sucesso | `--success` | `#9DDC96` | Confirmação de sincronização e resultado positivo. |
| Alerta | `--warning` | `#E5BF4B` | Pendência e atenção. |
| Erro | `--danger` | `#FF8D74` | Erro, remoção e ação destrutiva. |

O lime não será fundo recorrente, borda padrão, título ou decoração genérica. Estados de sucesso, alerta e erro preservam texto e geometria próprios e não dependem somente de cor.

## Detalhes de acabamento

1. O fundo recebe gradiente vertical discreto de azul-noite para azul-obisidiana, com um único brilho radial cobalto muito fraco em áreas amplas de contexto.
2. Textura diagonal de baixa opacidade aparece somente em fundos de página, cabeçalhos de tela ou área vazia; não sobre dados, inputs ou texto clínico.
3. A marca de fundo usa o símbolo SVG original da XSTEAM, sem filtro, distorção ou redesenho. Ela aparece com baixa opacidade, fora das áreas de leitura e sem competir com o logo do cabeçalho.
4. Cards de avaliação, atendimento e histórico recebem gradiente curto e sombra estrutural suave. Os dados internos permanecem em superfície estável para leitura.
5. Menus suspensos customizados, modais e sheets usam a superfície overlay, borda azul-acinzentada e sombra profunda.
6. O foco de teclado permanece em lime com contorno de 3px e offset adequado.

## Motion e responsividade

- Transições de hover, seleção e abertura usam somente `transform` e `opacity`, entre 180 e 220 ms.
- `prefers-reduced-motion` remove animações não essenciais sem ocultar informação.
- Em mobile, não haverá textura ou watermark competindo com campos e cards; os mesmos níveis de superfície serão preservados em coluna única.
- Os alvos de toque permanecem com no mínimo 48px nos fluxos operacionais.

## Critérios de aceite

- Todas as telas do PWA exibem as quatro superfícies distinguíveis por luminância e borda.
- O verde dominante atual desaparece de fundos, cards e campos; o lime fica restrito aos usos definidos.
- O símbolo de fundo é discreto, é o ativo original e não prejudica contraste.
- Estados de hover, seleção, foco, carregamento, vazio, erro e sucesso continuam legíveis em desktop e mobile.
- Os testes existentes permanecem aprovados e nenhum arquivo de regra de negócio é alterado.
