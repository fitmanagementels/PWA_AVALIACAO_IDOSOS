# Implantação

## Pré-requisitos

- Uma planilha Google exclusiva para a base de dados.
- Uma conta Google que possa criar e publicar o projeto Apps Script.
- Node.js 18 ou superior para executar os testes locais.

## Apps Script

1. No diretório do projeto, execute `npx @google/clasp create --type webapp --title "PWA Avaliação Idosos"`.
2. Mantenha o `.clasp.json` gerado apenas na máquina local; ele é ignorado pelo Git.
3. Defina o ID da planilha nas propriedades do script quando o repositório Apps Script estiver implementado.
4. Execute a função `setupSpreadsheet()` uma vez para criar as abas e os profissionais iniciais.

## Verificação local

Execute `npm test`. A saída deve terminar com zero falhas.
