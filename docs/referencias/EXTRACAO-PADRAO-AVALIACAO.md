# Extração de referências — PADRÃO-AVALIAÇÃO

> Fonte analisada: `PADRÃO-AVALIAÇÃO.pdf`, disponível nesta pasta. Extração realizada em 15/08/2026. Este documento transcreve o material-fonte; uma regra só deve ser ativada na aba `Referencias` quando estiver sem ambiguidade ou tiver validação profissional registrada.

## O que o PDF permite cadastrar agora

### 2-Minute Step Test

Fonte indicada no próprio PDF: Jones & Rikli (2002). A medida é o número de elevações do joelho direito em dois minutos. O material apresenta classificação por sexo e idade, que pode ser representada no modelo `faixas-por-sexo-e-idade`, com a unidade `elevações`.

| Sexo | Idade | Abaixo da média | Média | Acima da média |
| --- | ---: | ---: | ---: | ---: |
| Masculino | 60–64 | < 87 | 87–115 | > 115 |
| Masculino | 65–69 | < 86 | 86–116 | > 116 |
| Masculino | 70–74 | < 80 | 80–110 | > 110 |
| Masculino | 75–79 | < 73 | 73–109 | > 109 |
| Masculino | 80–84 | < 71 | 71–103 | > 103 |
| Masculino | 85–89 | < 59 | 59–91 | > 91 |
| Masculino | 90–94 | < 52 | 52–86 | > 86 |
| Feminino | 60–64 | < 75 | 75–107 | > 107 |
| Feminino | 65–69 | < 73 | 73–107 | > 107 |
| Feminino | 70–74 | < 68 | 68–101 | > 101 |
| Feminino | 75–79 | < 68 | 68–100 | > 100 |
| Feminino | 80–84 | < 60 | 60–91 | > 91 |
| Feminino | 85–89 | < 55 | 55–85 | > 85 |
| Feminino | 90–94 | < 44 | 44–72 | > 72 |

Essas faixas são completas, não têm sobreposição e podem ser cadastradas como a próxima referência ativa, preservando sexo e idade na data da avaliação.

## Regras de escore presentes no PDF, ainda não ativadas

O SPPB é um conjunto único no produto. As regras abaixo pertencem aos seus componentes, não são faixas normativas por sexo/idade.

### Caminhada de 4 m

| Tempo | Escore informado |
| --- | ---: |
| ≤ 4,82 s | 4 |
| 4,83–6,20 s | 3 |
| 6,21–8,70 s | 2 |
| `8,70 s` | 1 |
| Incapaz de completar | 0 |

**Ponto a validar:** a última linha está escrita como `8,70 segundos: 1 ponto`, sem operador. Ela se sobrepõe à faixa anterior em 8,70 s. A interpretação operacional já usada nos testes internos do projeto é `> 8,70 s = 1`, mas essa correção não deve ser apresentada como transcrição literal nem ativada sem validação.

### Sentar e levantar 5 vezes

| Tempo | Escore informado |
| --- | ---: |
| ≥ 11,19 s | 4 |
| 11,20–13,69 s | 3 |
| 13,70–16,69 s | 2 |
| > 16,70 s | 1 |
| > 60 s ou incapaz | 0 |

**Não ativar ainda.** A primeira faixa usa `≥ 11,19 s = 4`, o que conflita com as faixas seguintes e com a lógica de que menor tempo representa melhor desempenho. É necessária a confirmação da tabela correta antes de qualquer escore automático.

### Equilíbrio estático

| Condição | Escore informado |
| --- | ---: |
| Mantém as 3 posições por 10 s | 4 |
| Mantém 2 posições por 10 s | 3 |
| Mantém 1 posição por 10 s | 2 |
| Não mantém nenhuma posição por 10 s | 1 |
| Incapaz de tentar | 0 |

A regra está clara, mas a ficha atual precisa guardar cada uma das três posições para calculá-la e explicá-la adequadamente. Ela deve entrar junto com o refinamento da ficha do SPPB, não como uma referência genérica isolada.

## Testes sem faixa de referência no PDF

- **Back Scratch:** o PDF informa procedimento, duas tentativas válidas por lado e que o maior valor é melhor; não contém tabela de valores de referência. A linha já existente na planilha (`ref-back-scratch-v1`) veio de fonte fornecida anteriormente pelo responsável do projeto, não desta extração.
- **Chair Sit-and-Reach:** o PDF informa procedimento, duas tentativas válidas por lado e medida em centímetros; não contém tabela de valores de referência.
- **Extensão isométrica de joelho** e **remada isométrica:** não há faixa de referência no PDF.

## Decisão recomendada

1. Cadastrar agora a referência completa do **2-Minute Step Test** como `ref-step-2min-v1`.
2. Manter Back Scratch como a única outra referência ativa.
3. Não criar classificação para Chair Sit-and-Reach ou força até receber uma fonte com valores de referência.
4. Tratar o SPPB como uma regra de escore própria e validá-lo antes de exibi-lo no PWA e no PDF.
