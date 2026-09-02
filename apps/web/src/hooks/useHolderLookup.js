import { useEffect, useState } from 'react';
import { api } from '../lib/api';

export function useHolderLookup(phone, enabled = true) {
  const [holder, setHolder] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const digits = String(phone || '').replace(/\D/g, '');
    const isCm = digits.startsWith('237') ? digits.slice(3) : digits;
    const canLookup = enabled && ((digits.startsWith('237') && digits.length === 12) || (digits.length === 9 && digits[0] === '6'));
    if (!enabled) return;
    if (!canLookup) {
      setStatus('');
      setError('');
      if (!(digits.length === 9 && digits[0] === '6') && !digits.startsWith('237')) {
        setHolder((h) => h);
      }
      return;
    }
    if (isCm.length === 9 && isCm[0] !== '6') {
      setHolder('');
      setError('Invalid Cameroon number.');
      return;
    }
    const t = setTimeout(async () => {
      setStatus('Looking up name…');
      setError('');
      try {
        const data = await api(`/donations/holder?phone=${encodeURIComponent(phone || digits)}`);
        if (data.name) {
          setHolder(data.name);
          setStatus('');
          setError('');
        } else {
          setStatus('');
          setError('Name not found yet. You can type it.');
        }
      } catch {
        setStatus('');
        setError('Could not look up this number.');
      }
    }, 450);
    return () => clearTimeout(t);
  }, [phone, enabled]);

  return { holder, setHolder, status, error };
}
