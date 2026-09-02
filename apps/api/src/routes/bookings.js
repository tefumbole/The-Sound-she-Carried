import { Router } from 'express';
import { randomUUID, createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import multer from 'multer';
import { getPool } from '../db/pool.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import { getHolderName } from '../services/campayService.js';
import { notifyBookingSubmitted, notifyBookingDecision, sendBookingOtp } from '../services/bookingNotify.js';
import { toE164Any, toE164CM, looksLikePhone } from '../utils/phone.js';

const router = Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const bookingDir = path.resolve(process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads'), 'bookings');
fs.mkdirSync(bookingDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, bookingDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname || '').slice(0, 8) || '.jpg';
      cb(null, `${randomUUID()}${ext}`);
    },
  }),
  limits: { fileSize: 8 * 1024 * 1024 },
});

function hashOtp(phone, code) {
  return createHash('sha256').update(`${phone}:${code}`).digest('hex');
}

function publicPath(filePath) {
  if (!filePath) return null;
  const name = path.basename(filePath);
  return `/uploads/bookings/${name}`;
}

router.get('/calendar', async (_req, res) => {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT event_date, event_name, status FROM bookings
     WHERE status IN ('approved', 'pending') AND event_date >= CURDATE()
     ORDER BY event_date ASC`
  );
  res.json({
    booked: rows.filter((r) => r.status === 'approved').map((r) => r.event_date),
    pending: rows.filter((r) => r.status === 'pending').map((r) => r.event_date),
    events: rows.map((r) => ({
      date: r.event_date,
      title: r.status === 'approved' ? r.event_name : 'Pending request',
      status: r.status,
    })),
  });
});

router.get('/holder', async (req, res) => {
  try {
    const phone = toE164CM(req.query.phone);
    if (!phone) return res.json({ name: null });
    const name = await getHolderName(phone);
    res.json({ name: name && !looksLikePhone(name) ? name : null });
  } catch (err) {
    res.json({ name: null, error: err.message });
  }
});

router.post('/otp', async (req, res) => {
  const phone = toE164Any(req.body.phone);
  if (!phone) return res.status(400).json({ error: 'Enter a valid phone number.' });
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const pool = getPool();
  await pool.query('UPDATE booking_otps SET used_at = NOW() WHERE phone = ? AND used_at IS NULL', [phone]);
  await pool.query(
    `INSERT INTO booking_otps (id, phone, code_hash, expires_at) VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 10 MINUTE))`,
    [randomUUID(), phone, hashOtp(phone, code)]
  );
  const sent = await sendBookingOtp(phone, code);
  if (!sent.success) return res.status(400).json({ error: sent.error || 'Could not send OTP.' });
  res.json({ ok: true, phone });
});

router.post(
  '/',
  upload.fields([
    { name: 'id_document', maxCount: 1 },
    { name: 'signature', maxCount: 1 },
  ]),
  async (req, res) => {
    const phone = toE164Any(req.body.phone);
    const otp = String(req.body.otp || '').replace(/\D/g, '');
    const eventName = String(req.body.event_name || '').trim();
    const eventDate = String(req.body.event_date || '').trim();
    const eventTime = String(req.body.event_time || '').trim();
    const description = String(req.body.description || '').trim();
    const idType = req.body.id_type === 'passport' ? 'passport' : 'id';
    let holderName = String(req.body.holder_name || '').trim();
    let extracted = {};
    try {
      extracted = req.body.id_extracted ? JSON.parse(req.body.id_extracted) : {};
    } catch {
      extracted = {};
    }

    if (!phone) return res.status(400).json({ error: 'Enter a valid phone number.' });
    if (!eventName || !eventDate || !eventTime) {
      return res.status(400).json({ error: 'Event, date, and time are required.' });
    }
    if (String(req.body.eula_accepted || '') !== '1') {
      return res.status(400).json({ error: 'Please agree to the booking terms.' });
    }
    if (!/^\d{6}$/.test(otp)) return res.status(400).json({ error: 'Enter the 6-digit OTP.' });

    const pool = getPool();
    const [[otpRow]] = await pool.query(
      `SELECT * FROM booking_otps
       WHERE phone = ? AND code_hash = ? AND used_at IS NULL AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [phone, hashOtp(phone, otp)]
    );
    if (!otpRow) return res.status(400).json({ error: 'OTP is invalid or expired.' });

    const [[taken]] = await pool.query(
      `SELECT id FROM bookings WHERE event_date = ? AND status = 'approved' LIMIT 1`,
      [eventDate]
    );
    if (taken) {
      return res.status(409).json({ error: 'The Prophetic Minstrel is already booked on that date.' });
    }

    if (!holderName) {
      try { holderName = (await getHolderName(phone)) || ''; } catch { holderName = ''; }
    }
    if (extracted.full_name && !holderName) holderName = extracted.full_name;

    const idFile = req.files?.id_document?.[0];
    const sigFile = req.files?.signature?.[0];
    const id = randomUUID();
    const reviewToken = randomUUID();

    await pool.query(
      `INSERT INTO bookings
        (id, phone, holder_name, event_name, event_date, event_time, description,
         id_type, id_document_path, id_extracted_json, signature_path, otp_verified_at, status, review_token)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), 'pending', ?)`,
      [
        id, phone, holderName || null, eventName, eventDate, eventTime, description || null,
        idType, idFile?.path || null, JSON.stringify(extracted), sigFile?.path || null, reviewToken,
      ]
    );
    await pool.query('UPDATE booking_otps SET used_at = NOW() WHERE id = ?', [otpRow.id]);

    const [[booking]] = await pool.query('SELECT * FROM bookings WHERE id = ?', [id]);
    notifyBookingSubmitted(booking).catch((err) => console.error('Booking notify failed:', err.message));

    res.json({ id, status: 'pending', holder_name: holderName || null });
  }
);

