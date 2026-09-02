import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { api, money } from '../lib/api';

export default function DonatePendingPage() {
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
    <div className="min-h-dvh bg-navy flex items-center justify-center p-6">
      <div className="glass max-w-md w-full rounded-3xl p-8 text-center">
        {status === 'successful' ? (
          <>
            <h1 className="font-display text-3xl">Thank you</h1>
            <p className="mt-3 text-chrome">Your gift of {money(amount)} is carrying the sound.</p>
            <Link to="/" className="btn-donate inline-block mt-6 rounded-xl px-6 py-3">Back home</Link>
          </>
        ) : status === 'failed' ? (
          <>
            <h1 className="font-display text-3xl">Payment did not complete</h1>
            <p className="mt-3 text-chrome">You can try again from the homepage.</p>
            <Link to="/" className="btn-donate inline-block mt-6 rounded-xl px-6 py-3">Try again</Link>
          </>
        ) : (
          <>
            <h1 className="font-display text-3xl">Approve on your phone</h1>
            <p className="mt-3 text-chrome">Check the MoMo / Orange Money prompt and enter your PIN.</p>
            <ul className="text-left text-sm mt-5 space-y-2 text-chrome">
              <li><strong className="text-white">MTN:</strong> dial *126#</li>
              <li><strong className="text-white">Orange:</strong> dial #150*47#</li>
            </ul>
            <p className="mt-6 text-sm animate-pulse">Waiting for confirmation…</p>
          </>
        )}
      </div>
    </div>
  );
}
