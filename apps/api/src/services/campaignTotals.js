import { getPool } from '../db/pool.js';

export async function getCampaignSnapshot() {
  const pool = getPool();
  const [[settings]] = await pool.query('SELECT * FROM campaign_settings LIMIT 1');
  const [[sum]] = await pool.query(
    `SELECT COALESCE(SUM(amount), 0) AS live_raised
     FROM donations WHERE status = 'successful'`
  );
  const target = Number(settings?.target_amount || 5000000);
  const manual = Number(settings?.manual_raised || 0);
  const live = Number(sum?.live_raised || 0);
  const raised = manual + live;
  const pending = Math.max(target - raised, 0);
  const percent = target > 0 ? Math.min(100, Math.round((raised / target) * 1000) / 10) : 0;
  return { settings, target, manual, live, raised, pending, percent };
}
