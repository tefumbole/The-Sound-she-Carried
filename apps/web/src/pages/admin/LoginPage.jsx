import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function LoginPage() {
  const { startLogin, verifyLoginOtp, resendLoginOtp } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [challengeId, setChallengeId] = useState('');
  const [phoneHint, setPhoneHint] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submitCredentials(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const data = await startLogin(email, password);
      setChallengeId(data.challenge_id);
      setPhoneHint(data.phone_hint);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function submitOtp(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await verifyLoginOtp(challengeId, otp);
      navigate('/admin');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    setError('');
    setBusy(true);
    try {
      const data = await resendLoginOtp(challengeId);
      setChallengeId(data.challenge_id);
      setPhoneHint(data.phone_hint);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-ink flex items-center justify-center p-6">
      <form onSubmit={challengeId ? submitOtp : submitCredentials} className="glass w-full max-w-sm rounded-3xl p-8">
        <img src="/logo.jpg" alt="The Sound She Carries" className="h-24 mx-auto object-contain mb-4" />
        <p className="text-xs tracking-[0.3em] uppercase text-gold">Staff access</p>
        <h1 className="font-display text-3xl mt-2">{challengeId ? 'Enter OTP' : 'Sign in'}</h1>

        {!challengeId ? (
          <>
            <input className="w-full mt-6 rounded-xl px-3 py-2 text-ink" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin" />
            <input className="w-full mt-3 rounded-xl px-3 py-2 text-ink" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" />
          </>
        ) : (
          <>
            <p className="text-sm text-chrome mt-4">A code was sent to WhatsApp {phoneHint}.</p>
            <input
              className="w-full mt-4 rounded-xl px-3 py-3 text-ink tracking-[0.4em] text-center text-xl"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              inputMode="numeric"
              autoFocus
            />
            <button type="button" onClick={resend} className="text-gold text-sm mt-3">Resend code</button>
          </>
        )}

        {error && <p className="text-red-300 text-sm mt-3">{error}</p>}
        <button disabled={busy} className="btn-donate w-full mt-5 rounded-xl py-3">
          {busy ? 'Please wait…' : challengeId ? 'Verify and enter' : 'Send OTP'}
        </button>
      </form>
    </div>
  );
}
