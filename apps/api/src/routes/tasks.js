import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { getPool } from '../db/pool.js';
import { requireAuth, requirePermission, optionalAuth } from '../middleware/auth.js';
import { sendTextMessage } from '../services/wasenderWhatsAppService.js';

const router = Router();
const APP_URL = () => String(process.env.APP_URL || '').replace(/\/$/, '');

function personalize(template, vars) {
  let out = template || '';
  for (const [k, v] of Object.entries(vars)) {
    out = out.replace(new RegExp(`\\{${k}\\}`, 'gi'), v ?? '');
  }
  return out;
}

async function notifyAssignment(pool, task, assignment, user) {
  const [[tpl]] = await pool.query('SELECT body FROM task_message_templates ORDER BY created_at LIMIT 1');
  const body = personalize(task.notification_template || tpl?.body || 'New task: {subject}. Open {login_link}', {
    name: user.name || 'teammate',
    subject: task.title,
    priority: task.priority,
    start_date: task.start_date || '',
    deadline: [task.deadline, task.deadline_time].filter(Boolean).join(' '),
    description: task.description || '',
    login_link: `${APP_URL()}/tasks/invite/${assignment.invite_token}`,
  });
  const phone = user.whatsapp_phone || user.phone;
  if (phone) await sendTextMessage(phone, body, 'task_assign');
}

router.get('/', requireAuth, requirePermission('tasks.view'), async (req, res) => {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT t.*, c.name AS category_name,
            (SELECT COUNT(*) FROM task_assignments a WHERE a.task_id = t.id) AS assignee_count
     FROM tasks t
     LEFT JOIN task_categories c ON c.id = t.category_id
     ORDER BY t.created_at DESC`
  );
  res.json(rows);
});

router.get('/stats', requireAuth, requirePermission('tasks.view'), async (_req, res) => {
  const pool = getPool();
  const [[s]] = await pool.query(`
    SELECT
      COUNT(*) AS total,
      SUM(status = 'Pending') AS pending,
      SUM(status = 'In Progress') AS inProgress,
      SUM(status = 'Completed') AS completed,
      SUM(status = 'Overdue') AS overdue
    FROM tasks
  `);
  res.json(s);
});

router.get('/mine', requireAuth, async (req, res) => {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT a.*, t.title, t.description, t.priority, t.deadline, t.deadline_time, t.status AS task_status
     FROM task_assignments a
     JOIN tasks t ON t.id = a.task_id
     WHERE a.user_id = ?
     ORDER BY t.deadline IS NULL, t.deadline`,
    [req.user.sub]
  );
  res.json(rows);
});

router.get('/pending-acceptances', requireAuth, async (req, res) => {
  const pool = getPool();
  const admin = ['admin', 'super_admin'].includes(req.user.role);
  const [rows] = await pool.query(
    `SELECT a.*, t.title, t.priority, t.deadline, u.name AS assignee_name
     FROM task_assignments a
     JOIN tasks t ON t.id = a.task_id
     JOIN users u ON u.id = a.user_id
     WHERE a.status = 'Pending' ${admin ? '' : 'AND a.user_id = ?'}
     ORDER BY a.created_at DESC`,
    admin ? [] : [req.user.sub]
  );
  res.json(rows);
});

router.get('/categories', requireAuth, async (_req, res) => {
  const [rows] = await getPool().query('SELECT * FROM task_categories ORDER BY name');
  res.json(rows);
});

router.post('/categories', requireAuth, requirePermission('tasks.edit'), async (req, res) => {
  const id = randomUUID();
  await getPool().query('INSERT INTO task_categories (id, name, color) VALUES (?, ?, ?)', [
    id,
    req.body.name,
    req.body.color || '#8B1538',
  ]);
  res.status(201).json({ id });
});

router.get('/templates', requireAuth, async (_req, res) => {
  const [rows] = await getPool().query('SELECT * FROM task_message_templates ORDER BY name');
  res.json(rows);
});

