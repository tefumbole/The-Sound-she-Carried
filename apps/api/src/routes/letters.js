import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import multer from 'multer';
import { getPool } from '../db/pool.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import { sendTextThenDocumentBuffer, sendTextMessage } from '../services/wasenderWhatsAppService.js';
import { buildLetterPdfBuffer } from '../services/letterPdf.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.resolve(process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads'), 'letters');
fs.mkdirSync(uploadDir, { recursive: true });
const upload = multer({ dest: uploadDir, limits: { fileSize: 20 * 1024 * 1024 } });

const router = Router();

async function nextLetterRef(pool) {
  const [[s]] = await pool.query('SELECT * FROM letter_settings LIMIT 1');
  const n = Number(s.next_serial || 1);
  await pool.query('UPDATE letter_settings SET next_serial = ? WHERE id = ?', [n + 1, s.id]);
  const yy = new Date().getFullYear().toString().slice(-2);
  return `${s.serial_prefix}/${yy}/${String(n).padStart(6, '0')}`;
}

function ids(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  return String(value || '').split(',').map((x) => x.trim()).filter(Boolean);
}

router.get('/categories', requireAuth, async (_req, res) => {
  const [rows] = await getPool().query('SELECT * FROM letter_categories ORDER BY name');
  res.json(rows);
});

router.post('/categories', requireAuth, requirePermission('letters.compose'), async (req, res) => {
  const id = randomUUID();
  await getPool().query('INSERT INTO letter_categories (id, name) VALUES (?, ?)', [id, req.body.name]);
  res.status(201).json({ id });
});

router.get('/templates', requireAuth, async (_req, res) => {
  const [rows] = await getPool().query('SELECT * FROM letter_templates ORDER BY name');
  res.json(rows);
});

router.post('/templates', requireAuth, requirePermission('letters.compose'), async (req, res) => {
  const id = randomUUID();
  await getPool().query(
    'INSERT INTO letter_templates (id, name, subject, header, body, footer) VALUES (?, ?, ?, ?, ?, ?)',
    [id, req.body.name, req.body.subject || '', req.body.header || '', req.body.body || '', req.body.footer || '']
  );
  res.status(201).json({ id });
});

router.get('/', requireAuth, requirePermission('letters.view'), async (req, res) => {
  const status = req.query.status;
  const pool = getPool();
  const [rows] = status
    ? await pool.query('SELECT * FROM letters WHERE status = ? ORDER BY created_at DESC', [status])
    : await pool.query('SELECT * FROM letters ORDER BY created_at DESC');
  res.json(rows);
});

router.get('/:id', requireAuth, requirePermission('letters.view'), async (req, res) => {
  const pool = getPool();
  const [[letter]] = await pool.query('SELECT * FROM letters WHERE id = ?', [req.params.id]);
  if (!letter) return res.status(404).json({ error: 'Not found' });
  const [recipients] = await pool.query('SELECT * FROM letter_recipients WHERE letter_id = ?', [letter.id]);
  const [attachments] = await pool.query('SELECT * FROM letter_attachments WHERE letter_id = ?', [letter.id]);
  res.json({ ...letter, recipients, attachments });
});

