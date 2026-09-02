import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function DonateReturnPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  useEffect(() => {
    const id = params.get('id');
    if (id) navigate(`/donate/pending/${id}`, { replace: true });
    else navigate('/', { replace: true });
  }, [params, navigate]);
  return <p className="p-8 text-center">Returning…</p>;
}
