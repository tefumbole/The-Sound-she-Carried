import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, money } from '../lib/api';
import DonateModal from '../components/DonateModal';
import GoldSponsorModal from '../components/GoldSponsorModal';
import { useLang, LangSwitch } from '../i18n/LangContext';

const CONCERT = new Date('2026-09-27T17:00:00+01:00');
const WHATSAPP = 'https://wa.me/237697470711';
const GOLD_TIERS = [500000, 300000, 200000, 100000];

function useCountdown(target) {
  const [left, setLeft] = useState({ d: 0, h: 0, m: 0, s: 0, done: false });
  useEffect(() => {
    function tick() {
      const diff = target.getTime() - Date.now();
      if (diff <= 0) {
        setLeft({ d: 0, h: 0, m: 0, s: 0, done: true });
        return;
      }
      setLeft({
        d: Math.floor(diff / 86400000),
        h: Math.floor((diff / 3600000) % 24),
        m: Math.floor((diff / 60000) % 60),
        s: Math.floor((diff / 1000) % 60),
        done: false,
      });
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);
  return left;
}

function GoldSponsorSlider({ onPick, t }) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % GOLD_TIERS.length), 3800);
    return () => clearInterval(id);
  }, []);
  const tier = GOLD_TIERS[index];
  return (
    <div className="glass-navy fade-up rounded-[1.4rem] p-4 overflow-hidden">
      <p className="text-[10px] tracking-[0.32em] uppercase text-gold">{t.partnership}</p>
      <h2 className="font-display text-xl gold-text mt-0.5">{t.goldSponsors}</h2>
      <p className="text-xs text-chrome/90 mt-1 mb-3">{t.standWith}</p>
      <button
        type="button"
        onClick={() => onPick(tier)}
        className="sponsor-tile w-full min-h-[4.6rem] px-3 py-3 text-center"
      >
        <p className="text-[10px] tracking-[0.25em] uppercase text-gold">{t.tierOf} {index + 1} / {GOLD_TIERS.length}</p>
        <p className="font-display text-2xl gold-text mt-1">{money(tier)}</p>
        <p className="text-xs text-chrome mt-1">{t.tapSponsor}</p>
      </button>
      <div className="flex items-center justify-between mt-4">
        <button type="button" className="nav-orb" onClick={() => setIndex((i) => (i - 1 + GOLD_TIERS.length) % GOLD_TIERS.length)} aria-label="Previous tier">‹</button>
        <div className="flex gap-1.5">
          {GOLD_TIERS.map((t, i) => (
            <button
              key={t}
              type="button"
              onClick={() => setIndex(i)}
              className={`h-1.5 rounded-full transition-all ${i === index ? 'w-7 bg-gold' : 'w-1.5 bg-white/25'}`}
              aria-label={money(t)}
            />
          ))}
        </div>
        <button type="button" className="nav-orb" onClick={() => setIndex((i) => (i + 1) % GOLD_TIERS.length)} aria-label="Next tier">›</button>
      </div>
    </div>
  );
}

