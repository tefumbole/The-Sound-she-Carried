import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const groups = [
  {
    label: 'Campaign',
    items: [
      { to: '/admin', label: 'Dashboard', end: true, perm: 'campaign.view' },
      { to: '/admin/donations', label: 'Donations', perm: 'donations.view' },
      { to: '/admin/settings', label: 'Settings', perm: 'campaign.edit' },
    ],
  },
  {
    label: 'Work Management',
    items: [
      { to: '/admin/tasks/dashboard', label: 'Task Dashboard', perm: 'tasks.view' },
      { to: '/admin/tasks/create', label: 'Create Task', perm: 'tasks.create' },
      { to: '/admin/tasks', label: 'All Tasks', perm: 'tasks.view', end: true },
      { to: '/admin/tasks/scheduled', label: 'Scheduled', perm: 'tasks.view' },
      { to: '/admin/tasks/reminders', label: 'Reminders', perm: 'tasks.view' },
      { to: '/admin/tasks/my-tasks', label: 'My Tasks', perm: 'tasks.view' },
      { to: '/admin/tasks/pending', label: 'Pending Acceptances', perm: 'tasks.view' },
      { to: '/admin/tasks/settings', label: 'Task Settings', perm: 'tasks.edit' },
    ],
  },
  {
    label: 'Communication',
    items: [
      { to: '/admin/announcements/compose', label: 'Compose announcement', perm: 'announcements.compose' },
      { to: '/admin/announcements', label: 'All announcements', perm: 'announcements.view', end: true },
      { to: '/admin/announcements/scheduled', label: 'Scheduled announcements', perm: 'announcements.view' },
      { to: '/admin/announcements/templates', label: 'Announcement templates', perm: 'announcements.compose' },
      { to: '/admin/announcements/categories', label: 'Announcement categories', perm: 'announcements.compose' },
      { to: '/admin/announcements/settings', label: 'Announcement settings', perm: 'announcements.compose' },
      { to: '/admin/letters/compose', label: 'Compose letter', perm: 'letters.compose' },
      { to: '/admin/letters', label: 'All letters', perm: 'letters.view', end: true },
      { to: '/admin/letters/templates', label: 'Letter templates', perm: 'letters.compose' },
    ],
  },
  {
    label: 'People & Access',
    items: [
      { to: '/admin/users', label: 'All Users', perm: 'users.view' },
      { to: '/admin/users/new', label: 'Add Staff', perm: 'users.create' },
      { to: '/admin/roles', label: 'Roles & Permissions', perm: 'roles.view' },
    ],
  },
];

export default function AdminLayout() {
  const { user, can, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#111114] text-white flex">
      <aside className="w-64 shrink-0 bg-black/50 border-r border-white/10 p-4 hidden md:block">
        <p className="text-[10px] tracking-[0.3em] uppercase text-chrome">TSSC Admin</p>
        <p className="font-display text-xl mt-1">The Sound She Carries</p>
        {groups.map((g) => (
          <div key={g.label} className="mt-6">
            <p className="text-[10px] uppercase tracking-widest text-crimson mb-2">{g.label}</p>
            <div className="space-y-1">
              {g.items.filter((i) => can(i.perm) || can('*')).map((i) => (
                <NavLink
                  key={i.to}
                  to={i.to}
                  end={i.end}
                  className={({ isActive }) =>
                    `block rounded-lg px-3 py-1.5 text-sm ${isActive ? 'bg-crimson' : 'hover:bg-white/5'}`
                  }
                >
                  {i.label}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </aside>
      <div className="flex-1 min-w-0">
        <header className="flex justify-between items-center px-5 py-3 border-b border-white/10">
          <a href="/" className="text-sm text-chrome">View site</a>
          <div className="flex items-center gap-3 text-sm">
            <span>{user?.name}</span>
            <button
              onClick={() => { logout(); navigate('/admin/login'); }}
              className="text-chrome"
            >
              Logout
            </button>
          </div>
        </header>
        <main className="p-5 md:p-8"><Outlet /></main>
      </div>
    </div>
  );
}