router.post('/templates', requireAuth, requirePermission('tasks.edit'), async (req, res) => {
  const id = randomUUID();
  await getPool().query('INSERT INTO task_message_templates (id, name, body) VALUES (?, ?, ?)', [
    id,
    req.body.name,
    req.body.body || '',
  ]);
  res.status(201).json({ id });
});

router.get('/reminders', requireAuth, requirePermission('tasks.view'), async (_req, res) => {
  const [rows] = await getPool().query(
    `SELECT r.*, t.title FROM task_reminders r JOIN tasks t ON t.id = r.task_id ORDER BY r.reminder_time DESC`
  );
  res.json(rows);
});

router.post('/reminders', requireAuth, requirePermission('tasks.create'), async (req, res) => {
  const id = randomUUID();
  await getPool().query(
    'INSERT INTO task_reminders (id, task_id, reminder_time) VALUES (?, ?, ?)',
    [id, req.body.task_id, req.body.reminder_time]
  );
  res.status(201).json({ id });
});

router.get('/scheduled', requireAuth, requirePermission('tasks.view'), async (_req, res) => {
  const [rows] = await getPool().query(
    `SELECT * FROM tasks WHERE is_scheduled = 1 ORDER BY scheduled_at`
  );
  res.json(rows);
});

router.get('/invite/:token', optionalAuth, async (req, res) => {
  const pool = getPool();
  const [[row]] = await pool.query(
    `SELECT a.*, t.title, t.description, t.priority, t.deadline, u.name AS assignee_name
     FROM task_assignments a
     JOIN tasks t ON t.id = a.task_id
     JOIN users u ON u.id = a.user_id
     WHERE a.invite_token = ?`,
    [req.params.token]
  );
  if (!row) return res.status(404).json({ error: 'Invite not found' });
  res.json(row);
});

router.post('/invite/:token/respond', async (req, res) => {
  const accept = Boolean(req.body.accept);
  const pool = getPool();
  const [[a]] = await pool.query('SELECT * FROM task_assignments WHERE invite_token = ?', [req.params.token]);
  if (!a) return res.status(404).json({ error: 'Invite not found' });
  await pool.query(
    `UPDATE task_assignments SET status = ?, accepted_at = ?, declined_at = ? WHERE id = ?`,
    [accept ? 'Accepted' : 'Declined', accept ? new Date() : null, accept ? null : new Date(), a.id]
  );
  if (accept) {
    await pool.query(`UPDATE tasks SET status = 'In Progress' WHERE id = ? AND status = 'Pending'`, [a.task_id]);
  }
  res.json({ ok: true, accepted: accept });
});

