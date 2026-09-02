import './env.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { checkDatabaseConnection } from './db/pool.js';
import { isWasenderConfigured } from './services/wasenderWhatsAppService.js';
import { constructWebhookEvent, isStripeConfigured } from './services/stripeService.js';
import authRoutes from './routes/auth.js';
import campaignRoutes from './routes/campaign.js';
import donationsRoutes, { settleStripeDonation } from './routes/donations.js';
import webhookCatcherRoutes from './routes/webhookCatcher.js';
import usersRoutes from './routes/users.js';
import rolesRoutes from './routes/roles.js';
import tasksRoutes, { runProcessScheduled, runProcessReminders } from './routes/tasks.js';
import announcementsRoutes, { processScheduledAnnouncements } from './routes/announcements.js';
import lettersRoutes from './routes/letters.js';
import whatsappRoutes from './routes/whatsapp.js';
import bookingsRoutes from './routes/bookings.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT || 3005);
const uploadDir = path.resolve(process.env.UPLOAD_DIR || path.join(__dirname, '../uploads'));
fs.mkdirSync(uploadDir, { recursive: true });

app.set('trust proxy', true);
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false,
}));
const corsOrigins = String(process.env.CORS_ORIGIN || '*')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
app.use(cors({
  origin: corsOrigins.includes('*') ? '*' : corsOrigins,
  credentials: true,
}));
app.use(morgan('combined'));
app.post('/donations/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const event = constructWebhookEvent(req.body, req.headers['stripe-signature']);
    if (event.type === 'checkout.session.completed') {
      await settleStripeDonation(event.data.object);
    }
    res.json({ received: true });
  } catch (err) {
    console.error('Stripe webhook error:', err.message);
    res.status(400).json({ error: err.message });
  }
});
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(uploadDir));

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'tssc-api',
    wasender: isWasenderConfigured(),
    campay: Boolean(process.env.CAMPAY_TOKEN || process.env.CAMPAY_USERNAME),
    stripe: isStripeConfigured(),
  });
});

app.use('/auth', authRoutes);
app.use('/campaign', campaignRoutes);
app.use('/donations', donationsRoutes);
app.use('/campay/webhook', webhookCatcherRoutes);
app.use('/webhookercatcher', webhookCatcherRoutes);
app.use('/users', usersRoutes);
app.use('/roles', rolesRoutes);
app.use('/tasks', tasksRoutes);
app.use('/announcements', announcementsRoutes);
app.use('/letters', lettersRoutes);
app.use('/whatsapp', whatsappRoutes);
app.use('/bookings', bookingsRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Server error' });
});

await checkDatabaseConnection();

setInterval(() => {
  runProcessScheduled().catch((e) => console.warn(e.message));
  runProcessReminders().catch((e) => console.warn(e.message));
  processScheduledAnnouncements().catch((e) => console.warn(e.message));
}, 15_000);

app.listen(PORT, () => {
  console.log(`TSSC API listening on ${PORT}`);
});
