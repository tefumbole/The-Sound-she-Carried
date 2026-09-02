import { useEffect, useState } from 'react';
import { api } from '../lib/api';

export default function DonateModal({ open, onClose }) {
  const [amount, setAmount] = useState(2000);
  const [method, setMethod] = useState('momo');
  const [phone, setPhone] = useState('');
  const [holder, setHolder] = useState('');
  const [holderStatus, setHolderStatus] = useState('');
  const [waDifferent, setWaDifferent] = useState(false);
  const [whatsapp, setWhatsapp] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || method === 'card' || phone.replace(/\D/g, '').length < 9) return;
    const t = setTimeout(async () => {
      setHolderStatus('Checking number…');
      try {
        const data = await api(`/donations/holder?phone=${encodeURIComponent(phone)}`);
        if (data.name) {
          setHolder(data.name);
          setHolderStatus(`Name found: ${data.name}`);
        } else {
          setHolderStatus('');
        }
      } catch {
        setHolderStatus('');
      }
    }, 500);
    return () => clearTimeout(t);
  }, [phone, method, open]);

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
          holder_name: holder,
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-4">
      <form onSubmit={submit} className="glass w-full max-w-md rounded-2xl p-5 text-white">
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-xs tracking-[0.2em] text-chrome uppercase">Support the live recording</p>
            <h2 className="font-display text-2xl">Donate</h2>
          </div>
          <button type="button" onClick={onClose} className="text-chrome">Close</button>
        </div>

        <label className="block text-sm mb-1">Amount (F CFA)</label>
        <input
          type="number"
          min="100"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full mb-4 rounded-xl bg-white text-ink px-3 py-2"
        />

        <p className="text-sm mb-2">Payment method</p>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            ['momo', 'MTN MoMo'],
            ['om', 'Orange Money'],
            ['card', 'Visa'],
          ].map(([v, label]) => (
            <button
              key={v}
              type="button"
              onClick={() => setMethod(v)}
              className={`rounded-xl px-2 py-3 text-sm border ${method === v ? 'border-crimson bg-crimson/30' : 'border-white/20'}`}
            >
              {label}
            </button>
          ))}
        </div>

        {method === 'card' ? (
          <>
            <label className="block text-sm mb-1">Name on card / donor name</label>
            <input
              value={holder}
              onChange={(e) => setHolder(e.target.value)}
              placeholder="Your name"
              className="w-full mb-3 rounded-xl bg-white text-ink px-3 py-2"
            />
            <p className="text-xs text-chrome mb-3">You will complete Visa payment securely on Stripe. Stay on the page until you return here.</p>
          </>
        ) : (
          <>
            <label className="block text-sm mb-1">MoMo number</label>
            <div className="flex gap-2 mb-1">
              <span className="rounded-xl bg-white/10 px-3 py-2 text-sm">+237</span>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 9))}
                placeholder="6XX XX XX XX"
                className="flex-1 rounded-xl bg-white text-ink px-3 py-2"
                required
              />
            </div>
            <p className="text-xs text-emerald-300 min-h-4 mb-3">{holderStatus}</p>
            {holder && (
              <p className="text-sm mb-3">Paying as <strong>{holder}</strong></p>
            )}
            <p className="text-xs text-chrome mb-3">
              After you tap Donate, approve on your phone.
              {method === 'om' ? ' Orange: dial #150*47#.' : ' MTN: dial *126#.'}
            </p>
          </>
        )}

        <label className="flex items-center gap-2 text-sm mb-3">
          <input type="checkbox" checked={waDifferent} onChange={(e) => setWaDifferent(e.target.checked)} />
          WhatsApp number is different
        </label>
        {waDifferent && (
          <div className="flex gap-2 mb-4">
            <span className="rounded-xl bg-white/10 px-3 py-2 text-sm">+237</span>
            <input
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value.replace(/\D/g, '').slice(0, 9))}
              className="flex-1 rounded-xl bg-white text-ink px-3 py-2"
              placeholder="WhatsApp number"
            />
          </div>
        )}

        {error && <p className="text-red-300 text-sm mb-3">{error}</p>}
        <button disabled={busy} className="btn-donate w-full rounded-xl py-3 font-semibold">
          {busy ? 'Starting…' : `Donate ${Number(amount || 0).toLocaleString()} F CFA`}
        </button>
      </form>
    </div>
  );
}
