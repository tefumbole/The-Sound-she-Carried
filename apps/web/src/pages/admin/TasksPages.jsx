import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';

export function TaskDashboardPage() {
  const [stats, setStats] = useState({});
  useEffect(() => { api('/tasks/stats').then(setStats); }, []);
  return (
    <div>
      <div className="flex justify-between">
        <h1 className="font-display text-3xl">Task dashboard</h1>
        <Link to="/admin/tasks/create" className="btn-donate rounded-xl px-4 py-2">Create</Link>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-6">
        {[['Total', stats.total], ['Pending', stats.pending], ['In Progress', stats.inProgress], ['Completed', stats.completed], ['Overdue', stats.overdue]].map(([l, v]) => (
          <div key={l} className="glass rounded-2xl p-4"><p className="text-xs text-chrome">{l}</p><p className="text-2xl">{v || 0}</p></div>
        ))}
      </div>
    </div>
  );
}

export function TaskListPage() {
  const [rows, setRows] = useState([]);
  useEffect(() => { api('/tasks').then(setRows); }, []);
  return (
    <div>
      <h1 className="font-display text-3xl">All tasks</h1>
      <TaskTable rows={rows} />
    </div>
  );
}

export function ScheduledTasksPage() {
  const [rows, setRows] = useState([]);
  useEffect(() => { api('/tasks/scheduled').then(setRows); }, []);
  return <div><h1 className="font-display text-3xl">Scheduled tasks</h1><TaskTable rows={rows} /></div>;
}

