import { useEffect, useState } from 'react';
import { api, getToken } from '../../lib/api';

async function downloadPdf(id, reference) {
  const res = await fetch(`/api/letters/${id}/pdf`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error('Could not download PDF');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${reference || 'letter'}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

export function LetterComposePage() {
  const [users, setUsers] = useState([]);
  const [cats, setCats] = useState([]);
  const [tpls, setTpls] = useState([]);
  const [form, setForm] = useState({
    subject: '', header: '', body: '', footer: '', category_id: '', to_ids: [], cc_ids: [], forward: 'draft', comment: '',
  });
  const [files, setFiles] = useState([]);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api('/users').then(setUsers);
    api('/letters/categories').then(setCats);
    api('/letters/templates').then(setTpls);
  }, []);

  function applyTpl(id) {
    const t = tpls.find((x) => x.id === id);
    if (t) setForm((f) => ({ ...f, subject: t.subject || f.subject, header: t.header || '', body: t.body || '', footer: t.footer || '' }));
  }

  async function submit(e) {
    e.preventDefault();
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, Array.isArray(v) ? v.join(',') : v ?? ''));
    for (const f of files) fd.append('attachments', f);
    await api('/letters', { method: 'POST', body: fd });
    setMsg('Letter saved');
  }

  return (
    <form onSubmit={submit} className="max-w-3xl space-y-3">
      <h1 className="font-display text-3xl">Compose letter</h1>
      <select className="field" onChange={(e) => applyTpl(e.target.value)}>
        <option value="">Load template</option>
        {tpls.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
      </select>
      <input className="field" placeholder="Subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
      <textarea className="field min-h-16" placeholder="Header" value={form.header} onChange={(e) => setForm({ ...form, header: e.target.value })} />
      <textarea className="field min-h-40" placeholder="Body" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
      <textarea className="field min-h-16" placeholder="Footer" value={form.footer} onChange={(e) => setForm({ ...form, footer: e.target.value })} />
      <select className="field" value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
        <option value="">Category</option>
        {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <select className="field" value={form.forward} onChange={(e) => setForm({ ...form, forward: e.target.value })}>
        <option value="draft">Keep as draft</option>
        <option value="approver">Forward to approver</option>
        <option value="signer">Mark approved for signer</option>
        <option value="sender">Ready to send</option>
      </select>
      <PeoplePicker label="To" users={users} selected={form.to_ids} onChange={(to_ids) => setForm({ ...form, to_ids })} />
      <PeoplePicker label="CC" users={users} selected={form.cc_ids} onChange={(cc_ids) => setForm({ ...form, cc_ids })} />
      <input type="file" multiple onChange={(e) => setFiles([...e.target.files])} />
      <button className="btn-donate rounded-xl px-6 py-2">Save letter</button>
      {msg && <span className="ml-3 text-emerald-300">{msg}</span>}
    </form>
  );
}

function PeoplePicker({ label, users, selected, onChange }) {
  return (
    <div>
      <p className="text-sm text-chrome mb-1">{label}</p>
      <div className="grid sm:grid-cols-2 gap-1 max-h-36 overflow-auto">
        {users.map((u) => (
          <label key={u.id} className="flex gap-2 text-sm">
            <input type="checkbox" checked={selected.includes(u.id)} onChange={() => onChange(selected.includes(u.id) ? selected.filter((x) => x !== u.id) : [...selected, u.id])} />
            {u.name}
          </label>
        ))}
      </div>
    </div>
  );
}

export function LetterListPage() {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState('');
  async function load(s = status) {
    setRows(await api(s ? `/letters?status=${s}` : '/letters'));
  }
  useEffect(() => { load(''); }, []);

  async function act(id, action) {
    if (action === 'send') await api(`/letters/${id}/send`, { method: 'POST' });
    else await api(`/letters/${id}/action`, { method: 'POST', body: JSON.stringify({ action }) });
    load(status);
  }

  return (
    <div>
      <h1 className="font-display text-3xl">Letters</h1>
      <div className="flex flex-wrap gap-2 mt-4">
        {['', 'draft', 'edited', 'approved', 'signed', 'sent', 'rejected'].map((s) => (
          <button key={s || 'all'} onClick={() => { setStatus(s); load(s); }} className={`px-3 py-1 rounded-lg ${status === s ? 'bg-crimson' : 'bg-white/10'}`}>{s || 'all'}</button>
        ))}
      </div>
      <ul className="mt-4 space-y-2">
        {rows.map((l) => (
          <li key={l.id} className="glass rounded-xl p-4">
            <div className="flex justify-between gap-3">
              <div>
                <p className="font-semibold">{l.subject}</p>
                <p className="text-xs text-chrome">{l.reference} · {l.status}</p>
              </div>
              <button type="button" className="underline text-sm" onClick={() => downloadPdf(l.id, l.reference)}>PDF</button>
            </div>
            <div className="flex flex-wrap gap-2 mt-3 text-sm">
              <button onClick={() => act(l.id, 'edit_ok')}>Mark edited</button>
              <button onClick={() => act(l.id, 'approve')}>Approve</button>
              <button onClick={() => act(l.id, 'sign')}>Sign</button>
              <button onClick={() => act(l.id, 'send')} className="text-crimson">Send WhatsApp</button>
              <button onClick={() => act(l.id, 'reject')}>Reject</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function LetterTemplatesPage() {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({ name: '', subject: '', header: '', body: '', footer: '' });
  async function load() { setRows(await api('/letters/templates')); }
  useEffect(() => { load(); }, []);
  return (
    <div className="max-w-xl space-y-3">
      <h1 className="font-display text-3xl">Letter templates</h1>
      {['name', 'subject', 'header', 'body', 'footer'].map((k) => (
        k === 'body' || k === 'header' || k === 'footer'
          ? <textarea key={k} className="field min-h-20" placeholder={k} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
          : <input key={k} className="field" placeholder={k} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
      ))}
      <button className="btn-donate rounded-xl px-4 py-2" onClick={async () => { await api('/letters/templates', { method: 'POST', body: JSON.stringify(form) }); load(); }}>Save</button>
      <ul className="space-y-2">{rows.map((r) => <li key={r.id} className="glass rounded-xl p-3">{r.name}</li>)}</ul>
    </div>
  );
}
