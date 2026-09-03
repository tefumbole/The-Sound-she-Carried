import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useHolderLookup } from '../hooks/useHolderLookup';
import { useLang, LangSwitch } from '../i18n/LangContext';
import BookingCalendar from '../components/BookingCalendar';
import SignaturePad from '../components/SignaturePad';
import PhoneInput from '../components/PhoneInput';
import { COUNTRIES, toIntl } from '../lib/countries';

function Step({ n, title, children }) {
  return (
    <section className="step-block">
      <div className="flex items-center gap-2.5 mb-3">
        <span className="step-num">{n}</span>
        <h2 className="text-[11px] tracking-[0.22em] uppercase text-gold">{title}</h2>
      </div>
      {children}
    </section>
  );
}

export default function BookingPage() {
  const { t, lang } = useLang();
  const [iso, setIso] = useState('CM');
  const [local, setLocal] = useState('');
  const phone = toIntl((COUNTRIES.find((c) => c.iso === iso) || COUNTRIES[0]).dial, local);
  const lookup = useHolderLookup(phone, iso === 'CM');
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('17:00');
  const [description, setDescription] = useState('');
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

  const prettyDate = eventDate
    ? new Date(`${eventDate}T12:00:00`).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-GB', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    })
    : '';

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
    if (!eventDate) {
      setError(t.errDate);
      return;
    }
    if (!agreed) {
      setError(t.errEula);
      return;
    }
    if (!signature) {
      setError(t.errSign);
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

  const cta = busy ? t.wait : otpSent ? t.confirmBook : eventDate ? t.sendOtp : t.pickFirst;

  return (
    <div className="relative min-h-dvh bg-navy text-white overflow-x-hidden">
      <div className="poster-stage is-preview" aria-hidden>
        <img src="/poster-temp.jpg" alt="" className="poster-fit" />
        <div className="poster-veil" />
      </div>

      <header className="relative z-20 sticky top-0 flex items-center justify-between gap-2 px-3 sm:px-5 py-3 bg-navy/80 backdrop-blur-md border-b border-gold/15 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <Link to="/" className="text-goldSoft text-sm min-h-10 inline-flex items-center">← {t.home}</Link>
        <p className="text-[10px] tracking-[0.22em] uppercase text-gold hidden sm:block">{t.minstrel}</p>
        <div className="flex items-center gap-2">
          <LangSwitch />
        </div>
      </header>

      <main className="relative z-10 max-w-5xl mx-auto px-3 sm:px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <div className="pt-5 pb-4">
          <h1 className="font-display font-bold text-[1.85rem] sm:text-4xl text-[#f6e7b2] drop-shadow-[0_3px_14px_rgba(0,0,0,0.9)]">
            {t.bookTitle}
          </h1>
          <p className="text-white font-semibold text-sm sm:text-base mt-2 drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)]">{t.bookLead}</p>
        </div>

        {done ? (
          <div className="glass-navy rounded-[1.75rem] p-6 text-center max-w-lg">
            <h2 className="font-display text-2xl gold-text">{t.sentTitle}</h2>
            <p className="text-chrome mt-3">{t.sentBody}</p>
            <Link to="/" className="btn-donate inline-block mt-6 rounded-xl px-6 py-3">{t.backHome}</Link>
          </div>
        ) : (
          <form onSubmit={submit} className="pb-24 md:pb-8">
            <div className="grid lg:grid-cols-[1fr_22rem] gap-3 lg:gap-5 items-start">
              <div className="glass-navy rounded-[1.75rem] p-4 sm:p-6 space-y-5">
                <Step n="1" title={t.stepYou}>
                  <label className="field-label">{t.phone}</label>
                  <PhoneInput iso={iso} local={local} onIso={setIso} onLocal={setLocal} required dark />
                  <label className="field-label mt-3">{t.yourName}</label>
                  <input
                    value={lookup.holder}
                    onChange={(e) => lookup.setHolder(e.target.value)}
                    placeholder={t.namePh}
                    className="field-soft"
                    required
                  />
                  <p className={`text-xs mt-1.5 ${lookup.error ? 'text-red-300' : 'text-emerald-300'}`}>
                    {lookup.error || lookup.status || (lookup.holder ? t.editName : t.lookupHint)}
                  </p>
                </Step>

                <div className="lg:hidden">
                  <Step n="2" title={t.stepDate}>
                    <BookingCalendar booked={calendar.booked} pending={calendar.pending} value={eventDate} onChange={setEventDate} labels={{ booked: t.booked, pending: t.pending }} />
                    <div className={`mt-3 rounded-xl px-3 py-2.5 text-sm ${eventDate ? 'bg-gold/15 text-goldSoft' : 'bg-white/5 text-chrome'}`}>
                      {eventDate ? `${t.selected}: ${prettyDate}` : t.tapDate}
                    </div>
                  </Step>
                </div>

                <Step n="3" title={t.stepEvent}>
                  <label className="field-label">{t.eventWhat}</label>
                  <input
                    value={eventName}
                    onChange={(e) => setEventName(e.target.value)}
                    placeholder={t.eventPh}
                    className="field-soft"
                    required
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                    <div>
                      <label className="field-label">{t.startTime}</label>
                      <input type="time" value={eventTime} onChange={(e) => setEventTime(e.target.value)} className="field-soft" required />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="field-label">{t.notes}</label>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={3}
                        className="field-soft !min-h-[5.25rem] py-3"
                        placeholder={t.notesPh}
                      />
                    </div>
                  </div>
                </Step>

                <Step n="4" title={t.stepSign}>
                  <p className="text-sm text-chrome mb-2">{t.signHere}</p>
                  <SignaturePad onChange={setSignature} clearLabel={t.clearSign} />
                  {signature && <p className="text-xs text-emerald-300 mt-1">{t.signed}</p>}
                  <label className="flex items-start gap-3 text-sm text-chrome mt-4 rounded-2xl p-3 border border-gold/25 bg-white/5">
                    <input type="checkbox" className="mt-1.5 h-4 w-4 accent-[#d4af37]" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} required />
                    <span>
                      <span className="text-gold text-[10px] uppercase tracking-wider block mb-1">{t.eulaTitle}</span>
                      {t.eula}
                    </span>
                  </label>
                </Step>

                {otpSent && (
                  <Step n="5" title={t.stepOtp}>
                    <p className="text-sm text-chrome mb-2">{t.otpHint}</p>
                    <input
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="field-soft tracking-[0.4em] text-center text-xl"
                      placeholder="000000"
                      inputMode="numeric"
                      required
                    />
                  </Step>
                )}

                {error && <p className="text-red-300 text-sm">{error}</p>}
                <button disabled={busy} className="btn-donate hidden md:block w-full rounded-2xl min-h-12 font-semibold">
                  {cta}
                </button>
              </div>

              <aside className="hidden lg:block sticky top-20">
                <div className="glass-navy rounded-[1.75rem] p-5">
                  <Step n="2" title={t.stepDate}>
                    <BookingCalendar booked={calendar.booked} pending={calendar.pending} value={eventDate} onChange={setEventDate} labels={{ booked: t.booked, pending: t.pending }} />
                    <div className={`mt-3 rounded-xl px-3 py-2.5 text-sm ${eventDate ? 'bg-gold/15 text-goldSoft' : 'bg-white/5 text-chrome'}`}>
                      {eventDate ? `${t.selected}: ${prettyDate}` : t.tapDate}
                    </div>
                  </Step>
                </div>
              </aside>
            </div>

            <div className="md:hidden fixed inset-x-0 bottom-0 z-30 px-3 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-gradient-to-t from-navy via-navy/95 to-transparent">
              <button disabled={busy} className="btn-donate w-full rounded-2xl min-h-12 font-semibold">{cta}</button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
