import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../lib/api';

export default function BookingReviewPage() {
  const { token } = useParams();
  const [booking, setBooking] = useState(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api(`/bookings/review/${token}`).then(setBooking).catch((err) => setError(err.message));
  }, [token]);

  async function decide(action) {
    setBusy(true);
    setError('');
    try {
      const fresh = await api(`/bookings/review/${token}`, {
        method: 'POST',
        body: JSON.stringify({ action, reason }),
      });
      setBooking(fresh);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-dvh bg-navy text-white p-4 sm:p-5 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))]">
      <div className="max-w-lg mx-auto glass-navy rounded-3xl p-5 sm:p-6">
        <p className="text-[10px] tracking-[0.25em] uppercase text-gold">Booking request</p>
        <h1 className="font-display text-3xl gold-text mt-1">The Prophetic Minstrel</h1>
        {error && <p className="text-red-300 mt-3">{error}</p>}
        {!booking ? <p className="mt-4 text-chrome">Loading…</p> : (
          <>
            <div className="mt-5 space-y-2 text-sm">
              <p><span className="text-chrome">Name:</span> {booking.holder_name || '—'}</p>
              <p><span className="text-chrome">Phone:</span> {booking.phone}</p>
              <p><span className="text-chrome">Event:</span> {booking.event_name}</p>
              <p><span className="text-chrome">When:</span> {String(booking.event_date).slice(0, 10)} · {String(booking.event_time).slice(0, 5)}</p>
              <p><span className="text-chrome">Note:</span> {booking.description || '—'}</p>
              <p><span className="text-chrome">Status:</span> {booking.status}</p>
              {booking.id_extracted?.full_name && <p><span className="text-chrome">ID name:</span> {booking.id_extracted.full_name}</p>}
              {booking.id_extracted?.document_number && <p><span className="text-chrome">Document:</span> {booking.id_extracted.document_number}</p>}
            </div>
            {booking.signature_url && <img src={booking.signature_url} alt="Signature" className="mt-4 rounded-xl bg-white max-h-28" />}
            {booking.id_document_url && <img src={booking.id_document_url} alt="ID" className="mt-4 rounded-xl max-h-48 object-contain" />}
            {booking.status === 'pending' ? (
              <div className="mt-6 space-y-3">
                <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason if you reject" className="w-full rounded-xl bg-white text-ink px-3 py-2" rows={3} />
                <div className="grid grid-cols-2 gap-2">
                  <button disabled={busy} onClick={() => decide('approve')} className="btn-donate rounded-xl min-h-12">Approve</button>
                  <button disabled={busy} onClick={() => decide('reject')} className="rounded-xl min-h-12 border border-white/20">Reject</button>
                </div>
              </div>
            ) : (
              <p className="mt-6 text-goldSoft">This booking is {booking.status}{booking.reject_reason ? `: ${booking.reject_reason}` : ''}.</p>
            )}
            <Link to="/admin/bookings" className="block text-center text-gold text-sm mt-6">Open admin calendar</Link>
          </>
        )}
      </div>
    </div>
  );
}
