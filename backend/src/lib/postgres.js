/**
 * PostgreSQL connection pool
 */

import pg from 'pg';
import config from '../config/index.js';

const { Pool } = pg;

const pool = new Pool({
  host: config.postgres.host,
  port: config.postgres.port,
  database: config.postgres.database,
  user: config.postgres.user,
  password: config.postgres.password,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL pool error:', err);
});

/**
 * Check if PostgreSQL is reachable
 * @returns {Promise<{ok: boolean, latencyMs: number, error?: string}>}
 */
export async function checkHealth() {
  const start = Date.now();
  try {
    const result = await pool.query('SELECT 1 as health_check');
    return {
      ok: result.rows[0]?.health_check === 1,
      latencyMs: Date.now() - start,
    };
  } catch (error) {
    return {
      ok: false,
      latencyMs: Date.now() - start,
      error: error.message,
    };
  }
}

/**
 * Gracefully shutdown the pool
 */
export async function shutdown() {
  await pool.end();
  console.log('PostgreSQL pool closed');
}

export default pool;
