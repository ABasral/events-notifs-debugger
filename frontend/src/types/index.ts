// Event types
export type EventType = 'like' | 'comment' | 'follow';

export interface Event {
  id: string;
  actor_id: string;
  type: EventType;
  target_id: string;
  metadata: Record<string, any>;
  created_at: string;
}

// User types
export interface User {
  id: string;
  username: string;
  email: string | null;
  created_at: string;
  followers_count?: number;
  following_count?: number;
  followers?: { id: string; username: string }[];
  following?: { id: string; username: string }[];
}

// Notification types
export interface Notification {
  id: string;
  user_id: string;
  event_id: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

// Fanout Log types (Debug Trace)
export type FanoutStage = 
  | 'RECEIVED'
  | 'VALIDATED'
  | 'RECIPIENT_RESOLVED'
  | 'NOTIFICATION_CREATED'
  | 'COMPLETED'
  | 'ERROR';

export interface FanoutLog {
  id: string;
  event_id: string;
  stage: FanoutStage;
  data: Record<string, any>;
  created_at: string;
}

// API Response types
export interface EventWithTrace {
  event: Event;
  fanout_logs: FanoutLog[];
  notifications: Notification[];
}

export interface CreateEventResponse {
  success: boolean;
  event: Event;
  fanout_logs: FanoutLog[];
  notifications_created: number;
}

export interface ReplayResponse {
  success: boolean;
  event: Event;
  fanout_logs: FanoutLog[];
  notifications_created: number;
  message: string;
}

export interface ApiResponse<T> {
  data: T[];
}
