import { query, withTransaction } from '../config/database.js';
import {
  Event,
  User,
  Follower,
  Notification,
  FanoutLog,
  FanoutStage,
  CreateEventInput,
} from '../models/types.js';

// =============================================================================
// User Operations
// =============================================================================

export async function getAllUsers(): Promise<User[]> {
  const result = await query<User>('SELECT * FROM users ORDER BY username');
  return result.rows;
}

export async function getUserById(id: string): Promise<User | null> {
  const result = await query<User>('SELECT * FROM users WHERE id = $1', [id]);
  return result.rows[0] || null;
}

export async function getUserByUsername(username: string): Promise<User | null> {
  const result = await query<User>('SELECT * FROM users WHERE username = $1', [username]);
  return result.rows[0] || null;
}

// =============================================================================
// Follower Operations
// =============================================================================

export async function getFollowers(userId: string): Promise<User[]> {
  const result = await query<User>(
    `SELECT u.* FROM users u
     JOIN followers f ON f.user_id = u.id
     WHERE f.follows_user_id = $1`,
    [userId]
  );
  return result.rows;
}

export async function getFollowing(userId: string): Promise<User[]> {
  const result = await query<User>(
    `SELECT u.* FROM users u
     JOIN followers f ON f.follows_user_id = u.id
     WHERE f.user_id = $1`,
    [userId]
  );
  return result.rows;
}

// =============================================================================
// Event Operations
// =============================================================================

export async function createEvent(input: CreateEventInput): Promise<Event> {
  const result = await query<Event>(
    `INSERT INTO events (actor_id, type, target_id, metadata)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [input.actor_id, input.type, input.target_id, JSON.stringify(input.metadata || {})]
  );
  return result.rows[0];
}

export async function getEventById(id: string): Promise<Event | null> {
  const result = await query<Event>('SELECT * FROM events WHERE id = $1', [id]);
  return result.rows[0] || null;
}

export async function getAllEvents(): Promise<Event[]> {
  const result = await query<Event>('SELECT * FROM events ORDER BY created_at DESC');
  return result.rows;
}

// =============================================================================
// Fanout Log Operations
// =============================================================================

export async function createFanoutLog(
  eventId: string,
  stage: FanoutStage,
  data: Record<string, any> = {}
): Promise<FanoutLog> {
  const result = await query<FanoutLog>(
    `INSERT INTO fanout_logs (event_id, stage, data)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [eventId, stage, JSON.stringify(data)]
  );
  return result.rows[0];
}

export async function getFanoutLogsByEventId(eventId: string): Promise<FanoutLog[]> {
  const result = await query<FanoutLog>(
    `SELECT * FROM fanout_logs WHERE event_id = $1 ORDER BY created_at ASC`,
    [eventId]
  );
  return result.rows;
}

export async function deleteFanoutLogsByEventId(eventId: string): Promise<number> {
  const result = await query('DELETE FROM fanout_logs WHERE event_id = $1', [eventId]);
  return result.rowCount || 0;
}

// =============================================================================
// Notification Operations
// =============================================================================

export async function createNotification(
  userId: string,
  eventId: string,
  message: string
): Promise<Notification> {
  const result = await query<Notification>(
    `INSERT INTO notifications (user_id, event_id, message)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [userId, eventId, message]
  );
  return result.rows[0];
}

export async function getNotificationsByUserId(userId: string): Promise<Notification[]> {
  const result = await query<Notification>(
    `SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );
  return result.rows;
}

export async function getNotificationsByEventId(eventId: string): Promise<Notification[]> {
  const result = await query<Notification>(
    `SELECT * FROM notifications WHERE event_id = $1 ORDER BY created_at DESC`,
    [eventId]
  );
  return result.rows;
}

export async function deleteNotificationsByEventId(eventId: string): Promise<number> {
  const result = await query('DELETE FROM notifications WHERE event_id = $1', [eventId]);
  return result.rowCount || 0;
}

export async function markNotificationRead(id: string): Promise<Notification | null> {
  const result = await query<Notification>(
    `UPDATE notifications SET is_read = true WHERE id = $1 RETURNING *`,
    [id]
  );
  return result.rows[0] || null;
}

// =============================================================================
// Replay Operations
// =============================================================================

export async function clearEventData(eventId: string): Promise<{ notifications: number; logs: number }> {
  const notifResult = await query('DELETE FROM notifications WHERE event_id = $1', [eventId]);
  const logsResult = await query('DELETE FROM fanout_logs WHERE event_id = $1', [eventId]);
  
  return {
    notifications: notifResult.rowCount || 0,
    logs: logsResult.rowCount || 0,
  };
}
