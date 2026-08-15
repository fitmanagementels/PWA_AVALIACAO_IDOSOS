# Brand visual contract

## Contexto e premissas

- Requisitos considerados: melhorar a organização dos perfis na Central de Atendimentos; separar visualmente cada aluno; reforçar a hierarquia entre identificação, contexto clínico e próxima ação; manter pesquisa, novo cadastro e rascunhos arquivados acessíveis.
- Premissas: a lista atual não exige comparação tabular entre alunos; cada pessoa tem uma única ação operacional prioritária; os dados mostrados continuam os mesmos e nenhuma chamada adicional ao backend será criada por esta mudança visual.
- Tarefa e decisão principais: localizar rapidamente uma pessoa e executar a ação segura de maior prioridade para ela — retomar rascunho, retomar avaliação, ver atendimento ou iniciar uma nova avaliação.

## Perfil

- Tipo: PWA operacional.
- Público e frequência: profissional de avaliação funcional, em uso recorrente durante atendimentos, tanto em celular quanto em desktop.
- Justificativa: a tela inicial inicia rotinas clínicas e retoma registros; ela não é uma tela de indicadores ou gestão comparativa.

## Tema

- Escolha: dark.
- Superfícies e justificativa: base escura para a página; card escuro para cada perfil; superfície ativa somente em hover/foco; overlay não aplicável nesta lista. O lime `#E2FF42` fica reservado para o CTA de cadastro e foco visível, preservando contraste e o caráter operacional da marca.

## Densidade

- Escolha: confortável.
- Justificativa: há poucos dados por pessoa, mas o reconhecimento correto de cada aluno é clínico e sensível. Mais espaço vertical reduz seleções erradas, sem transformar a tela em uma grade excessivamente longa.

## Hierarquia

1. Identidade da tela: Central de Atendimentos, título, explicação curta e ações globais.
2. Busca: filtro de pessoas antes da listagem, com largura integral e leitura imediata.
3. Identidade de cada aluno: nome completo como título inequívoco do card; data de nascimento e sexo como metadados secundários.
4. Situação: chip de rascunho, avaliação em andamento, última avaliação ou ausência de registros, visualmente associado ao aluno correto.
5. Próxima ação: um único botão específico por card, próximo ao status correspondente.

## Zonas

| Zona | Objetivo | Conteúdo | Prioridade | Componente |
|---|---|---|---|---|
| Cabeçalho operacional | Orientar e iniciar o atendimento | Eyebrow, título, descrição, rascunhos arquivados e Nova pessoa | Alta | Hero compacto com zona de ação |
| Localização | Encontrar rapidamente uma pessoa | Campo Buscar pessoa | Alta | Campo de busca de largura integral |
| Lista de atendimentos | Reconhecer e escolher um aluno sem ambiguidade | Um card por pessoa, com nome e metadados | Alta | Pilha de cards operacionais |
| Próximo passo | Expor a decisão clínica atual do aluno | Status, data relevante e CTA específico | Alta | Rodapé/coluna de ação dentro do card |
| Estados de lista | Explicar ausência ou indisponibilidade sem quebrar o fluxo | Vazio, carregamento e erro | Média | Estado vazio dentro da zona de lista |

## Componentes

- Componente focal: card operacional de aluno. O card inteiro terá uma área de identificação selecionável e uma zona de ação claramente separada, sem que um aluno compartilhe bordas com o próximo.
- Fluxos lineares: buscar → escolher aluno → executar o próximo passo; cadastrar pessoa → abrir perfil. Não haverá atalhos que criem nova avaliação a partir do card quando já existir rascunho.
- Blocos de overview/bento: não aplicável. A Central prioriza continuidade do atendimento; bento adicionaria ruído sem apoiar a decisão primária.
- Dados densos — tabela ou cards e por quê: cards. A lista é curta, a decisão é individual e cada registro possui texto e ação próprios. A tabela atual dá a falsa sensação de comparação e encosta visualmente um aluno no outro.
- Estados vazios, carregamento, erro e sucesso: vazio informa que não há pessoas ou nenhum resultado de busca; carregamento mantém o esqueleto da lista sem bloquear busca; erro preserva a lista local e mostra mensagem curta; sucesso de sincronização continua apenas no dock já existente.

## Responsividade

- Mobile em coluna única: hero, busca e cards em uma única coluna. Cada card exibe nome e metadados primeiro; status e botão ficam logo abaixo, com alvo de toque mínimo de 48px.
- Ordem das zonas no mobile: cabeçalho operacional → busca → lista de cards → ação do card. O botão Nova pessoa preserva destaque, enquanto rascunhos arquivados fica como ícone discreto ao lado.
- Adaptação de dados densos: não aplicável; cards já evitam rolagem horizontal. Datas e estados podem quebrar linha, mas nome e ação não se sobrepõem.
- Expansão para telas maiores: cards continuam empilhados, com grade interna em duas colunas — identidade à esquerda e situação/ação à direita. Espaço entre cards substitui os divisores contínuos da tabela.

## Marca e acabamento

- Voz visual aplicada: Cobalto silencioso — tecnologia clínica escura, precisa e contida.
- Tema final e proporção dark (mínimo 60%): dark integral; superfícies claras não são usadas na interface operacional.
- Uso permitido de `#E2FF42` — marca/foco/ação/métrica: logo, CTA principal, foco visível de teclado e indicadores de prioridade. Não é fundo recorrente de cards ou páginas.
- Uso de geometria e efeitos: gradiente interno curto para diferenciar níveis de superfície; textura diagonal e símbolo XSTEAM original em baixa opacidade exclusivamente em áreas amplas de contexto, nunca sobre dados clínicos ou campos.

### Tokens aplicados

| Categoria | Token | Valor | Uso |
|---|---|---|---|
| Base | `--surface-base` | `#06080D` | Fundo de página. |
| Card | `--surface-card` | `#0E131D` | Conteúdo operacional. |
| Elevada | `--surface-elevated` | `#192232` | Cabeçalho interno e contexto. |
| Ativa | `--surface-active` | `#2A3850` | Hover e seleção. |
| Overlay | `--surface-overlay` | `#05070C` | Modais, menus e dock. |
| Campo | `--surface-field` | `#090E15` | Inputs e textareas. |
| Borda | `--border` | `#34425B` | Contornos e divisores. |
| Texto secundário | `--text-secondary` | `#B2C0CD` | Metadados e explicações. |

### Quatro superfícies

| Nível | Token | Luminância/borda | Conteúdo |
|---|---|---|---|
| base | `--surface-base` | Azul-obisidiana mais escuro | Página e respiro. |
| card | `--surface-card` | Azul profundo, borda fria sutil | Cards e formulários. |
| ativo | `--surface-active` | Azul cobalto dessaturado | Hover, seleção e interação persistente. |
| overlay | `--surface-overlay` | Quase preto azulado, sombra profunda | Menus, modais e dock. |

### Verificação final

- Desktop — contraste, foco, dados e estados: previsto para validação durante a implementação em cards, controles, modais e dock.
- Mobile — ordem, alcance, legibilidade, overflow e overlays: previsto para validação durante a implementação nos breakpoints existentes.
- Motion com `transform`/`opacity`: 180–220 ms somente em interação e feedback.
- `prefers-reduced-motion`: preservado com remoção de animações não essenciais.
- Pendências restantes: implementar tokens no CSS e executar testes visuais/automatizados.
