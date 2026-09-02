export function cameroonLocalDigits(input) {
  let digits = String(input || '').replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('237')) digits = digits.slice(3);
  digits = digits.replace(/^0+/, '');
  return digits;
}

export function toE164CM(input) {
  const local = cameroonLocalDigits(input);
  if (local.length !== 9 || local[0] !== '6') return '';
  return `+237${local}`;
}

/** Campay collect / holder_info expect 2376XXXXXXXX */
export function toCampayMsisdn(input) {
  const local = cameroonLocalDigits(input);
  if (local.length !== 9 || local[0] !== '6') return '';
  return `237${local}`;
}

export function toE164Any(input) {
  const raw = String(input || '').trim();
  let digits = raw.replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (raw.startsWith('+') && digits.length >= 8 && digits.length <= 15) return `+${digits}`;
  if (digits.length >= 11 && digits.length <= 15) return `+${digits}`;
  return toE164CM(raw);
}

export function looksLikePhone(name) {
  return /^\+?\d[\d\s-]{6,}$/.test(String(name || '').trim());
}

export function formatXaf(amount) {
  return `${Number(amount || 0).toLocaleString('en-US')} F CFA`;
}
