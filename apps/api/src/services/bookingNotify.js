import { randomUUID } from 'node:crypto';
import { sendTextMessage, sendOtp, formatPhoneNumber } from './wasenderWhatsAppService.js';
import { getPool } from '../db/pool.js';

async function logWa(phone, type, content, status, error) {
  const pool = getPool();
  await pool.query(
    `INSERT INTO whatsapp_logs (id, phone_number, message_type, message_content, status, error_message)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [randomUUID(), phone, type, content, status, error || null]
  );
}

export async function sendBookingOtp(phone, otp) {
  const result = await sendOtp(phone, otp, 'Confirm your booking of The Prophetic Minstrel.');
  await logWa(phone, 'booking_otp', `OTP ${otp}`, result.success ? 'sent' : 'failed', result.error);
  return result;
}

function adminPhones() {
  const extra = process.env.SEED_ADMIN_PHONE || '+237675321739';
  return extra;
}

export async function notifyBookingSubmitted(booking) {
  const appUrl = String(process.env.APP_URL || 'https://tssc.cloud').replace(/\/$/, '');
  const reviewUrl = `${appUrl}/booking/review/${booking.review_token}`;
  const pool = getPool();
  const [[settings]] = await pool.query('SELECT admin_phones FROM campaign_settings LIMIT 1');
  const phones = String(`${settings?.admin_phones || ''},${adminPhones()}`)
    .split(/[,;]+/)
    .map((p) => formatPhoneNumber(p.trim()))
    .filter(Boolean);
  const unique = [...new Set(phones)];
  const msg =
    `*New booking request*\n\n` +
    `${booking.holder_name || 'Guest'} (${booking.phone}) wants to book *The Prophetic Minstrel*.\n` +
    `Event: *${booking.event_name}*\n` +
    `When: *${booking.event_date}* at *${String(booking.event_time).slice(0, 5)}*\n` +
    `${booking.description ? `Note: ${booking.description}\n` : ''}` +
    `\nApprove or reject:\n${reviewUrl}`;

  for (const phone of unique) {
    const result = await sendTextMessage(phone, msg, 'booking_admin');
    await logWa(phone, 'booking_admin', msg, result.success ? 'sent' : 'failed', result.error);
  }
}

export async function notifyBookingDecision(booking) {
  const phone = formatPhoneNumber(booking.phone);
  if (!phone) return;
  const approved = booking.status === 'approved';
  const msg = approved
    ? `Your booking of *The Prophetic Minstrel* for *${booking.event_name}* on *${booking.event_date}* was *approved*.\n\n_TSSC_`
    : `Your booking of *The Prophetic Minstrel* for *${booking.event_name}* on *${booking.event_date}* was *not approved*.\nReason: ${booking.reject_reason || 'Not specified'}\n\n_TSSC_`;
  const result = await sendTextMessage(phone, msg, 'booking_decision');
  await logWa(phone, 'booking_decision', msg, result.success ? 'sent' : 'failed', result.error);
}
