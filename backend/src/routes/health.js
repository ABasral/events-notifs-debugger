/**
 * Health check routes
 */

import { Router } from 'express';
import { checkPostgresHealth, checkRedisHealth } from '../lib/index.js';

const router = Router();

/**
 * GET /health
 * Simple health check - returns 200 if the server is running
 */
router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /health/detailed
 * Detailed health check - includes Postgres and Redis status
 */
router.get('/detailed', async (req, res) => {
  const [postgresHealth, redisHealth] = await Promise.all([
    checkPostgresHealth(),
    checkRedisHealth(),
  ]);

  const allHealthy = postgresHealth.ok && redisHealth.ok;

  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    services: {
      postgres: {
        status: postgresHealth.ok ? 'ok' : 'error',
        latencyMs: postgresHealth.latencyMs,
        ...(postgresHealth.error && { error: postgresHealth.error }),
      },
      redis: {
        status: redisHealth.ok ? 'ok' : 'error',
        latencyMs: redisHealth.latencyMs,
        ...(redisHealth.error && { error: redisHealth.error }),
      },
    },
  });
});

export default router;
