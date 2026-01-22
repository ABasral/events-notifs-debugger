import { Router, Request, Response } from 'express';
import * as db from '../services/db.js';

export const usersRouter = Router();

/**
 * GET /api/users
 * List all users
 */
usersRouter.get('/', async (req: Request, res: Response) => {
  try {
    const users = await db.getAllUsers();
    res.json({ data: users });
  } catch (error) {
    console.error('User list error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/users/:id
 * Get user details
 */
usersRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const user = await db.getUserById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Get followers and following counts
    const followers = await db.getFollowers(req.params.id);
    const following = await db.getFollowing(req.params.id);
    
    res.json({
      ...user,
      followers_count: followers.length,
      following_count: following.length,
      followers: followers.map(f => ({ id: f.id, username: f.username })),
      following: following.map(f => ({ id: f.id, username: f.username })),
    });
  } catch (error) {
    console.error('User get error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/users/:id/notifications
 * Get notifications for a user
 */
usersRouter.get('/:id/notifications', async (req: Request, res: Response) => {
  try {
    const notifications = await db.getNotificationsByUserId(req.params.id);
    res.json({ data: notifications });
  } catch (error) {
    console.error('User notifications error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/users/:id/notifications/:notificationId/read
 * Mark a notification as read
 */
usersRouter.post('/:id/notifications/:notificationId/read', async (req: Request, res: Response) => {
  try {
    const notification = await db.markNotificationRead(req.params.notificationId);
    
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    res.json(notification);
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});
