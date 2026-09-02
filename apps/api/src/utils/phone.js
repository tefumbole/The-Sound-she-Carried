export function cameroonLocalDigits(input) {
  let digits = String(input || '').replace(/\D/g, '');
  if (digits.startsWith('237')) digits = digits.slice(3);
  digits = digits.replace(/^0+/, '');
  return digits;
}

export function toE164CM(input) {
  const local = cameroonLocalDigits(input);
  if (local.length < 8 || local.length > 9) return '';
  return `+237${local}`;
}

export function looksLikePhone(name) {
  return /^\+?\d[\d\s-]{6,}$/.test(String(name || '').trim());
}

export function formatXaf(amount) {
  return `${Number(amount || 0).toLocaleString('en-US')} F CFA`;
}
