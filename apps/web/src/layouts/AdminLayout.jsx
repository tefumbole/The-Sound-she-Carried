import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const groups = [
  {
    label: 'Campaign',
    home: '/admin',
    match: (p) => p === '/admin' || ['/admin/donations', '/admin/bookings', '/admin/settings'].includes(p) || p.startsWith('/admin/prophetic-messages'),
    items: [
      { to: '/admin', label: 'Dashboard', end: true, perm: 'campaign.view' },
      { to: '/admin/donations', label: 'Donations', perm: 'donations.view' },
      { to: '/admin/prophetic-messages', label: 'Prophetic Messages', perm: 'prophetic_messages.view', end: true },
      { to: '/admin/prophetic-messages/history', label: 'Prophetic History', perm: 'prophetic_messages.view' },
      { to: '/admin/bookings', label: 'Bookings', perm: 'bookings.view' },
      { to: '/admin/settings', label: 'Settings', perm: 'campaign.edit' },
    ],
  },
  {
    label: 'Work Management',
    home: '/admin/tasks/dashboard',
    match: (p) => p.startsWith('/admin/tasks'),
    items: [
      { to: '/admin/tasks/dashboard', label: 'Dashboard', perm: 'tasks.view' },
      { to: '/admin/tasks/create', label: 'Create', perm: 'tasks.create' },
      { to: '/admin/tasks', label: 'All Tasks', perm: 'tasks.view', end: true },
      { to: '/admin/tasks/scheduled', label: 'Scheduled', perm: 'tasks.view' },
      { to: '/admin/tasks/reminders', label: 'Reminders', perm: 'tasks.view' },
      { to: '/admin/tasks/my-tasks', label: 'My Tasks', perm: 'tasks.view' },
      { to: '/admin/tasks/pending', label: 'Pending', perm: 'tasks.view' },
      { to: '/admin/tasks/settings', label: 'Settings', perm: 'tasks.edit' },
    ],
  },
  {
    label: 'Communication',
    home: '/admin/announcements/compose',
    match: (p) => p.startsWith('/admin/announcements') || p.startsWith('/admin/letters'),
    items: [
      { to: '/admin/announcements/compose', label: 'Compose', perm: 'announcements.compose' },
      { to: '/admin/announcements', label: 'Announcements', perm: 'announcements.view', end: true },
      { to: '/admin/announcements/scheduled', label: 'Scheduled', perm: 'announcements.view' },
      { to: '/admin/announcements/templates', label: 'Ann. templates', perm: 'announcements.compose' },
      { to: '/admin/announcements/categories', label: 'Ann. categories', perm: 'announcements.compose' },
      { to: '/admin/announcements/settings', label: 'Ann. settings', perm: 'announcements.compose' },
      { to: '/admin/letters/compose', label: 'Compose letter', perm: 'letters.compose' },
      { to: '/admin/letters', label: 'Letters', perm: 'letters.view', end: true },
      { to: '/admin/letters/templates', label: 'Letter templates', perm: 'letters.compose' },
    ],
  },
  {
    label: 'People',
    home: '/admin/users',
    match: (p) => p.startsWith('/admin/users') || p.startsWith('/admin/roles'),
    items: [
      { to: '/admin/users', label: 'All Users', perm: 'users.view' },
      { to: '/admin/users/new', label: 'Add Staff', perm: 'users.create' },
      { to: '/admin/roles', label: 'Roles', perm: 'roles.view' },
    ],
  },
];

export default function AdminLayout() {
  const { user, can, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const allowed = (items) => items.filter((i) => can(i.perm) || can('*'));
  const visibleGroups = groups.filter((g) => allowed(g.items).length);
  const active = visibleGroups.find((g) => g.match(pathname)) || visibleGroups[0];
  const tabs = active ? allowed(active.items) : [];

  return (
    <div className="min-h-screen bg-[#111114] text-white flex">
      <aside className="w-56 shrink-0 bg-black/50 border-r border-white/10 p-4 hidden md:flex md:flex-col">
        <img src="/logo.jpg" alt="TSSC" className="h-16 w-auto object-contain mb-2" />
        <p className="text-[10px] tracking-[0.3em] uppercase text-gold">TSSC Admin</p>
        <p className="font-display text-xl mt-1 mb-6">The Sound She Carries</p>
        <nav className="space-y-1">
          {visibleGroups.map((g) => {
            const on = active?.label === g.label;
            return (
              <button
                key={g.label}
                type="button"
                onClick={() => navigate(allowed(g.items)[0]?.to || g.home)}
                className={`w-full text-left rounded-lg px-3 py-2.5 text-sm ${on ? 'bg-gold text-ink font-semibold' : 'hover:bg-white/5 text-chrome'}`}
              >
                {g.label}
              </button>
            );
          })}
        </nav>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="flex justify-between items-center gap-2 px-3 md:px-5 py-3 border-b border-white/10 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <div className="flex items-center gap-2 min-w-0">
            <select
              className="md:hidden rounded-lg bg-black/40 border border-white/15 px-2 min-h-10 text-sm max-w-[9.5rem]"
              value={active?.label || ''}
              onChange={(e) => {
                const g = visibleGroups.find((x) => x.label === e.target.value);
                if (g) navigate(allowed(g.items)[0]?.to || g.home);
              }}
            >
              {visibleGroups.map((g) => <option key={g.label} value={g.label}>{g.label}</option>)}
            </select>
            <a href="/" className="text-sm text-chrome whitespace-nowrap">View site</a>
          </div>
          <div className="flex items-center gap-2 text-sm shrink-0">
            <span className="hidden sm:inline truncate max-w-[8rem]">{user?.name}</span>
            <button onClick={() => { logout(); navigate('/admin/login'); }} className="min-h-10 px-2 text-chrome">Logout</button>
          </div>
        </header>

        {tabs.length > 0 && (
          <div className="border-b border-white/10 px-3 md:px-5 overflow-x-auto">
            <div className="flex gap-1 min-w-max py-2">
              {tabs.map((i) => (
                <NavLink
                  key={i.to}
                  to={i.to}
                  end={i.end || i.to === '/admin'}
                  className={({ isActive }) =>
                    `rounded-full px-3 py-1.5 text-sm whitespace-nowrap ${
                      isActive ? 'bg-gold text-ink font-semibold' : 'text-chrome hover:text-white hover:bg-white/5'
                    }`
                  }
                >
                  {i.label}
                </NavLink>
              ))}
            </div>
          </div>
        )}

        <main className="p-3 sm:p-5 md:p-8 flex-1 pb-[max(1.25rem,env(safe-area-inset-bottom))]"><Outlet /></main>
      </div>
    </div>
  );
}
