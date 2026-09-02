import { useEffect, useState } from 'react';
import { api } from '../../lib/api';

export default function RolesPage() {
  const [data, setData] = useState({ roles: [], permissions: [] });
  const [name, setName] = useState('');

  async function load() {
    setData(await api('/roles'));
  }
  useEffect(() => { load(); }, []);

  async function toggle(role, code) {
    const next = role.permissions.includes(code)
      ? role.permissions.filter((p) => p !== code)
      : [...role.permissions, code];
    await api(`/roles/${role.id}`, { method: 'PUT', body: JSON.stringify({ permissions: next }) });
    load();
  }

  async function addRole(e) {
    e.preventDefault();
    await api('/roles', { method: 'POST', body: JSON.stringify({ name }) });
    setName('');
    load();
  }

  return (
    <div>
      <h1 className="font-display text-3xl">Roles & Permissions</h1>
      <form onSubmit={addRole} className="flex gap-2 mt-4 max-w-md">
        <input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="New role name" />
        <button className="btn-donate rounded-xl px-4">Add</button>
      </form>
      <div className="mt-8 space-y-8">
        {data.roles.map((role) => (
          <div key={role.id}>
            <h2 className="font-display text-xl mb-2">{role.name}</h2>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2">
              {data.permissions.map((p) => (
                <label key={p.code} className="flex gap-2 text-sm bg-white/5 rounded-lg px-3 py-2">
                  <input type="checkbox" checked={role.permissions.includes(p.code)} onChange={() => toggle(role, p.code)} />
                  {p.code}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
