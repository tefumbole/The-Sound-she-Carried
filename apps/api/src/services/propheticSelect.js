import { randomUUID } from 'node:crypto';
import { cameroonLocalDigits, toE164CM, toE164Any } from '../utils/phone.js';

export const DAY_THEMES = {
  monday: 'new_beginnings',
  tuesday: 'strength',
  wednesday: 'wisdom',
  thursday: 'open_doors',
  friday: 'fruitfulness',
  saturday: 'family',
  sunday: 'thanksgiving',
};

export const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

export function weekdayInDouala(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Africa/Douala',
    weekday: 'long',
  }).formatToParts(date);
  return String(parts.find((p) => p.type === 'weekday')?.value || 'Sunday').toLowerCase();
}

export function longDateInDouala(date = new Date()) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Douala',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export function firstNameFrom(fullName) {
  const raw = String(fullName || '').trim();
  if (!raw) return 'Friend';
  const first = raw.split(/\s+/)[0].replace(/[^\p{L}'-]/gu, '');
  if (!first) return 'Friend';
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
}

export function personalize(template, firstName) {
  const name = firstName || 'Friend';
  return String(template || '').replaceAll('{{firstName}}', name);
}

export function thankYouLine(count) {
  if (count <= 1) return 'Thank you for becoming part of this vision.';
  if (count === 2) return 'Thank you for standing with this vision again.';
  return 'Your continued partnership with this vision is deeply appreciated.';
}

export function donationReference(id) {
  const compact = String(id || '').replace(/-/g, '').slice(0, 8).toUpperCase();
  return `TSSC-${compact || randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()}`;
}

export function normalizeEmail(input) {
  const email = String(input || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return '';
  return email;
}

export function normalizeContributorPhone(input) {
  const e164 = toE164CM(input) || toE164Any(input);
  const digits = cameroonLocalDigits(input) || String(e164 || '').replace(/\D/g, '');
  return {
    phoneE164: e164 || null,
    phoneDigits: digits || null,
  };
}

export async function findOrCreateContributor(conn, { phone, email, fullName }) {
  const { phoneE164, phoneDigits } = normalizeContributorPhone(phone);
  const cleanEmail = normalizeEmail(email);
  const firstName = firstNameFrom(fullName);
  const name = String(fullName || '').trim() || firstName;

  let row = null;
  if (phoneDigits) {
    const [byPhone] = await conn.query('SELECT * FROM contributors WHERE phone_digits = ? LIMIT 1', [phoneDigits]);
    row = byPhone[0] || null;
  }
  if (!row && cleanEmail) {
    const [byEmail] = await conn.query('SELECT * FROM contributors WHERE email = ? LIMIT 1', [cleanEmail]);
    row = byEmail[0] || null;
  }

  if (row) {
    const next = {
      first_name: row.first_name || firstName,
      full_name: name || row.full_name,
      phone_e164: row.phone_e164 || phoneE164,
      phone_digits: row.phone_digits || phoneDigits,
      email: row.email || cleanEmail || null,
    };
    await conn.query(
      `UPDATE contributors
       SET first_name = ?, full_name = ?, phone_e164 = ?, phone_digits = ?, email = ?, updated_at = NOW()
       WHERE id = ?`,
      [next.first_name, next.full_name, next.phone_e164, next.phone_digits, next.email, row.id]
    );
    return { ...row, ...next };
  }

  const id = randomUUID();
  await conn.query(
    `INSERT INTO contributors (id, first_name, full_name, phone_e164, phone_digits, email)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, firstName, name, phoneE164, phoneDigits, cleanEmail || null]
  );
  return {
    id,
    first_name: firstName,
    full_name: name,
    phone_e164: phoneE164,
    phone_digits: phoneDigits,
    email: cleanEmail || null,
  };
}

export async function usedMessageIds(conn, contributorId) {
  const [rows] = await conn.query(
    'SELECT prophetic_message_id FROM contributor_prophetic_messages WHERE contributor_id = ?',
    [contributorId]
  );
  return rows.map((r) => r.prophetic_message_id);
}

export async function recentMessageFamilies(conn, contributorId, limit = 4) {
  const [rows] = await conn.query(
    `SELECT pm.message_family, pm.theme
     FROM contributor_prophetic_messages cpm
     JOIN prophetic_messages pm ON pm.id = cpm.prophetic_message_id
     WHERE cpm.contributor_id = ?
     ORDER BY cpm.sent_at DESC
     LIMIT ?`,
    [contributorId, limit]
  );
  return rows
    .map((r) => r.message_family || r.theme)
    .filter(Boolean);
}

export async function pickUnusedMessage(conn, { usedIds, day, recentFamilies = [] }) {
  const used = usedIds.length ? usedIds : ['00000000-0000-0000-0000-000000000000'];
  const placeholders = used.map(() => '?').join(',');
  const families = [...new Set(recentFamilies.filter(Boolean))];
  const familySql = families.length
    ? `AND COALESCE(message_family, theme) NOT IN (${families.map(() => '?').join(',')})`
    : '';

  const tryPick = async (extraSql, extraParams) => {
    const [rows] = await conn.query(
      `SELECT * FROM prophetic_messages
       WHERE active = 1 ${extraSql}
         AND id NOT IN (${placeholders})
       ORDER BY RAND()
       LIMIT 1`,
      [...extraParams, ...used]
    );
    return rows[0] || null;
  };

  return (
    (families.length ? await tryPick(`AND day_of_week = ? ${familySql}`, [day, ...families]) : null)
    || (await tryPick('AND day_of_week = ?', [day]))
    || (families.length ? await tryPick(familySql, families) : null)
    || (await tryPick('', []))
  );
}

export async function loadAssignment(conn, contributionId) {
  const [rows] = await conn.query(
    `SELECT cpm.*, pm.title, pm.message, pm.scripture_reference, pm.scripture_text,
            pm.declaration, pm.theme, pm.day_of_week
     FROM contributor_prophetic_messages cpm
     JOIN prophetic_messages pm ON pm.id = cpm.prophetic_message_id
     WHERE cpm.contribution_id = ?
     LIMIT 1`,
    [contributionId]
  );
  return rows[0] || null;
}

export function buildConfirmation(donation, assignment, extras = {}) {
  const firstName = donation.first_name || extras.firstName || firstNameFrom(donation.holder_name);
  const day = extras.day || weekdayInDouala();
  const dayLabel = day.charAt(0).toUpperCase() + day.slice(1);
  const count = extras.count || 1;
  return {
    id: donation.id,
    status: donation.status,
    amount: donation.amount,
    method: donation.method,
    reference: donation.reference || donationReference(donation.id),
    first_name: firstName,
    date: longDateInDouala(),
    day,
    day_label: dayLabel,
    thank_you: thankYouLine(count),
    title: assignment?.title || 'Your Prophetic Word for Today',
    message: assignment ? personalize(assignment.message, firstName) : '',
    scripture_reference: assignment?.scripture_reference || '',
    scripture_text: assignment?.scripture_text || '',
    declaration: assignment ? personalize(assignment.declaration, firstName) : '',
    theme: assignment?.theme || '',
    disclaimer: "This scripture-based encouragement is shared as part of our ministry's appreciation to partners.",
  };
}

export async function assignPropheticWord(conn, donation) {
  const existing = await loadAssignment(conn, donation.id);
  const day = weekdayInDouala();
  const phone = donation.whatsapp_phone || donation.momo_phone;
  const contributor = donation.contributor_id
    ? (await conn.query('SELECT * FROM contributors WHERE id = ?', [donation.contributor_id]))[0][0]
      || await findOrCreateContributor(conn, { phone, email: donation.email, fullName: donation.holder_name })
    : await findOrCreateContributor(conn, { phone, email: donation.email, fullName: donation.holder_name });

  const firstName = donation.first_name || contributor.first_name || firstNameFrom(donation.holder_name);
  const reference = donation.reference || donationReference(donation.id);
  await conn.query(
    `UPDATE donations
     SET contributor_id = ?, first_name = ?, reference = ?, email = COALESCE(email, ?)
     WHERE id = ?`,
    [contributor.id, firstName, reference, normalizeEmail(donation.email) || null, donation.id]
  );
  donation.contributor_id = contributor.id;
  donation.first_name = firstName;
  donation.reference = reference;

  const [[{ count }]] = await conn.query(
    `SELECT COUNT(*) AS count FROM donations
     WHERE contributor_id = ? AND status = 'successful'`,
    [contributor.id]
  );

  if (existing) {
    return buildConfirmation({ ...donation, status: 'successful' }, existing, { day, firstName, count });
  }

  const usedIds = await usedMessageIds(conn, contributor.id);
  const recentFamilies = await recentMessageFamilies(conn, contributor.id, 4);
  const picked = await pickUnusedMessage(conn, { usedIds, day, recentFamilies });
  if (picked) {
    try {
      await conn.query(
        `INSERT INTO contributor_prophetic_messages
          (id, contributor_id, contribution_id, prophetic_message_id, sent_at)
         VALUES (?, ?, ?, ?, NOW())`,
        [randomUUID(), contributor.id, donation.id, picked.id]
      );
    } catch (err) {
      if (!/duplicate/i.test(err.message)) throw err;
    }
  }
  const assignment = (await loadAssignment(conn, donation.id)) || picked;
  return buildConfirmation({ ...donation, status: 'successful' }, assignment, { day, firstName, count });
}

export async function getConfirmationPayload(conn, donation) {
  const assignment = await loadAssignment(conn, donation.id);
  let count = 1;
  if (donation.contributor_id) {
    const [[{ count: n }]] = await conn.query(
      `SELECT COUNT(*) AS count FROM donations
       WHERE contributor_id = ? AND status = 'successful'`,
      [donation.contributor_id]
    );
    count = n;
  }
  return buildConfirmation(donation, assignment, { count });
}
