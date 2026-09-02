import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function DonateReturnPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  useEffect(() => {
    const id = params.get('id');
    const sessionId = params.get('session_id');
    if (id) {
      navigate(`/donate/pending/${id}${sessionId ? `?session_id=${encodeURIComponent(sessionId)}` : ''}`, { replace: true });
      return;
    }
    else navigate('/', { replace: true });
  }, [params, navigate]);
  return <p className="p-8 text-center">Returning…</p>;
}
