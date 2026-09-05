import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { getPool } from '../db/pool.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import {
  getHolderName,
  collectPayment,
  getTransactionStatus,
  validateCampayJwt,
} from '../services/campayService.js';
import { createDonationCheckout, getCheckoutStatus } from '../services/stripeService.js';
import { notifyDonationSuccess } from '../services/donationNotify.js';
import { toE164CM, looksLikePhone } from '../utils/phone.js';
import {
  assignPropheticWord,
  donationReference,
  firstNameFrom,
  getConfirmationPayload,
} from '../services/propheticSelect.js';
import { buildDonationConfirmationPdf } from '../services/donationConfirmationPdf.js';

const router = Router();

export async function markSuccessful(pool, donation) {
  const conn = await pool.getConnection();
  let fresh = donation;
  let confirmation = null;
  let shouldNotify = false;
  try {
    await conn.beginTransaction();
    const [[locked]] = await conn.query('SELECT * FROM donations WHERE id = ? FOR UPDATE', [donation.id]);
    if (!locked) {
      await conn.rollback();
      return donation;
    }
    if (locked.status !== 'successful') {
      await conn.query(
        `UPDATE donations SET status = 'successful', updated_at = NOW() WHERE id = ? AND status <> 'successful'`,
        [locked.id]
      );
    }
    const [[updated]] = await conn.query('SELECT * FROM donations WHERE id = ?', [locked.id]);
    confirmation = await assignPropheticWord(conn, updated);
    const [[row]] = await conn.query('SELECT * FROM donations WHERE id = ?', [locked.id]);
    fresh = row;
    shouldNotify = !row.notified_at;
    await conn.commit();
  } catch (err) {
    try { await conn.rollback(); } catch { /* ignore */ }
    throw err;
  } finally {
    conn.release();
  }

  if (shouldNotify) {
    try {
      await notifyDonationSuccess(fresh, confirmation);
      await pool.query(
        'UPDATE donations SET notified_at = NOW() WHERE id = ? AND notified_at IS NULL',
        [fresh.id]
      );
    } catch (err) {
      console.error('Donation notify failed:', err.message);
    }
  }
  return fresh;
}

router.get('/holder', async (req, res) => {
  try {
    const phone = toE164CM(req.query.phone);
    if (!phone) return res.json({ name: null, error: 'Invalid phone number.' });
    const name = await getHolderName(phone);
    res.json({ name: name && !looksLikePhone(name) ? name : null });
  } catch (err) {
    console.warn('Holder lookup failed:', err.message);
    res.json({ name: null, error: err.message });
  }
});

router.post('/initiate', async (req, res) => {
  const amount = Math.round(Number(req.body.amount || 0));
  let method = String(req.body.method || 'mobile');
  if (method === 'momo' || method === 'om') method = 'mobile';
  const kind = String(req.body.kind || 'gift') === 'gold_sponsor' ? 'gold_sponsor' : 'gift';
  const goldTiers = [100000, 200000, 300000, 500000];
  if (kind === 'gold_sponsor' && !goldTiers.includes(amount)) {
    return res.status(400).json({ error: 'Choose a Gold Sponsor amount.' });
  }
  if (!Number.isFinite(amount) || amount < 100) {
    return res.status(400).json({ error: 'Minimum donation is 100 F CFA.' });
  }
  if (!['mobile', 'card'].includes(method)) {
    return res.status(400).json({ error: 'Invalid payment method.' });
  }

  const momoPhone = method === 'card' ? null : toE164CM(req.body.phone);
  if (method !== 'card' && !momoPhone) {
    return res.status(400).json({ error: 'Enter a valid Cameroon MoMo number.' });
  }

  let holderName = String(req.body.holder_name || '').trim();
  if (!holderName && momoPhone) {
    try {
      holderName = (await getHolderName(momoPhone)) || '';
    } catch {
      holderName = '';
    }
  }

  const email = String(req.body.email || '').trim();
  if (method === 'card' && !holderName) {
    return res.status(400).json({ error: 'Enter the name on the card.' });
  }
  if (method === 'card' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Enter a valid email for the Visa receipt.' });
  }

  const cardPhone = method === 'card' ? toE164CM(req.body.phone) : null;
  const whatsapp = toE164CM(req.body.whatsapp_phone || req.body.phone) || momoPhone || cardPhone;
  const id = randomUUID();
  const reference = donationReference(id);
  const firstName = firstNameFrom(holderName);
  const pool = getPool();
  const appUrl = String(process.env.APP_URL || '').replace(/\/$/, '');

  if (method === 'card') {
    const checkout = await createDonationCheckout({
      donationId: id,
      amount,
      holderName,
      email,
      phone: cardPhone || '',
      successUrl: `${appUrl}/donate/return?id=${id}&session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${appUrl}/donate/return?id=${id}&failed=1`,
      productName: kind === 'gold_sponsor' ? 'Gold Sponsor — The Sound She Carries' : 'The Sound She Carries donation',
    });
    if (!checkout.success) return res.status(400).json({ error: checkout.message });

    await pool.query(
      `INSERT INTO donations (id, amount, method, momo_phone, holder_name, whatsapp_phone, status, campay_ref, campay_link, kind, email, reference, first_name)
       VALUES (?, ?, 'card', ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?)`,
      [id, amount, toE164CM(req.body.phone) || null, holderName || 'Card donor', whatsapp, checkout.sessionId, checkout.url, kind, email || null, reference, firstName]
    );
    return res.json({ id, status: 'pending', checkout_url: checkout.url, reference });
  }

  const collect = await collectPayment({
    amount,
    phone: momoPhone,
    description: kind === 'gold_sponsor' ? 'Gold Sponsor — The Sound She Carries' : 'The Sound She Carries donation',
    externalReference: id,
  });
  if (!collect.success) return res.status(400).json({ error: collect.message });

  await pool.query(
    `INSERT INTO donations (id, amount, method, momo_phone, holder_name, whatsapp_phone, status, campay_ref, kind, email, reference, first_name)
     VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?)`,
    [id, amount, method, momoPhone, holderName || null, whatsapp, collect.reference, kind, email || null, reference, firstName]
  );

  res.json({
    id,
    status: 'pending',
    reference,
    provider_reference: collect.reference,
    message: collect.message,
    holder_name: holderName || null,
  });
});