function Unit({ n, label, max }) {
  const r = 38;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - Math.min(Number(n) / max, 1));
  return (
    <div className="tick-ring">
      <svg viewBox="0 0 96 96" aria-hidden>
        <circle className="tick-track" cx="48" cy="48" r={r} />
        <circle className="tick-fill" cx="48" cy="48" r={r} strokeDasharray={c} strokeDashoffset={offset} />
      </svg>
      <div className="tick-core">
        <div className="font-display gold-text leading-none tracking-tight">{String(n).padStart(2, '0')}</div>
        <div className="tick-label">{label}</div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const { t } = useLang();
  const [stats, setStats] = useState(null);
  const [open, setOpen] = useState(false);
  const [gold, setGold] = useState(false);
  const [goldAmount, setGoldAmount] = useState(500000);
  const left = useCountdown(CONCERT);

  useEffect(() => {
    api('/campaign/public')
      .then(setStats)
      .catch(() => setStats({
        target: 5000000, raised: 1300000, pending: 3700000, percent: 26,
        venue: 'Chariot Banquet Hall, Mile 18 Buea',
      }));
  }, []);

  const percent = stats?.percent ?? 26;
  const raised = Number(stats?.raised ?? 1300000);
  const onTrack = raised >= 2500000;

  function openGold(amount) {
    setGoldAmount(amount);
    setGold(true);
  }

  return (
    <div className="hero-split bg-navy text-white">
      <header className="shrink-0 z-20 flex items-center justify-between gap-2 px-3 sm:px-5 py-2.5 bg-navy/90 border-b border-gold/15 pt-[max(0.55rem,env(safe-area-inset-top))]">
        <img src="/logo.jpg" alt="The Sound She Carries" className="h-9 sm:h-10 w-auto rounded-lg object-contain ring-1 ring-gold/30" />
        <div className="flex items-center gap-2">
          <LangSwitch />
          <Link to="/admin/login" className="staff-chip">{t.staff}</Link>
        </div>
      </header>

      <div className="flex-1 min-h-0 flex flex-col md:flex-row">
        <section className="relative overflow-hidden h-[28svh] min-h-[10rem] max-h-52 md:h-full md:max-h-none md:w-[40%] lg:w-[42%] shrink-0 bg-[#d8d8d8]">
          <img src="/lily.jpg" alt="Lian Ministrel" className="hero-photo" />
        </section>

        <section className="hero-right flex-1 min-h-0 px-3 sm:px-5 py-3 md:py-4 pb-[max(0.85rem,env(safe-area-inset-bottom))]">
          <div className="max-w-xl mx-auto md:ml-auto md:mr-0 space-y-3">
            <div className="glass-navy fade-up rounded-[1.4rem] p-4 sm:p-5">
              <p className="text-center text-[10px] tracking-[0.32em] uppercase text-gold font-bold">{t.minstrel}</p>
              <h1 className="font-display font-bold text-[1.45rem] sm:text-3xl text-center leading-tight mt-1 text-[#f6e7b2]">
                {t.title}
              </h1>
              <p className="text-center italic font-serif text-goldSoft mt-0.5 text-base">{t.live}</p>
              <p className="text-center mt-2 text-xs sm:text-sm text-chrome">{t.when}</p>
              <p className="text-center text-xs sm:text-sm text-white/90">{stats?.venue || t.venue}</p>

              <div className="gold-line my-3" />

              <div className="countdown-row">
                {left.done ? (
                  <p className="font-display text-2xl gold-text text-center w-full">{t.liveNow}</p>
                ) : (
                  <>
                    <Unit n={left.d} label={t.days} max={30} />
                    <Unit n={left.h} label={t.hours} max={24} />
                    <Unit n={left.m} label={t.mins} max={60} />
                    <Unit n={left.s} label={t.secs} max={60} />
                  </>
                )}
              </div>

              <div className="mt-4">
                <div className="flex justify-between gap-3 text-[10px] uppercase tracking-wider mb-1.5">
                  <span className={onTrack ? 'text-goldSoft' : 'text-rose-300'}>{t.raised} {money(stats?.raised)}</span>
                  <span className="text-chrome">{t.target} {money(stats?.target)}</span>
                </div>
                <div className={`h-2 rounded-full bg-white/10 overflow-hidden ring-1 ${onTrack ? 'ring-gold/20' : 'ring-rose-400/40'}`}>
                  <div
                    className={`h-full rounded-full progress-sheen ${
                      onTrack
                        ? 'bg-gradient-to-r from-bronze via-gold to-goldSoft'
                        : 'bg-gradient-to-r from-rose-800 via-rose-500 to-orange-400'
                    }`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <p className={`text-center text-xs mt-1.5 ${onTrack ? 'text-goldSoft' : 'text-rose-300'}`}>
                  {onTrack
                    ? `${percent}% · ${money(stats?.pending)} ${t.needPending}`
                    : `${percent}% · ${t.needMore}`}
                </p>
              </div>

              <button onClick={() => setOpen(true)} className="btn-donate btn-pulse w-full mt-4 rounded-xl min-h-11 text-sm sm:text-base font-semibold">
                {t.donate}
              </button>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <Link to="/book" className="rounded-xl min-h-10 border border-gold/40 text-goldSoft text-sm inline-flex items-center justify-center hover:bg-gold/10">
                  {t.book}
                </Link>
                <a href={WHATSAPP} target="_blank" rel="noreferrer" className="rounded-xl min-h-10 border border-gold/40 text-goldSoft text-sm inline-flex items-center justify-center hover:bg-gold/10">
                  {t.contact}
                </a>
              </div>
            </div>

            <GoldSponsorSlider onPick={openGold} t={t} />
          </div>
        </section>
      </div>

      <DonateModal open={open} onClose={() => setOpen(false)} />
      <GoldSponsorModal open={gold} onClose={() => setGold(false)} presetAmount={goldAmount} />
    </div>
  );
}
