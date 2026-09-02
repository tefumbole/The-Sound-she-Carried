import { COUNTRIES } from '../lib/countries';

export default function PhoneInput({ iso, local, onIso, onLocal, required }) {
  const country = COUNTRIES.find((c) => c.iso === iso) || COUNTRIES[0];
  return (
    <div className="flex gap-2">
      <select
        value={country.iso}
        onChange={(e) => onIso(e.target.value)}
        className="rounded-lg bg-navyMid text-gold text-sm px-2 min-h-10 max-w-[8.5rem] border border-gold/25"
      >
        {COUNTRIES.map((c) => (
          <option key={c.iso} value={c.iso}>{c.flag} +{c.dial}</option>
        ))}
      </select>
      <input
        value={local}
        onChange={(e) => onLocal(e.target.value.replace(/\D/g, '').slice(0, country.max))}
        placeholder="Phone number"
        className="flex-1 rounded-lg bg-white text-ink px-3 min-h-10"
        required={required}
      />
    </div>
  );
}
