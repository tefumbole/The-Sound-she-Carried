import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { getPool } from '../db/pool.js';
import { handleCampayWebhookPayload } from './donations.js';

const router = Router();

function pickHeaders(headers) {
  const keep = [
    'content-type', 'user-agent', 'x-campay-secret', 'signature',
    'x-forwarded-for', 'x-real-ip', 'host',
  ];
  const out = {};
  for (const key of keep) {
    if (headers[key]) out[key] = headers[key];
  }
  return out;
}

async function capture(req, source = 'campay') {
  const result = await handleCampayWebhookPayload(req.body || {}, req.headers);
  const pool = getPool();
  const id = randomUUID();
  await pool.query(
    `INSERT INTO webhook_catches (id, source, method, path, headers_json, body_json, valid_secret, donation_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      source,
      req.method,
      req.originalUrl,
      JSON.stringify(pickHeaders(req.headers)),
      JSON.stringify(req.body || {}),
      result.valid ? 1 : 0,
      result.donation?.id || null,
    ]
  );
  return { id, ...result };
}

router.get('/', async (_req, res) => {
  const pool = getPool();
  const [rows] = await pool.query(
    'SELECT id, source, method, path, valid_secret, donation_id, body_json, created_at FROM webhook_catches ORDER BY created_at DESC LIMIT 50'
  );
  const items = rows.map((r) => ({
    ...r,
    body: typeof r.body_json === 'string' ? JSON.parse(r.body_json) : r.body_json,
  }));

  res.type('html').send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>TSSC webhook catcher</title>
  <style>
    body { margin:0; font-family: ui-sans-serif, system-ui; background:#0b0b0d; color:#f4f1e6; }
    header { padding:24px; border-bottom:1px solid #2a2a2e; }
    h1 { margin:0; font-size:22px; color:#d4af37; }
    p { color:#9aa0a8; }
    main { padding:20px; max-width:960px; margin:0 auto; }
    .card { background:#16161a; border:1px solid #2a2a2e; border-radius:14px; padding:14px 16px; margin-bottom:12px; }
    .meta { font-size:12px; color:#9aa0a8; margin-bottom:8px; }
    .ok { color:#4ade80; } .bad { color:#f87171; }
    pre { white-space:pre-wrap; word-break:break-word; font-size:12px; color:#e5e7eb; margin:0; }
    code { color:#00e5ff; }
  </style>
</head>
<body>
  <header>
    <h1>TSSC webhook catcher</h1>
    <p>Campay posts here: <code>https://tssc.cloud/campay/webhook</code></p>
  </header>
  <main>
    ${items.length ? items.map((i) => `
      <article class="card">
        <div class="meta">${i.created_at} · ${i.method} ${i.path} ·
          <span class="${i.valid_secret ? 'ok' : 'bad'}">${i.valid_secret ? 'secret valid' : 'secret invalid'}</span>
          ${i.donation_id ? ` · donation ${i.donation_id}` : ''}
        </div>
        <pre>${escapeHtml(JSON.stringify(i.body, null, 2))}</pre>
      </article>`).join('') : '<p>No webhooks captured yet.</p>'}
  </main>
</body>
</html>`);
});

router.post('/', async (req, res) => {
  try {
    const result = await capture(req, 'campay');
    if (!result.valid) return res.status(401).json({ status: 'unauthorized', catch_id: result.id });
    res.json({ ok: true, catch_id: result.id, donation_id: result.donation?.id || null });
  } catch (err) {
    console.error('Webhook catcher failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export default router;
