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
  async function addColumn(table, ddl, label) {
    try {
      await pool.query(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
      console.log('Altered:', label);
    } catch {
      /* already exists */
    }
  }
  await addColumn('donations', "kind VARCHAR(40) NOT NULL DEFAULT 'gift'", 'donations.kind');
  await addColumn('donations', 'contributor_id CHAR(36) DEFAULT NULL', 'donations.contributor_id');
  await addColumn('donations', 'email VARCHAR(255) DEFAULT NULL', 'donations.email');
  await addColumn('donations', 'reference VARCHAR(40) DEFAULT NULL', 'donations.reference');
  await addColumn('donations', 'first_name VARCHAR(120) DEFAULT NULL', 'donations.first_name');
  await addColumn('prophetic_messages', 'message_family VARCHAR(80) DEFAULT NULL', 'prophetic_messages.message_family');
  console.log('Migration complete.');
  await getPool().end();
} catch (error) {
  console.error('Migration failed:', error.message);
  process.exitCode = 1;
  try { await getPool().end(); } catch { /* ignore */ }
}
