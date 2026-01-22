import {
  Event,
  User,
  Notification,
  FanoutLog,
  CreateEventInput,
} from '../models/types.js';
import * as db from './db.js';

// =============================================================================
// Fanout Rules
// =============================================================================

/*
 * Fanout Rules:
 * - like: notify owner of target
 * - comment: notify owner + all followers of target
 * - follow: notify followed user
 */

export interface FanoutResult {
  event: Event;
  logs: FanoutLog[];
  notifications: Notification[];
}

// =============================================================================
// Main Fanout Engine
// =============================================================================

export async function processEvent(input: CreateEventInput): Promise<FanoutResult> {
  const logs: FanoutLog[] = [];
  const notifications: Notification[] = [];
  
  // Step 1: Create the event
  const event = await db.createEvent(input);
  
  // Step 2: Log RECEIVED stage
  logs.push(await db.createFanoutLog(event.id, 'RECEIVED', {
    actor_id: event.actor_id,
    type: event.type,
    target_id: event.target_id,
    metadata: event.metadata,
  }));
  
  // Step 3: Validate event
  const validation = validateEvent(event);
  logs.push(await db.createFanoutLog(event.id, 'VALIDATED', {
    is_valid: validation.valid,
    errors: validation.errors,
  }));
  
  if (!validation.valid) {
    logs.push(await db.createFanoutLog(event.id, 'ERROR', {
      message: 'Event validation failed',
      errors: validation.errors,
    }));
    return { event, logs, notifications };
  }
  
  // Step 4: Resolve recipients based on event type
  const recipients = await resolveRecipients(event);
  logs.push(await db.createFanoutLog(event.id, 'RECIPIENT_RESOLVED', {
    recipient_count: recipients.length,
    recipient_ids: recipients.map(r => r.id),
    recipient_usernames: recipients.map(r => r.username),
    rule: getRecipientRule(event.type),
  }));
  
  // Step 5: Create notifications for each recipient
  const actor = await db.getUserById(event.actor_id);
  const actorName = actor?.username || 'Someone';
  
  for (const recipient of recipients) {
    // Don't notify the actor of their own action
    if (recipient.id === event.actor_id) {
      continue;
    }
    
    const message = generateNotificationMessage(event.type, actorName);
    const notification = await db.createNotification(recipient.id, event.id, message);
    notifications.push(notification);
    
    logs.push(await db.createFanoutLog(event.id, 'NOTIFICATION_CREATED', {
      notification_id: notification.id,
      user_id: recipient.id,
      username: recipient.username,
      message: message,
    }));
  }
  
  // Step 6: Mark as completed
  logs.push(await db.createFanoutLog(event.id, 'COMPLETED', {
    total_notifications: notifications.length,
    duration_ms: Date.now() - new Date(event.created_at).getTime(),
  }));
  
  return { event, logs, notifications };
}

// =============================================================================
// Replay Engine
// =============================================================================

export async function replayEvent(eventId: string): Promise<FanoutResult> {
  // Get the original event
  const event = await db.getEventById(eventId);
  if (!event) {
    throw new Error(`Event not found: ${eventId}`);
  }
  
  // Clear existing data for this event
  const cleared = await db.clearEventData(eventId);
  console.log(`Cleared ${cleared.notifications} notifications and ${cleared.logs} logs for event ${eventId}`);
  
  // Re-run fanout from the RECEIVED stage
  const logs: FanoutLog[] = [];
  const notifications: Notification[] = [];
  
  // Step 1: Log RECEIVED stage
  logs.push(await db.createFanoutLog(event.id, 'RECEIVED', {
    actor_id: event.actor_id,
    type: event.type,
    target_id: event.target_id,
    metadata: event.metadata,
    is_replay: true,
  }));
  
  // Step 2: Validate event
  const validation = validateEvent(event);
  logs.push(await db.createFanoutLog(event.id, 'VALIDATED', {
    is_valid: validation.valid,
    errors: validation.errors,
    is_replay: true,
  }));
  
  if (!validation.valid) {
    logs.push(await db.createFanoutLog(event.id, 'ERROR', {
      message: 'Event validation failed',
      errors: validation.errors,
      is_replay: true,
    }));
    return { event, logs, notifications };
  }
  
  // Step 3: Resolve recipients
  const recipients = await resolveRecipients(event);
  logs.push(await db.createFanoutLog(event.id, 'RECIPIENT_RESOLVED', {
    recipient_count: recipients.length,
    recipient_ids: recipients.map(r => r.id),
    recipient_usernames: recipients.map(r => r.username),
    rule: getRecipientRule(event.type),
    is_replay: true,
  }));
  
  // Step 4: Create notifications
  const actor = await db.getUserById(event.actor_id);
  const actorName = actor?.username || 'Someone';
  
  for (const recipient of recipients) {
    if (recipient.id === event.actor_id) {
      continue;
    }
    
    const message = generateNotificationMessage(event.type, actorName);
    const notification = await db.createNotification(recipient.id, event.id, message);
    notifications.push(notification);
    
    logs.push(await db.createFanoutLog(event.id, 'NOTIFICATION_CREATED', {
      notification_id: notification.id,
      user_id: recipient.id,
      username: recipient.username,
      message: message,
      is_replay: true,
    }));
  }
  
  // Step 5: Mark as completed
  logs.push(await db.createFanoutLog(event.id, 'COMPLETED', {
    total_notifications: notifications.length,
    is_replay: true,
    duration_ms: Date.now() - new Date(event.created_at).getTime(),
  }));
  
  return { event, logs, notifications };
}

// =============================================================================
// Helper Functions
// =============================================================================

function validateEvent(event: Event): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!event.actor_id) {
    errors.push('actor_id is required');
  }
  
  if (!event.type) {
    errors.push('type is required');
  }
  
  if (!['like', 'comment', 'follow'].includes(event.type)) {
    errors.push(`Invalid event type: ${event.type}`);
  }
  
  if (!event.target_id) {
    errors.push('target_id is required');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

async function resolveRecipients(event: Event): Promise<User[]> {
  const recipients: User[] = [];
  
  switch (event.type) {
    case 'like':
      // Like: notify the owner of the target (the target user)
      const likeTarget = await db.getUserById(event.target_id);
      if (likeTarget) {
        recipients.push(likeTarget);
      }
      break;
      
    case 'comment':
      // Comment: notify the owner + followers of target
      const commentTarget = await db.getUserById(event.target_id);
      if (commentTarget) {
        recipients.push(commentTarget);
      }
      
      // Also notify all followers of the target
      const followers = await db.getFollowers(event.target_id);
      for (const follower of followers) {
        // Avoid duplicates
        if (!recipients.find(r => r.id === follower.id)) {
          recipients.push(follower);
        }
      }
      break;
      
    case 'follow':
      // Follow: notify the followed user
      const followedUser = await db.getUserById(event.target_id);
      if (followedUser) {
        recipients.push(followedUser);
      }
      break;
      
    default:
      break;
  }
  
  return recipients;
}

function getRecipientRule(eventType: string): string {
  switch (eventType) {
    case 'like':
      return 'owner of target';
    case 'comment':
      return 'owner + followers';
    case 'follow':
      return 'followed user';
    default:
      return 'unknown';
  }
}

function generateNotificationMessage(eventType: string, actorName: string): string {
  switch (eventType) {
    case 'like':
      return `${actorName} liked your content`;
    case 'comment':
      return `${actorName} commented on a post`;
    case 'follow':
      return `${actorName} started following you`;
    default:
      return `${actorName} interacted with you`;
  }
}

