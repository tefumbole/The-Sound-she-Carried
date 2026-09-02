import './../env.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';
import { getPool, assertOwnDatabase } from './pool.js';
import { getCreateStatements } from './schemaStatements.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function ensureDatabase() {
  assertOwnDatabase();
  const dbName = process.env.DB_NAME || 'tssc';
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
  });
  try {
    await conn.query(
      `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
  } catch (error) {
    const denied = /access denied/i.test(error.message);
    if (!denied) throw error;
    const [rows] = await conn.query('SHOW DATABASES LIKE ?', [dbName]);
    if (!rows.length) throw error;
  } finally {
    await conn.end();
  }
}

try {
  await ensureDatabase();
  const pool = getPool();
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  for (const statement of getCreateStatements(sql)) {
    await pool.query(statement);
    const match = statement.match(/CREATE TABLE IF NOT EXISTS (\w+)/i);
    console.log('Created:', match?.[1] || 'table');
  }
  try {
    await pool.query("ALTER TABLE donations ADD COLUMN kind VARCHAR(40) NOT NULL DEFAULT 'gift'");
    console.log('Altered: donations.kind');
  } catch {
    /* already exists */
  }
  console.log('Migration complete.');
  await getPool().end();
} catch (error) {
  console.error('Migration failed:', error.message);
  process.exitCode = 1;
  try { await getPool().end(); } catch { /* ignore */ }
}
