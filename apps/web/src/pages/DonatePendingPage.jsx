import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { api, money } from '../lib/api';
import { useLang, LangSwitch } from '../i18n/LangContext';

function fill(template, vars) {
  return String(template || '').replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? '');
}

export default function DonatePendingPage() {
  const { t } = useLang();
  const { id } = useParams();
  const [params] = useSearchParams();
  const [status, setStatus] = useState('pending');
  const [amount, setAmount] = useState(null);
  const [confirm, setConfirm] = useState(null);

  useEffect(() => {
    let stop = false;
    async function poll() {
      try {
        const session = params.get('session_id');
        const q = session ? `?session_id=${encodeURIComponent(session)}` : '';
        const data = await api(`/donations/${id}/status${q}`);
        if (stop) return;
        setStatus(data.status);
        setAmount(data.amount);
        if (data.status === 'successful') setConfirm(data);
        if (data.status === 'pending') setTimeout(poll, 4000);
      } catch {
        if (!stop) setTimeout(poll, 5000);
      }
    }
    poll();
    return () => { stop = true; };
  }, [id, params]);

  async function share() {
    const text = [
      `THE SOUND SHE CARRIES`,
      confirm?.thank_you,
      confirm?.title,
      confirm?.message,
      confirm?.scripture_reference,
      confirm?.scripture_text,
      confirm?.declaration,
      `Reference: ${confirm?.reference || ''}`,
    ].filter(Boolean).join('\n\n');
    try {
      if (navigator.share) {
        await navigator.share({ title: 'The Sound She Carries', text });
        return;
      }
    } catch {
      /* fall through */
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noreferrer');
  }

  return (
    <div className="min-h-dvh bg-navy flex items-center justify-center p-4 sm:p-6 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="glass max-w-lg w-full rounded-3xl p-6 sm:p-8 text-center">
        <div className="flex justify-end mb-3"><LangSwitch /></div>
        {status === 'successful' ? (
          <>
            <p className="text-[11px] tracking-[0.28em] uppercase text-gold">{t.paySuccess}</p>
            <h1 className="font-display text-3xl mt-2">
              {fill(t.thankYouName, { name: confirm?.first_name || 'Friend' })}
            </h1>
            <p className="mt-3 text-chrome">
              {fill(t.giftReceived, { amount: money(confirm?.amount ?? amount) })}
            </p>
            <p className="mt-2 text-sm text-goldSoft">{t.reference}: {confirm?.reference}</p>

            {confirm?.message && (
              <div className="mt-6 text-left rounded-2xl border border-gold/25 p-4">
                <p className="text-[11px] tracking-[0.22em] uppercase text-gold">
                  {fill(t.yourWord, { day: confirm.day_label || '' })}
                </p>
                {confirm.title && (
                  <p className="mt-3 font-display text-2xl tracking-[0.12em] uppercase text-gold">
                    {confirm.title}
                  </p>
                )}
                <p className="mt-3 text-white leading-relaxed">{confirm.message}</p>
                <p className="mt-5 text-[11px] tracking-[0.22em] uppercase text-gold">{t.scriptureForYou}</p>
                <p className="mt-2 text-goldSoft font-semibold">{confirm.scripture_reference}</p>
                <p className="mt-1 italic text-chrome">“{confirm.scripture_text}”</p>
                <p className="mt-5 text-[11px] tracking-[0.22em] uppercase text-gold">{t.todaysDeclaration}</p>
                <p className="mt-2 text-white">{confirm.declaration}</p>
              </div>
            )}

            <p className="mt-5 text-sm text-chrome">{t.standWithThanks}</p>
            <p className="mt-2 text-[11px] text-white/50">{t.wordDisclaimer}</p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-6">
              <a
                href={`/api/donations/${id}/confirmation.pdf`}
                className="rounded-xl min-h-11 border border-gold/40 text-goldSoft text-sm inline-flex items-center justify-center hover:bg-gold/10"
              >
                {t.downloadConfirm}
              </a>
              <button
                type="button"
                onClick={share}
                className="rounded-xl min-h-11 border border-gold/40 text-goldSoft text-sm hover:bg-gold/10"
              >
                {t.share}
              </button>
              <Link to="/" className="btn-donate rounded-xl min-h-11 text-sm inline-flex items-center justify-center">
                {t.contributeAgain}
              </Link>
            </div>
          </>
        ) : status === 'failed' ? (
          <>
            <h1 className="font-display text-3xl">{t.payFail}</h1>
            <p className="mt-3 text-chrome">{t.tryAgain}</p>
            <Link to="/" className="btn-donate inline-block mt-6 rounded-xl px-6 py-3">{t.tryAgain}</Link>
          </>
        ) : (
          <>
            <h1 className="font-display text-3xl">{t.approvePhone}</h1>
            <p className="mt-3 text-chrome">{t.approveHint}</p>
            <p className="mt-6 text-sm animate-pulse">{t.waiting}</p>
          </>
        )}
      </div>
    </div>
  );
}
