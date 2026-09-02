import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { getPool } from '../db/pool.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';

const router = Router();

router.get('/', requireAuth, requirePermission('roles.view'), async (_req, res) => {
  const pool = getPool();
  const [roles] = await pool.query('SELECT * FROM roles ORDER BY name');
  const [perms] = await pool.query('SELECT * FROM permissions ORDER BY code');
  const [rp] = await pool.query('SELECT * FROM role_permissions');
  res.json({
    roles: roles.map((r) => ({
      ...r,
      permissions: rp.filter((p) => p.role_id === r.id).map((p) => p.permission_code),
    })),
    permissions: perms,
  });
});

router.post('/', requireAuth, requirePermission('roles.edit'), async (req, res) => {
  const name = String(req.body.name || '').trim();
  if (!name) return res.status(400).json({ error: 'Role name is required.' });
  const pool = getPool();
  const id = randomUUID();
  await pool.query('INSERT INTO roles (id, name, description) VALUES (?, ?, ?)', [id, name, req.body.description || '']);
  res.status(201).json({ id, name });
});

router.put('/:id', requireAuth, requirePermission('roles.edit'), async (req, res) => {
  const pool = getPool();
  if (req.body.name) {
    await pool.query('UPDATE roles SET name = ?, description = ? WHERE id = ?', [
      req.body.name,
      req.body.description || '',
      req.params.id,
    ]);
  }
  if (Array.isArray(req.body.permissions)) {
    await pool.query('DELETE FROM role_permissions WHERE role_id = ?', [req.params.id]);
    for (const code of req.body.permissions) {
      await pool.query(
        'INSERT INTO role_permissions (id, role_id, permission_code) VALUES (?, ?, ?)',
        [randomUUID(), req.params.id, code]
      );
    }
  }
  res.json({ ok: true });
});

export default router;
