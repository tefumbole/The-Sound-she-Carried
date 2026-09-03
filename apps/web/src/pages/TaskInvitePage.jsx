import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api';

export default function TaskInvitePage() {
  const { token } = useParams();
  const [task, setTask] = useState(null);
  const [done, setDone] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api(`/tasks/invite/${token}`).then(setTask).catch((e) => setError(e.message));
  }, [token]);

  async function respond(accept) {
    try {
      await api(`/tasks/invite/${token}/respond`, {
        method: 'POST',
        body: JSON.stringify({ accept }),
      });
      setDone(accept ? 'accepted' : 'declined');
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div className="min-h-dvh bg-ink flex items-center justify-center p-4 sm:p-6 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="glass max-w-lg w-full rounded-3xl p-5 sm:p-8">
        {error && <p className="text-red-300">{error}</p>}
        {!task && !error && <p>Loading…</p>}
        {task && (
          <>
            <p className="text-xs tracking-widest uppercase text-chrome">Task invitation</p>
            <h1 className="font-display text-3xl mt-2">{task.title}</h1>
            <p className="text-chrome mt-3 whitespace-pre-wrap">{task.description}</p>
            <p className="mt-3 text-sm">Priority: {task.priority} · Deadline: {task.deadline || '—'}</p>
            {done ? (
              <p className="mt-6">You {done} this task.</p>
            ) : (
              <div className="flex gap-3 mt-6">
                <button onClick={() => respond(true)} className="btn-donate flex-1 rounded-xl py-3">Accept</button>
                <button onClick={() => respond(false)} className="flex-1 rounded-xl py-3 border border-white/20">Decline</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