router.post(
  '/',
  requireAuth,
  requirePermission('letters.compose'),
  upload.array('attachments', 8),
  async (req, res) => {
    const pool = getPool();
    const id = randomUUID();
    const reference = await nextLetterRef(pool);
    const toIds = ids(req.body.to_ids);
    const ccIds = ids(req.body.cc_ids);
    const forward = req.body.forward || 'draft';
    let status = 'draft';
    if (forward === 'approver') status = 'edited';
    if (forward === 'signer') status = 'approved';
    if (forward === 'sender') status = 'signed';

    await pool.query(
      `INSERT INTO letters
        (id, reference, subject, header, body, footer, comment, category_id, status, to_ids, cc_ids, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        reference,
        req.body.subject || '',
        req.body.header || '',
        req.body.body || '',
        req.body.footer || '',
        req.body.comment || '',
        req.body.category_id || null,
        status,
        toIds.join(','),
        ccIds.join(','),
        req.user.sub,
      ]
    );

    const allIds = [...toIds.map((uid) => [uid, 'to']), ...ccIds.map((uid) => [uid, 'cc'])];
    for (const [userId, kind] of allIds) {
      const [[u]] = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
      if (!u) continue;
      await pool.query(
        `INSERT INTO letter_recipients (id, letter_id, user_id, kind, name, phone) VALUES (?, ?, ?, ?, ?, ?)`,
        [randomUUID(), id, userId, kind, u.name, u.whatsapp_phone || u.phone]
      );
    }

    for (const file of req.files || []) {
      await pool.query(
        'INSERT INTO letter_attachments (id, letter_id, file_name, file_url) VALUES (?, ?, ?, ?)',
        [randomUUID(), id, file.originalname, file.path]
      );
    }

    if (req.body.save_as_template) {
      await pool.query(
        'INSERT INTO letter_templates (id, name, subject, header, body, footer) VALUES (?, ?, ?, ?, ?, ?)',
        [randomUUID(), req.body.subject || 'Template', req.body.subject, req.body.header, req.body.body, req.body.footer]
      );
    }

    const [[letter]] = await pool.query('SELECT * FROM letters WHERE id = ?', [id]);
    res.status(201).json(letter);
  }
);

router.post('/:id/action', requireAuth, async (req, res) => {
  const action = String(req.body.action || '');
  const pool = getPool();
  const [[letter]] = await pool.query('SELECT * FROM letters WHERE id = ?', [req.params.id]);
  if (!letter) return res.status(404).json({ error: 'Not found' });

  const map = {
    edit_ok: { status: 'edited', field: 'edit_by', perm: 'letters.compose' },
    approve: { status: 'approved', field: 'approved_by', perm: 'letters.approve' },
    sign: { status: 'signed', field: 'signed_by', perm: 'letters.sign' },
    reject: { status: 'rejected', field: 'reject_by', perm: 'letters.approve' },
  };
  const spec = map[action];
  if (!spec) return res.status(400).json({ error: 'Unknown action' });

  await pool.query(`UPDATE letters SET status = ?, ${spec.field} = ? WHERE id = ?`, [
    spec.status,
    req.user.sub,
    letter.id,
  ]);
  res.json({ ok: true, status: spec.status });
});

router.post('/:id/send', requireAuth, requirePermission('letters.send'), async (req, res) => {
  const pool = getPool();
  const [[letter]] = await pool.query('SELECT * FROM letters WHERE id = ?', [req.params.id]);
  if (!letter) return res.status(404).json({ error: 'Not found' });
  const [recipients] = await pool.query(
    `SELECT * FROM letter_recipients WHERE letter_id = ? AND kind = 'to'`,
    [letter.id]
  );

  for (const r of recipients) {
    if (!r.phone) continue;
    const pdf = await buildLetterPdfBuffer({
      reference: letter.reference,
      subject: letter.subject,
      header: letter.header,
      body: letter.body,
      footer: letter.footer,
      recipientName: r.name,
    });
    const text =
      `Dear ${r.name || 'friend'},\n\nPlease find the official letter *${letter.subject}* (${letter.reference}).\n\n_The Sound She Carries_`;
    await sendTextThenDocumentBuffer(r.phone, text, pdf, `${letter.reference}.pdf`);
  }

  await pool.query('UPDATE letters SET status = ?, sent_by = ? WHERE id = ?', ['sent', req.user.sub, letter.id]);
  res.json({ ok: true, sent: recipients.length });
});

router.get('/:id/pdf', requireAuth, requirePermission('letters.view'), async (req, res) => {
  const pool = getPool();
  const [[letter]] = await pool.query('SELECT * FROM letters WHERE id = ?', [req.params.id]);
  if (!letter) return res.status(404).json({ error: 'Not found' });
  const pdf = await buildLetterPdfBuffer({
    reference: letter.reference,
    subject: letter.subject,
    header: letter.header,
    body: letter.body,
    footer: letter.footer,
    recipientName: '',
  });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${letter.reference}.pdf"`);
  res.send(pdf);
});

export default router;
