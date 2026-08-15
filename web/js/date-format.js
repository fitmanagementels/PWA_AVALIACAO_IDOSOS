const BRAZIL_TIME_ZONE = 'America/Fortaleza';

export function ageInYears(birthDate, at = new Date()) {
  const birth = String(birthDate || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!birth || Number.isNaN(at?.getTime?.())) return null;
  const parts = new Intl.DateTimeFormat('pt-BR', { timeZone: BRAZIL_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' })
    .formatToParts(at)
    .reduce((result, part) => ({ ...result, [part.type]: part.value }), {});
  const year = Number(parts.year);
  const month = Number(parts.month);
  const day = Number(parts.day);
  return year - Number(birth[1]) - Number(month < Number(birth[2]) || (month === Number(birth[2]) && day < Number(birth[3])));
}

export function formatDateBr(value) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : '—';
}

export function formatDateTimeBr(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  const parts = new Intl.DateTimeFormat('pt-BR', {
    timeZone: BRAZIL_TIME_ZONE,
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(date).reduce((result, part) => ({ ...result, [part.type]: part.value }), {});
  return `${parts.day}/${parts.month}/${parts.year} às ${parts.hour}:${parts.minute}`;
}
