import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import AdminLayout from './layouts/AdminLayout';
import LandingPage from './pages/LandingPage';
import DonatePendingPage from './pages/DonatePendingPage';
import DonateReturnPage from './pages/DonateReturnPage';
import TaskInvitePage from './pages/TaskInvitePage';
import LoginPage from './pages/admin/LoginPage';
import DashboardPage from './pages/admin/DashboardPage';
import DonationsPage from './pages/admin/DonationsPage';
import CampaignSettingsPage from './pages/admin/CampaignSettingsPage';
import UsersPage from './pages/admin/UsersPage';
import UserFormPage from './pages/admin/UserFormPage';
import RolesPage from './pages/admin/RolesPage';
import {
  TaskDashboardPage, TaskListPage, CreateTaskPage, ScheduledTasksPage,
  TaskRemindersPage, MyTasksPage, PendingAcceptancesPage, TaskSettingsPage,
} from './pages/admin/TasksPages';
import {
  AnnouncementComposePage, AnnouncementListPage, AnnouncementTemplatesPage,
  AnnouncementCategoriesPage, AnnouncementSettingsPage,
} from './pages/admin/AnnouncementsPages';
import { LetterComposePage, LetterListPage, LetterTemplatesPage } from './pages/admin/LettersPages';

function Guard({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <p className="p-8">Loading…</p>;
  if (!user) return <Navigate to="/admin/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/donate/pending/:id" element={<DonatePendingPage />} />
      <Route path="/donate/return" element={<DonateReturnPage />} />
      <Route path="/tasks/invite/:token" element={<TaskInvitePage />} />
      <Route path="/admin/login" element={<LoginPage />} />
      <Route path="/admin" element={<Guard><AdminLayout /></Guard>}>
        <Route index element={<DashboardPage />} />
        <Route path="donations" element={<DonationsPage />} />
        <Route path="settings" element={<CampaignSettingsPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="users/new" element={<UserFormPage />} />
        <Route path="roles" element={<RolesPage />} />
        <Route path="tasks/dashboard" element={<TaskDashboardPage />} />
        <Route path="tasks/create" element={<CreateTaskPage />} />
        <Route path="tasks/scheduled" element={<ScheduledTasksPage />} />
        <Route path="tasks/reminders" element={<TaskRemindersPage />} />
        <Route path="tasks/my-tasks" element={<MyTasksPage />} />
        <Route path="tasks/pending" element={<PendingAcceptancesPage />} />
        <Route path="tasks/settings" element={<TaskSettingsPage />} />
        <Route path="tasks" element={<TaskListPage />} />
        <Route path="announcements/compose" element={<AnnouncementComposePage />} />
        <Route path="announcements/scheduled" element={<AnnouncementListPage status="scheduled" />} />
        <Route path="announcements/templates" element={<AnnouncementTemplatesPage />} />
        <Route path="announcements/categories" element={<AnnouncementCategoriesPage />} />
        <Route path="announcements/settings" element={<AnnouncementSettingsPage />} />
        <Route path="announcements" element={<AnnouncementListPage />} />
        <Route path="letters/compose" element={<LetterComposePage />} />
        <Route path="letters/templates" element={<LetterTemplatesPage />} />
        <Route path="letters" element={<LetterListPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
