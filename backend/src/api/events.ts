import { Router, Request, Response } from 'express';
import { CreateEventSchema } from '../models/types.js';
import * as db from '../services/db.js';
import { processEvent, replayEvent } from '../services/fanout.js';

export const eventsRouter = Router();

/**
 * POST /api/events
 * Create a new event and run fanout
 */
eventsRouter.post('/', async (req: Request, res: Response) => {
  try {
    const parseResult = CreateEventSchema.safeParse(req.body);
    
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Validation error',
        details: parseResult.error.issues,
      });
    }
    
    // Process the event through fanout
    const result = await processEvent(parseResult.data);
    
    res.status(201).json({
      success: true,
      event: result.event,
      fanout_logs: result.logs,
      notifications_created: result.notifications.length,
    });
  } catch (error) {
    console.error('Event creation error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/events
 * List all events
 */
eventsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const events = await db.getAllEvents();
    res.json({ data: events });
  } catch (error) {
    console.error('Event list error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/events/:id
 * Get a single event by ID
 */
eventsRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const event = await db.getEventById(req.params.id);
    
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    res.json(event);
  } catch (error) {
    console.error('Event get error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/events/:id/trace
 * Get the fanout trace (logs) for an event
 */
eventsRouter.get('/:id/trace', async (req: Request, res: Response) => {
  try {
    const event = await db.getEventById(req.params.id);
    
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    const logs = await db.getFanoutLogsByEventId(req.params.id);
    const notifications = await db.getNotificationsByEventId(req.params.id);
    
    res.json({
      event,
      fanout_logs: logs,
      notifications,
    });
  } catch (error) {
    console.error('Event trace error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/events/:id/replay
 * Delete old notifications and fanout logs, then rerun fanout
 */
eventsRouter.post('/:id/replay', async (req: Request, res: Response) => {
  try {
    const result = await replayEvent(req.params.id);
    
    res.json({
      success: true,
      event: result.event,
      fanout_logs: result.logs,
      notifications_created: result.notifications.length,
      message: 'Event replayed successfully',
    });
  } catch (error) {
    console.error('Event replay error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});
