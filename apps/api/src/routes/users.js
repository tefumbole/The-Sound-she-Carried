import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { getPool } from '../db/pool.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import { toE164CM } from '../utils/phone.js';

const router = Router();

function publicUser(row) {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    phone: row.phone,
    whatsapp_phone: row.whatsapp_phone,
    role: row.role,
    status: row.status,
    created_at: row.created_at,
  };
}

router.get('/', requireAuth, requirePermission('users.view'), async (req, res) => {
  const pool = getPool();
  const q = `%${String(req.query.q || '').trim()}%`;
  const [rows] = await pool.query(
    `SELECT id, email, name, phone, whatsapp_phone, role, status, created_at
     FROM users
     WHERE (? = '%%' OR name LIKE ? OR email LIKE ? OR phone LIKE ?)
     ORDER BY created_at DESC`,
    [q, q, q, q]
  );
  res.json(rows);
});

router.get('/search', requireAuth, async (req, res) => {
  const pool = getPool();
  const q = `%${String(req.query.q || '').trim()}%`;
  const [rows] = await pool.query(
    `SELECT id, name, email, phone, whatsapp_phone, role
     FROM users WHERE status = 'active' AND (name LIKE ? OR email LIKE ? OR phone LIKE ?)
     ORDER BY name LIMIT 40`,
    [q, q, q]
  );
  res.json(rows);
});

router.post('/', requireAuth, requirePermission('users.create'), async (req, res) => {
  const { name, email, password, role, status } = req.body || {};
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email and password are required.' });
  }
  const pool = getPool();
  const [exists] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
  if (exists[0]) return res.status(409).json({ error: 'Email already in use.' });

  const id = randomUUID();
  const hash = await bcrypt.hash(String(password), 10);
  await pool.query(
    `INSERT INTO users (id, email, password_hash, name, phone, whatsapp_phone, role, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      String(email).trim(),
      hash,
      String(name).trim(),
      toE164CM(req.body.phone) || null,
      toE164CM(req.body.whatsapp_phone || req.body.phone) || null,
      role || 'staff',
      status || 'active',
    ]
  );
  const [[user]] = await pool.query(
    'SELECT id, email, name, phone, whatsapp_phone, role, status, created_at FROM users WHERE id = ?',
    [id]
  );
  res.status(201).json(publicUser(user));
});

router.put('/:id', requireAuth, requirePermission('users.edit'), async (req, res) => {
  const pool = getPool();
  const sets = [];
  const values = [];
  const map = {
    name: req.body.name,
    email: req.body.email,
    role: req.body.role,
    status: req.body.status,
    phone: req.body.phone !== undefined ? toE164CM(req.body.phone) || null : undefined,
    whatsapp_phone: req.body.whatsapp_phone !== undefined ? toE164CM(req.body.whatsapp_phone) || null : undefined,
  };
  for (const [k, v] of Object.entries(map)) {
    if (v !== undefined) {
      sets.push(`${k} = ?`);
      values.push(v);
    }
  }
  if (req.body.password) {
    sets.push('password_hash = ?');
    values.push(await bcrypt.hash(String(req.body.password), 10));
  }
  if (!sets.length) return res.status(400).json({ error: 'Nothing to update' });
  values.push(req.params.id);
  await pool.query(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`, values);
  const [[user]] = await pool.query(
    'SELECT id, email, name, phone, whatsapp_phone, role, status, created_at FROM users WHERE id = ?',
    [req.params.id]
  );
  res.json(publicUser(user));
});

export default router;