export function TaskRemindersPage() {
  const [rows, setRows] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [form, setForm] = useState({ task_id: '', reminder_time: '' });
  useEffect(() => {
    api('/tasks/reminders').then(setRows);
    api('/tasks').then(setTasks);
  }, []);
  async function add(e) {
    e.preventDefault();
    await api('/tasks/reminders', { method: 'POST', body: JSON.stringify(form) });
    setRows(await api('/tasks/reminders'));
  }
  return (
    <div>
      <h1 className="font-display text-3xl">Reminders</h1>
      <form onSubmit={add} className="flex flex-wrap gap-2 mt-4">
        <select className="field max-w-xs" value={form.task_id} onChange={(e) => setForm({ ...form, task_id: e.target.value })}>
          <option value="">Task</option>
          {tasks.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
        </select>
        <input className="field max-w-xs" type="datetime-local" value={form.reminder_time} onChange={(e) => setForm({ ...form, reminder_time: e.target.value })} />
        <button className="btn-donate rounded-xl px-4">Add</button>
      </form>
      <ul className="mt-6 space-y-2">
        {rows.map((r) => <li key={r.id} className="glass rounded-xl p-3">{r.title} · {r.reminder_time} · {r.is_sent ? 'sent' : 'pending'}</li>)}
      </ul>
    </div>
  );
}

export function MyTasksPage() {
  const [rows, setRows] = useState([]);
  useEffect(() => { api('/tasks/mine').then(setRows); }, []);
  async function update(id, progress) {
    await api(`/tasks/${id}/progress`, { method: 'POST', body: JSON.stringify({ progress: Number(progress) }) });
    setRows(await api('/tasks/mine'));
  }
  return (
    <div>
      <h1 className="font-display text-3xl">My tasks</h1>
      <div className="mt-4 space-y-3">
        {rows.map((r) => (
          <div key={r.id} className="glass rounded-2xl p-4">
            <p className="font-semibold">{r.title}</p>
            <p className="text-sm text-chrome">{r.status} · {r.progress}%</p>
            <input type="range" min="0" max="100" defaultValue={r.progress} onMouseUp={(e) => update(r.task_id, e.target.value)} className="w-full mt-2" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function PendingAcceptancesPage() {
  const [rows, setRows] = useState([]);
  useEffect(() => { api('/tasks/pending-acceptances').then(setRows); }, []);
  return (
    <div>
      <h1 className="font-display text-3xl">Pending acceptances</h1>
      <ul className="mt-4 space-y-2">
        {rows.map((r) => (
          <li key={r.id} className="glass rounded-xl p-3 flex justify-between">
            <span>{r.title} · {r.assignee_name}</span>
            {r.invite_token && <a className="underline" href={`/tasks/invite/${r.invite_token}`}>Invite link</a>}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function TaskSettingsPage() {
  const [cats, setCats] = useState([]);
  const [tpls, setTpls] = useState([]);
  const [cat, setCat] = useState('');
  const [tpl, setTpl] = useState({ name: '', body: '' });
  async function load() {
    setCats(await api('/tasks/categories'));
    setTpls(await api('/tasks/templates'));
  }
  useEffect(() => { load(); }, []);
  return (
    <div className="space-y-8 max-w-2xl">
      <h1 className="font-display text-3xl">Task settings</h1>
      <form onSubmit={async (e) => { e.preventDefault(); await api('/tasks/categories', { method: 'POST', body: JSON.stringify({ name: cat }) }); setCat(''); load(); }} className="flex gap-2">
        <input className="field" value={cat} onChange={(e) => setCat(e.target.value)} placeholder="New category" />
        <button className="btn-donate rounded-xl px-4">Add</button>
      </form>
      <p className="text-chrome">{cats.map((c) => c.name).join(' · ')}</p>
      <form onSubmit={async (e) => { e.preventDefault(); await api('/tasks/templates', { method: 'POST', body: JSON.stringify(tpl) }); setTpl({ name: '', body: '' }); load(); }} className="space-y-2">
        <input className="field" placeholder="Template name" value={tpl.name} onChange={(e) => setTpl({ ...tpl, name: e.target.value })} />
        <textarea className="field min-h-32" placeholder="Body with {name} {subject} {deadline} {login_link}" value={tpl.body} onChange={(e) => setTpl({ ...tpl, body: e.target.value })} />
        <button className="btn-donate rounded-xl px-4 py-2">Save template</button>
      </form>
      <ul className="space-y-2">{tpls.map((t) => <li key={t.id} className="glass rounded-xl p-3">{t.name}</li>)}</ul>
    </div>
  );
}

export function CreateTaskPage() {
  const [users, setUsers] = useState([]);
  const [cats, setCats] = useState([]);
  const [form, setForm] = useState({
    title: '', description: '', priority: 'Medium', deadline: '', category_id: '',
    assignee_ids: [], is_scheduled: false, scheduled_at: '',
  });
  useEffect(() => {
    api('/users').then(setUsers);
    api('/tasks/categories').then(setCats);
  }, []);
  async function submit(e) {
    e.preventDefault();
    await api('/tasks', { method: 'POST', body: JSON.stringify(form) });
    window.location.href = '/admin/tasks';
  }
  function toggle(id) {
    setForm((f) => ({
      ...f,
      assignee_ids: f.assignee_ids.includes(id) ? f.assignee_ids.filter((x) => x !== id) : [...f.assignee_ids, id],
    }));
  }
  return (
    <form onSubmit={submit} className="max-w-2xl space-y-3">
      <h1 className="font-display text-3xl">Create task</h1>
      <input className="field" placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
      <textarea className="field min-h-28" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      <div className="flex gap-2">
        <select className="field" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
          {['Low', 'Medium', 'High'].map((p) => <option key={p}>{p}</option>)}
        </select>
        <input className="field" type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
        <select className="field" value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
          <option value="">Category</option>
          {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <label className="flex gap-2"><input type="checkbox" checked={form.is_scheduled} onChange={(e) => setForm({ ...form, is_scheduled: e.target.checked })} /> Schedule for later</label>
      {form.is_scheduled && <input className="field" type="datetime-local" value={form.scheduled_at} onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })} />}
      <p className="text-sm text-chrome">Assignees</p>
      <div className="grid sm:grid-cols-2 gap-2">
        {users.map((u) => (
          <label key={u.id} className="flex gap-2 text-sm bg-white/5 rounded-lg px-3 py-2">
            <input type="checkbox" checked={form.assignee_ids.includes(u.id)} onChange={() => toggle(u.id)} />
            {u.name}
          </label>
        ))}
      </div>
      <button className="btn-donate rounded-xl px-6 py-2">Create & notify</button>
    </form>
  );
}

function TaskTable({ rows }) {
  return (
    <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10">
      <table className="w-full text-sm">
        <thead className="bg-white/5 text-chrome"><tr><th className="p-3 text-left">Title</th><th className="p-3 text-left">Status</th><th className="p-3 text-left">Priority</th><th className="p-3 text-left">Deadline</th></tr></thead>
        <tbody>
          {rows.map((t) => (
            <tr key={t.id} className="border-t border-white/10">
              <td className="p-3">{t.title}</td>
              <td className="p-3">{t.status}</td>
              <td className="p-3">{t.priority}</td>
              <td className="p-3">{t.deadline || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
