# Acesso da Web App por conta Google — desenho

## Objetivo

Permitir que o PWA hospedado no GitHub Pages sincronize com o Apps Script durante a fase de desenvolvimento, usando a sessão Google já aberta no navegador e mantendo a planilha privada.

## Decisão

A implantação adequada é uma **App da Web**, executando como o proprietário e disponível para **Qualquer pessoa com uma Conta do Google**. O PWA usa o endereço `/exec` desta Web App e envia `credentials: 'include'` em cada chamada para levar a sessão Google existente.

O Executável da API não é uma Web App e não pode ser usado pela URL `/exec`; ele não deve ser configurado em `web/config.js`.

## Fluxo

1. O PWA continua salvando cada ação imediatamente na fila local.
2. Quando houver conectividade e a pessoa estiver conectada ao Google no navegador, a fila envia as ações à Web App junto com sua sessão.
3. O Apps Script grava as alterações na planilha e devolve a confirmação.
4. Caso a sessão Google esteja ausente ou a API não responda, a ação não é descartada: permanece localmente pendente e pode ser reenviada depois.

## Escopo e limites

- Publicação de código no GitHub Pages continua independente da permissão do Apps Script: atualizações visuais e de código do PWA podem ser feitas normalmente.
- A planilha não é pública e o Apps Script exige uma conta Google. Os testes continuam usando dados não sensíveis até que a autorização por e-mail seja implementada.
- Antes do uso operacional, a autorização por e-mail será adicionada ao backend; a Web App continua a ser o canal de transporte.

## Verificação

- A rota `health` deve retornar JSON quando aberta no navegador já conectado ao Google.
- O PWA deve conseguir sincronizar as alterações pendentes e refletir o resultado na planilha.
- A fila local deve sobreviver caso a API esteja temporariamente indisponível.
