import { z } from 'zod';

// =============================================================================
// Event Types
// =============================================================================

export const EventTypes = ['like', 'comment', 'follow'] as const;
export type EventType = typeof EventTypes[number];

export const CreateEventSchema = z.object({
  actor_id: z.string().uuid(),
  type: z.enum(EventTypes),
  target_id: z.string().uuid(),
  metadata: z.record(z.any()).optional().default({}),
});

export type CreateEventInput = z.infer<typeof CreateEventSchema>;

export interface Event {
  id: string;
  actor_id: string;
  type: EventType;
  target_id: string;
  metadata: Record<string, any>;
  created_at: Date;
}

// =============================================================================
// User Types
// =============================================================================

export interface User {
  id: string;
  username: string;
  email: string | null;
  created_at: Date;
}

// =============================================================================
// Follower Types
// =============================================================================

export interface Follower {
  id: string;
  user_id: string;
  follows_user_id: string;
  created_at: Date;
}

// =============================================================================
// Notification Types
// =============================================================================

export interface Notification {
  id: string;
  user_id: string;
  event_id: string;
  message: string;
  is_read: boolean;
  created_at: Date;
}

// =============================================================================
// Fanout Log Types (Debug Trace)
// =============================================================================

export const FanoutStages = [
  'RECEIVED',
  'VALIDATED',
  'RECIPIENT_RESOLVED',
  'NOTIFICATION_CREATED',
  'COMPLETED',
  'ERROR',
] as const;

export type FanoutStage = typeof FanoutStages[number];

export interface FanoutLog {
  id: string;
  event_id: string;
  stage: FanoutStage;
  data: Record<string, any>;
  created_at: Date;
}

// =============================================================================
// API Response Types
// =============================================================================

export interface EventWithTrace {
  event: Event;
  fanout_logs: FanoutLog[];
  notifications: Notification[];
}

export interface UserWithDetails extends User {
  followers_count: number;
  following_count: number;
}
