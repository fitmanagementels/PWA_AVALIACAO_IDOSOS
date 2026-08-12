import { formatDateBr, formatDateTimeBr } from '../date-format.js';
import { buildReportModel } from '../report-model.js';

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
}[character]));

export function renderReportPreview(root, options) {
  const model = buildReportModel(options);
  root.innerHTML = `<section class="report-preview-screen"><div class="report-preview-actions" aria-label="Ações do relatório"><button class="secondary" type="button" data-report-back>Voltar</button><button type="button" data-report-print>Salvar / compartilhar PDF</button></div>${reportDocumentMarkup(model)}</section>`;
  root.querySelector('[data-report-back]').onclick = () => options.onBack?.();
  root.querySelector('[data-report-print]').onclick = () => window.print();
}

function reportDocumentMarkup(model) {
  const { meta, summary, technical } = model;
  const personLabel = `${escapeHtml(meta.name)}${meta.age === null ? '' : ` · ${meta.age} anos`}`;
  const context = [
    meta.date ? `Avaliação em ${formatDateBr(meta.date)}` : null,
    meta.updatedAt ? `Atualizado às ${formatDateTimeBr(meta.updatedAt).split(' às ')[1] || formatDateTimeBr(meta.updatedAt)}` : null,
    meta.professionalName ? `Responsável: ${escapeHtml(meta.professionalName)}` : null
  ].filter(Boolean).join(' · ');
  return `<article class="report-document" aria-label="Relatório de avaliação funcional">
    <header class="report-cover">
      <div class="report-brand"><img src="./icons/xsteam-mark.svg" width="56" height="56" alt=""><span><strong>XSTEAM</strong><small>Avaliação funcional</small></span></div>
      <span class="report-cover__label">AVALIAÇÃO</span>
    </header>
    <section class="report-summary">
      <p class="report-kicker">RELATÓRIO DE AVALIAÇÃO FUNCIONAL</p>
      <h1>Resumo da sessão</h1>
      <p class="report-intro">Resultados objetivos dos testes concluídos.</p>
      <div class="report-person-context"><div><strong>${personLabel}</strong><span>${context || 'Dados da sessão'}</span></div><span class="report-person-context__kind">PRONTUÁRIO<br>FUNCIONAL</span></div>
      ${meta.isPendingSync ? '<p class="report-pending">Dados deste aparelho ainda não sincronizados.</p>' : ''}
      <section class="report-section" aria-labelledby="report-results-title"><h2 id="report-results-title">Resultados realizados</h2><div class="report-result-grid">${summary.cards.map(summaryCardMarkup).join('')}</div>${summary.hasBilateral ? '<p class="report-side-legend">D = direita · E = esquerda</p>' : ''}</section>
      ${summary.studentObservations ? `<section class="report-observations"><h2>Observações do profissional</h2><p>${escapeHtml(summary.studentObservations).replace(/\n/g, '<br>')}</p></section>` : ''}
    </section>
    <section class="report-technical" aria-labelledby="report-technical-title">
      <div class="report-technical__heading"><p class="report-kicker">${escapeHtml(meta.name)}${meta.date ? ` · ${formatDateBr(meta.date)}` : ''}</p><h2 id="report-technical-title">Detalhamento técnico</h2></div>
      ${technical.domains.map(domainMarkup).join('')}
    </section>
    <footer class="report-footer"><span>XSTEAM · Avaliação funcional</span><span>Gerado em ${formatDateTimeBr(new Date().toISOString())}</span></footer>
  </article>`;
}

function summaryCardMarkup(test) {
  return `<article class="report-result-card"><h3>${escapeHtml(test.title)}</h3><strong>${escapeHtml(test.value)}</strong>${test.classification ? `<span>${escapeHtml(test.classification)}</span>` : ''}</article>`;
}

function domainMarkup(domain) {
  return `<section class="report-domain"><h3>${escapeHtml(domain.name)}</h3>${domain.tests.map(technicalCardMarkup).join('')}</section>`;
}

function technicalCardMarkup(test) {
  const sides = test.sides.map((side) => `<div class="report-side"><span>${escapeHtml(side.label || 'Resultado')}</span><strong>${escapeHtml(`${side.value}${side.unit ? ` ${side.unit}` : ''}`)}</strong>${side.attempts.length ? `<small>Tentativas: ${side.attempts.map((attempt) => `${escapeHtml(attempt.order)}ª: ${escapeHtml(attempt.value)}`).join(' · ')}${side.unit ? ` ${escapeHtml(side.unit)}` : ''}</small>` : ''}</div>`).join('');
  return `<article class="report-technical-card"><div class="report-technical-card__top"><h4>${escapeHtml(test.title)}</h4>${test.classification ? `<span>${escapeHtml(test.classification)}</span>` : ''}</div><strong class="report-technical-card__value">${escapeHtml(test.value)}</strong><div class="report-side-grid">${sides}</div></article>`;
}
