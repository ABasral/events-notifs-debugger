import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';

import { config } from './config/index.js';
import { closeDatabasePool } from './config/database.js';
import { apiRouter } from './api/index.js';

async function main() {
  console.log('Starting Event & Notification Debugging Console API...');
  
  // Create Express app
  const app = express();
  
  // Middleware
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors());
  app.use(compression());
  app.use(express.json());
  app.use(morgan('dev'));
  
  // Mount API routes
  app.use('/api', apiRouter);
  
  // Root endpoint
  app.get('/', (req, res) => {
    res.json({
      name: 'Event & Notification Debugging Console',
      api: '/api',
      health: '/api/health',
    });
  });
  
  // Error handling
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
      error: 'Internal server error',
      message: config.env === 'development' ? err.message : undefined,
    });
  });
  
  // Graceful shutdown
  const shutdown = async () => {
    console.log('\nShutting down...');
    await closeDatabasePool();
    console.log('Server stopped');
    process.exit(0);
  };
  
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  
  // Start server
  app.listen(config.api.port, config.api.host, () => {
    console.log(`API server running at http://${config.api.host}:${config.api.port}`);
  });
}

main().catch((error) => {
  console.error('Startup error:', error);
  process.exit(1);
});
