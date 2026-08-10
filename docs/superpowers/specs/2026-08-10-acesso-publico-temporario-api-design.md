# Acesso público temporário da API — desenho

## Objetivo

Permitir que o PWA hospedado no GitHub Pages sincronize com o Apps Script durante a fase de desenvolvimento, sem login e apenas com dados não sensíveis de teste.

## Decisão

A implantação Web App do Apps Script será configurada temporariamente para **Qualquer pessoa**, executando como o proprietário do script. O endereço de API já configurado no PWA permanece inalterado.

## Fluxo

1. O PWA continua salvando cada ação imediatamente na fila local.
2. Quando houver conectividade e a implantação estiver pública, a fila envia as ações ao Apps Script.
3. O Apps Script grava as alterações na planilha e devolve a confirmação.
4. Caso a implantação volte a ser privada antes da sincronização, a ação não é descartada: permanece localmente pendente e será reenviada quando uma API acessível voltar a estar configurada.

## Escopo e limites

- Publicação de código no GitHub Pages continua independente da permissão do Apps Script: atualizações visuais e de código do PWA podem ser feitas normalmente.
- Com a API pública, qualquer pessoa que descubra o endereço pode tentar usar as rotas atuais. Portanto, esta configuração é restrita a testes sem dados clínicos, pessoais ou reais.
- Antes do uso operacional, a implantação pública será removida e substituída por autenticação Google com lista de e-mails autorizados.

## Verificação

- A rota `health` deve retornar JSON para uma chamada sem sessão Google.
- O PWA deve conseguir sincronizar as alterações pendentes e refletir o resultado na planilha.
- A fila local deve sobreviver caso a API esteja temporariamente indisponível.
