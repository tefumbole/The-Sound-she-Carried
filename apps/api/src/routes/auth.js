import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getPool } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

function buildSession(user) {
  const token = jwt.sign(
    { sub: user.id, email: user.email, role: user.role, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
  return {
    access_token: token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      whatsapp_phone: user.whatsapp_phone,
      role: user.role,
    },
  };
}

router.post('/login', async (req, res) => {
  const identifier = String(req.body.email || req.body.identifier || '').trim();
  const password = String(req.body.password || '');
  if (!identifier || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT * FROM users WHERE status = 'active' AND (
       LOWER(email) = LOWER(?)
       OR LOWER(SUBSTRING_INDEX(email, '@', 1)) = LOWER(?)
       OR REPLACE(phone, '+', '') = REPLACE(?, '+', '')
     ) LIMIT 1`,
    [identifier, identifier, identifier]
  );
  const user = rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ error: 'Invalid credentials.' });
  }
  res.json(buildSession(user));
});

router.get('/me', requireAuth, async (req, res) => {
  const pool = getPool();
  const [rows] = await pool.query('SELECT id, email, name, phone, whatsapp_phone, role, status FROM users WHERE id = ?', [req.user.sub]);
  if (!rows[0]) return res.status(404).json({ error: 'User not found' });

  const [perms] = await pool.query(
    `SELECT rp.permission_code
     FROM users u
     JOIN roles r ON r.name = u.role
     JOIN role_permissions rp ON rp.role_id = r.id
     WHERE u.id = ?`,
    [req.user.sub]
  );
  res.json({
    user: rows[0],
    permissions: (req.user.role === 'super_admin' || req.user.role === 'admin')
      ? ['*']
      : perms.map((p) => p.permission_code),
  });
});

export default router;
