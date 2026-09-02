import { useEffect, useState } from 'react';
import { api, money } from '../lib/api';
import { useHolderLookup } from '../hooks/useHolderLookup';

const TIERS = [500000, 300000, 200000, 100000];

export default function GoldSponsorModal({ open, onClose, presetAmount }) {
  const [amount, setAmount] = useState(presetAmount || 500000);
  const [method, setMethod] = useState('mobile');
  const [phone, setPhone] = useState('');
  const [waDifferent, setWaDifferent] = useState(false);
  const [whatsapp, setWhatsapp] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const lookup = useHolderLookup(phone, open && method !== 'card');

  useEffect(() => {
    if (open && presetAmount) setAmount(presetAmount);
  }, [open, presetAmount]);

  if (!open) return null;

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const data = await api('/donations/initiate', {
        method: 'POST',
        body: JSON.stringify({
          amount,
          method,
          kind: 'gold_sponsor',
          phone,
          holder_name: lookup.holder,
          whatsapp_phone: waDifferent ? whatsapp : phone,
        }),
      });
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
        return;
      }
      window.location.href = `/donate/pending/${data.id}`;
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-navy/75 p-0 sm:p-4">
      <form onSubmit={submit} className="glass-navy w-full max-w-md rounded-t-3xl sm:rounded-2xl p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] max-h-[92dvh] overflow-y-auto">
        <p className="text-[10px] tracking-[0.22em] uppercase text-gold">The Sound She Carries</p>
        <div className="flex justify-between items-start">
          <h2 className="font-display text-2xl gold-text">Gold Sponsor</h2>
          <button type="button" onClick={onClose} className="text-chrome min-h-11">Close</button>
        </div>
        <p className="text-sm text-chrome mt-1 mb-4">Choose your sponsorship level.</p>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {TIERS.map((tier) => (
            <button
              key={tier}
              type="button"
              onClick={() => setAmount(tier)}
              className={`rounded-xl min-h-12 border text-sm ${amount === tier ? 'border-gold bg-gold/15 text-goldSoft' : 'border-white/15'}`}
            >
              {money(tier)}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {[['mobile', 'MoMo / OM'], ['card', 'Visa']].map(([v, label]) => (
            <button
              key={v}
              type="button"
              onClick={() => setMethod(v)}
              className={`rounded-xl min-h-12 text-[11px] border ${method === v ? 'border-gold bg-gold/15 text-goldSoft' : 'border-white/15'}`}
            >
              {label}
            </button>
          ))}
        </div>
        {method !== 'card' && (
          <>
            <label className="block text-sm mb-1">MoMo number</label>
            <div className="flex gap-2 mb-1">
              <span className="rounded-xl bg-navyMid px-3 min-h-12 inline-flex items-center text-gold">+237</span>
              <input value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 9))} className="flex-1 rounded-xl bg-white text-ink px-3 min-h-12" required />
            </div>
            {lookup.holder && <p className="text-goldSoft text-sm mt-2">Name: <strong>{lookup.holder}</strong></p>}
            <p className={`text-xs mt-1 ${lookup.error ? 'text-red-300' : 'text-emerald-300'}`}>{lookup.error || lookup.status}</p>
          </>
        )}
        {method === 'card' && (
          <input value={lookup.holder} onChange={(e) => lookup.setHolder(e.target.value)} placeholder="Your name" className="w-full rounded-xl bg-white text-ink px-3 min-h-12 mb-3" />
        )}
        <label className="flex items-center gap-2 text-sm my-3">
          <input type="checkbox" checked={waDifferent} onChange={(e) => setWaDifferent(e.target.checked)} />
          WhatsApp number is different
        </label>
        {waDifferent && (
          <input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value.replace(/\D/g, '').slice(0, 9))} placeholder="WhatsApp" className="w-full rounded-xl bg-white text-ink px-3 min-h-12 mb-3" />
        )}
        {error && <p className="text-red-300 text-sm mb-3">{error}</p>}
        <button disabled={busy} className="btn-donate w-full rounded-xl min-h-12 font-semibold">
          {busy ? 'Starting…' : `Sponsor ${money(amount)}`}
        </button>
      </form>
    </div>
  );
}
