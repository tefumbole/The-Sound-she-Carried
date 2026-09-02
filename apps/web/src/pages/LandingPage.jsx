import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, money } from '../lib/api';
import DonateModal from '../components/DonateModal';

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
    <div className="text-center min-w-[64px]">
      <div className="font-display text-3xl md:text-4xl chrome-text">{String(n).padStart(2, '0')}</div>
      <div className="text-[10px] tracking-[0.2em] uppercase text-chrome">{label}</div>
    </div>
  );
}

export default function LandingPage() {
  const [stats, setStats] = useState(null);
  const [open, setOpen] = useState(false);
  const left = useCountdown(CONCERT);

  async function load() {
    try {
      setStats(await api('/campaign/public'));
    } catch {
      setStats({
        target: 5000000,
        raised: 3000000,
        pending: 2000000,
        percent: 60,
        venue: 'Chariot Banquet Hall, Mile 18 Buea',
        contacts: ['+237697470711', '+237670706435'],
      });
    }
  }

  useEffect(() => { load(); }, []);

  const percent = stats?.percent ?? 60;

  return (
    <div
      className="min-h-screen bg-cover bg-center bg-no-repeat text-white"
      style={{ backgroundImage: "linear-gradient(180deg, rgba(10,10,12,.28), rgba(10,10,12,.55)), url('/poster.jpg')" }}
    >
      <header className="flex justify-between items-center px-5 py-4">
        <img src="/logo.jpg" alt="The Sound She Carries" className="h-12 md:h-14 w-auto rounded-md object-contain" />
        <Link to="/admin/login" className="text-xs text-gold hover:text-white">Staff</Link>
      </header>

      <main className="max-w-xl mx-auto px-4 pb-16 pt-6">
        <div className="glass rounded-3xl p-6 md:p-8">
          <img src="/logo.jpg" alt="TSSC" className="mx-auto h-28 md:h-36 w-auto object-contain drop-shadow-lg" />
          <p className="text-center text-xs tracking-[0.3em] uppercase text-gold mt-4">The Prophetic Minstrel</p>
          <h1 className="font-display text-4xl md:text-5xl text-center leading-tight mt-2 chrome-text">
            The Sound She Carries
          </h1>
          <p className="text-center italic text-crimson mt-1 text-xl">Live Recording</p>
          <p className="text-center mt-3 text-sm text-chrome">Lian Ministrel · 27 September · 5 PM</p>
          <p className="text-center text-sm">{stats?.venue || 'Chariot Banquet Hall, Mile 18 Buea'}</p>

          <div className="flex justify-center gap-4 mt-6">
            {left.done ? (
              <p className="font-display text-xl">The sound is live.</p>
            ) : (
              <>
                <Unit n={left.d} label="Days" />
                <Unit n={left.h} label="Hours" />
                <Unit n={left.m} label="Mins" />
                <Unit n={left.s} label="Secs" />
              </>
            )}
          </div>

          <div className="mt-8">
            <div className="flex justify-between text-xs uppercase tracking-wider text-chrome mb-2">
              <span>Raised {money(stats?.raised)}</span>
              <span>Target {money(stats?.target)}</span>
            </div>
            <div className="h-3 rounded-full bg-white/15 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-gold to-cyan transition-all"
                style={{ width: `${percent}%` }}
              />
            </div>
            <p className="text-center text-sm mt-2">{percent}% funded · {money(stats?.pending)} still pending</p>
          </div>

          <button onClick={() => setOpen(true)} className="btn-donate w-full mt-6 rounded-2xl py-3.5 text-lg font-semibold">
            Donate
          </button>

          <div className="mt-8 pt-5 border-t border-white/15 text-center">
            <p className="text-xs tracking-widest uppercase text-crimson mb-2">For info and sponsorship</p>
            <div className="flex flex-col sm:flex-row justify-center gap-2 sm:gap-4">
              {(stats?.contacts || ['+237697470711', '+237670706435']).map((n) => (
                <a key={n} href={`tel:${n}`} className="underline underline-offset-4">{n}</a>
              ))}
            </div>
          </div>
        </div>
      </main>
      <DonateModal open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
