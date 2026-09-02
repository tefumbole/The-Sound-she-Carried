import './../env.js';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { getPool } from './pool.js';

const PERMISSIONS = [
  ['campaign.view', 'View campaign'],
  ['campaign.edit', 'Edit campaign settings'],
  ['donations.view', 'View donations'],
  ['users.view', 'View users'],
  ['users.create', 'Create users'],
  ['users.edit', 'Edit users'],
  ['roles.view', 'View roles'],
  ['roles.edit', 'Edit roles'],
  ['tasks.view', 'View tasks'],
  ['tasks.create', 'Create tasks'],
  ['tasks.edit', 'Edit tasks'],
  ['tasks.delete', 'Delete tasks'],
  ['announcements.view', 'View announcements'],
  ['announcements.compose', 'Compose announcements'],
  ['announcements.send', 'Send announcements'],
  ['letters.view', 'View letters'],
  ['letters.compose', 'Compose letters'],
  ['letters.approve', 'Approve letters'],
  ['letters.sign', 'Sign letters'],
  ['letters.send', 'Send letters'],
  ['menu.campaign', 'Menu campaign'],
  ['menu.users', 'Menu people'],
  ['menu.tasks', 'Menu tasks'],
  ['menu.announcements', 'Menu announcements'],
  ['menu.letters', 'Menu letters'],
];

const ROLE_MAP = {
  super_admin: PERMISSIONS.map(([c]) => c),
  admin: PERMISSIONS.map(([c]) => c),
  editor: [
    'campaign.view', 'donations.view', 'users.view',
    'tasks.view', 'tasks.create', 'tasks.edit',
    'announcements.view', 'announcements.compose',
    'letters.view', 'letters.compose',
    'menu.campaign', 'menu.users', 'menu.tasks', 'menu.announcements', 'menu.letters',
  ],
  approver: ['letters.view', 'letters.approve', 'menu.letters', 'campaign.view', 'menu.campaign'],
  signer: ['letters.view', 'letters.sign', 'menu.letters', 'campaign.view', 'menu.campaign'],
  staff: ['tasks.view', 'menu.tasks', 'campaign.view', 'menu.campaign'],
};

const pool = getPool();

try {
  for (const [code, label] of PERMISSIONS) {
    const [rows] = await pool.query('SELECT id FROM permissions WHERE code = ?', [code]);
    if (!rows[0]) {
      await pool.query('INSERT INTO permissions (id, code, label) VALUES (?, ?, ?)', [randomUUID(), code, label]);
    }
  }

  for (const [name, codes] of Object.entries(ROLE_MAP)) {
    let [roles] = await pool.query('SELECT id FROM roles WHERE name = ?', [name]);
    let roleId = roles[0]?.id;
    if (!roleId) {
      roleId = randomUUID();
      await pool.query(
        'INSERT INTO roles (id, name, description, is_default) VALUES (?, ?, ?, ?)',
        [roleId, name, `${name} role`, name === 'staff' ? 1 : 0]
      );
    }
    await pool.query('DELETE FROM role_permissions WHERE role_id = ?', [roleId]);
    for (const code of codes) {
      await pool.query(
        'INSERT INTO role_permissions (id, role_id, permission_code) VALUES (?, ?, ?)',
        [randomUUID(), roleId, code]
      );
    }
    console.log('Seeded role:', name);
  }

  const email = process.env.SEED_ADMIN_EMAIL || 'admin@tssc.cloud';
  const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
  if (!existing[0]) {
    const hash = await bcrypt.hash(process.env.SEED_ADMIN_PASSWORD || 'ChangeMe123!', 10);
    await pool.query(
      `INSERT INTO users (id, email, password_hash, name, phone, whatsapp_phone, role, status)
       VALUES (?, ?, ?, ?, ?, ?, 'super_admin', 'active')`,
      [
        randomUUID(),
        email,
        hash,
        process.env.SEED_ADMIN_NAME || 'TSSC Admin',
        process.env.SEED_ADMIN_PHONE || '+237697470711',
        process.env.SEED_ADMIN_PHONE || '+237697470711',
      ]
    );
    console.log('Seeded admin:', email);
  }

  const [campaign] = await pool.query('SELECT id FROM campaign_settings LIMIT 1');
  if (!campaign[0]) {
    await pool.query(
      `INSERT INTO campaign_settings
        (id, title, artist, target_amount, manual_raised, concert_at, venue, notify_donor, notify_admin, admin_phones)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1, ?)`,
      [
        randomUUID(),
        'The Sound She Carries',
        'Lian Ministrel',
        5000000,
        3000000,
        '2026-09-27 17:00:00',
        'Chariot Banquet Hall, Mile 18 Buea',
        '+237697470711,+237670706435',
      ]
    );
    console.log('Seeded campaign settings');
  }

  const [ann] = await pool.query('SELECT id FROM announcement_settings LIMIT 1');
  if (!ann[0]) {
    await pool.query(
      `INSERT INTO announcement_settings (id, company_name, default_header, serial_prefix, next_serial, timezone)
       VALUES (?, ?, ?, ?, 1, ?)`,
      [randomUUID(), 'The Sound She Carries', 'TSSC Presents', 'TSSC/ANN', 'Africa/Douala']
    );
  }

  const [ltr] = await pool.query('SELECT id FROM letter_settings LIMIT 1');
  if (!ltr[0]) {
    await pool.query(
      'INSERT INTO letter_settings (id, serial_prefix, next_serial) VALUES (?, ?, 1)',
      [randomUUID(), 'TSSC/LTR']
    );
  }

  const [cats] = await pool.query('SELECT id FROM task_categories LIMIT 1');
  if (!cats[0]) {
    for (const name of ['Concert', 'Sponsorship', 'Production', 'General']) {
      await pool.query('INSERT INTO task_categories (id, name) VALUES (?, ?)', [randomUUID(), name]);
    }
  }

  const [acats] = await pool.query('SELECT id FROM announcement_categories LIMIT 1');
  if (!acats[0]) {
    for (const name of ['General', 'Sponsors', 'Team']) {
      await pool.query('INSERT INTO announcement_categories (id, name) VALUES (?, ?)', [randomUUID(), name]);
    }
  }

  const [lcats] = await pool.query('SELECT id FROM letter_categories LIMIT 1');
  if (!lcats[0]) {
    for (const name of ['Official', 'Invitation', 'Thank you']) {
      await pool.query('INSERT INTO letter_categories (id, name) VALUES (?, ?)', [randomUUID(), name]);
    }
  }

  const [tpl] = await pool.query('SELECT id FROM task_message_templates LIMIT 1');
  if (!tpl[0]) {
    await pool.query(
      'INSERT INTO task_message_templates (id, name, body) VALUES (?, ?, ?)',
      [
        randomUUID(),
        'Default assignment',
        'Hello {name},\n\nYou have been assigned: *{subject}*\nPriority: {priority}\nDeadline: {deadline}\n\n{description}\n\nOpen: {login_link}\n\n_The Sound She Carries_',
      ]
    );
  }

  console.log('Seed complete.');
} catch (error) {
  console.error('Seed failed:', error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
