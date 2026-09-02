import { randomUUID } from 'node:crypto';
import { sendTextMessage, formatPhoneNumber } from './wasenderWhatsAppService.js';
import { getCampaignSnapshot } from './campaignTotals.js';
import { formatXaf } from '../utils/phone.js';
import { getPool } from '../db/pool.js';

async function logWa(phone, type, content, status, error) {
  const pool = getPool();
  await pool.query(
    `INSERT INTO whatsapp_logs (id, phone_number, message_type, message_content, status, error_message)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [randomUUID(), phone, type, content, status, error || null]
  );
}

export async function notifyDonationSuccess(donation) {
  const snap = await getCampaignSnapshot();
  if (!snap.settings) return;

  const name = donation.holder_name || 'Friend';
  const methodLabel = donation.method === 'card' ? 'Visa' : donation.method === 'om' ? 'Orange Money' : 'MoMo';

  if (Number(snap.settings.notify_donor) === 1 && donation.whatsapp_phone) {
    const donorMsg =
      `Thank you, *${name}*, for contributing to *The Sound She Carries*.\n\n` +
      `Your gift: *${formatXaf(donation.amount)}*\n` +
      `Raised so far: *${formatXaf(snap.raised)}* of *${formatXaf(snap.target)}*\n` +
      `Still pending: *${formatXaf(snap.pending)}*\n\n` +
      `Live Recording · 27 Sept · 5 PM · Chariot Banquet Hall, Mile 18 Buea\n` +
      `_TSSC · The Prophetic Minstrel_`;
    const result = await sendTextMessage(donation.whatsapp_phone, donorMsg, 'donation_donor');
    await logWa(donation.whatsapp_phone, 'donation_donor', donorMsg, result.success ? 'sent' : 'failed', result.error);
  }

  if (Number(snap.settings.notify_admin) === 1) {
    const phones = String(snap.settings.admin_phones || '')
      .split(/[,;]+/)
      .map((p) => formatPhoneNumber(p.trim()))
      .filter(Boolean);
    const adminMsg =
      `*${name}* has donated *${formatXaf(donation.amount)}* via ${methodLabel} ` +
      `to *The Sound She Carries*.\n\nRaised: ${formatXaf(snap.raised)} / ${formatXaf(snap.target)} (${snap.percent}%)`;
    for (const phone of phones) {
      const result = await sendTextMessage(phone, adminMsg, 'donation_admin');
      await logWa(phone, 'donation_admin', adminMsg, result.success ? 'sent' : 'failed', result.error);
    }
  }
}
