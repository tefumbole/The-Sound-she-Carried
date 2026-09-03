import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';

export function useHolderLookup(phone, enabled = true) {
  const [holder, setHolder] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const edited = useRef(false);
  const lastPhone = useRef('');

  function setHolderManual(value) {
    edited.current = true;
    setHolder(value);
  }

  useEffect(() => {
    const digits = String(phone || '').replace(/\D/g, '');
    if (digits !== lastPhone.current) {
      lastPhone.current = digits;
      edited.current = false;
    }
    const isCm = digits.startsWith('237') ? digits.slice(3) : digits;
    const canLookup = enabled && ((digits.startsWith('237') && digits.length === 12) || (digits.length === 9 && digits[0] === '6'));
    if (!enabled) return;
    if (!canLookup) {
      setStatus('');
      setError('');
      return;
    }
    if (isCm.length === 9 && isCm[0] !== '6') {
      if (!edited.current) setHolder('');
      setError('Invalid Cameroon number.');
      return;
    }
    const t = setTimeout(async () => {
      setStatus('Looking up name…');
      setError('');
      try {
        const data = await api(`/donations/holder?phone=${encodeURIComponent(phone || digits)}`);
        if (data.name) {
          if (!edited.current) setHolder(data.name);
          setStatus('You can edit the name if it is not correct.');
          setError('');
        } else {
          setStatus('');
          setError('Name not found yet. Type it below.');
        }
      } catch {
        setStatus('');
        setError('Could not look up this number. Type the name below.');
      }
    }, 450);
    return () => clearTimeout(t);
  }, [phone, enabled]);

  return { holder, setHolder: setHolderManual, status, error };
}
