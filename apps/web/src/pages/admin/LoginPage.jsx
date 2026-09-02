import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@tssc.cloud');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
      navigate('/admin');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="min-h-screen bg-ink flex items-center justify-center p-6">
      <form onSubmit={submit} className="glass w-full max-w-sm rounded-3xl p-8">
        <img src="/logo.jpg" alt="The Sound She Carries" className="h-24 mx-auto object-contain mb-4" />
        <p className="text-xs tracking-[0.3em] uppercase text-gold">Staff access</p>
        <h1 className="font-display text-3xl mt-2">Sign in</h1>
        <input className="w-full mt-6 rounded-xl px-3 py-2 text-ink" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
        <input className="w-full mt-3 rounded-xl px-3 py-2 text-ink" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" />
        {error && <p className="text-red-300 text-sm mt-3">{error}</p>}
        <button className="btn-donate w-full mt-5 rounded-xl py-3">Enter</button>
      </form>
    </div>
  );
}
