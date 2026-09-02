import mysql from 'mysql2/promise';

let pool;

export function getPool() {
  if (!pool) {
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
    });
  }
  return pool;
}

export async function checkDatabaseConnection() {
  const connection = await getPool().getConnection();
  try {
    await connection.ping();
    console.log('[MySQL] Connection OK:', process.env.DB_NAME);
  } finally {
    connection.release();
  }
}
