/**
 * Redis client
 */

import Redis from 'ioredis';
import config from '../config/index.js';

const redis = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  maxRetriesPerRequest: 3,
  retryDelayOnFailover: 100,
  lazyConnect: true,
});

redis.on('error', (err) => {
  console.error('Redis connection error:', err.message);
});

redis.on('connect', () => {
  console.log('Redis connected');
});

/**
 * Check if Redis is reachable
 * @returns {Promise<{ok: boolean, latencyMs: number, error?: string}>}
 */
export async function checkHealth() {
  const start = Date.now();
  try {
    const pong = await redis.ping();
    return {
      ok: pong === 'PONG',
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
 * Connect to Redis
 */
export async function connect() {
  await redis.connect();
}

/**
 * Gracefully shutdown Redis
 */
export async function shutdown() {
  await redis.quit();
  console.log('Redis connection closed');
}

export default redis;
