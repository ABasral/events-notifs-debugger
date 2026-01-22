import { Router, Request, Response } from 'express';
import { checkDatabaseHealth } from '../config/database.js';

export const healthRouter = Router();

/**
 * GET /api/health
 * Basic health check
 */
healthRouter.get('/', async (req: Request, res: Response) => {
  try {
    const dbHealthy = await checkDatabaseHealth();
    
    res.status(dbHealthy ? 200 : 503).json({
      status: dbHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        database: dbHealthy ? 'up' : 'down',
      },
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/health/detailed
 * Detailed health check with metrics
 */
healthRouter.get('/detailed', async (req: Request, res: Response) => {
  try {
    const dbHealthy = await checkDatabaseHealth();
    
    res.json({
      status: dbHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        database: {
          status: dbHealthy ? 'up' : 'down',
        },
      },
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});
