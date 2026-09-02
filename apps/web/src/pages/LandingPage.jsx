import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, money } from '../lib/api';
import DonateModal from '../components/DonateModal';
import GoldSponsorModal from '../components/GoldSponsorModal';

const CONCERT = new Date('2026-09-27T17:00:00+01:00');

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
      <div className="font-display text-2xl sm:text-3xl md:text-4xl gold-text leading-none">
        {String(n).padStart(2, '0')}
      </div>
      <div className="mt-1 text-[9px] sm:text-[10px] tracking-[0.18em] uppercase text-chrome">{label}</div>
    </div>
  );
}

export default function LandingPage() {
  const [stats, setStats] = useState(null);
  const [open, setOpen] = useState(false);
  const [gold, setGold] = useState(false);
  const left = useCountdown(CONCERT);

  useEffect(() => {
    api('/campaign/public')
      .then(setStats)
      .catch(() => setStats({
        target: 5000000, raised: 3000000, pending: 2000000, percent: 60,
        venue: 'Chariot Banquet Hall, Mile 18 Buea',
        contacts: ['+237697470711', '+237670706435'],
      }));
  }, []);

  const percent = stats?.percent ?? 60;

  return (
    <div className="relative min-h-dvh bg-navy text-white overflow-x-hidden">
      <div className="poster-stage" aria-hidden>
        <img src="/poster.jpg" alt="" className="poster-fit" />
        <div className="poster-veil" />
        <div className="gold-waves" />
        <div className="sparkles" />
      </div>

      <div className="relative z-10 flex min-h-dvh flex-col md:flex-row md:items-center">
        <header className="flex items-center justify-between px-4 pt-[max(0.9rem,env(safe-area-inset-top))] pb-2 md:absolute md:inset-x-0 md:top-0 md:px-8 md:py-6">
          <img src="/logo.jpg" alt="The Sound She Carries" className="h-11 md:h-14 w-auto rounded-lg object-contain ring-1 ring-gold/35 logo-glow" />
          <Link to="/admin/login" className="text-[11px] tracking-[0.22em] uppercase text-gold/80 hover:text-gold">Staff</Link>
        </header>

        <div className="h-[34vh] min-h-[180px] md:hidden" aria-hidden />

        <main className="w-full md:w-[min(36rem,48%)] md:pl-8 lg:pl-14 md:pr-4">
          <div className="glass-navy fade-up mx-3 mb-[max(0.85rem,env(safe-area-inset-bottom))] rounded-[1.6rem] p-5 sm:p-7 md:mx-0 md:mb-8">
            <p className="text-center text-[10px] sm:text-xs tracking-[0.32em] uppercase text-gold">The Prophetic Minstrel</p>
            <h1 className="font-display text-[1.7rem] sm:text-4xl md:text-5xl text-center leading-tight mt-2 gold-text">
              The Sound She Carries
            </h1>
            <p className="text-center italic font-serif text-goldSoft mt-1 text-lg sm:text-xl">Live Recording</p>
            <p className="text-center mt-3 text-sm text-chrome">Lian Ministrel · 27 September · 5 PM</p>
            <p className="text-center text-sm text-white/90">{stats?.venue || 'Chariot Banquet Hall, Mile 18 Buea'}</p>

            <div className="gold-line my-5" />

            <div className="flex justify-center gap-2 sm:gap-3">
              {left.done ? (
                <p className="font-display text-xl gold-text">The sound is live.</p>
              ) : (
                <>
                  <Unit n={left.d} label="Days" />
                  <Unit n={left.h} label="Hours" />
                  <Unit n={left.m} label="Mins" />
                  <Unit n={left.s} label="Secs" />
                </>
              )}
            </div>

            <div className="mt-6">
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
              <button type="button" onClick={() => setGold(true)} className="rounded-xl min-h-12 border border-gold/40 text-goldSoft text-sm hover:bg-gold/10">
                Gold Sponsor
              </button>
            </div>

            <div className="mt-6 pt-4 text-center">
              <div className="gold-line mb-4" />
              <p className="text-[10px] tracking-[0.22em] uppercase text-gold mb-2">For info and sponsorship</p>
              <div className="flex flex-col sm:flex-row justify-center gap-2 sm:gap-4">
                {(stats?.contacts || ['+237697470711', '+237670706435']).map((n) => (
                  <a key={n} href={`tel:${n}`} className="min-h-11 inline-flex items-center justify-center underline underline-offset-4">
                    {n}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
      <DonateModal open={open} onClose={() => setOpen(false)} />
      <GoldSponsorModal open={gold} onClose={() => setGold(false)} />
    </div>
  );
}
