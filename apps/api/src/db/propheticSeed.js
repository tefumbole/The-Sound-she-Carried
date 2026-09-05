import { randomUUID } from 'node:crypto';
import { LIBRARY } from './propheticLibraryData.js';

export function propheticLibrary() {
  return LIBRARY;
}

export async function seedPropheticMessages(pool) {
  const [deactivated] = await pool.query(
    `UPDATE prophetic_messages
     SET active = 0, updated_at = NOW()
     WHERE message_family IS NULL OR message_family = ''`
  );
  if (deactivated.affectedRows) {
    console.log('Deactivated old prophetic messages:', deactivated.affectedRows);
  }

  let inserted = 0;
  for (const row of LIBRARY) {
    const [dup] = await pool.query(
      'SELECT id FROM prophetic_messages WHERE day_of_week = ? AND scripture_reference = ? AND message = ? LIMIT 1',
      [row.day_of_week, row.scripture_reference, row.message]
    );
    if (dup[0]) continue;
    await pool.query(
      `INSERT INTO prophetic_messages
        (id, title, message, scripture_reference, scripture_text, declaration, theme, message_family, day_of_week, active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        randomUUID(),
        row.title,
        row.message,
        row.scripture_reference,
        row.scripture_text,
        row.declaration,
        row.theme,
        row.message_family || row.theme,
        row.day_of_week,
      ]
    );
    inserted += 1;
  }

  const [[{ n: active }]] = await pool.query(
    'SELECT COUNT(*) AS n FROM prophetic_messages WHERE active = 1'
  );
  console.log('Seeded prophetic messages:', inserted, 'active:', active);
  return active;
}
