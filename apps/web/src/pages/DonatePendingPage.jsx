import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { api, money } from '../lib/api';
import { useLang, LangSwitch } from '../i18n/LangContext';

export default function DonatePendingPage() {
  const { t } = useLang();
  const { id } = useParams();
  const [params] = useSearchParams();
  const [status, setStatus] = useState('pending');
  const [amount, setAmount] = useState(null);

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
        if (data.status === 'pending') setTimeout(poll, 4000);
      } catch {
        if (!stop) setTimeout(poll, 5000);
      }
    }
    poll();
    return () => { stop = true; };
  }, [id, params]);

  return (
    <div className="min-h-dvh bg-navy flex items-center justify-center p-4 sm:p-6 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="glass max-w-md w-full rounded-3xl p-6 sm:p-8 text-center">
        <div className="flex justify-end mb-3"><LangSwitch /></div>
        {status === 'successful' ? (
          <>
            <h1 className="font-display text-3xl">{t.thanks}</h1>
            <p className="mt-3 text-chrome">{t.giftCarry} {money(amount)}</p>
            <Link to="/" className="btn-donate inline-block mt-6 rounded-xl px-6 py-3">{t.backHome}</Link>
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
