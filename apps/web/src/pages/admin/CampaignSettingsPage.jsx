import { useEffect, useState } from 'react';
import { api, money } from '../../lib/api';

export default function CampaignSettingsPage() {
  const [form, setForm] = useState(null);
  const [saved, setSaved] = useState('');

  useEffect(() => {
    api('/campaign').then((s) => {
      setForm({
        target_amount: s.settings.target_amount,
        manual_raised: s.settings.manual_raised,
        concert_at: String(s.settings.concert_at || '').slice(0, 16),
        notify_donor: s.settings.notify_donor,
        notify_admin: s.settings.notify_admin,
        admin_phones: s.settings.admin_phones,
        venue: s.settings.venue,
      });
    });
  }, []);

  if (!form) return <p>Loading…</p>;

  async function save(e) {
    e.preventDefault();
    await api('/campaign', {
      method: 'PUT',
      body: JSON.stringify({
        ...form,
        concert_at: form.concert_at.replace('T', ' ') + ':00',
      }),
    });
    setSaved('Saved');
  }

  return (
    <form onSubmit={save} className="max-w-xl space-y-4">
      <h1 className="font-display text-3xl">Campaign settings</h1>
      <Field label={`Target (${money(form.target_amount)})`}>
        <input className="field" type="number" value={form.target_amount} onChange={(e) => setForm({ ...form, target_amount: e.target.value })} />
      </Field>
      <Field label="Manual raised (base, plus live donations)">
        <input className="field" type="number" value={form.manual_raised} onChange={(e) => setForm({ ...form, manual_raised: e.target.value })} />
      </Field>
      <Field label="Concert date/time">
        <input className="field" type="datetime-local" value={form.concert_at} onChange={(e) => setForm({ ...form, concert_at: e.target.value })} />
      </Field>
      <Field label="Venue">
        <input className="field" value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} />
      </Field>
      <Field label="Admin WhatsApp numbers (comma separated)">
        <input className="field" value={form.admin_phones} onChange={(e) => setForm({ ...form, admin_phones: e.target.value })} />
      </Field>
      <label className="flex gap-2"><input type="checkbox" checked={!!Number(form.notify_donor)} onChange={(e) => setForm({ ...form, notify_donor: e.target.checked ? 1 : 0 })} /> Notify donors on WhatsApp</label>
      <label className="flex gap-2"><input type="checkbox" checked={!!Number(form.notify_admin)} onChange={(e) => setForm({ ...form, notify_admin: e.target.checked ? 1 : 0 })} /> Notify admins on WhatsApp</label>
      <button className="btn-donate rounded-xl px-6 py-2">Save</button>
      {saved && <span className="ml-3 text-emerald-300">{saved}</span>}
    </form>
  );
}

function Field({ label, children }) {
  return (
    <label className="block text-sm">
      <span className="text-chrome">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
