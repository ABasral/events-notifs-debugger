-- Event & Notification Debugging Console
-- Simplified Schema for Core Debugging Engine

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- Users Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username        VARCHAR(100) NOT NULL UNIQUE,
    email           VARCHAR(255),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- ============================================================================
-- Followers Table (who follows whom)
-- ============================================================================
CREATE TABLE IF NOT EXISTS followers (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    follows_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT unique_follow UNIQUE(user_id, follows_user_id),
    CONSTRAINT no_self_follow CHECK (user_id != follows_user_id)
);

CREATE INDEX IF NOT EXISTS idx_followers_user ON followers(user_id);
CREATE INDEX IF NOT EXISTS idx_followers_follows ON followers(follows_user_id);

-- ============================================================================
-- Events Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS events (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type            VARCHAR(50) NOT NULL,
    target_id       UUID REFERENCES users(id) ON DELETE SET NULL,
    metadata        JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT event_type_check CHECK (type IN ('like', 'comment', 'follow'))
);

CREATE INDEX IF NOT EXISTS idx_events_actor ON events(actor_id);
CREATE INDEX IF NOT EXISTS idx_events_target ON events(target_id);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at DESC);

-- ============================================================================
-- Notifications Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS notifications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    message         TEXT NOT NULL,
    is_read         BOOLEAN NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_event ON notifications(event_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

-- ============================================================================
-- Fanout Logs Table (Debug Trace)
-- ============================================================================
CREATE TABLE IF NOT EXISTS fanout_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    stage           VARCHAR(50) NOT NULL,
    data            JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT stage_check CHECK (stage IN (
        'RECEIVED',
        'VALIDATED', 
        'RECIPIENT_RESOLVED',
        'NOTIFICATION_CREATED',
        'COMPLETED',
        'ERROR'
    ))
);

CREATE INDEX IF NOT EXISTS idx_fanout_logs_event ON fanout_logs(event_id);
CREATE INDEX IF NOT EXISTS idx_fanout_logs_stage ON fanout_logs(stage);
CREATE INDEX IF NOT EXISTS idx_fanout_logs_created ON fanout_logs(created_at ASC);
