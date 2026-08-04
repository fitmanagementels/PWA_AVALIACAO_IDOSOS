# Formatação brasileira de datas e horários

## Objetivo

Apresentar datas e horários do PWA no padrão brasileiro, sem alterar os valores persistidos no Google Sheets.

## Regras

- Datas clínicas sem horário (nascimento e data da avaliação): `dd/MM/aaaa`.
- Eventos com horário (criação, atualização e sincronização): `dd/MM/aaaa às HH:mm`, no fuso horário local do dispositivo.
- Valores ISO que representam somente uma data usam os dez primeiros caracteres (`aaaa-mm-dd`) antes da formatação. Assim, o fuso não desloca o dia exibido.

## Implementação e verificação

Um módulo de apresentação concentra as duas formatações. As telas de pessoas e avaliação passam a usá-lo, com testes para data ISO com hora e data pura.
