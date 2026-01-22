/**
 * Route registration
 */

import healthRoutes from './health.js';

export function registerRoutes(app) {
  // Health check routes
  app.use('/health', healthRoutes);

  // Future routes will be registered here:
  // app.use('/api/events', eventRoutes);
  // app.use('/api/notifications', notificationRoutes);
  // app.use('/api/users', userRoutes);
}
