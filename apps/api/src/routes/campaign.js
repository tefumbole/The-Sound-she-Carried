import { Router } from 'express';
import { getPool } from '../db/pool.js';
import { getCampaignSnapshot } from '../services/campaignTotals.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';

const router = Router();

router.get('/public', async (_req, res) => {
  const snap = await getCampaignSnapshot();
  res.json({
    title: snap.settings?.title,
    artist: snap.settings?.artist,
    venue: snap.settings?.venue,
    concert_at: snap.settings?.concert_at,
    target: snap.target,
    raised: snap.raised,
    pending: snap.pending,
    percent: snap.percent,
    contacts: ['https://wa.me/237697470711'],
  });
});

router.get('/', requireAuth, requirePermission('campaign.view'), async (_req, res) => {
  const snap = await getCampaignSnapshot();
  res.json(snap);
});

router.put('/', requireAuth, requirePermission('campaign.edit'), async (req, res) => {
  const pool = getPool();
  const [[row]] = await pool.query('SELECT id FROM campaign_settings LIMIT 1');
  if (!row) return res.status(404).json({ error: 'Settings missing' });

  const fields = {
    target_amount: req.body.target_amount,
    manual_raised: req.body.manual_raised,
    concert_at: req.body.concert_at,
    notify_donor: req.body.notify_donor,
    notify_admin: req.body.notify_admin,
    admin_phones: req.body.admin_phones,
    venue: req.body.venue,
    title: req.body.title,
    artist: req.body.artist,
  };

  const sets = [];
  const values = [];
  for (const [key, val] of Object.entries(fields)) {
    if (val !== undefined) {
      sets.push(`${key} = ?`);
      values.push(val);
    }
  }
  if (!sets.length) return res.json(await getCampaignSnapshot());
  values.push(row.id);
  await pool.query(`UPDATE campaign_settings SET ${sets.join(', ')} WHERE id = ?`, values);
  res.json(await getCampaignSnapshot());
});

export default router;
