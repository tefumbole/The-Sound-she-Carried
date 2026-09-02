import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { sendTextMessage, isWasenderConfigured } from '../services/wasenderWhatsAppService.js';

const router = Router();

router.get('/status', requireAuth, (_req, res) => {
  res.json({ configured: isWasenderConfigured() });
});

router.post('/test', requireAuth, async (req, res) => {
  const result = await sendTextMessage(req.body.to, req.body.text || 'TSSC WhatsApp test', 'test');
  res.json(result);
});

export default router;
