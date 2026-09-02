import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import BookingCalendar from '../../components/BookingCalendar';

export default function BookingsPage() {
  const [rows, setRows] = useState([]);
  const [calendar, setCalendar] = useState({ booked: [], pending: [] });
  const [selected, setSelected] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  async function load() {
    const [list, cal] = await Promise.all([api('/bookings'), api('/bookings/calendar')]);
    setRows(list);
    setCalendar(cal);
  }

  useEffect(() => { load().catch((err) => setError(err.message)); }, []);

  const visible = selected
    ? rows.filter((r) => String(r.event_date).slice(0, 10) === selected)
    : rows;

  async function decide(id, action) {
    setError('');
    try {
      await api(`/bookings/${id}`, { method: 'PATCH', body: JSON.stringify({ action, reason }) });
      setReason('');
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <h1 className="font-display text-3xl">Bookings</h1>
      <p className="text-chrome text-sm mt-1 mb-5">Gold dates are confirmed. Grey dates have pending requests.</p>
      {error && <p className="text-red-300 mb-3">{error}</p>}
      <div className="max-w-md mb-6">
        <BookingCalendar booked={calendar.booked} pending={calendar.pending} value={selected} onChange={setSelected} selectable={false} />
        {selected && <button className="text-gold text-sm mt-2" onClick={() => setSelected('')}>Show all dates</button>}
      </div>
      <div className="space-y-3">
        {visible.map((b) => (
          <article key={b.id} className="rounded-2xl border border-white/10 p-4">
            <div className="flex justify-between gap-3">
              <div>
                <p className="font-semibold">{b.holder_name || 'Guest'} · {b.phone}</p>
                <p className="text-sm text-chrome">{b.event_name} · {String(b.event_date).slice(0, 10)} · {String(b.event_time).slice(0, 5)}</p>
                <p className="text-sm mt-1">{b.description}</p>
                <p className="text-goldSoft text-xs uppercase mt-2">{b.status}</p>
              </div>
              {b.signature_url && <img src={b.signature_url} alt="" className="h-12 bg-white rounded" />}
            </div>
            {b.status === 'pending' && (
              <div className="mt-3 flex flex-col sm:flex-row gap-2">
                <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reject reason" className="flex-1 rounded-xl px-3 py-2 text-ink" />
                <button onClick={() => decide(b.id, 'approve')} className="btn-donate rounded-xl px-4 py-2">Approve</button>
                <button onClick={() => decide(b.id, 'reject')} className="rounded-xl px-4 py-2 border border-white/20">Reject</button>
              </div>
            )}
          </article>
        ))}
        {!visible.length && <p className="text-chrome">No bookings yet.</p>}
      </div>
    </div>
  );
}
