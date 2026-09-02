import { Router } from 'express';
import { createHash, randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getPool } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import { sendOtp, formatPhoneNumber } from '../services/wasenderWhatsAppService.js';

const router = Router();

function hashOtp(userId, code) {
  return createHash('sha256').update(`${userId}:${code}`).digest('hex');
}

function maskPhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.length < 6) return 'WhatsApp';
  return `+${digits.slice(0, 3)} *** ${digits.slice(-3)}`;
}

function otpPhoneFor(user) {
  return formatPhoneNumber(user.whatsapp_phone || user.phone || process.env.SEED_ADMIN_PHONE || '+237675321739');
}

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

async function findUser(pool, identifier) {
  const [rows] = await pool.query(
    `SELECT * FROM users WHERE status = 'active' AND (
       LOWER(email) = LOWER(?)
       OR LOWER(SUBSTRING_INDEX(email, '@', 1)) = LOWER(?)
       OR REPLACE(phone, '+', '') = REPLACE(?, '+', '')
     ) LIMIT 1`,
    [identifier, identifier, identifier]
  );
  return rows[0] || null;
}

async function issueLoginOtp(user) {
  const phone = otpPhoneFor(user);
  if (!phone) {
    return { ok: false, error: 'No WhatsApp number is set for this account.' };
  }
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const pool = getPool();
  const challengeId = randomUUID();
  await pool.query('UPDATE login_otps SET used_at = NOW() WHERE user_id = ? AND used_at IS NULL', [user.id]);
  await pool.query(
    `INSERT INTO login_otps (id, user_id, phone, code_hash, expires_at)
     VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 10 MINUTE))`,
    [challengeId, user.id, phone, hashOtp(user.id, code)]
  );
  const sent = await sendOtp(phone, code, 'Use this code to finish signing in to TSSC Admin.');
  if (!sent.success) {
    return { ok: false, error: sent.error || 'Could not send the login OTP.' };
  }
  return { ok: true, challengeId, phone };
}

router.post('/login', async (req, res) => {
  const identifier = String(req.body.email || req.body.identifier || '').trim();
  const password = String(req.body.password || '');
  if (!identifier || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const pool = getPool();
  const user = await findUser(pool, identifier);
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ error: 'Invalid credentials.' });
  }

  const otp = await issueLoginOtp(user);
  if (!otp.ok) return res.status(400).json({ error: otp.error });

  res.json({
    otp_required: true,
    challenge_id: otp.challengeId,
    phone_hint: maskPhone(otp.phone),
  });
});

router.post('/verify-otp', async (req, res) => {
  const challengeId = String(req.body.challenge_id || '').trim();
  const code = String(req.body.otp || '').replace(/\D/g, '');
  if (!challengeId || !/^\d{6}$/.test(code)) {
    return res.status(400).json({ error: 'Enter the 6-digit OTP sent to WhatsApp.' });
  }

  const pool = getPool();
  const [[row]] = await pool.query(
    `SELECT * FROM login_otps WHERE id = ? AND used_at IS NULL AND expires_at > NOW() LIMIT 1`,
    [challengeId]
  );
  if (!row) return res.status(401).json({ error: 'OTP is invalid or expired.' });

  const [[user]] = await pool.query(`SELECT * FROM users WHERE id = ? AND status = 'active'`, [row.user_id]);
  if (!user || row.code_hash !== hashOtp(user.id, code)) {
    return res.status(401).json({ error: 'OTP is invalid or expired.' });
  }

  await pool.query('UPDATE login_otps SET used_at = NOW() WHERE id = ?', [row.id]);
  res.json(buildSession(user));
});

router.post('/resend-otp', async (req, res) => {
  const challengeId = String(req.body.challenge_id || '').trim();
  if (!challengeId) return res.status(400).json({ error: 'Start login again.' });
  const pool = getPool();
  const [[row]] = await pool.query('SELECT * FROM login_otps WHERE id = ? LIMIT 1', [challengeId]);
  if (!row) return res.status(400).json({ error: 'Start login again.' });
  const [[user]] = await pool.query(`SELECT * FROM users WHERE id = ? AND status = 'active'`, [row.user_id]);
  if (!user) return res.status(400).json({ error: 'Start login again.' });
  const otp = await issueLoginOtp(user);
  if (!otp.ok) return res.status(400).json({ error: otp.error });
  res.json({ otp_required: true, challenge_id: otp.challengeId, phone_hint: maskPhone(otp.phone) });
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
