import { createHmac } from 'node:crypto';
import { cameroonLocalDigits, toE164CM } from '../utils/phone.js';

function baseUrl() {
  return String(process.env.CAMPAY_BASE_URL || 'https://www.campay.net/api').replace(/\/$/, '');
}

function simulate() {
  return String(process.env.PAYMENT_SIMULATE || '').toLowerCase() === 'true';
}

async function request(method, url, payload, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Token ${token}`;
  const options = { method, headers };
  if (payload != null) options.body = JSON.stringify(payload);

  const res = await fetch(url, options);
  const text = await res.text();
  let body = {};
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text };
  }
  return { http: res.status, body };
}

export async function campayToken() {
  if (process.env.CAMPAY_TOKEN) return process.env.CAMPAY_TOKEN;
  const username = process.env.CAMPAY_USERNAME || process.env.CAMPAY_APP_USERNAME;
  const password = process.env.CAMPAY_PASSWORD || process.env.CAMPAY_APP_PASSWORD;
  if (!username || !password) return '';

  const { body } = await request('POST', `${baseUrl()}/token/`, { username, password });
  return body?.token || '';
}

export async function getHolderName(phone) {
  if (simulate()) return 'Test Donor';
  const token = await campayToken();
  if (!token) return null;
  const digits = cameroonLocalDigits(phone);
  if (digits.length < 8) return null;
  const { body } = await request(
    'GET',
    `${baseUrl()}/holder_info/?phone_number=${encodeURIComponent(digits)}`,
    null,
    token
  );
  const name = String(body?.full_name || '').trim();
  return name || null;
}

export async function collectPayment({ amount, phone, description, externalReference }) {
  if (simulate()) {
    return {
      success: true,
      status: 'PENDING',
      reference: `SIM-${externalReference}`,
      message: 'Simulation: approve on this page.',
    };
  }

  const token = await campayToken();
  if (!token) {
    return { success: false, message: 'Mobile Money is temporarily unavailable.' };
  }

  const from = cameroonLocalDigits(phone);
  const { http, body } = await request(
    'POST',
    `${baseUrl()}/collect/`,
    {
      amount: String(Math.round(Number(amount))),
      from,
      description: description || 'The Sound She Carries donation',
      external_reference: String(externalReference),
      currency: 'XAF',
    },
    token
  );

  if (body?.reference) {
    return {
      success: true,
      status: 'PENDING',
      reference: body.reference,
      message: 'Payment request sent. Approve the transaction on your phone.',
    };
  }

  return {
    success: false,
    message: body?.message || 'We could not start the Mobile Money payment.',
    http,
    raw: body,
  };
}

export async function getPaymentLink({ amount, phone, externalReference, redirectUrl, failureUrl }) {
  if (simulate()) {
    return { success: true, link: `${redirectUrl}?simulated=1` };
  }
  const token = await campayToken();
  if (!token) return { success: false, message: 'Card payment is temporarily unavailable.' };

  const { body } = await request(
    'POST',
    `${baseUrl()}/get_payment_link/`,
    {
      amount: String(Math.round(Number(amount))),
      from: cameroonLocalDigits(phone) || '670706435',
      currency: 'XAF',
      external_reference: String(externalReference),
      redirect_url: redirectUrl,
      failure_redirect_url: failureUrl || redirectUrl,
      payment_options: 'CARD',
    },
    token
  );

  if (body?.link) return { success: true, link: body.link, reference: body.reference || null };
  return { success: false, message: body?.message || 'Could not create card checkout.' };
}

export async function getTransactionStatus(reference) {
  if (simulate() && String(reference).startsWith('SIM-')) {
    return { status: 'SUCCESSFUL', providerStatus: 'SUCCESSFUL' };
  }
  const token = await campayToken();
  if (!token) return { status: 'PENDING', providerStatus: 'UNKNOWN' };

  const { body } = await request(
    'GET',
    `${baseUrl()}/transaction/${encodeURIComponent(reference)}/`,
    null,
    token
  );
  const providerStatus = String(body?.status || 'PENDING').toUpperCase();
  let status = 'PENDING';
  if (['SUCCESSFUL', 'SUCCESS', 'COMPLETED'].includes(providerStatus)) status = 'SUCCESSFUL';
  if (['FAILED', 'REJECTED', 'EXPIRED'].includes(providerStatus)) status = 'FAILED';
  return { status, providerStatus, raw: body };
}

function base64UrlDecode(data) {
  let s = String(data || '').replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  return Buffer.from(s, 'base64').toString('utf8');
}

export function validateCampayJwt(payload, headers = {}) {
  const secret = process.env.CAMPAY_WEBHOOK_SECRET || '';
  if (!secret) return true;
  const provided = headers['x-campay-secret'] || payload?.secret;
  if (provided) return secret === String(provided);

  const token = payload?.signature || headers.signature;
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const expected = createHmac('sha256', secret)
    .update(`${parts[0]}.${parts[1]}`)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  if (expected !== parts[2]) return false;
  try {
    const json = JSON.parse(base64UrlDecode(parts[1]));
    if (json?.exp && Number(json.exp) < Date.now() / 1000 - 60) return false;
  } catch {
    return false;
  }
  return true;
}

export { toE164CM };
