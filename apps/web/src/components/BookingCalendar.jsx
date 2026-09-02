import { useMemo, useState } from 'react';

function ymd(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function asDateKey(value) {
  if (!value) return '';
  if (typeof value === 'string') return value.slice(0, 10);
  try { return ymd(new Date(value)); } catch { return ''; }
}

export default function BookingCalendar({ booked = [], pending = [], value, onChange, selectable = true }) {
  const today = new Date();
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const bookedSet = useMemo(() => new Set(booked.map(asDateKey)), [booked]);
  const pendingSet = useMemo(() => new Set(pending.map(asDateKey)), [pending]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const start = new Date(year, month, 1);
  const startPad = start.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startPad; i += 1) cells.push(null);
  for (let d = 1; d <= daysInMonth; d += 1) cells.push(new Date(year, month, d));

  return (
    <div className="rounded-2xl border border-gold/25 bg-navy/40 p-3">
      <div className="flex items-center justify-between mb-3">
        <button type="button" className="text-gold px-2 min-h-10" onClick={() => setCursor(new Date(year, month - 1, 1))}>‹</button>
        <p className="font-display text-gold">{cursor.toLocaleString('en-GB', { month: 'long', year: 'numeric' })}</p>
        <button type="button" className="text-gold px-2 min-h-10" onClick={() => setCursor(new Date(year, month + 1, 1))}>›</button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] uppercase tracking-wider text-chrome mb-1">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => <div key={d}>{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (!day) return <div key={`e-${i}`} />;
          const key = ymd(day);
          const isBooked = bookedSet.has(key);
          const isPending = pendingSet.has(key);
          const isPast = key < ymd(today);
          const selected = value === key;
          return (
            <button
              key={key}
              type="button"
              disabled={isPast || (selectable && isBooked)}
              onClick={() => {
                if (isBooked) return;
                if (selectable && !isPast) onChange?.(key);
              }}
              className={`min-h-10 rounded-lg text-sm ${
                isBooked
                  ? 'bg-gold text-ink font-semibold'
                  : selected
                    ? 'bg-gold/25 text-goldSoft ring-1 ring-gold'
                    : isPending
                      ? 'bg-white/10 text-goldSoft'
                      : isPast
                        ? 'text-white/25'
                        : 'hover:bg-white/10'
              }`}
              title={isBooked ? 'Already booked' : isPending ? 'Pending request' : ''}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>
      <div className="flex gap-3 mt-3 text-[10px] uppercase tracking-wider text-chrome">
        <span className="inline-flex items-center gap-1"><i className="inline-block w-2.5 h-2.5 rounded-sm bg-gold" /> Booked</span>
        <span className="inline-flex items-center gap-1"><i className="inline-block w-2.5 h-2.5 rounded-sm bg-white/20" /> Pending</span>
      </div>
    </div>
  );
}
