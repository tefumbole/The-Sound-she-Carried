import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import multer from 'multer';
import { getPool } from '../db/pool.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import {
  sendTextMessage,
  sendImageMessage,
  sendDocumentMessage,
  uploadBufferToWasender,
} from '../services/wasenderWhatsAppService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.resolve(process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads'), 'announcements');
fs.mkdirSync(uploadDir, { recursive: true });
const upload = multer({ dest: uploadDir, limits: { fileSize: 20 * 1024 * 1024 } });

const router = Router();

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function personalize(text, user) {
  return String(text || '')
    .replace(/\{name\}/gi, user.name || '')
    .replace(/\{email\}/gi, user.email || '')
    .replace(/\{phone\}/gi, user.phone || '')
    .replace(/\{reference\}/gi, user.reference || '');
}

async function nextSerial(pool) {
  const [[s]] = await pool.query('SELECT * FROM announcement_settings LIMIT 1');
  const n = Number(s.next_serial || 1);
  await pool.query('UPDATE announcement_settings SET next_serial = ? WHERE id = ?', [n + 1, s.id]);
  return `${s.serial_prefix}-${String(n).padStart(6, '0')}`;
}

async function sendAnnouncement(pool, announcement) {
  const ids = String(announcement.recipient_ids || '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
  if (!ids.length) return 0;
  const [users] = await pool.query(
    `SELECT * FROM users WHERE id IN (${ids.map(() => '?').join(',')})`,
    ids
  );
  const attachments = Array.isArray(announcement.attachments_json)
    ? announcement.attachments_json
    : JSON.parse(announcement.attachments_json || '[]');

  let sent = 0;
  for (const user of users) {
    const phone = user.whatsapp_phone || user.phone;
    if (!phone) continue;
    const text = [
      personalize(announcement.header, { ...user, reference: announcement.reference }),
      personalize(announcement.body, { ...user, reference: announcement.reference }),
      personalize(announcement.footer, { ...user, reference: announcement.reference }),
    ].filter(Boolean).join('\n\n');
    const result = await sendTextMessage(phone, text, 'announcement');
    if (result.success) sent += 1;
    for (const file of attachments) {
      await sleep(3000);
      try {
        const buf = fs.readFileSync(file.path);
        const up = await uploadBufferToWasender(buf, file.mimetype || 'application/octet-stream');
        if (up.success && up.public_url) {
          if (String(file.mimetype || '').startsWith('image/')) {
            await sendImageMessage(phone, up.public_url);
          } else {
            await sendDocumentMessage(phone, up.public_url, null, file.originalname);
          }
        }
      } catch (err) {
        console.warn('Announcement attachment failed:', err.message);
      }
    }
    await sleep(6000);
  }
  await pool.query(
    `UPDATE announcements SET status = 'sent', sent_count = ?, updated_at = NOW() WHERE id = ?`,
    [sent, announcement.id]
  );
  return sent;
}

router.get('/settings', requireAuth, requirePermission('announcements.view'), async (_req, res) => {
  const [[row]] = await getPool().query('SELECT * FROM announcement_settings LIMIT 1');
  res.json(row);
});

router.put('/settings', requireAuth, requirePermission('announcements.compose'), async (req, res) => {
  const pool = getPool();
  const [[row]] = await pool.query('SELECT id FROM announcement_settings LIMIT 1');
  await pool.query(
    `UPDATE announcement_settings SET company_name = ?, default_header = ?, serial_prefix = ?, timezone = ? WHERE id = ?`,
    [
      req.body.company_name,
      req.body.default_header,
      req.body.serial_prefix,
      req.body.timezone || 'Africa/Douala',
      row.id,
    ]
  );
  const [[fresh]] = await pool.query('SELECT * FROM announcement_settings LIMIT 1');
  res.json(fresh);
});

router.get('/categories', requireAuth, async (_req, res) => {
  const [rows] = await getPool().query('SELECT * FROM announcement_categories ORDER BY name');
  res.json(rows);
});

router.post('/categories', requireAuth, requirePermission('announcements.compose'), async (req, res) => {
  const id = randomUUID();
  await getPool().query('INSERT INTO announcement_categories (id, name) VALUES (?, ?)', [id, req.body.name]);
  res.status(201).json({ id });
});

router.get('/templates', requireAuth, async (_req, res) => {
  const [rows] = await getPool().query('SELECT * FROM announcement_templates ORDER BY name');
  res.json(rows);
});

router.post('/templates', requireAuth, requirePermission('announcements.compose'), async (req, res) => {
  const id = randomUUID();
  await getPool().query(
    'INSERT INTO announcement_templates (id, name, subject, header, body, footer) VALUES (?, ?, ?, ?, ?, ?)',
    [id, req.body.name, req.body.subject || '', req.body.header || '', req.body.body || '', req.body.footer || '']
  );
  res.status(201).json({ id });
});

router.get('/', requireAuth, requirePermission('announcements.view'), async (req, res) => {
  const status = req.query.status;
  const pool = getPool();
  const [rows] = status
    ? await pool.query('SELECT * FROM announcements WHERE status = ? ORDER BY created_at DESC', [status])
    : await pool.query('SELECT * FROM announcements ORDER BY created_at DESC');
  res.json(rows);
});

router.post(
  '/',
  requireAuth,
  requirePermission('announcements.compose'),
  upload.array('attachments', 8),
  async (req, res) => {
    const pool = getPool();
    const id = randomUUID();
    const reference = await nextSerial(pool);
    const recipientIds = Array.isArray(req.body.recipient_ids)
      ? req.body.recipient_ids
      : String(req.body.recipient_ids || '').split(',').filter(Boolean);
    const attachments = (req.files || []).map((f) => ({
      path: f.path,
      originalname: f.originalname,
      mimetype: f.mimetype,
    }));
    const scheduledAt = req.body.scheduled_at || null;
    const sendNow = String(req.body.send_now || '') === '1';
    await pool.query(
      `INSERT INTO announcements
        (id, subject, header, body, footer, category_id, recipient_ids, reference, status, scheduled_at, attachments_json, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        req.body.subject || '',
        req.body.header || '',
        req.body.body || '',
        req.body.footer || '',
        req.body.category_id || null,
        recipientIds.join(','),
        reference,
        sendNow ? 'sending' : scheduledAt ? 'scheduled' : 'draft',
        scheduledAt,
        JSON.stringify(attachments),
        req.user.sub,
      ]
    );
    const [[row]] = await pool.query('SELECT * FROM announcements WHERE id = ?', [id]);
    if (sendNow) {
      sendAnnouncement(pool, row).catch((e) => console.error(e));
    }
    res.status(201).json(row);
  }
);

router.post('/:id/send', requireAuth, requirePermission('announcements.send'), async (req, res) => {
  const pool = getPool();
  const [[row]] = await pool.query('SELECT * FROM announcements WHERE id = ?', [req.params.id]);
  if (!row) return res.status(404).json({ error: 'Not found' });
  const sent = await sendAnnouncement(pool, row);
  res.json({ ok: true, sent });
});

export async function processScheduledAnnouncements() {
  const pool = getPool();
  const [due] = await pool.query(
    `SELECT * FROM announcements WHERE status = 'scheduled' AND scheduled_at <= NOW()`
  );
  for (const row of due) {
    try { await sendAnnouncement(pool, row); } catch (e) { console.warn(e.message); }
  }
}

export default router;
