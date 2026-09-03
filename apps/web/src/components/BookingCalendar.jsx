import { useMemo, useState } from 'react';

function ymd(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function asDateKey(value) {
  if (!value) return '';
  if (typeof value === 'string') return value.slice(0, 10);
  try { return ymd(new Date(value)); } catch { return ''; }
}

export default function BookingCalendar({ booked = [], pending = [], value, onChange, selectable = true, labels }) {
  const today = new Date();
  const todayKey = ymd(today);
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const bookedSet = useMemo(() => new Set(booked.map(asDateKey)), [booked]);
  const pendingSet = useMemo(() => new Set(pending.map(asDateKey)), [pending]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const startPad = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = Array.from({ length: startPad }, () => null)
    .concat(Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)));

  const pretty = value
    ? new Date(`${value}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
    : '';

  return (
    <div className="cal-card">
      <div className="flex items-center justify-between px-1 mb-3">
        <button type="button" className="cal-nav" onClick={() => setCursor(new Date(year, month - 1, 1))} aria-label="Previous month">‹</button>
        <div className="text-center">
          <p className="font-display text-gold text-lg leading-none">{cursor.toLocaleString('en-GB', { month: 'long' })}</p>
          <p className="text-[10px] tracking-[0.22em] uppercase text-chrome mt-1">{year}</p>
        </div>
        <button type="button" className="cal-nav" onClick={() => setCursor(new Date(year, month + 1, 1))} aria-label="Next month">›</button>
      </div>
      <div className="grid grid-cols-7 text-center text-[10px] tracking-[0.14em] uppercase text-gold/60 mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => <div key={d}>{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((day, i) => {
          if (!day) return <div key={`e-${i}`} />;
          const key = ymd(day);
          const isBooked = bookedSet.has(key);
          const isPending = pendingSet.has(key);
          const isPast = key < todayKey;
          const selected = value === key;
          const isToday = key === todayKey;
          return (
            <button
              key={key}
              type="button"
              disabled={isPast || (selectable && isBooked)}
              onClick={() => { if (!isBooked && !isPast && selectable) onChange?.(key); }}
              className={[
                'cal-day',
                isBooked && 'is-booked',
                selected && 'is-selected',
                isPending && !selected && 'is-pending',
                isPast && 'is-past',
                isToday && !selected && !isBooked && 'is-today',
              ].filter(Boolean).join(' ')}
              title={isBooked ? 'Already booked' : isPending ? 'Pending request' : ''}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/10">
        <div className="flex gap-2.5 text-[9px] uppercase tracking-wider text-chrome">
          <span className="inline-flex items-center gap-1"><i className="cal-dot bg-gold" /> {labels?.booked || 'Booked'}</span>
          <span className="inline-flex items-center gap-1"><i className="cal-dot bg-white/25" /> {labels?.pending || 'Pending'}</span>
        </div>
        {pretty && <p className="text-xs text-goldSoft">{pretty}</p>}
      </div>
    </div>
  );
}
