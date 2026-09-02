import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, money } from '../lib/api';
import DonateModal from '../components/DonateModal';
import GoldSponsorModal from '../components/GoldSponsorModal';

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

function GoldSponsorSlider({ onPick }) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % GOLD_TIERS.length), 3800);
    return () => clearInterval(id);
  }, []);
  const tier = GOLD_TIERS[index];
  return (
    <div className="glass-navy fade-up rounded-[1.25rem] sm:rounded-[1.6rem] p-4 sm:p-5 overflow-hidden">
      <p className="text-[10px] tracking-[0.28em] uppercase text-gold">Partnership</p>
      <h2 className="font-display text-xl sm:text-2xl gold-text mt-0.5">Gold Sponsors</h2>
      <p className="text-xs sm:text-sm text-chrome mt-1 mb-3">Stand with the live recording.</p>
      <button
        type="button"
        onClick={() => onPick(tier)}
        className="w-full rounded-2xl border border-gold/50 bg-gold/10 min-h-[5rem] sm:min-h-[6.25rem] px-3 py-4 text-center hover:bg-gold/20 transition"
      >
        <p className="text-[10px] tracking-[0.25em] uppercase text-gold">Tier {index + 1} of {GOLD_TIERS.length}</p>
        <p className="font-display text-2xl sm:text-3xl gold-text mt-1">{money(tier)}</p>
        <p className="text-xs text-chrome mt-1.5">Tap to sponsor</p>
      </button>
      <div className="flex items-center justify-between mt-3">
        <button type="button" className="text-gold min-h-10 px-3" onClick={() => setIndex((i) => (i - 1 + GOLD_TIERS.length) % GOLD_TIERS.length)}>‹</button>
        <div className="flex gap-1.5">
          {GOLD_TIERS.map((t, i) => (
            <button
              key={t}
              type="button"
              onClick={() => setIndex(i)}
              className={`h-1.5 rounded-full transition-all ${i === index ? 'w-6 bg-gold' : 'w-1.5 bg-white/25'}`}
              aria-label={money(t)}
            />
          ))}
        </div>
        <button type="button" className="text-gold min-h-10 px-3" onClick={() => setIndex((i) => (i + 1) % GOLD_TIERS.length)}>›</button>
      </div>
    </div>
  );
}

function Unit({ n, label }) {
  return (
    <div className="tick text-center flex-1 min-w-0">
      <div className="font-display text-[1.55rem] sm:text-4xl lg:text-5xl gold-text leading-none tracking-tight">
        {String(n).padStart(2, '0')}
      </div>
      <div className="mt-1 text-[8px] sm:text-[10px] tracking-[0.18em] uppercase text-goldSoft">{label}</div>
    </div>
  );
}