async function decideBooking(booking, action, reason) {
  const pool = getPool();
  if (action === 'approve') {
    const [[taken]] = await pool.query(
      `SELECT id FROM bookings WHERE event_date = ? AND status = 'approved' AND id <> ? LIMIT 1`,
      [booking.event_date, booking.id]
    );
    if (taken) throw new Error('That date is already approved for another booking.');
    await pool.query(
      `UPDATE bookings SET status = 'approved', reject_reason = NULL, updated_at = NOW() WHERE id = ?`,
      [booking.id]
    );
  } else {
    await pool.query(
      `UPDATE bookings SET status = 'rejected', reject_reason = ?, updated_at = NOW() WHERE id = ?`,
      [reason || 'Rejected', booking.id]
    );
  }
  const [[fresh]] = await pool.query('SELECT * FROM bookings WHERE id = ?', [booking.id]);
  notifyBookingDecision(fresh).catch((err) => console.error('Booking decision notify failed:', err.message));
  return fresh;
}

function serializeBooking(row, withPrivate = false) {
  if (!row) return null;
  return {
    id: row.id,
    phone: row.phone,
    holder_name: row.holder_name,
    event_name: row.event_name,
    event_date: row.event_date,
    event_time: row.event_time,
    description: row.description,
    id_type: row.id_type,
    id_extracted: typeof row.id_extracted_json === 'string' ? JSON.parse(row.id_extracted_json) : row.id_extracted_json,
    id_document_url: withPrivate ? publicPath(row.id_document_path) : null,
    signature_url: withPrivate ? publicPath(row.signature_path) : null,
    status: row.status,
    reject_reason: row.reject_reason,
    created_at: row.created_at,
  };
}

router.get('/review/:token', async (req, res) => {
  const pool = getPool();
  const [[row]] = await pool.query('SELECT * FROM bookings WHERE review_token = ?', [req.params.token]);
  if (!row) return res.status(404).json({ error: 'Booking not found.' });
  res.json(serializeBooking(row, true));
});

router.post('/review/:token', async (req, res) => {
  const pool = getPool();
  const [[row]] = await pool.query('SELECT * FROM bookings WHERE review_token = ?', [req.params.token]);
  if (!row) return res.status(404).json({ error: 'Booking not found.' });
  if (row.status !== 'pending') return res.status(400).json({ error: 'This booking was already decided.' });
  const action = req.body.action === 'approve' ? 'approve' : 'reject';
  if (action === 'reject' && !String(req.body.reason || '').trim()) {
    return res.status(400).json({ error: 'Give a reason for rejection.' });
  }
  try {
    const fresh = await decideBooking(row, action, String(req.body.reason || '').trim());
    res.json(serializeBooking(fresh, true));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/', requireAuth, requirePermission('bookings.view'), async (_req, res) => {
  const pool = getPool();
  const [rows] = await pool.query('SELECT * FROM bookings ORDER BY event_date DESC, created_at DESC LIMIT 400');
  res.json(rows.map((r) => serializeBooking(r, true)));
});

router.patch('/:id', requireAuth, requirePermission('bookings.decide'), async (req, res) => {
  const pool = getPool();
  const [[row]] = await pool.query('SELECT * FROM bookings WHERE id = ?', [req.params.id]);
  if (!row) return res.status(404).json({ error: 'Booking not found.' });
  if (row.status !== 'pending') return res.status(400).json({ error: 'This booking was already decided.' });
  const action = req.body.action === 'approve' ? 'approve' : 'reject';
  if (action === 'reject' && !String(req.body.reason || '').trim()) {
    return res.status(400).json({ error: 'Give a reason for rejection.' });
  }
  try {
    const fresh = await decideBooking(row, action, String(req.body.reason || '').trim());
    res.json(serializeBooking(fresh, true));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
