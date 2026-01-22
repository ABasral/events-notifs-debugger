/**
 * Event & Notification Debugging Console - Backend
 * Entry point
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import config from './config/index.js';
import { registerRoutes } from './routes/index.js';
import { errorHandler, notFoundHandler, requestLogger } from './middleware/index.js';
import { connectRedis, shutdownPostgres, shutdownRedis } from './lib/index.js';

// Load environment variables
dotenv.config();

const app = express();

// Core middleware
app.use(cors({ origin: config.cors.origin, credentials: true }));
app.use(express.json());
app.use(requestLogger);

// Register routes
registerRoutes(app);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

/**
 * Graceful shutdown handler
 */
async function shutdown(signal) {
  console.log(`\n${signal} received, shutting down gracefully...`);

  try {
    await Promise.all([shutdownPostgres(), shutdownRedis()]);
    console.log('Cleanup complete, exiting.');
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

/**
 * Start the server
 */
async function start() {
  try {
    // Connect to Redis (Postgres pool connects lazily)
    await connectRedis();
    console.log('Redis connected');

    app.listen(config.port, () => {
      console.log(`Server running on port ${config.port} in ${config.env} mode`);
      console.log(`Health check: http://localhost:${config.port}/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