router.post('/', requireAuth, requirePermission('tasks.create'), async (req, res) => {
  const pool = getPool();
  const id = randomUUID();
  const scheduled = Boolean(req.body.is_scheduled);
  await pool.query(
    `INSERT INTO tasks (id, title, description, priority, start_date, start_time, deadline, deadline_time,
      status, created_by, category_id, notification_template, is_scheduled, scheduled_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      req.body.title,
      req.body.description || '',
      req.body.priority || 'Medium',
      req.body.start_date || null,
      req.body.start_time || null,
      req.body.deadline || null,
      req.body.deadline_time || null,
      scheduled ? 'Scheduled' : 'Pending',
      req.user.sub,
      req.body.category_id || null,
      req.body.notification_template || null,
      scheduled ? 1 : 0,
      req.body.scheduled_at || null,
    ]
  );

  const assignees = Array.isArray(req.body.assignee_ids) ? req.body.assignee_ids : [];
  for (const userId of assignees) {
    const aid = randomUUID();
    const token = randomUUID();
    await pool.query(
      `INSERT INTO task_assignments (id, task_id, user_id, status, invite_token) VALUES (?, ?, ?, 'Pending', ?)`,
      [aid, id, userId, token]
    );
    if (!scheduled) {
      const [[user]] = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
      const [[task]] = await pool.query('SELECT * FROM tasks WHERE id = ?', [id]);
      if (user && task) {
        try { await notifyAssignment(pool, task, { invite_token: token }, user); } catch (e) { console.warn(e.message); }
      }
    }
  }

  const cc = Array.isArray(req.body.cc_ids) ? req.body.cc_ids : [];
  for (const userId of cc) {
    await pool.query('INSERT INTO task_cc (id, task_id, user_id) VALUES (?, ?, ?)', [randomUUID(), id, userId]);
  }

  res.status(201).json({ id });
});

router.get('/:id', requireAuth, requirePermission('tasks.view'), async (req, res) => {
  const pool = getPool();
  const [[task]] = await pool.query('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
  if (!task) return res.status(404).json({ error: 'Not found' });
  const [assignments] = await pool.query(
    `SELECT a.*, u.name, u.email, u.phone FROM task_assignments a JOIN users u ON u.id = a.user_id WHERE a.task_id = ?`,
    [task.id]
  );
  const [updates] = await pool.query(
    `SELECT u.* FROM task_updates u JOIN task_assignments a ON a.id = u.assignment_id WHERE a.task_id = ? ORDER BY u.created_at`,
    [task.id]
  );
  res.json({ ...task, assignments, updates });
});

router.post('/:id/progress', requireAuth, async (req, res) => {
  const pool = getPool();
  const [[a]] = await pool.query(
    'SELECT * FROM task_assignments WHERE task_id = ? AND user_id = ?',
    [req.params.id, req.user.sub]
  );
  if (!a) return res.status(404).json({ error: 'Assignment not found' });
  const progress = Math.max(0, Math.min(100, Number(req.body.progress || 0)));
  await pool.query('UPDATE task_assignments SET progress = ?, status = ? WHERE id = ?', [
    progress,
    progress >= 100 ? 'Completed' : 'In Progress',
    a.id,
  ]);
  await pool.query(
    'INSERT INTO task_updates (id, assignment_id, progress, comment) VALUES (?, ?, ?, ?)',
    [randomUUID(), a.id, progress, req.body.comment || '']
  );
  if (progress >= 100) {
    await pool.query(`UPDATE tasks SET status = 'Completed' WHERE id = ?`, [req.params.id]);
  } else {
    await pool.query(`UPDATE tasks SET status = 'In Progress' WHERE id = ? AND status = 'Pending'`, [req.params.id]);
  }
  res.json({ ok: true, progress });
});

export async function runProcessScheduled() {
  const pool = getPool();
  const [due] = await pool.query(
    `SELECT * FROM tasks WHERE is_scheduled = 1 AND status = 'Scheduled' AND scheduled_at <= NOW()`
  );
  for (const task of due) {
    await pool.query(`UPDATE tasks SET status = 'Pending', is_scheduled = 0 WHERE id = ?`, [task.id]);
    const [asg] = await pool.query('SELECT * FROM task_assignments WHERE task_id = ?', [task.id]);
    for (const a of asg) {
      const [[user]] = await pool.query('SELECT * FROM users WHERE id = ?', [a.user_id]);
      if (user) {
        try { await notifyAssignment(pool, task, a, user); } catch (e) { console.warn(e.message); }
      }
    }
  }
}

export async function runProcessReminders() {
  const pool = getPool();
  const [due] = await pool.query(
    `SELECT r.*, t.title FROM task_reminders r JOIN tasks t ON t.id = r.task_id
     WHERE r.is_sent = 0 AND r.reminder_time <= NOW()`
  );
  for (const r of due) {
    const [asg] = await pool.query(
      `SELECT a.*, u.name, u.phone, u.whatsapp_phone FROM task_assignments a JOIN users u ON u.id = a.user_id WHERE a.task_id = ?`,
      [r.task_id]
    );
    for (const a of asg) {
      const phone = a.whatsapp_phone || a.phone;
      if (phone) {
        await sendTextMessage(phone, `Reminder: *${r.title}* is still open.\n_The Sound She Carries_`, 'task_reminder');
      }
    }
    await pool.query('UPDATE task_reminders SET is_sent = 1 WHERE id = ?', [r.id]);
  }
}

export default router;
