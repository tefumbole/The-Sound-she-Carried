import jwt from 'jsonwebtoken';
import { getPool } from '../db/pool.js';

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function optionalAuth(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (token) {
    try {
      req.user = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      req.user = null;
    }
  }
  next();
}

export function requirePermission(...codes) {
  return async (req, res, next) => {
    if (!req.user?.sub) return res.status(401).json({ error: 'Unauthorized' });
    if (req.user.role === 'super_admin' || req.user.role === 'admin') return next();

    try {
      const pool = getPool();
      const [rows] = await pool.query(
        `SELECT rp.permission_code
         FROM users u
         JOIN roles r ON r.name = u.role
         JOIN role_permissions rp ON rp.role_id = r.id
         WHERE u.id = ?`,
        [req.user.sub]
      );
      const have = new Set(rows.map((r) => r.permission_code));
      const ok = codes.some((c) => have.has(c));
      if (!ok) return res.status(403).json({ error: 'Forbidden' });
      next();
    } catch (err) {
      next(err);
    }
  };
}
