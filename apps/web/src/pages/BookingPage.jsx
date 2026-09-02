import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useHolderLookup } from '../hooks/useHolderLookup';
import BookingCalendar from '../components/BookingCalendar';
import SignaturePad from '../components/SignaturePad';
import { readIdDocument } from '../lib/readIdDocument';

export default function BookingPage() {
  const [phone, setPhone] = useState('');
  const lookup = useHolderLookup(phone, true);
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('17:00');
  const [description, setDescription] = useState('');
  const [idType, setIdType] = useState('id');
  const [idFile, setIdFile] = useState(null);
  const [extracted, setExtracted] = useState(null);
  const [reading, setReading] = useState(false);
  const [signature, setSignature] = useState(null);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [calendar, setCalendar] = useState({ booked: [], pending: [] });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    api('/bookings/calendar').then(setCalendar).catch(() => {});
  }, []);

  async function onId(file) {
    setIdFile(file);
    setExtracted(null);
    if (!file) return;
    setReading(true);
    setError('');
    try {
      const data = await readIdDocument(file);
      setExtracted(data);
      if (data.full_name && !lookup.holder) lookup.setHolder(data.full_name);
    } catch {
      setError('Could not read the document. Try a clearer photo.');
    } finally {
      setReading(false);
    }
  }

  async function requestOtp() {
    setBusy(true);
    setError('');
    try {
      await api('/bookings/otp', { method: 'POST', body: JSON.stringify({ phone }) });
      setOtpSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function submit(e) {
    e.preventDefault();
    if (!signature) {
      setError('Please draw your signature.');
      return;
    }
    if (!otpSent) {
      await requestOtp();
      return;
    }
    setBusy(true);
    setError('');
    try {
      const form = new FormData();
      form.append('phone', phone);
      form.append('holder_name', lookup.holder || extracted?.full_name || '');
      form.append('event_name', eventName);
      form.append('event_date', eventDate);
      form.append('event_time', eventTime);
      form.append('description', description);
      form.append('id_type', idType);
      form.append('otp', otp);
      form.append('id_extracted', JSON.stringify(extracted || {}));
      if (idFile) form.append('id_document', idFile);
      form.append('signature', signature, 'signature.png');
      await api('/bookings', { method: 'POST', body: form });
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-dvh bg-navy text-white">
      <header className="flex items-center justify-between px-4 py-4">
        <Link to="/" className="text-gold text-sm">← Home</Link>
        <p className="text-[10px] tracking-[0.25em] uppercase text-gold">The Prophetic Minstrel</p>
        <span />
      </header>
      <main className="max-w-xl mx-auto px-4 pb-16">
        <h1 className="font-display text-3xl gold-text">Book Lian Ministrel</h1>
        <p className="text-chrome text-sm mt-2 mb-6">Request a date. She will approve or decline by WhatsApp.</p>

        {done ? (
          <div className="glass-navy rounded-3xl p-6 text-center">
            <h2 className="font-display text-2xl gold-text">Request sent</h2>
            <p className="text-chrome mt-3">The Prophetic Minstrel has received your booking request. You will get a WhatsApp confirmation after she decides.</p>
            <Link to="/" className="btn-donate inline-block mt-6 rounded-xl px-6 py-3">Back home</Link>
          </div>
        ) : (
          <form onSubmit={submit} className="glass-navy rounded-3xl p-5 space-y-4">
            <div>
              <label className="text-sm">Phone number</label>
              <div className="flex gap-2 mt-1">
                <span className="rounded-xl bg-navyMid px-3 min-h-12 inline-flex items-center text-gold">+237</span>
                <input value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 9))} className="flex-1 rounded-xl bg-white text-ink px-3 min-h-12" required />
              </div>
              {lookup.holder && <p className="text-goldSoft text-sm mt-2">Name: <strong>{lookup.holder}</strong></p>}
              <p className={`text-xs mt-1 ${lookup.error ? 'text-red-300' : 'text-emerald-300'}`}>{lookup.error || lookup.status}</p>
            </div>

            <div>
              <label className="text-sm">Event</label>
              <input value={eventName} onChange={(e) => setEventName(e.target.value)} placeholder="Concert, worship night, private gathering…" className="w-full mt-1 rounded-xl bg-white text-ink px-3 min-h-12" required />
            </div>

            <div>
              <label className="text-sm mb-2 block">Date — booked days are marked in gold</label>
              <BookingCalendar booked={calendar.booked} pending={calendar.pending} value={eventDate} onChange={setEventDate} />
              {eventDate && <p className="text-sm text-goldSoft mt-2">Selected: {eventDate}</p>}
            </div>

            <div>
              <label className="text-sm">Time</label>
              <input type="time" value={eventTime} onChange={(e) => setEventTime(e.target.value)} className="w-full mt-1 rounded-xl bg-white text-ink px-3 min-h-12" required />
            </div>

            <div>
              <label className="text-sm">Short description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full mt-1 rounded-xl bg-white text-ink px-3 py-2" placeholder="Venue, audience, what you need…" />
            </div>

            <div>
              <p className="text-sm mb-2">Scan ID or passport</p>
              <div className="grid grid-cols-2 gap-2 mb-2">
                {[['id', 'National ID'], ['passport', 'Passport']].map(([v, label]) => (
                  <button key={v} type="button" onClick={() => setIdType(v)} className={`rounded-xl min-h-11 border ${idType === v ? 'border-gold bg-gold/15 text-goldSoft' : 'border-white/15'}`}>{label}</button>
                ))}
              </div>
              <input type="file" accept="image/*" capture="environment" onChange={(e) => onId(e.target.files?.[0] || null)} className="w-full text-sm" />
              {reading && <p className="text-goldSoft text-sm mt-2 animate-pulse">Reading document…</p>}
              {extracted && (
                <div className="mt-3 rounded-xl bg-navyMid p-3 text-sm space-y-1">
                  <p className="text-gold text-[10px] uppercase tracking-wider">Information read</p>
                  <p>Name: {extracted.full_name || '—'}</p>
                  <p>Document: {extracted.document_number || '—'}</p>
                  <p>Date found: {extracted.expiry_or_dob || '—'}</p>
                </div>
              )}
            </div>

            <div>
              <label className="text-sm mb-2 block">Signature</label>
              <SignaturePad onChange={setSignature} />
            </div>

            {otpSent && (
              <div>
                <label className="text-sm">OTP sent to WhatsApp</label>
                <input value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} className="w-full mt-1 rounded-xl bg-white text-ink px-3 min-h-12 tracking-[0.4em] text-center text-xl" placeholder="000000" required />
              </div>
            )}

            {error && <p className="text-red-300 text-sm">{error}</p>}
            <button disabled={busy || !eventDate} className="btn-donate w-full rounded-xl min-h-12 font-semibold">
              {busy ? 'Please wait…' : otpSent ? 'Confirm booking' : 'Send OTP and continue'}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
