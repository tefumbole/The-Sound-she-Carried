import { useState } from 'react';
import { api } from '../lib/api';
import { useHolderLookup } from '../hooks/useHolderLookup';
import { useLang } from '../i18n/LangContext';

export default function DonateModal({ open, onClose }) {
  const { t } = useLang();
  const [amount, setAmount] = useState(2000);
  const [method, setMethod] = useState('mobile');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const lookup = useHolderLookup(phone, open && method !== 'card');
  const [waDifferent, setWaDifferent] = useState(false);
  const [whatsapp, setWhatsapp] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

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
          phone,
          email,
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
      <form
        onSubmit={submit}
        className="glass-navy w-full max-w-md rounded-t-3xl sm:rounded-2xl p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-white max-h-[92dvh] overflow-y-auto"
      >
        <div className="mx-auto mb-3 h-1 w-12 rounded-full bg-gold/40 sm:hidden" />
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-[10px] tracking-[0.22em] text-gold uppercase">{t.support}</p>
            <h2 className="font-display text-2xl gold-text">{t.donate}</h2>
          </div>
          <button type="button" onClick={onClose} className="min-h-11 px-2 text-chrome hover:text-gold">
            {t.close}
          </button>
        </div>

        <p className="text-[10px] tracking-[0.2em] uppercase text-gold mb-2">{t.amount}</p>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {[2000, 5000, 10000, 25000].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setAmount(n)}
              className={`amount-chip px-3 ${Number(amount) === n ? 'is-on' : ''}`}
            >
              {n.toLocaleString()}
            </button>
          ))}
        </div>
        <input
          type="number"
          min="100"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="field-modern mb-4"
        />

        <p className="text-[10px] tracking-[0.2em] uppercase text-gold mb-2">{t.method}</p>
        <div className="pay-seg mb-4">
          {[
            ['mobile', t.momo],
            ['card', t.visa],
          ].map(([v, label]) => (
            <button
              key={v}
              type="button"
              onClick={() => setMethod(v)}
              className={method === v ? 'is-on' : 'text-white/80'}
            >
              {label}
            </button>
          ))}
        </div>

        {method === 'card' ? (
          <>
            <div className="rounded-xl border border-gold/30 bg-white/5 p-3 mb-4 text-sm">
              <p className="text-[10px] tracking-[0.2em] uppercase text-gold">{t.visaPay}</p>
              <p className="mt-1.5">{t.amountDue}: <strong className="text-goldSoft">{Number(amount || 0).toLocaleString()} F CFA</strong></p>
              <p className="text-chrome text-xs mt-2">{t.visaHint}</p>
            </div>
            <label className="block text-sm mb-1">{t.nameOnCard}</label>
            <input
              value={lookup.holder}
              onChange={(e) => lookup.setHolder(e.target.value)}
              placeholder="Name as it appears on the card"
              className="field-modern mb-3"
              required
            />
            <label className="block text-sm mb-1">{t.emailReceipt}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@email.com"
              className="field-modern mb-3"
              required
            />
            <label className="block text-sm mb-1">{t.phone}</label>
            <div className="flex gap-2 mb-3">
              <span className="rounded-xl bg-navyMid px-3 min-h-12 inline-flex items-center text-sm text-gold">+237</span>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 9))}
                placeholder="6XX XX XX XX"
                className="field-modern flex-1"
                required
              />
            </div>
          </>
        ) : (
          <>
            <label className="block text-sm mb-1">{t.momoNumber}</label>
            <div className="flex gap-2 mb-1">
              <span className="rounded-xl bg-navyMid px-3 min-h-12 inline-flex items-center text-sm text-gold">+237</span>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 9))}
                placeholder="6XX XX XX XX"
                className="field-modern flex-1"
                required
              />
            </div>
            <label className="block text-sm mt-3 mb-1">{t.name}</label>
            <input
              value={lookup.holder}
              onChange={(e) => lookup.setHolder(e.target.value)}
              placeholder="Name on this number"
              className="field-modern mb-1"
              required
            />
            <p className={`text-xs min-h-4 mb-3 ${lookup.error ? 'text-red-300' : 'text-emerald-300'}`}>
              {lookup.error || lookup.status || (lookup.holder ? t.editName : '')}
            </p>
            <p className="text-xs text-chrome mb-3">
              {t.approveHint}
            </p>
          </>
        )}

        <label className="flex items-center gap-2 text-sm mb-3">
          <input type="checkbox" checked={waDifferent} onChange={(e) => setWaDifferent(e.target.checked)} />
          {t.waDifferent}
        </label>
        {waDifferent && (
          <div className="flex gap-2 mb-4">
            <span className="rounded-xl bg-navyMid px-3 min-h-12 inline-flex items-center text-sm text-gold">+237</span>
            <input
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value.replace(/\D/g, '').slice(0, 9))}
              className="flex-1 rounded-xl bg-white text-ink px-3 min-h-12 py-2"
              placeholder="WhatsApp number"
            />
          </div>
        )}

        {error && <p className="text-red-300 text-sm mb-3">{error}</p>}
        <button disabled={busy} className="btn-donate w-full rounded-xl min-h-12 py-3 font-semibold">
          {busy ? t.starting : `${t.donate} ${Number(amount || 0).toLocaleString()} F CFA`}
        </button>
      </form>
    </div>
  );
}
