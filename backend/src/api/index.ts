import { Router } from 'express';
import { eventsRouter } from './events.js';
import { usersRouter } from './users.js';
import { healthRouter } from './health.js';

export const apiRouter = Router();

// Mount all route handlers
apiRouter.use('/events', eventsRouter);
apiRouter.use('/users', usersRouter);
apiRouter.use('/health', healthRouter);

// API info endpoint
apiRouter.get('/', (req, res) => {
  res.json({
    name: 'Event & Notification Debugging Console API',
    version: '1.0.0',
    endpoints: {
      'POST /api/events': 'Create event and run fanout',
      'GET /api/events': 'List all events',
      'GET /api/events/:id': 'Get event by ID',
      'GET /api/events/:id/trace': 'Get fanout trace for event',
      'POST /api/events/:id/replay': 'Replay event fanout',
      'GET /api/users': 'List all users',
      'GET /api/users/:id': 'Get user details',
      'GET /api/users/:id/notifications': 'Get user notifications',
      'GET /api/health': 'Health check',
    },
  });
});
