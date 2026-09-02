export const COUNTRIES = [
  { iso: 'CM', name: 'Cameroon', dial: '237', flag: '🇨🇲', max: 9 },
  { iso: 'NG', name: 'Nigeria', dial: '234', flag: '🇳🇬', max: 10 },
  { iso: 'GH', name: 'Ghana', dial: '233', flag: '🇬🇭', max: 9 },
  { iso: 'CI', name: 'Côte d’Ivoire', dial: '225', flag: '🇨🇮', max: 10 },
  { iso: 'SN', name: 'Senegal', dial: '221', flag: '🇸🇳', max: 9 },
  { iso: 'KE', name: 'Kenya', dial: '254', flag: '🇰🇪', max: 9 },
  { iso: 'UG', name: 'Uganda', dial: '256', flag: '🇺🇬', max: 9 },
  { iso: 'TZ', name: 'Tanzania', dial: '255', flag: '🇹🇿', max: 9 },
  { iso: 'RW', name: 'Rwanda', dial: '250', flag: '🇷🇼', max: 9 },
  { iso: 'ZA', name: 'South Africa', dial: '27', flag: '🇿🇦', max: 9 },
  { iso: 'FR', name: 'France', dial: '33', flag: '🇫🇷', max: 9 },
  { iso: 'GB', name: 'United Kingdom', dial: '44', flag: '🇬🇧', max: 10 },
  { iso: 'US', name: 'United States', dial: '1', flag: '🇺🇸', max: 10 },
  { iso: 'CA', name: 'Canada', dial: '1', flag: '🇨🇦', max: 10 },
  { iso: 'DE', name: 'Germany', dial: '49', flag: '🇩🇪', max: 11 },
  { iso: 'AE', name: 'UAE', dial: '971', flag: '🇦🇪', max: 9 },
];

export function toIntl(dial, local) {
  const digits = String(local || '').replace(/\D/g, '').replace(/^0+/, '');
  if (!digits) return '';
  return `+${dial}${digits}`;
}
