import mysql from 'mysql2/promise';

let pool;

const BLOCKED_DB_MARKERS = [
  'manukeza',
  'beyondworld',
  'beyondtech',
  'beyond_tech',
  'u152889834',
];

export function assertOwnDatabase() {
  const name = String(process.env.DB_NAME || '').trim();
  const user = String(process.env.DB_USER || '').trim();
  if (!name) {
    throw new Error('DB_NAME is required. TSSC will not start without its own database.');
  }
  const hay = `${name} ${user}`.toLowerCase();
  if (BLOCKED_DB_MARKERS.some((marker) => hay.includes(marker))) {
    throw new Error('Refusing to start: TSSC must not share a database with Manukeza or Beyond Tech.');
  }
}

export function getPool() {
  if (!pool) {
    assertOwnDatabase();
    pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      enableKeepAlive: true,
      multipleStatements: false,
      timezone: '+01:00',
    });
  }
  return pool;
}

export async function checkDatabaseConnection() {
  assertOwnDatabase();
  const connection = await getPool().getConnection();
  try {
    await connection.ping();
    const [rows] = await connection.query('SELECT DATABASE() AS db');
    const actual = rows[0]?.db;
    if (!actual || actual !== process.env.DB_NAME) {
      throw new Error(`Connected to ${actual || '(none)'}, expected ${process.env.DB_NAME}`);
    }
    console.log('[MySQL] Connection OK:', actual);
  } finally {
    connection.release();
  }
}
