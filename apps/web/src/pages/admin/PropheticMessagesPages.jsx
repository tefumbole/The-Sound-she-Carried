import { useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const THEMES = [
  'mercy', 'favour', 'open_doors', 'divine_help', 'restoration',
  'fruitfulness', 'protection', 'family', 'business', 'career',
  'wisdom', 'direction', 'healing', 'peace', 'breakthrough',
  'grace', 'victory', 'provision', 'purpose', 'spiritual_growth',
  'answered_prayer', 'new_beginnings', 'preservation', 'speed', 'establishment',
];
const empty = {
  title: 'MERCY',
  message: '',
  scripture_reference: '',
  scripture_text: '',
  declaration: 'I DECLARE: ',
  theme: 'mercy',
  message_family: 'mercy',
  day_of_week: 'monday',
  active: 1,
};

export function PropheticMessageListPage() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState('');
  const [day, setDay] = useState('');
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');

  async function load() {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (day) params.set('day', day);
    setRows(await api(`/prophetic-messages?${params}`));
  }

  useEffect(() => { load().catch(() => {}); }, []);

  function setField(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function save(e) {
    e.preventDefault();
    setError('');
    try {
      if (editing) await api(`/prophetic-messages/${editing}`, { method: 'PUT', body: JSON.stringify(form) });
      else await api('/prophetic-messages', { method: 'POST', body: JSON.stringify(form) });
      setForm(empty);
      setEditing(null);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  function startEdit(row) {
    setEditing(row.id);
    setForm({
      title: row.title,
      message: row.message,
      scripture_reference: row.scripture_reference,
      scripture_text: row.scripture_text,
      declaration: row.declaration,
      theme: row.theme,
      message_family: row.message_family || row.theme,
      day_of_week: row.day_of_week,
      active: Number(row.active),
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function deactivate(id) {
    await api(`/prophetic-messages/${id}`, { method: 'DELETE' });
    await load();
  }

  const previewText = useMemo(() => {
    const name = 'Grace';
    return {
      message: String(form.message || '').replaceAll('{{firstName}}', name),
      declaration: String(form.declaration || '').replaceAll('{{firstName}}', name),
    };
  }, [form]);

  return (
    <div>
      <h1 className="font-display text-3xl">Prophetic Messages</h1>
      <form onSubmit={save} className="glass rounded-2xl p-5 mt-6 grid gap-3">
        <div className="grid md:grid-cols-2 gap-3">
          <input className="field uppercase" placeholder="Heading (e.g. MERCY)" value={form.title} onChange={(e) => setField('title', e.target.value.toUpperCase())} />
          <input className="field" placeholder="Scripture reference" value={form.scripture_reference} onChange={(e) => setField('scripture_reference', e.target.value)} />
        </div>
        <textarea className="field min-h-24" placeholder="Message (use {{firstName}})" value={form.message} onChange={(e) => setField('message', e.target.value)} />
        <textarea className="field min-h-20" placeholder="Scripture text" value={form.scripture_text} onChange={(e) => setField('scripture_text', e.target.value)} />
        <textarea className="field min-h-20" placeholder="I DECLARE: …" value={form.declaration} onChange={(e) => setField('declaration', e.target.value)} />
        <div className="grid md:grid-cols-4 gap-3">
          <select className="field" value={form.day_of_week} onChange={(e) => setField('day_of_week', e.target.value)}>
            {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <select className="field" value={form.theme} onChange={(e) => {
            setField('theme', e.target.value);
            setField('message_family', e.target.value);
          }}>
            {THEMES.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <input className="field" placeholder="Message family" value={form.message_family || ''} onChange={(e) => setField('message_family', e.target.value)} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={Number(form.active) === 1} onChange={(e) => setField('active', e.target.checked ? 1 : 0)} />
            Active
          </label>
        </div>
        {error && <p className="text-rose-300 text-sm">{error}</p>}
        <div className="flex flex-wrap gap-2">
          <button type="submit" className="btn-donate rounded-xl px-4 py-2">{editing ? 'Update' : 'Add message'}</button>
          <button type="button" className="rounded-xl px-4 py-2 border border-gold/40" onClick={() => setPreview(previewText)}>Preview</button>
          {editing && (
            <button type="button" className="rounded-xl px-4 py-2 border border-white/20" onClick={() => { setEditing(null); setForm(empty); }}>
              Cancel edit
            </button>
          )}
        </div>
        {preview && (
          <div className="rounded-xl border border-gold/30 p-4 text-sm">
            <p className="text-gold uppercase tracking-wider text-xs">Preview for Grace</p>
            <p className="mt-2 font-display text-xl tracking-[0.12em] uppercase text-gold">{form.title}</p>
            <p className="mt-2">{preview.message}</p>
            <p className="mt-3 italic">{form.scripture_reference} — {form.scripture_text}</p>
            <p className="mt-3 text-gold uppercase tracking-wider text-xs">I DECLARE</p>
            <p className="mt-2">{preview.declaration}</p>
          </div>
        )}
      </form>

      <div className="flex flex-wrap gap-2 mt-8">
        <input className="field max-w-xs" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="field max-w-[10rem]" value={day} onChange={(e) => setDay(e.target.value)}>
          <option value="">All days</option>
          {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <button type="button" className="btn-donate rounded-xl px-4" onClick={() => load()}>Filter</button>
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full text-sm">
          <thead className="bg-white/5 text-chrome">
            <tr>
              <th className="text-left p-3">Day</th>
              <th className="text-left p-3">Title</th>
              <th className="text-left p-3">Scripture</th>
              <th className="text-left p-3">Family</th>
              <th className="text-left p-3">Sent</th>
              <th className="text-left p-3">Active</th>
              <th className="text-left p-3"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-white/10">
                <td className="p-3 capitalize">{row.day_of_week}</td>
                <td className="p-3">{row.title}</td>
                <td className="p-3">{row.scripture_reference}</td>
                <td className="p-3">{row.message_family || row.theme}</td>
                <td className="p-3">{row.sent_count}</td>
                <td className="p-3">{Number(row.active) ? 'Yes' : 'No'}</td>
                <td className="p-3 whitespace-nowrap">
                  <button type="button" className="underline mr-3" onClick={() => startEdit(row)}>Edit</button>
                  {Number(row.active) === 1 && (
                    <button type="button" className="underline text-rose-300" onClick={() => deactivate(row.id)}>Deactivate</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function PropheticHistoryPage() {
  const [rows, setRows] = useState([]);
  useEffect(() => { api('/prophetic-messages/history').then(setRows).catch(() => {}); }, []);
  return (
    <div>
      <h1 className="font-display text-3xl">Prophetic Message History</h1>
      <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full text-sm">
          <thead className="bg-white/5 text-chrome">
            <tr>
              <th className="text-left p-3">Contributor</th>
              <th className="text-left p-3">Phone</th>
              <th className="text-left p-3">Contribution</th>
              <th className="text-left p-3">Amount</th>
              <th className="text-left p-3">Prophetic Message</th>
              <th className="text-left p-3">Scripture</th>
              <th className="text-left p-3">Date Sent</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-white/10">
                <td className="p-3">{row.full_name || row.first_name || '—'}</td>
                <td className="p-3">{row.phone_e164 || '—'}</td>
                <td className="p-3">{row.reference || row.contribution_id}</td>
                <td className="p-3">{row.amount ? `${Number(row.amount).toLocaleString('en-US')} F CFA` : '—'}</td>
                <td className="p-3 max-w-xs truncate" title={row.message}>{row.title}</td>
                <td className="p-3">{row.scripture_reference}</td>
                <td className="p-3">{row.sent_at ? new Date(row.sent_at).toLocaleString() : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