router.get('/:id/status', async (req, res) => {
  const pool = getPool();
  const [[donation]] = await pool.query('SELECT * FROM donations WHERE id = ?', [req.params.id]);
  if (!donation) return res.status(404).json({ error: 'Donation not found' });

  if (donation.status === 'pending' && donation.campay_ref) {
    const sessionId = req.query.session_id || donation.campay_ref;
    const result = donation.method === 'card'
      ? await getCheckoutStatus(sessionId)
      : await getTransactionStatus(donation.campay_ref);
    if (result.status === 'SUCCESSFUL') {
      if (result.holderName && !donation.holder_name) {
        await pool.query('UPDATE donations SET holder_name = ? WHERE id = ?', [result.holderName, donation.id]);
        donation.holder_name = result.holderName;
      }
      const fresh = await markSuccessful(pool, donation);
      const confirmation = await getConfirmationPayload(pool, fresh);
      return res.json(confirmation);
    }
    if (result.status === 'FAILED') {
      await pool.query(
        'UPDATE donations SET status = ?, failure_message = ? WHERE id = ?',
        ['failed', result.raw?.reason || 'Payment failed', donation.id]
      );
      return res.json({ id: donation.id, status: 'failed' });
    }
  }

  if (donation.status === 'successful') {
    return res.json(await getConfirmationPayload(pool, donation));
  }
  res.json({
    id: donation.id,
    status: donation.status,
    amount: donation.amount,
    method: donation.method,
    reference: donation.reference || null,
  });
});

router.get('/:id/confirmation.pdf', async (req, res) => {
  const pool = getPool();
  const [[donation]] = await pool.query('SELECT * FROM donations WHERE id = ?', [req.params.id]);
  if (!donation) return res.status(404).json({ error: 'Donation not found' });
  if (donation.status !== 'successful') {
    return res.status(409).json({ error: 'Confirmation is available after a successful contribution.' });
  }
  const payload = await getConfirmationPayload(pool, donation);
  const pdf = await buildDonationConfirmationPdf(payload);
  const filename = `${payload.reference || 'TSSC'}-confirmation.pdf`;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(pdf);
});

export async function handleCampayWebhookPayload(payload, headers = {}) {
  const valid = validateCampayJwt(payload || {}, headers);
  const reference = payload?.reference || payload?.external_reference;
  const providerStatus = String(payload?.status || '').toUpperCase();
  let donation = null;

  if (valid && reference) {
    const pool = getPool();
    const [rows] = await pool.query(
      'SELECT * FROM donations WHERE campay_ref = ? OR id = ? LIMIT 1',
      [reference, payload?.external_reference || '']
    );
    donation = rows[0] || null;
    if (donation) {
      if (['SUCCESSFUL', 'SUCCESS', 'COMPLETED'].includes(providerStatus)) {
        donation = await markSuccessful(pool, donation);
      } else if (['FAILED', 'REJECTED', 'EXPIRED'].includes(providerStatus)) {
        await pool.query('UPDATE donations SET status = ? WHERE id = ? AND status = ?', ['failed', donation.id, 'pending']);
        donation = { ...donation, status: 'failed' };
      }
    }
  }

  return { valid, donation, reference, providerStatus };
}

router.post('/campay/webhook', async (req, res) => {
  const result = await handleCampayWebhookPayload(req.body || {}, req.headers);
  if (!result.valid) return res.status(401).json({ status: 'unauthorized' });
  res.json({ ok: true, donation_id: result.donation?.id || null });
});

export async function settleStripeDonation(session) {
  const donationId = session?.metadata?.donation_id;
  if (!donationId) return null;
  const pool = getPool();
  const [[donation]] = await pool.query('SELECT * FROM donations WHERE id = ?', [donationId]);
  if (!donation) return null;
  const name = session.customer_details?.name || donation.holder_name;
  const email = session.customer_details?.email || donation.email;
  if (name || email) {
    await pool.query(
      'UPDATE donations SET holder_name = COALESCE(?, holder_name), email = COALESCE(?, email) WHERE id = ?',
      [name || null, email || null, donation.id]
    );
    if (name) donation.holder_name = name;
    if (email) donation.email = email;
  }
  return markSuccessful(pool, donation);
}

router.get('/', requireAuth, requirePermission('donations.view'), async (_req, res) => {
  const pool = getPool();
  const [rows] = await pool.query('SELECT * FROM donations ORDER BY created_at DESC LIMIT 500');
  res.json(rows);
});

export default router;
