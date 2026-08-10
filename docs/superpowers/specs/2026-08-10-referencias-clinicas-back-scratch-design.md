# Referências clínicas — Back Scratch

## Objetivo

Transformar a aba existente `Referencias` na fonte versionada de critérios clínicos do PWA, começando pelo teste Back Scratch. A estrutura precisa suportar regras diferentes para testes futuros sem alterar colunas da planilha a cada novo modelo.

## Decisões aprovadas

- A aba `Referencias` mantém exatamente as colunas atuais: `referenciaId`, `testeId`, `versao`, `criteriosJson`, `classificacao` e `vigencia`.
- Cada teste usa uma linha por versão de sua referência, não uma linha por sexo, idade ou resultado qualitativo.
- `criteriosJson` contém o modelo e todos os limites específicos daquele teste.
- Para Back Scratch, a mesma faixa é aplicada a cada lado registrado (`direito` e `esquerdo`) de forma independente.
- A classificação usa o valor oficial de cada resultado concluído, em centímetros.
- Pacientes fora das faixas cadastradas, sem sexo informado, com unidade incompatível ou com teste não concluído não recebem inferência: o resultado permanece como `Sem referência disponível`.

## Linha a cadastrar

| Coluna | Valor |
|---|---|
| `referenciaId` | `ref-back-scratch-v1` |
| `testeId` | `back-scratch` |
| `versao` | `1` |
| `classificacao` | `qualitativa-3-faixas` |
| `vigencia` | `2026-08-10` |

O campo `criteriosJson` será armazenado como JSON válido, em uma única célula:

```json
{
  "modelo": "faixas-por-sexo-e-idade",
  "unidade": "cm",
  "aplicarPorLado": true,
  "rotulos": {
    "abaixo": "Abaixo da média",
    "normal": "Normal",
    "acima": "Acima da média"
  },
  "faixas": [
    { "sexo": "masculino", "idadeMin": 60, "idadeMax": 64, "normalMin": -16.5, "normalMax": 0 },
    { "sexo": "masculino", "idadeMin": 65, "idadeMax": 69, "normalMin": -19.1, "normalMax": -2.5 },
    { "sexo": "masculino", "idadeMin": 70, "idadeMax": 74, "normalMin": -20.3, "normalMax": -2.5 },
    { "sexo": "masculino", "idadeMin": 75, "idadeMax": 79, "normalMin": -22.9, "normalMax": -5.1 },
    { "sexo": "masculino", "idadeMin": 80, "idadeMax": 84, "normalMin": -24.1, "normalMax": -5.1 },
    { "sexo": "masculino", "idadeMin": 85, "idadeMax": 89, "normalMin": -25.4, "normalMax": -7.6 },
    { "sexo": "masculino", "idadeMin": 90, "idadeMax": 94, "normalMin": -26.7, "normalMax": -10.2 },
    { "sexo": "feminino", "idadeMin": 60, "idadeMax": 64, "normalMin": -7.6, "normalMax": 3.8 },
    { "sexo": "feminino", "idadeMin": 65, "idadeMax": 69, "normalMin": -8.9, "normalMax": 3.8 },
    { "sexo": "feminino", "idadeMin": 70, "idadeMax": 74, "normalMin": -10.2, "normalMax": 2.5 },
    { "sexo": "feminino", "idadeMin": 75, "idadeMax": 79, "normalMin": -12.7, "normalMax": 1.3 },
    { "sexo": "feminino", "idadeMin": 80, "idadeMax": 84, "normalMin": -14, "normalMax": 0 },
    { "sexo": "feminino", "idadeMin": 85, "idadeMax": 89, "normalMin": -17.8, "normalMax": -2.5 },
    { "sexo": "feminino", "idadeMin": 90, "idadeMax": 94, "normalMin": -20.3, "normalMax": -2.5 }
  ],
  "fonte": "Tabela de referência fornecida pelo responsável do projeto em 10/08/2026"
}
```

## Regra de interpretação

1. O backend seleciona a referência ativa por `testeId`, usando a versão de maior vigência aplicável.
2. Para o Back Scratch, encontra a faixa cujo `sexo` coincide com a pessoa e cuja idade esteja entre `idadeMin` e `idadeMax`, inclusive.
3. Valor estritamente menor que `normalMin`: `Abaixo da média`.
4. Valor entre `normalMin` e `normalMax`, inclusive nos dois limites: `Normal`.
5. Valor estritamente maior que `normalMax`: `Acima da média`.
6. Não havendo faixa compatível, não atribui classificação clínica.

## Extensibilidade

Outros testes reutilizarão a mesma linha-base, mas poderão declarar modelos diferentes em `criteriosJson`, como `pontuacao-por-componente`, `faixas-por-sexo-e-idade`, `limiar-unico` ou `percentis`. O interpretador do backend reconhece o campo `modelo`; a planilha não ganha colunas clínicas específicas de um único teste.

## Limites de escopo

Esta primeira referência não cria estimativas para idade menor que 60 ou maior que 94, não altera avaliações históricas e não substitui julgamento profissional. A fonte bibliográfica completa poderá substituir a descrição provisória de `fonte` quando for fornecida.

## Validação futura

- Ler a linha ativa da aba `Referencias` e validar o JSON antes de aplicá-lo.
- Testar cada uma das 14 faixas e seus limites exatos.
- Testar classificações direita e esquerda independentes.
- Confirmar que casos sem faixa compatível permanecem sem classificação.
- Confirmar que uma versão futura substitui a anterior sem modificar resultados históricos.
