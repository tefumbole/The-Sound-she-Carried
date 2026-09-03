import { COUNTRIES } from '../lib/countries';

export default function PhoneInput({ iso, local, onIso, onLocal, required, dark }) {
  const country = COUNTRIES.find((c) => c.iso === iso) || COUNTRIES[0];
  return (
    <div className="flex gap-2">
      <select
        value={country.iso}
        onChange={(e) => onIso(e.target.value)}
        className={`rounded-xl text-gold text-base px-2 min-h-12 max-w-[7.8rem] border border-gold/25 ${dark ? 'bg-white/10' : 'bg-navyMid'}`}
      >
        {COUNTRIES.map((c) => (
          <option key={c.iso} value={c.iso}>{c.flag} +{c.dial}</option>
        ))}
      </select>
      <input
        value={local}
        onChange={(e) => onLocal(e.target.value.replace(/\D/g, '').slice(0, country.max))}
        placeholder={dark ? '6XX XX XX XX' : 'Phone number'}
        className={`${dark ? 'field-soft' : 'field-modern'} flex-1`}
        inputMode="tel"
        required={required}
      />
    </div>
  );
}
