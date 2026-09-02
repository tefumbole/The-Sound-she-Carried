import { useEffect, useState } from 'react';
import { api } from '../lib/api';

export function useHolderLookup(phone, enabled = true) {
  const [holder, setHolder] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const digits = String(phone || '').replace(/\D/g, '');
    if (!enabled) return;
    if (digits.length < 9) {
      setHolder('');
      setStatus('');
      setError('');
      return;
    }
    if (digits.length === 9 && digits[0] !== '6') {
      setHolder('');
      setStatus('');
      setError('Invalid phone number.');
      return;
    }
    const t = setTimeout(async () => {
      setStatus('Looking up name…');
      setError('');
      try {
        const data = await api(`/donations/holder?phone=${encodeURIComponent(digits)}`);
        if (data.name) {
          setHolder(data.name);
          setStatus('');
          setError('');
        } else {
          setHolder('');
          setStatus('');
          setError('Name not found for this number yet. You can still continue.');
        }
      } catch {
        setHolder('');
        setStatus('');
        setError('Could not look up this number.');
      }
    }, 450);
    return () => clearTimeout(t);
  }, [phone, enabled]);

  return { holder, setHolder, status, error };
}
