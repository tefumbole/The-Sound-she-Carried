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

function prettyPhone(input) {
  const e164 = formatPhoneNumber(input) || String(input || '').trim();
  const digits = e164.replace(/\D/g, '');
  if (digits.startsWith('237') && digits.length === 12) {
    return `+237 ${digits.slice(3, 6)} ${digits.slice(6, 9)} ${digits.slice(9)}`;
  }
  return e164 || '—';
}

function donorPhone(donation) {
  return donation.momo_phone || donation.whatsapp_phone || '';
}

function underline(title) {
  return `*${title}*\n━━━━━━━━━━━━━━━━`;
}

export async function notifyDonationSuccess(donation) {
  const snap = await getCampaignSnapshot();
  if (!snap.settings) return;

  const name = donation.holder_name || 'Friend';
  const methodLabel = donation.method === 'card' ? 'Visa' : 'MoMo / OM';
  const kind = donation.kind === 'gold_sponsor' ? 'Gold Sponsor' : 'Gift';
  const phoneDisplay = prettyPhone(donorPhone(donation));

  if (Number(snap.settings.notify_donor) === 1 && donation.whatsapp_phone) {
    const donorMsg =
      `${underline('THANK YOU / MERCI')}\n\n` +
      `🙏 ${name}\n` +
      `💵 ${formatXaf(donation.amount)}\n` +
      `✨ The Sound She Carries\n\n` +
      `📊 ${formatXaf(snap.raised)} / ${formatXaf(snap.target)} (${snap.percent}%)`;
    const result = await sendTextMessage(donation.whatsapp_phone, donorMsg, 'donation_donor');
    await logWa(donation.whatsapp_phone, 'donation_donor', donorMsg, result.success ? 'sent' : 'failed', result.error);
  }

  if (Number(snap.settings.notify_admin) === 1) {
    const phones = String(snap.settings.admin_phones || '')
      .split(/[,;]+/)
      .map((p) => formatPhoneNumber(p.trim()))
      .filter((p) => p && !String(p).replace(/\D/g, '').endsWith('670706435'));
    const adminMsg =
      `${underline('NEW DONATION / NOUVEAU DON')}\n\n` +
      `👤 ${name}\n` +
      `📞 ${phoneDisplay}\n` +
      `💵 ${formatXaf(donation.amount)} · ${methodLabel}\n` +
      `🏷️ ${kind}\n\n` +
      `📊 ${formatXaf(snap.raised)} / ${formatXaf(snap.target)} (${snap.percent}%)`;
    for (const phone of phones) {
      const result = await sendTextMessage(phone, adminMsg, 'donation_admin');
      await logWa(phone, 'donation_admin', adminMsg, result.success ? 'sent' : 'failed', result.error);
    }
  }
}
