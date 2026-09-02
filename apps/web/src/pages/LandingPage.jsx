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

function Unit({ n, label }) {
  return (
    <div className="tick text-center flex-1">
      <div className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl gold-text leading-none tracking-tight">
        {String(n).padStart(2, '0')}
      </div>
      <div className="mt-2 text-[10px] sm:text-xs tracking-[0.28em] uppercase text-goldSoft">{label}</div>
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

  function openGold(amount) {
    setGoldAmount(amount);
    setGold(true);
  }

  return (
    <div className="relative min-h-dvh bg-navy text-white overflow-x-hidden">
      <div className="poster-stage" aria-hidden>
        <img src="/poster.jpg" alt="" className="poster-fit" />
        <div className="poster-veil" />
        <div className="gold-waves" />
        <div className="sparkles" />
      </div>

      <div className="relative z-10 flex min-h-dvh flex-col md:flex-row md:items-center md:justify-between">
        <header className="flex items-center justify-between px-4 pt-[max(0.9rem,env(safe-area-inset-top))] pb-2 md:absolute md:inset-x-0 md:top-0 md:px-8 md:py-6">
          <img src="/logo.jpg" alt="The Sound She Carries" className="h-11 md:h-14 w-auto rounded-lg object-contain ring-1 ring-gold/35 logo-glow" />
          <Link to="/admin/login" className="text-[11px] tracking-[0.22em] uppercase text-gold/80 hover:text-gold">Staff</Link>
        </header>

        <div className="h-[22vh] min-h-[120px] md:hidden" aria-hidden />

        <main className="w-full md:w-[min(40rem,50%)] md:pl-8 lg:pl-14 md:pr-4">
          <div className="glass-navy fade-up mx-3 mb-3 rounded-[1.6rem] p-5 sm:p-7 md:mx-0 md:mb-8">
            <p className="text-center text-[10px] sm:text-xs tracking-[0.32em] uppercase text-gold">The Prophetic Minstrel</p>
            <h1 className="font-display text-[1.7rem] sm:text-4xl md:text-5xl text-center leading-tight mt-2 gold-text">
              The Sound She Carries
            </h1>
            <p className="text-center italic font-serif text-goldSoft mt-1 text-lg sm:text-xl">Live Recording</p>
            <p className="text-center mt-3 text-sm text-chrome">Lian Ministrel · 27 September · 5 PM</p>
            <p className="text-center text-sm text-white/90">{stats?.venue || 'Chariot Banquet Hall, Mile 18 Buea'}</p>

            <div className="gold-line my-5" />

            <div className="flex justify-center gap-2 sm:gap-4">
              {left.done ? (
                <p className="font-display text-3xl gold-text">The sound is live.</p>
              ) : (
                <>
                  <Unit n={left.d} label="Days" />
                  <Unit n={left.h} label="Hours" />
                  <Unit n={left.m} label="Mins" />
                  <Unit n={left.s} label="Secs" />
                </>
              )}
            </div>

            <div className="mt-7">
              <div className="flex justify-between gap-3 text-[11px] uppercase tracking-wider text-chrome mb-2">
                <span>Raised {money(stats?.raised)}</span>
                <span>Target {money(stats?.target)}</span>
              </div>
              <div className="h-2.5 rounded-full bg-white/10 overflow-hidden ring-1 ring-gold/20">
                <div className="h-full rounded-full progress-sheen bg-gradient-to-r from-bronze via-gold to-goldSoft" style={{ width: `${percent}%` }} />
              </div>
              <p className="text-center text-sm mt-2 text-chrome">{percent}% funded · {money(stats?.pending)} still pending</p>
            </div>

            <button onClick={() => setOpen(true)} className="btn-donate btn-pulse w-full mt-6 rounded-2xl min-h-12 py-3.5 text-base sm:text-lg font-semibold">
              Donate
            </button>

            <div className="grid grid-cols-2 gap-2 mt-3">
              <Link to="/book" className="rounded-xl min-h-12 border border-gold/40 text-goldSoft text-sm inline-flex items-center justify-center hover:bg-gold/10">
                Book
              </Link>
              <a
                href={WHATSAPP}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl min-h-12 border border-gold/40 text-goldSoft text-sm inline-flex items-center justify-center hover:bg-gold/10"
              >
                Contact Us
              </a>
            </div>
          </div>
        </main>

        <aside className="w-full md:w-[min(22rem,28%)] md:pr-8 lg:pr-12 px-3 md:px-0 pb-[max(0.85rem,env(safe-area-inset-bottom))] md:pb-0">
          <div className="glass-navy fade-up rounded-[1.6rem] p-5 md:p-6">
            <p className="text-[10px] tracking-[0.28em] uppercase text-gold">Partnership</p>
            <h2 className="font-display text-2xl md:text-3xl gold-text mt-1">Gold Sponsors</h2>
            <p className="text-sm text-chrome mt-2 mb-4">Stand with the live recording.</p>
            <div className="grid grid-cols-2 md:grid-cols-1 gap-2">
              {GOLD_TIERS.map((tier) => (
                <button
                  key={tier}
                  type="button"
                  onClick={() => openGold(tier)}
                  className="rounded-xl min-h-12 border border-gold/40 text-goldSoft hover:bg-gold/15 hover:text-white"
                >
                  {money(tier)}
                </button>
              ))}
            </div>
          </div>
        </aside>
      </div>
      <DonateModal open={open} onClose={() => setOpen(false)} />
      <GoldSponsorModal open={gold} onClose={() => setGold(false)} presetAmount={goldAmount} />
    </div>
  );
}
