import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { getPool } from '../db/pool.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import { DAY_THEMES, personalize } from '../services/propheticSelect.js';

const router = Router();
const DAYS = Object.keys(DAY_THEMES);

function normalize(body) {
  const day = String(body.day_of_week || '').toLowerCase();
  return {
    title: String(body.title || 'MERCY').trim(),
    message: String(body.message || '').trim(),
    scripture_reference: String(body.scripture_reference || '').trim(),
    scripture_text: String(body.scripture_text || '').trim(),
    declaration: String(body.declaration || '').trim(),
    theme: String(body.theme || body.message_family || DAY_THEMES[day] || 'blessing').trim(),
    message_family: String(body.message_family || body.theme || DAY_THEMES[day] || '').trim() || null,
    day_of_week: DAYS.includes(day) ? day : '',
    active: body.active === false || body.active === 0 || body.active === '0' ? 0 : 1,
  };
}

router.get('/', requireAuth, requirePermission('prophetic_messages.view'), async (req, res) => {
  const pool = getPool();
  const q = `%${String(req.query.q || '').trim()}%`;
  const day = String(req.query.day || '').toLowerCase();
  const params = [];
  let where = 'WHERE 1=1';
  if (req.query.q) {
    where += ' AND (pm.title LIKE ? OR pm.message LIKE ? OR pm.scripture_reference LIKE ? OR pm.theme LIKE ? OR pm.message_family LIKE ?)';
    params.push(q, q, q, q, q);
  }
  if (DAYS.includes(day)) {
    where += ' AND pm.day_of_week = ?';
    params.push(day);
  }
  const [rows] = await pool.query(
    `SELECT pm.*, (
        SELECT COUNT(*) FROM contributor_prophetic_messages cpm WHERE cpm.prophetic_message_id = pm.id
      ) AS sent_count
     FROM prophetic_messages pm
     ${where}
     ORDER BY FIELD(pm.day_of_week, 'monday','tuesday','wednesday','thursday','friday','saturday','sunday'), pm.created_at DESC`,
    params
  );
  res.json(rows);
});

router.get('/history', requireAuth, requirePermission('prophetic_messages.view'), async (_req, res) => {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT cpm.id, cpm.sent_at, cpm.contribution_id,
            c.first_name, c.full_name, c.phone_e164, c.email,
            d.amount, d.reference, d.status,
            pm.title, pm.message, pm.scripture_reference, pm.theme, pm.day_of_week
     FROM contributor_prophetic_messages cpm
     JOIN prophetic_messages pm ON pm.id = cpm.prophetic_message_id
     LEFT JOIN contributors c ON c.id = cpm.contributor_id
     LEFT JOIN donations d ON d.id = cpm.contribution_id
     ORDER BY cpm.sent_at DESC
     LIMIT 500`
  );
  res.json(rows);
});

router.get('/:id', requireAuth, requirePermission('prophetic_messages.view'), async (req, res) => {
  const pool = getPool();
  const [[row]] = await pool.query('SELECT * FROM prophetic_messages WHERE id = ?', [req.params.id]);
  if (!row) return res.status(404).json({ error: 'Message not found' });
  res.json({
    ...row,
    preview: personalize(row.message, 'Grace'),
    preview_declaration: personalize(row.declaration, 'Grace'),
  });
});

router.post('/', requireAuth, requirePermission('prophetic_messages.compose'), async (req, res) => {
  const data = normalize(req.body || {});
  if (!data.message || !data.scripture_reference || !data.declaration || !data.day_of_week) {
    return res.status(400).json({ error: 'Message, scripture, declaration, and day are required.' });
  }
  const id = randomUUID();
  const pool = getPool();
  await pool.query(
    `INSERT INTO prophetic_messages
      (id, title, message, scripture_reference, scripture_text, declaration, theme, message_family, day_of_week, active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, data.title, data.message, data.scripture_reference, data.scripture_text, data.declaration, data.theme, data.message_family, data.day_of_week, data.active]
  );
  const [[row]] = await pool.query('SELECT * FROM prophetic_messages WHERE id = ?', [id]);
  res.status(201).json(row);
});

router.put('/:id', requireAuth, requirePermission('prophetic_messages.compose'), async (req, res) => {
  const pool = getPool();
  const [[existing]] = await pool.query('SELECT * FROM prophetic_messages WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Message not found' });
  const data = normalize({ ...existing, ...req.body });
  if (!data.day_of_week) return res.status(400).json({ error: 'Choose a day of week.' });
  await pool.query(
    `UPDATE prophetic_messages
     SET title = ?, message = ?, scripture_reference = ?, scripture_text = ?, declaration = ?,
         theme = ?, message_family = ?, day_of_week = ?, active = ?, updated_at = NOW()
     WHERE id = ?`,
    [data.title, data.message, data.scripture_reference, data.scripture_text, data.declaration, data.theme, data.message_family, data.day_of_week, data.active, req.params.id]
  );
  const [[row]] = await pool.query('SELECT * FROM prophetic_messages WHERE id = ?', [req.params.id]);
  res.json(row);
});

router.delete('/:id', requireAuth, requirePermission('prophetic_messages.compose'), async (req, res) => {
  const pool = getPool();
  await pool.query('UPDATE prophetic_messages SET active = 0, updated_at = NOW() WHERE id = ?', [req.params.id]);
  res.json({ ok: true, deactivated: req.params.id });
});

export default router;