export default function LandingPage() {
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
    <div className="relative min-h-dvh bg-navy text-white overflow-x-hidden">
      <div className="poster-stage is-preview" aria-hidden>
        <img src="/poster-temp.jpg" alt="" className="poster-fit" />
        <div className="poster-veil" />
      </div>

      <div className="relative z-10 flex min-h-dvh flex-col gap-3 lg:flex-row lg:items-start lg:justify-between lg:gap-6 px-3 sm:px-5 lg:px-8 pt-[max(0.7rem,env(safe-area-inset-top))] pb-[max(1.1rem,env(safe-area-inset-bottom))]">
        <header className="flex items-center justify-between lg:absolute lg:inset-x-0 lg:top-0 lg:px-8 lg:pt-5">
          <img src="/logo.jpg" alt="The Sound She Carries" className="h-10 sm:h-11 lg:h-12 w-auto rounded-lg object-contain ring-1 ring-gold/35 logo-glow" />
          <Link to="/admin/login" className="text-[11px] tracking-[0.22em] uppercase text-gold/80 hover:text-gold min-h-10 inline-flex items-center">Staff</Link>
        </header>

        <div className="h-[26svh] min-h-[8.5rem] max-h-52 lg:hidden" aria-hidden />

        <main className="w-full lg:w-[min(36rem,48%)] lg:mt-[4.75rem] lg:mb-4">
          <div className="glass-navy fade-up rounded-[1.25rem] sm:rounded-[1.6rem] p-4 sm:p-6 lg:p-7">
            <p className="text-center text-[10px] sm:text-xs tracking-[0.32em] uppercase text-gold">The Prophetic Minstrel</p>
            <h1 className="font-display text-[1.45rem] sm:text-3xl lg:text-4xl text-center leading-tight mt-1.5 gold-text">
              The Sound She Carries
            </h1>
            <p className="text-center italic font-serif text-goldSoft mt-0.5 text-base sm:text-xl">Live Recording</p>
            <p className="text-center mt-2 text-xs sm:text-sm text-chrome">Lian Ministrel · 27 September · 5 PM</p>
            <p className="text-center text-xs sm:text-sm text-white/90">{stats?.venue || 'Chariot Banquet Hall, Mile 18 Buea'}</p>

            <div className="gold-line my-3 sm:my-4" />

            <div className="flex justify-center gap-1.5 sm:gap-3">
              {left.done ? (
                <p className="font-display text-2xl sm:text-3xl gold-text">The sound is live.</p>
              ) : (
                <>
                  <Unit n={left.d} label="Days" />
                  <Unit n={left.h} label="Hours" />
                  <Unit n={left.m} label="Mins" />
                  <Unit n={left.s} label="Secs" />
                </>
              )}
            </div>

            <div className="mt-4 sm:mt-5">
              <div className="flex justify-between gap-3 text-[10px] sm:text-[11px] uppercase tracking-wider mb-2">
                <span className={onTrack ? 'text-goldSoft' : 'text-rose-300'}>Raised {money(stats?.raised)}</span>
                <span className="text-chrome">Target {money(stats?.target)}</span>
              </div>
              <div className={`h-2 sm:h-2.5 rounded-full bg-white/10 overflow-hidden ring-1 ${onTrack ? 'ring-gold/20' : 'ring-rose-400/40'}`}>
                <div
                  className={`h-full rounded-full progress-sheen ${
                    onTrack
                      ? 'bg-gradient-to-r from-bronze via-gold to-goldSoft'
                      : 'bg-gradient-to-r from-rose-800 via-rose-500 to-orange-400'
                  }`}
                  style={{ width: `${percent}%` }}
                />
              </div>
              <p className={`text-center text-xs sm:text-sm mt-2 leading-snug ${onTrack ? 'text-goldSoft' : 'text-rose-300'}`}>
                {onTrack
                  ? `${percent}% funded · ${money(stats?.pending)} still pending`
                  : `${percent}% funded · below 2,500,000 F CFA — we still need more`}
              </p>
            </div>

            <button onClick={() => setOpen(true)} className="btn-donate btn-pulse w-full mt-4 sm:mt-5 rounded-2xl min-h-12 py-3 text-base sm:text-lg font-semibold">
              Donate
            </button>

            <div className="grid grid-cols-2 gap-2 mt-2.5">
              <Link to="/book" className="rounded-xl min-h-11 sm:min-h-12 border border-gold/40 text-goldSoft text-sm inline-flex items-center justify-center hover:bg-gold/10">
                Book
              </Link>
              <a
                href={WHATSAPP}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl min-h-11 sm:min-h-12 border border-gold/40 text-goldSoft text-sm inline-flex items-center justify-center hover:bg-gold/10"
              >
                Contact Us
              </a>
            </div>
          </div>
        </main>

        <aside className="w-full lg:w-[min(20rem,26%)] lg:mt-[4.75rem] lg:mb-4 lg:self-center">
          <GoldSponsorSlider onPick={openGold} />
        </aside>
      </div>
      <DonateModal open={open} onClose={() => setOpen(false)} />
      <GoldSponsorModal open={gold} onClose={() => setGold(false)} presetAmount={goldAmount} />
    </div>
  );
}
