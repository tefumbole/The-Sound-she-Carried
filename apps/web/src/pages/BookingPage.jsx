import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useHolderLookup } from '../hooks/useHolderLookup';
import BookingCalendar from '../components/BookingCalendar';
import SignaturePad from '../components/SignaturePad';
import PhoneInput from '../components/PhoneInput';
import { COUNTRIES, toIntl } from '../lib/countries';

const EULA = `By requesting this date, I agree that Lian Ministrel (The Prophetic Minstrel) may accept or decline, that I will honour agreed fees, travel, and timing, treat her and the team with respect, and will not sell or commercially stream her performance without written permission.`;

export default function BookingPage() {
  const [iso, setIso] = useState('CM');
  const [local, setLocal] = useState('');
  const phone = toIntl((COUNTRIES.find((c) => c.iso === iso) || COUNTRIES[0]).dial, local);
  const lookup = useHolderLookup(phone, iso === 'CM');
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('17:00');
  const [description, setDescription] = useState('');
  const [showSign, setShowSign] = useState(false);
  const [signature, setSignature] = useState(null);
  const [agreed, setAgreed] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [calendar, setCalendar] = useState({ booked: [], pending: [] });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    api('/bookings/calendar').then(setCalendar).catch(() => {});
  }, []);

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
    if (!agreed) {
      setError('Please agree to the booking terms.');
      return;
    }
    if (!signature) {
      setError('Please add your signature.');
      setShowSign(true);
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
      form.append('holder_name', lookup.holder);
      form.append('event_name', eventName);
      form.append('event_date', eventDate);
      form.append('event_time', eventTime);
      form.append('description', description);
      form.append('otp', otp);
      form.append('eula_accepted', '1');
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
      <main className="max-w-4xl mx-auto px-4 pb-10">
        <h1 className="font-display text-2xl sm:text-3xl gold-text">Book Lian Ministrel</h1>
        <p className="text-chrome text-sm mt-1 mb-4">Request a date. She will approve or decline by WhatsApp.</p>

        {done ? (
          <div className="glass-navy rounded-3xl p-6 text-center">
            <h2 className="font-display text-2xl gold-text">Request sent</h2>
            <p className="text-chrome mt-3">The Prophetic Minstrel has received your booking request. You will get a WhatsApp confirmation after she decides.</p>
            <Link to="/" className="btn-donate inline-block mt-6 rounded-xl px-6 py-3">Back home</Link>
          </div>
        ) : (
          <form onSubmit={submit} className="glass-navy rounded-3xl p-4 sm:p-5 space-y-3">
            <div className="grid md:grid-cols-2 gap-4 md:gap-5 items-start">
              <div className="space-y-3">
                <div>
                  <label className="text-xs uppercase tracking-wider text-gold/80">Phone number</label>
                  <div className="mt-1">
                    <PhoneInput iso={iso} local={local} onIso={setIso} onLocal={setLocal} required />
                  </div>
                  <input
                    value={lookup.holder}
                    onChange={(e) => lookup.setHolder(e.target.value)}
                    placeholder="Your name"
                    className="w-full mt-2 rounded-lg bg-white text-ink px-3 min-h-10"
                  />
                  <p className={`text-xs mt-1 ${lookup.error ? 'text-red-300' : 'text-emerald-300'}`}>{lookup.error || lookup.status}</p>
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wider text-gold/80">Event</label>
                  <input value={eventName} onChange={(e) => setEventName(e.target.value)} placeholder="Concert, worship night, private gathering…" className="w-full mt-1 rounded-lg bg-white text-ink px-3 min-h-10" required />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wider text-gold/80">Time</label>
                  <input type="time" value={eventTime} onChange={(e) => setEventTime(e.target.value)} className="w-full mt-1 rounded-lg bg-white text-ink px-3 min-h-10" required />
                </div>
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-gold/80 mb-1 block">Pick a date</label>
                <BookingCalendar booked={calendar.booked} pending={calendar.pending} value={eventDate} onChange={setEventDate} />
              </div>
            </div>

            <div>
              <label className="text-xs uppercase tracking-wider text-gold/80">Short description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="w-full mt-1 rounded-lg bg-white text-ink px-3 py-2" placeholder="Venue, audience, what you need…" />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs uppercase tracking-wider text-gold/80">Signature</label>
                {!showSign ? (
                  <button type="button" onClick={() => setShowSign(true)} className="text-sm text-gold border border-gold/40 rounded-lg px-3 min-h-9">Add</button>
                ) : (
                  <button type="button" onClick={() => { setShowSign(false); setSignature(null); }} className="text-sm text-chrome">Hide</button>
                )}
              </div>
              {showSign && (
                <div className="mt-2">
                  <SignaturePad onChange={setSignature} />
                </div>
              )}
            </div>

            <label className="flex items-start gap-3 text-sm text-chrome bg-navy/40 rounded-xl p-3 border border-gold/20">
              <input type="checkbox" className="mt-1" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} required />
              <span>
                <span className="text-gold text-[10px] uppercase tracking-wider block mb-1">End user booking agreement</span>
                {EULA}
              </span>
            </label>

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
