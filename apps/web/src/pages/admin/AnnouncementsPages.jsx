import { useEffect, useState } from 'react';
import { api } from '../../lib/api';

export function AnnouncementComposePage() {
  const [users, setUsers] = useState([]);
  const [cats, setCats] = useState([]);
  const [form, setForm] = useState({ subject: '', header: 'TSSC Presents', body: '', footer: 'The Sound She Carries', category_id: '', recipient_ids: [], scheduled_at: '' });
  const [files, setFiles] = useState([]);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api('/users').then(setUsers);
    api('/announcements/categories').then(setCats);
  }, []);

  async function submit(sendNow) {
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => {
      if (k === 'recipient_ids') fd.append(k, v.join(','));
      else fd.append(k, v ?? '');
    });
    fd.append('send_now', sendNow ? '1' : '0');
    for (const f of files) fd.append('attachments', f);
    await api('/announcements', { method: 'POST', body: fd });
    setMsg(sendNow ? 'Sending…' : 'Saved');
  }

  return (
    <div className="max-w-2xl space-y-3">
      <h1 className="font-display text-3xl">Compose announcement</h1>
      <input className="field" placeholder="Subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
      <input className="field" placeholder="Header" value={form.header} onChange={(e) => setForm({ ...form, header: e.target.value })} />
      <textarea className="field min-h-32" placeholder="Body — tokens {name} {phone} {reference}" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
      <input className="field" placeholder="Footer" value={form.footer} onChange={(e) => setForm({ ...form, footer: e.target.value })} />
      <select className="field" value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
        <option value="">Category</option>
        {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <input className="field" type="datetime-local" value={form.scheduled_at} onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })} />
      <input type="file" multiple onChange={(e) => setFiles([...e.target.files])} />
      <p className="text-sm text-chrome">Recipients (staff)</p>
      <div className="grid sm:grid-cols-2 gap-2 max-h-48 overflow-auto">
        {users.map((u) => (
          <label key={u.id} className="flex gap-2 text-sm">
            <input type="checkbox" checked={form.recipient_ids.includes(u.id)} onChange={() => setForm((f) => ({ ...f, recipient_ids: f.recipient_ids.includes(u.id) ? f.recipient_ids.filter((x) => x !== u.id) : [...f.recipient_ids, u.id] }))} />
            {u.name}
          </label>
        ))}
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={() => submit(false)} className="rounded-xl px-4 py-2 border border-white/20">Save / schedule</button>
        <button type="button" onClick={() => submit(true)} className="btn-donate rounded-xl px-4 py-2">Send now</button>
      </div>
      {msg && <p className="text-emerald-300">{msg}</p>}
    </div>
  );
}

export function AnnouncementListPage({ status }) {
  const [rows, setRows] = useState([]);
  async function load() {
    setRows(await api(status ? `/announcements?status=${status}` : '/announcements'));
  }
  useEffect(() => { load(); }, [status]);
  async function send(id) {
    await api(`/announcements/${id}/send`, { method: 'POST' });
    load();
  }
  return (
    <div>
      <h1 className="font-display text-3xl">{status === 'scheduled' ? 'Scheduled announcements' : 'Announcements'}</h1>
      <ul className="mt-4 space-y-2">
        {rows.map((r) => (
          <li key={r.id} className="glass rounded-xl p-4 flex justify-between gap-3">
            <div>
              <p className="font-semibold">{r.subject}</p>
              <p className="text-xs text-chrome">{r.reference} · {r.status} · sent {r.sent_count || 0}</p>
            </div>
            {r.status !== 'sent' && <button onClick={() => send(r.id)} className="btn-donate rounded-xl px-3 py-1 text-sm">Send</button>}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function AnnouncementTemplatesPage() {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({ name: '', subject: '', body: '' });
  async function load() { setRows(await api('/announcements/templates')); }
  useEffect(() => { load(); }, []);
  return (
    <div className="max-w-xl space-y-3">
      <h1 className="font-display text-3xl">Announcement templates</h1>
      <input className="field" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      <input className="field" placeholder="Subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
      <textarea className="field min-h-24" placeholder="Body" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
      <button className="btn-donate rounded-xl px-4 py-2" onClick={async () => { await api('/announcements/templates', { method: 'POST', body: JSON.stringify(form) }); load(); }}>Save</button>
      <ul className="space-y-2">{rows.map((r) => <li key={r.id} className="glass rounded-xl p-3">{r.name}</li>)}</ul>
    </div>
  );
}

export function AnnouncementCategoriesPage() {
  const [rows, setRows] = useState([]);
  const [name, setName] = useState('');
  async function load() { setRows(await api('/announcements/categories')); }
  useEffect(() => { load(); }, []);
  return (
    <div className="max-w-xl">
      <h1 className="font-display text-3xl">Categories</h1>
      <form className="flex gap-2 mt-4" onSubmit={async (e) => { e.preventDefault(); await api('/announcements/categories', { method: 'POST', body: JSON.stringify({ name }) }); setName(''); load(); }}>
        <input className="field" value={name} onChange={(e) => setName(e.target.value)} />
        <button className="btn-donate rounded-xl px-4">Add</button>
      </form>
      <ul className="mt-4 space-y-2">{rows.map((r) => <li key={r.id}>{r.name}</li>)}</ul>
    </div>
  );
}

export function AnnouncementSettingsPage() {
  const [form, setForm] = useState(null);
  useEffect(() => { api('/announcements/settings').then(setForm); }, []);
  if (!form) return null;
  return (
    <form className="max-w-xl space-y-3" onSubmit={async (e) => { e.preventDefault(); await api('/announcements/settings', { method: 'PUT', body: JSON.stringify(form) }); }}>
      <h1 className="font-display text-3xl">Announcement settings</h1>
      {['company_name', 'default_header', 'serial_prefix', 'timezone'].map((k) => (
        <input key={k} className="field" value={form[k] || ''} onChange={(e) => setForm({ ...form, [k]: e.target.value })} placeholder={k} />
      ))}
      <button className="btn-donate rounded-xl px-4 py-2">Save</button>
    </form>
  );
}
