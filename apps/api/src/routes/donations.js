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

const router = Router();

async function markSuccessful(pool, donation) {
  if (donation.status === 'successful') return donation;
  await pool.query(
    `UPDATE donations SET status = 'successful', updated_at = NOW() WHERE id = ? AND status <> 'successful'`,
    [donation.id]
  );
  const [[fresh]] = await pool.query('SELECT * FROM donations WHERE id = ?', [donation.id]);
  if (fresh.status === 'successful' && !fresh.notified_at) {
    try {
      await notifyDonationSuccess(fresh);
      await pool.query('UPDATE donations SET notified_at = NOW() WHERE id = ?', [fresh.id]);
    } catch (err) {
      console.error('Donation notify failed:', err.message);
    }
  }
  return fresh;
}

router.get('/holder', async (req, res) => {
  try {
    const name = await getHolderName(req.query.phone);
    res.json({ name: name && !looksLikePhone(name) ? name : null });
  } catch (err) {
    console.warn('Holder lookup failed:', err.message);
    res.json({ name: null });
  }
});

router.post('/initiate', async (req, res) => {
  const amount = Math.round(Number(req.body.amount || 0));
  const method = String(req.body.method || 'momo');
  if (!Number.isFinite(amount) || amount < 100) {
    return res.status(400).json({ error: 'Minimum donation is 100 F CFA.' });
  }
  if (!['momo', 'om', 'card'].includes(method)) {
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

  const whatsapp = toE164CM(req.body.whatsapp_phone || (method === 'card' ? '' : req.body.phone)) || momoPhone;
  const id = randomUUID();
  const pool = getPool();
  const appUrl = String(process.env.APP_URL || '').replace(/\/$/, '');

  if (method === 'card') {
    const checkout = await createDonationCheckout({
      donationId: id,
      amount,
      holderName: holderName || 'Card donor',
      successUrl: `${appUrl}/donate/return?id=${id}&session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${appUrl}/donate/return?id=${id}&failed=1`,
    });
    if (!checkout.success) return res.status(400).json({ error: checkout.message });

    await pool.query(
      `INSERT INTO donations (id, amount, method, momo_phone, holder_name, whatsapp_phone, status, campay_ref, campay_link)
       VALUES (?, ?, 'card', ?, ?, ?, 'pending', ?, ?)`,
      [id, amount, toE164CM(req.body.phone) || null, holderName || 'Card donor', whatsapp, checkout.sessionId, checkout.url]
    );
    return res.json({ id, status: 'pending', checkout_url: checkout.url });
  }

  const collect = await collectPayment({
    amount,
    phone: momoPhone,
    description: 'The Sound She Carries donation',
    externalReference: id,
  });
  if (!collect.success) return res.status(400).json({ error: collect.message });

  await pool.query(
    `INSERT INTO donations (id, amount, method, momo_phone, holder_name, whatsapp_phone, status, campay_ref)
     VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`,
    [id, amount, method, momoPhone, holderName || null, whatsapp, collect.reference]
  );

  res.json({
    id,
    status: 'pending',
    reference: collect.reference,
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
      return res.json({ id: fresh.id, status: fresh.status, amount: fresh.amount });
    }
    if (result.status === 'FAILED') {
      await pool.query(
        'UPDATE donations SET status = ?, failure_message = ? WHERE id = ?',
        ['failed', result.raw?.reason || 'Payment failed', donation.id]
      );
      return res.json({ id: donation.id, status: 'failed' });
    }
  }

  res.json({ id: donation.id, status: donation.status, amount: donation.amount, method: donation.method });
});

router.post('/campay/webhook', async (req, res) => {
  if (!validateCampayJwt(req.body || {}, req.headers)) {
    return res.status(401).json({ status: 'unauthorized' });
  }
  const reference = req.body?.reference || req.body?.external_reference;
  const providerStatus = String(req.body?.status || '').toUpperCase();
  if (!reference) return res.json({ ok: true });

  const pool = getPool();
  const [rows] = await pool.query(
    'SELECT * FROM donations WHERE campay_ref = ? OR id = ? LIMIT 1',
    [reference, req.body?.external_reference || '']
  );
  const donation = rows[0];
  if (!donation) return res.json({ ok: true });

  if (['SUCCESSFUL', 'SUCCESS', 'COMPLETED'].includes(providerStatus)) {
    await markSuccessful(pool, donation);
  } else if (['FAILED', 'REJECTED', 'EXPIRED'].includes(providerStatus)) {
    await pool.query('UPDATE donations SET status = ? WHERE id = ? AND status = ?', ['failed', donation.id, 'pending']);
  }
  res.json({ ok: true });
});

export async function settleStripeDonation(session) {
  const donationId = session?.metadata?.donation_id;
  if (!donationId) return null;
  const pool = getPool();
  const [[donation]] = await pool.query('SELECT * FROM donations WHERE id = ?', [donationId]);
  if (!donation) return null;
  const name = session.customer_details?.name || donation.holder_name;
  if (name) {
    await pool.query('UPDATE donations SET holder_name = ? WHERE id = ?', [name, donation.id]);
    donation.holder_name = name;
  }
  return markSuccessful(pool, donation);
}

router.get('/', requireAuth, requirePermission('donations.view'), async (_req, res) => {
  const pool = getPool();
  const [rows] = await pool.query('SELECT * FROM donations ORDER BY created_at DESC LIMIT 500');
  res.json(rows);
});

export default router;
