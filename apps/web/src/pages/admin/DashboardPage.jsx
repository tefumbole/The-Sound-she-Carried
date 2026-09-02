import { useEffect, useState } from 'react';
import { api, money } from '../../lib/api';

export default function DashboardPage() {
  const [snap, setSnap] = useState(null);
  const [donations, setDonations] = useState([]);

  useEffect(() => {
    api('/campaign').then(setSnap).catch(() => {});
    api('/donations').then(setDonations).catch(() => {});
  }, []);

  return (
    <div>
      <h1 className="font-display text-3xl">Campaign</h1>
      <div className="grid md:grid-cols-3 gap-4 mt-6">
        <Stat label="Raised" value={money(snap?.raised)} />
        <Stat label="Target" value={money(snap?.target)} />
        <Stat label="Pending" value={money(snap?.pending)} />
      </div>
      <div className="mt-6 h-3 rounded-full bg-white/10 overflow-hidden">
        <div className="h-full bg-crimson" style={{ width: `${snap?.percent || 0}%` }} />
      </div>
      <p className="text-sm text-chrome mt-2">{snap?.percent || 0}% of target</p>
      <h2 className="mt-10 font-display text-2xl">Recent donations</h2>
      <Table rows={donations.slice(0, 12)} />
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="glass rounded-2xl p-5">
      <p className="text-xs uppercase tracking-widest text-chrome">{label}</p>
      <p className="text-2xl mt-1">{value}</p>
    </div>
  );
}

export function Table({ rows }) {
  return (
    <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10">
      <table className="w-full text-sm">
        <thead className="bg-white/5 text-chrome">
          <tr>
            <th className="text-left p-3">Name</th>
            <th className="text-left p-3">Amount</th>
            <th className="text-left p-3">Method</th>
            <th className="text-left p-3">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((d) => (
            <tr key={d.id} className="border-t border-white/10">
              <td className="p-3">{d.holder_name || '—'}</td>
              <td className="p-3">{money(d.amount)}</td>
              <td className="p-3 uppercase">{d.method}</td>
              <td className="p-3">{d.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
