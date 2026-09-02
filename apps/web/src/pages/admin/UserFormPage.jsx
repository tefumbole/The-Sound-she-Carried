import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';

export default function UserFormPage() {
  const navigate = useNavigate();
  const [roles, setRoles] = useState([]);
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', whatsapp_phone: '', role: 'staff', status: 'active' });
  const [error, setError] = useState('');

  useEffect(() => {
    api('/roles').then((d) => setRoles(d.roles || [])).catch(() => {});
  }, []);

  async function submit(e) {
    e.preventDefault();
    try {
      await api('/users', { method: 'POST', body: JSON.stringify(form) });
      navigate('/admin/users');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <form onSubmit={submit} className="max-w-xl space-y-3">
      <h1 className="font-display text-3xl">Add staff</h1>
      {['name', 'email', 'password', 'phone', 'whatsapp_phone'].map((k) => (
        <input key={k} className="field" type={k === 'password' ? 'password' : 'text'} placeholder={k.replace('_', ' ')} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} required={['name', 'email', 'password'].includes(k)} />
      ))}
      <select className="field" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
        {roles.map((r) => <option key={r.id} value={r.name}>{r.name}</option>)}
      </select>
      {error && <p className="text-red-300">{error}</p>}
      <button className="btn-donate rounded-xl px-6 py-2">Create</button>
    </form>
  );
}
