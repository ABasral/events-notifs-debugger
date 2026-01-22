# Event & Notification Debugging Console - System Design

## Overview

This document describes the complete architecture for an internal debugging console that enables engineers to trace, replay, and inspect how raw user events become notifications.

## Design Principles

1. **Observability First**: Every decision must be explainable and traceable
2. **Deterministic Replay**: Any event can be re-processed with identical logic
3. **Immutable Events**: Events are write-once, never modified
4. **Explicit Decisions**: No silent skips - every outcome has a reason code
5. **Isolation**: Replays never mutate production state

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DEBUGGING CONSOLE                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │    Event     │  │    User      │  │   Replay     │  │    Live      │    │
│  │   Explorer   │  │  Inspector   │  │   Console    │  │   Stream     │    │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              API GATEWAY                                     │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │  /events  │  /traces  │  /users  │  /replay  │  /stream  │  /rules    │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
           ┌─────────────────────────┼─────────────────────────┐
           ▼                         ▼                         ▼
┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────────┐
│   EVENT INGESTION   │  │   TRACE SERVICE     │  │   REPLAY ENGINE         │
│   SERVICE           │  │                     │  │                         │
│  ┌───────────────┐  │  │  ┌───────────────┐  │  │  ┌───────────────────┐  │
│  │ Validate      │  │  │  │ Query Traces  │  │  │  │ Clone Event       │  │
│  │ Normalize     │  │  │  │ Build Trees   │  │  │  │ Reset Cache State │  │
│  │ Store Event   │  │  │  │ Diff Traces   │  │  │  │ Execute Fanout    │  │
│  │ Enqueue       │  │  │  │ Live Stream   │  │  │  │ Produce Trace     │  │
│  └───────────────┘  │  │  └───────────────┘  │  │  │ Compare Results   │  │
└─────────────────────┘  └─────────────────────┘  │  └───────────────────┘  │
           │                         ▲             └─────────────────────────┘
           ▼                         │                         │
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FANOUT WORKER POOL                                 │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                         FANOUT PROCESSOR                               │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ │ │
│  │  │ Load     │  │ Evaluate │  │ Check    │  │ Apply    │  │ Emit     │ │ │
│  │  │ Rules    │  │ Targets  │  │ Caches   │  │ Filters  │  │ Notifs   │ │ │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘ │ │
│  │                              │                                         │ │
│  │                              ▼                                         │ │
│  │  ┌────────────────────────────────────────────────────────────────┐   │ │
│  │  │                    TRACE EMITTER                               │   │ │
│  │  │   Every step → TraceStep { decision, reason, metadata }        │   │ │
│  │  └────────────────────────────────────────────────────────────────┘   │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
           │                         │
           ▼                         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              DATA LAYER                                      │
│  ┌─────────────────────────────────┐  ┌─────────────────────────────────┐   │
│  │          POSTGRESQL             │  │             REDIS               │   │
│  │  ┌───────────────────────────┐  │  │  ┌───────────────────────────┐  │   │
│  │  │ events                    │  │  │  │ idempotency_keys          │  │   │
│  │  │ traces                    │  │  │  │ dedupe_cache              │  │   │
│  │  │ trace_steps               │  │  │  │ throttle_buckets          │  │   │
│  │  │ notifications             │  │  │  │ user_preferences_cache    │  │   │
│  │  │ fanout_rules              │  │  │  │ replay_queue              │  │   │
│  │  │ users                     │  │  │  │ live_trace_stream         │  │   │
│  │  │ replay_sessions           │  │  │  │ worker_locks              │  │   │
│  │  └───────────────────────────┘  │  │  └───────────────────────────┘  │   │
│  └─────────────────────────────────┘  └─────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Service Boundaries

### 1. Event Ingestion Service

**Responsibility**: Accept, validate, normalize, and store raw events.

**Boundaries**:
- ONLY handles event intake
- NEVER processes fanout directly
- ALWAYS enqueues to fanout queue
- MUST assign immutable event_id and timestamp

**Endpoints**:
- `POST /api/events` - Ingest new event
- `GET /api/events` - Query events with filters
- `GET /api/events/:id` - Get single event

### 2. Fanout Worker Service

**Responsibility**: Process events and determine notification recipients.

**Boundaries**:
- Consumes from event queue
- Evaluates ALL rules for each event
- Emits trace steps for EVERY decision
- Writes notifications
- NEVER modifies events

**Trace Points**:
- Rule evaluation start/end
- Target user identification
- Cache/dedupe checks
- Filter application
- Final decision with reason

### 3. Trace Service

**Responsibility**: Store, query, and stream trace data.

**Boundaries**:
- Receives trace steps from fanout workers
- Stores to PostgreSQL
- Publishes to Redis stream for live view
- Builds trace trees for visualization
- Computes trace diffs for replay comparison

### 4. Replay Engine

**Responsibility**: Re-execute fanout for debugging.

**Boundaries**:
- Clones event with new trace_id
- Optionally resets cache state
- Runs identical fanout logic
- Produces NEW trace (never modifies original)
- Supports dry-run mode (no notifications written)

### 5. API Gateway

**Responsibility**: Unified API for the debugging console.

**Boundaries**:
- Authentication/authorization
- Request routing
- WebSocket connections for live stream
- Rate limiting

---

## Data Model

### PostgreSQL Schema

```sql
-- Core Events Table
CREATE TABLE events (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type      VARCHAR(100) NOT NULL,
    actor_user_id   VARCHAR(100) NOT NULL,
    target_user_id  VARCHAR(100),
    target_entity_type VARCHAR(100),
    target_entity_id VARCHAR(100),
    payload         JSONB NOT NULL DEFAULT '{}',
    
    -- Debugging metadata
    source_service  VARCHAR(100),
    correlation_id  UUID,
    
    -- Timestamps
    occurred_at     TIMESTAMPTZ NOT NULL,
    ingested_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Indexes
    CONSTRAINT events_type_check CHECK (event_type IN (
        'like', 'unlike', 'follow', 'unfollow', 'comment', 
        'reply', 'mention', 'reaction', 'share', 'repost',
        'post_create', 'story_view', 'dm_receive'
    ))
);

CREATE INDEX idx_events_type ON events(event_type);
CREATE INDEX idx_events_actor ON events(actor_user_id);
CREATE INDEX idx_events_target_user ON events(target_user_id);
CREATE INDEX idx_events_occurred_at ON events(occurred_at DESC);
CREATE INDEX idx_events_correlation ON events(correlation_id);

-- Traces Table (one per event processing)
CREATE TABLE traces (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id        UUID NOT NULL REFERENCES events(id),
    trace_type      VARCHAR(20) NOT NULL DEFAULT 'live',
    
    -- Replay metadata
    replay_session_id UUID,
    parent_trace_id   UUID REFERENCES traces(id),
    
    -- Processing status
    status          VARCHAR(20) NOT NULL DEFAULT 'pending',
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    
    -- Aggregates (computed after completion)
    total_targets   INTEGER DEFAULT 0,
    notified_count  INTEGER DEFAULT 0,
    skipped_count   INTEGER DEFAULT 0,
    error_count     INTEGER DEFAULT 0,
    
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT traces_type_check CHECK (trace_type IN ('live', 'replay', 'dry_run')),
    CONSTRAINT traces_status_check CHECK (status IN ('pending', 'processing', 'completed', 'failed'))
);

CREATE INDEX idx_traces_event ON traces(event_id);
CREATE INDEX idx_traces_status ON traces(status);
CREATE INDEX idx_traces_replay ON traces(replay_session_id);

-- Trace Steps Table (every decision point)
CREATE TABLE trace_steps (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trace_id        UUID NOT NULL REFERENCES traces(id),
    sequence_num    INTEGER NOT NULL,
    
    -- Step identification
    step_type       VARCHAR(50) NOT NULL,
    target_user_id  VARCHAR(100),
    
    -- Decision
    decision        VARCHAR(20) NOT NULL,
    reason_code     VARCHAR(100) NOT NULL,
    reason_detail   TEXT,
    
    -- Rule context
    rule_id         UUID,
    rule_name       VARCHAR(100),
    rule_version    INTEGER,
    
    -- Cache/state context
    cache_key       VARCHAR(255),
    cache_hit       BOOLEAN,
    cache_value     JSONB,
    
    -- Timing
    started_at      TIMESTAMPTZ NOT NULL,
    duration_ms     INTEGER NOT NULL,
    
    -- Full context for replay debugging
    context         JSONB NOT NULL DEFAULT '{}',
    
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT step_type_check CHECK (step_type IN (
        'fanout_start', 'fanout_end',
        'rule_evaluate', 'target_identify',
        'cache_check', 'dedupe_check', 'throttle_check',
        'preference_check', 'block_check', 'mute_check',
        'notification_create', 'notification_skip',
        'error'
    )),
    CONSTRAINT decision_check CHECK (decision IN (
        'proceed', 'notify', 'skip', 'error', 'throttle', 'dedupe'
    ))
);

CREATE INDEX idx_trace_steps_trace ON trace_steps(trace_id, sequence_num);
CREATE INDEX idx_trace_steps_user ON trace_steps(target_user_id);
CREATE INDEX idx_trace_steps_decision ON trace_steps(decision);
CREATE INDEX idx_trace_steps_reason ON trace_steps(reason_code);

-- Notifications Table
CREATE TABLE notifications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trace_step_id   UUID REFERENCES trace_steps(id),
    
    -- Core notification data
    recipient_id    VARCHAR(100) NOT NULL,
    notification_type VARCHAR(100) NOT NULL,
    
    -- Source event reference
    event_id        UUID NOT NULL REFERENCES events(id),
    actor_user_id   VARCHAR(100) NOT NULL,
    
    -- Content
    title           TEXT,
    body            TEXT,
    payload         JSONB NOT NULL DEFAULT '{}',
    
    -- Delivery status
    status          VARCHAR(20) NOT NULL DEFAULT 'pending',
    delivered_at    TIMESTAMPTZ,
    read_at         TIMESTAMPTZ,
    clicked_at      TIMESTAMPTZ,
    
    -- Grouping
    group_key       VARCHAR(255),
    
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT notification_status_check CHECK (status IN (
        'pending', 'sent', 'delivered', 'read', 'clicked', 'failed'
    ))
);

CREATE INDEX idx_notifications_recipient ON notifications(recipient_id);
CREATE INDEX idx_notifications_event ON notifications(event_id);
CREATE INDEX idx_notifications_type ON notifications(notification_type);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX idx_notifications_group ON notifications(group_key);

-- Fanout Rules Table
CREATE TABLE fanout_rules (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(100) NOT NULL UNIQUE,
    description     TEXT,
    
    -- Rule definition
    event_types     TEXT[] NOT NULL,
    target_selector JSONB NOT NULL,
    conditions      JSONB NOT NULL DEFAULT '[]',
    actions         JSONB NOT NULL DEFAULT '[]',
    
    -- Execution settings
    priority        INTEGER NOT NULL DEFAULT 100,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    version         INTEGER NOT NULL DEFAULT 1,
    
    -- Rate limiting
    throttle_config JSONB,
    dedupe_config   JSONB,
    
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_rules_active ON fanout_rules(is_active, priority);
CREATE INDEX idx_rules_event_types ON fanout_rules USING GIN(event_types);

-- Replay Sessions Table
CREATE TABLE replay_sessions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Source
    original_event_id UUID NOT NULL REFERENCES events(id),
    original_trace_id UUID NOT NULL REFERENCES traces(id),
    
    -- Configuration
    reset_cache     BOOLEAN NOT NULL DEFAULT false,
    dry_run         BOOLEAN NOT NULL DEFAULT true,
    rule_overrides  JSONB,
    
    -- Status
    status          VARCHAR(20) NOT NULL DEFAULT 'pending',
    
    -- Results
    replay_trace_id UUID REFERENCES traces(id),
    diff_summary    JSONB,
    
    -- Metadata
    initiated_by    VARCHAR(100) NOT NULL,
    initiated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at    TIMESTAMPTZ,
    
    CONSTRAINT replay_status_check CHECK (status IN (
        'pending', 'processing', 'completed', 'failed'
    ))
);

CREATE INDEX idx_replay_original ON replay_sessions(original_event_id);
CREATE INDEX idx_replay_status ON replay_sessions(status);

-- Users Table (for inspector)
CREATE TABLE users (
    id              VARCHAR(100) PRIMARY KEY,
    username        VARCHAR(100),
    display_name    VARCHAR(255),
    
    -- Notification preferences
    preferences     JSONB NOT NULL DEFAULT '{}',
    
    -- Block/mute lists (for debugging visibility)
    blocked_users   TEXT[] DEFAULT '{}',
    muted_users     TEXT[] DEFAULT '{}',
    
    -- Stats (computed)
    total_notifications INTEGER DEFAULT 0,
    last_notification_at TIMESTAMPTZ,
    
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Redis Schema

```
# Idempotency Keys (prevent duplicate event processing)
idempotency:{event_id} = "1"  TTL: 24h

# Dedupe Cache (prevent duplicate notifications)
dedupe:{recipient_id}:{event_type}:{actor_id}:{target_entity} = {timestamp}  TTL: 1h

# Throttle Buckets (rate limit notifications per user)
throttle:{recipient_id}:{notification_type}:{window} = count  TTL: window_size

# User Preference Cache
user_prefs:{user_id} = {serialized_preferences}  TTL: 5m

# Replay Queue
replay_queue = LIST of replay_session_ids

# Live Trace Stream (Redis Streams)
XADD trace_stream * trace_id {id} step_type {type} data {json}

# Worker Locks (distributed processing)
worker_lock:{event_id} = {worker_id}  TTL: 30s

# Processing Queue
event_queue = LIST of event_ids
```

---

## Fanout Lifecycle

### Phase 1: Event Ingestion

```
┌─────────────────────────────────────────────────────────────┐
│                    EVENT INGESTION                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Receive raw event                                        │
│     └── POST /api/events { type, actor, target, payload }    │
│                                                              │
│  2. Validate event structure                                 │
│     └── Schema validation                                    │
│     └── Required fields check                                │
│     └── Type-specific validation                             │
│                                                              │
│  3. Normalize event                                          │
│     └── Assign UUID                                          │
│     └── Set ingestion timestamp                              │
│     └── Normalize user IDs                                   │
│     └── Extract correlation ID                               │
│                                                              │
│  4. Check idempotency                                        │
│     └── SETNX idempotency:{event_id}                         │
│     └── If exists: return existing, skip enqueue             │
│                                                              │
│  5. Store event (PostgreSQL)                                 │
│     └── INSERT INTO events                                   │
│                                                              │
│  6. Create trace record                                      │
│     └── INSERT INTO traces (status: pending)                 │
│                                                              │
│  7. Enqueue for processing                                   │
│     └── LPUSH event_queue {event_id}                         │
│                                                              │
│  8. Return event ID to caller                                │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Phase 2: Fanout Processing

```
┌─────────────────────────────────────────────────────────────┐
│                    FANOUT PROCESSING                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Dequeue event                                            │
│     └── BRPOP event_queue                                    │
│     └── Acquire worker lock                                  │
│                                                              │
│  2. Load event + trace                                       │
│     └── SELECT * FROM events WHERE id = ?                    │
│     └── UPDATE traces SET status = 'processing'              │
│     └── EMIT trace_step: fanout_start                        │
│                                                              │
│  3. Load applicable rules                                    │
│     └── SELECT * FROM fanout_rules                           │
│         WHERE event_type = ANY(event_types)                  │
│         AND is_active = true                                 │
│         ORDER BY priority                                    │
│                                                              │
│  4. For each rule:                                           │
│     └── EMIT trace_step: rule_evaluate                       │
│                                                              │
│     4a. Identify target users                                │
│         └── Apply target_selector to event                   │
│         └── EMIT trace_step: target_identify                 │
│                                                              │
│     4b. For each target user:                                │
│         ┌─────────────────────────────────────────────────┐  │
│         │  CHECK SEQUENCE (all emit trace steps)          │  │
│         ├─────────────────────────────────────────────────┤  │
│         │  a. Dedupe check                                │  │
│         │     └── GET dedupe:{key}                        │  │
│         │     └── If hit: SKIP reason=dedupe_hit          │  │
│         │                                                 │  │
│         │  b. Throttle check                              │  │
│         │     └── INCR throttle:{key}                     │  │
│         │     └── If over: SKIP reason=throttled          │  │
│         │                                                 │  │
│         │  c. Block check                                 │  │
│         │     └── Check blocked_users array               │  │
│         │     └── If blocked: SKIP reason=blocked         │  │
│         │                                                 │  │
│         │  d. Mute check                                  │  │
│         │     └── Check muted_users array                 │  │
│         │     └── If muted: SKIP reason=muted             │  │
│         │                                                 │  │
│         │  e. Preference check                            │  │
│         │     └── Check user notification preferences     │  │
│         │     └── If disabled: SKIP reason=pref_disabled  │  │
│         │                                                 │  │
│         │  f. Custom conditions                           │  │
│         │     └── Evaluate rule conditions                │  │
│         │     └── If fail: SKIP reason=condition_failed   │  │
│         │                                                 │  │
│         │  ALL PASSED:                                    │  │
│         │  g. Create notification                         │  │
│         │     └── INSERT INTO notifications               │  │
│         │     └── SET dedupe:{key}                        │  │
│         │     └── EMIT trace_step: notification_create    │  │
│         └─────────────────────────────────────────────────┘  │
│                                                              │
│  5. Complete trace                                           │
│     └── UPDATE traces SET status = 'completed'               │
│     └── Compute aggregates                                   │
│     └── EMIT trace_step: fanout_end                          │
│                                                              │
│  6. Release lock                                             │
│     └── DEL worker_lock:{event_id}                           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Phase 3: Trace Emission

```
┌─────────────────────────────────────────────────────────────┐
│                    TRACE EMISSION                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Every trace step includes:                                  │
│                                                              │
│  {                                                           │
│    "trace_id": "uuid",                                       │
│    "sequence_num": 1,                                        │
│    "step_type": "cache_check",                               │
│    "target_user_id": "user_123",                             │
│    "decision": "skip",                                       │
│    "reason_code": "dedupe_hit",                              │
│    "reason_detail": "Same notification sent 5 min ago",      │
│    "rule_id": "uuid",                                        │
│    "rule_name": "like_notify",                               │
│    "cache_key": "dedupe:user_123:like:user_456:post_789",    │
│    "cache_hit": true,                                        │
│    "cache_value": { "timestamp": 1699234567 },               │
│    "started_at": "2024-01-15T10:30:00Z",                     │
│    "duration_ms": 2,                                         │
│    "context": {                                              │
│      "event_type": "like",                                   │
│      "actor_id": "user_456",                                 │
│      "preferences": { "likes": true },                       │
│      "throttle_count": 5,                                    │
│      "throttle_limit": 10                                    │
│    }                                                         │
│  }                                                           │
│                                                              │
│  Emission targets:                                           │
│  1. PostgreSQL (trace_steps table) - persistent              │
│  2. Redis Stream (trace_stream) - live view                  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Replay Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    REPLAY FLOW                               │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Initiate Replay                                          │
│     └── POST /api/replay                                     │
│         {                                                    │
│           "event_id": "uuid",                                │
│           "reset_cache": false,                              │
│           "dry_run": true,                                   │
│           "rule_overrides": {}                               │
│         }                                                    │
│                                                              │
│  2. Create Replay Session                                    │
│     └── Load original event                                  │
│     └── Load original trace                                  │
│     └── INSERT INTO replay_sessions                          │
│                                                              │
│  3. Prepare Replay Context                                   │
│     ┌─────────────────────────────────────────────────────┐  │
│     │  If reset_cache = true:                             │  │
│     │  └── Snapshot current cache state                   │  │
│     │  └── Clear relevant dedupe/throttle keys            │  │
│     │  └── Store snapshot for restoration                 │  │
│     │                                                     │  │
│     │  If reset_cache = false:                            │  │
│     │  └── Use current cache state                        │  │
│     │  └── May produce different results                  │  │
│     └─────────────────────────────────────────────────────┘  │
│                                                              │
│  4. Create Replay Trace                                      │
│     └── INSERT INTO traces                                   │
│         (trace_type: 'replay', parent_trace_id: original)    │
│                                                              │
│  5. Execute Fanout                                           │
│     └── Same fanout logic as live processing                 │
│     └── All trace steps emitted with replay trace_id         │
│                                                              │
│     ┌─────────────────────────────────────────────────────┐  │
│     │  If dry_run = true:                                 │  │
│     │  └── DO NOT insert notifications                    │  │
│     │  └── Trace steps marked as dry_run                  │  │
│     │                                                     │  │
│     │  If dry_run = false:                                │  │
│     │  └── Insert notifications normally                  │  │
│     │  └── Use separate group_key prefix                  │  │
│     └─────────────────────────────────────────────────────┘  │
│                                                              │
│  6. Compute Diff                                             │
│     └── Compare original trace vs replay trace               │
│     └── Identify:                                            │
│         - Users notified in both (match)                     │
│         - Users notified only in original (regression)       │
│         - Users notified only in replay (new notification)   │
│         - Decision changes (same user, different outcome)    │
│                                                              │
│  7. Complete Replay Session                                  │
│     └── UPDATE replay_sessions                               │
│         SET status = 'completed', diff_summary = {...}       │
│                                                              │
│  8. Restore Cache (if reset)                                 │
│     └── Restore original cache state from snapshot           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Reason Codes Reference

| Code | Category | Description |
|------|----------|-------------|
| `notified` | Success | Notification created successfully |
| `dedupe_hit` | Skip | Same notification recently sent |
| `throttled` | Skip | Rate limit exceeded for this user |
| `blocked` | Skip | Actor is blocked by recipient |
| `muted` | Skip | Actor is muted by recipient |
| `pref_disabled` | Skip | User has disabled this notification type |
| `self_action` | Skip | Actor and recipient are same user |
| `condition_failed` | Skip | Rule condition not satisfied |
| `target_not_found` | Skip | Target user doesn't exist |
| `rule_inactive` | Skip | Rule was disabled during processing |
| `error_db` | Error | Database error during processing |
| `error_cache` | Error | Redis error during processing |
| `error_timeout` | Error | Processing timeout |
| `error_unknown` | Error | Unexpected error |

---

## API Responsibilities

### Events API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/events` | POST | Ingest new event |
| `/api/events` | GET | List events with filters |
| `/api/events/:id` | GET | Get event by ID |
| `/api/events/:id/trace` | GET | Get trace for event |

### Traces API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/traces` | GET | List traces with filters |
| `/api/traces/:id` | GET | Get trace with all steps |
| `/api/traces/:id/tree` | GET | Get trace as decision tree |
| `/api/traces/:id/diff/:other_id` | GET | Compare two traces |

### Users API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/users/:id` | GET | Get user details |
| `/api/users/:id/notifications` | GET | Get user's notifications |
| `/api/users/:id/traces` | GET | Get traces involving user |
| `/api/users/:id/decisions` | GET | Get all decisions for user |

### Replay API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/replay` | POST | Initiate replay session |
| `/api/replay/:id` | GET | Get replay session status |
| `/api/replay/:id/diff` | GET | Get detailed diff |

### Rules API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/rules` | GET | List all rules |
| `/api/rules/:id` | GET | Get rule details |
| `/api/rules/:id/traces` | GET | Get traces for rule |

### Stream API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/stream` | WebSocket | Live trace step stream |
| `/api/stream/subscribe` | WebSocket | Subscribe to specific event/user |

---

## Worker Responsibilities

### Event Processor Worker

```
Consumes: event_queue
Produces: trace_steps, notifications

Responsibilities:
1. Dequeue events (BRPOP with timeout)
2. Acquire distributed lock
3. Execute fanout logic
4. Emit all trace steps
5. Write notifications (if not dry-run)
6. Update trace status
7. Release lock
8. Handle retries with backoff

Scaling: Horizontally scalable
Concurrency: Configurable per worker
```

### Replay Worker

```
Consumes: replay_queue
Produces: trace_steps (replay), diff_summary

Responsibilities:
1. Dequeue replay requests
2. Load original event and trace
3. Prepare cache context
4. Execute fanout with replay trace
5. Compute diff
6. Store results
7. Notify completion via WebSocket

Scaling: Horizontally scalable
Isolation: Separate pool from live workers
```

### Trace Aggregator Worker

```
Consumes: trace_stream
Produces: trace aggregate updates

Responsibilities:
1. Subscribe to trace_stream
2. Batch updates
3. Update trace aggregates periodically
4. Maintain live connections for streaming

Scaling: Single leader, multiple followers
```

---

## Frontend Navigation Model

```
┌─────────────────────────────────────────────────────────────┐
│  ┌──────────────────────────────────────────────────────┐   │
│  │  🔧 Event & Notification Debugger                    │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  [Events] [Traces] [Users] [Replay] [Rules] [Stream]  │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  EVENTS VIEW                                                 │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Filters: [Type ▼] [User] [Time Range] [Status ▼]      │ │
│  ├────────────────────────────────────────────────────────┤ │
│  │ ┌──────────────────────────────────────────────────┐   │ │
│  │ │ Timeline                                         │   │ │
│  │ │ ├─ 10:30:05 like    user_a → user_b (post_123)  │   │ │
│  │ │ ├─ 10:30:04 follow  user_c → user_d             │   │ │
│  │ │ ├─ 10:30:02 comment user_e → post_456           │   │ │
│  │ │ └─ ...                                          │   │ │
│  │ └──────────────────────────────────────────────────┘   │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  EVENT DETAIL VIEW                                           │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Event: like | user_a → user_b's post_123              │ │
│  │ ID: 550e8400-e29b-41d4-a716-446655440000              │ │
│  │ Occurred: 2024-01-15 10:30:05                          │ │
│  ├────────────────────────────────────────────────────────┤ │
│  │                                                        │ │
│  │  TRACE TREE                    DECISION SUMMARY        │ │
│  │  ┌──────────────────────┐     ┌──────────────────┐    │ │
│  │  │ ▼ fanout_start       │     │ Notified: 1      │    │ │
│  │  │   ▼ rule: like_notif │     │ Skipped: 3       │    │ │
│  │  │     ├─ user_b ✓      │     │   dedupe: 1      │    │ │
│  │  │     ├─ user_c ✗ muted│     │   muted: 1       │    │ │
│  │  │     ├─ user_d ✗ dedup│     │   prefs: 1       │    │ │
│  │  │     └─ user_e ✗ prefs│     │ Errors: 0        │    │ │
│  │  │   ▼ fanout_end       │     └──────────────────┘    │ │
│  │  └──────────────────────┘                              │ │
│  │                                                        │ │
│  │  [Replay This Event]  [View Raw]  [Copy ID]           │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  USER INSPECTOR VIEW                                         │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ User: user_123 (@johndoe)                              │ │
│  ├────────────────────────────────────────────────────────┤ │
│  │  NOTIFICATIONS          DECISIONS                      │ │
│  │  ┌──────────────────┐  ┌──────────────────────────┐   │ │
│  │  │ Last 24h: 15     │  │ Received: 15 (75%)       │   │ │
│  │  │ ├─ likes: 8      │  │ Skipped: 5 (25%)         │   │ │
│  │  │ ├─ follows: 3    │  │   ├─ throttled: 2        │   │ │
│  │  │ └─ comments: 4   │  │   ├─ dedupe: 2           │   │ │
│  │  └──────────────────┘  │   └─ blocked: 1          │   │ │
│  │                         └──────────────────────────┘   │ │
│  │  PREFERENCES           BLOCKS/MUTES                    │ │
│  │  ┌──────────────────┐  ┌──────────────────────────┐   │ │
│  │  │ likes: ON        │  │ Blocked: user_789        │   │ │
│  │  │ follows: ON      │  │ Muted: user_456          │   │ │
│  │  │ comments: ON     │  │                          │   │ │
│  │  │ mentions: OFF    │  │                          │   │ │
│  │  └──────────────────┘  └──────────────────────────┘   │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  REPLAY CONSOLE VIEW                                         │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Source Event: [Select or paste ID]                     │ │
│  │                                                        │ │
│  │ Options:                                               │ │
│  │ ☑ Dry Run (no notifications created)                   │ │
│  │ ☐ Reset Cache (clear dedupe/throttle)                  │ │
│  │ ☐ Rule Overrides                                       │ │
│  │                                                        │ │
│  │ [Execute Replay]                                       │ │
│  ├────────────────────────────────────────────────────────┤ │
│  │                                                        │ │
│  │  COMPARISON                                            │ │
│  │  ┌─────────────────────┬─────────────────────────┐    │ │
│  │  │ ORIGINAL            │ REPLAY                  │    │ │
│  │  ├─────────────────────┼─────────────────────────┤    │ │
│  │  │ user_a ✓ notified   │ user_a ✓ notified     │    │ │
│  │  │ user_b ✗ skipped    │ user_b ✓ notified  ⚠  │    │ │
│  │  │ user_c ✗ throttled  │ user_c ✓ notified  ⚠  │    │ │
│  │  └─────────────────────┴─────────────────────────┘    │ │
│  │                                                        │ │
│  │  ⚠ 2 decision changes detected                        │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  LIVE STREAM VIEW                                            │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Filter: [Event Type ▼] [User ID] [● Live]             │ │
│  ├────────────────────────────────────────────────────────┤ │
│  │ 10:30:05.123 │ trace_abc │ fanout_start        │ like │ │
│  │ 10:30:05.125 │ trace_abc │ target_identify     │ 3    │ │
│  │ 10:30:05.127 │ trace_abc │ dedupe_check user_a │ pass │ │
│  │ 10:30:05.128 │ trace_abc │ notify user_a       │ ✓    │ │
│  │ 10:30:05.130 │ trace_abc │ dedupe_check user_b │ hit  │ │
│  │ 10:30:05.131 │ trace_abc │ skip user_b         │ ✗    │ │
│  │ ...                                                    │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Trace Semantics

### Trace Structure

A trace is a **complete record** of all decisions made when processing an event.

```
Trace
├── id: unique identifier
├── event_id: source event
├── trace_type: live | replay | dry_run
├── status: pending | processing | completed | failed
├── steps: ordered list of TraceStep
│   ├── [0] fanout_start
│   ├── [1] rule_evaluate (rule_1)
│   ├── [2] target_identify (3 users)
│   ├── [3] dedupe_check (user_a) → proceed
│   ├── [4] throttle_check (user_a) → proceed
│   ├── [5] preference_check (user_a) → proceed
│   ├── [6] notification_create (user_a)
│   ├── [7] dedupe_check (user_b) → skip (dedupe_hit)
│   ├── [8] notification_skip (user_b)
│   ├── [9] dedupe_check (user_c) → proceed
│   ├── [10] mute_check (user_c) → skip (muted)
│   ├── [11] notification_skip (user_c)
│   └── [12] fanout_end
└── aggregates
    ├── total_targets: 3
    ├── notified_count: 1
    ├── skipped_count: 2
    └── error_count: 0
```

### Trace Tree Representation

For visualization, traces can be converted to trees:

```
TraceTree
├── event: { type: "like", actor: "user_x", target: "post_y" }
├── rules_evaluated: [
│   └── {
│       rule: "like_notify",
│       targets: [
│           { user: "user_a", decisions: [...], outcome: "notified" },
│           { user: "user_b", decisions: [...], outcome: "skipped", reason: "dedupe" },
│           { user: "user_c", decisions: [...], outcome: "skipped", reason: "muted" }
│       ]
│   }
├── summary: { notified: 1, skipped: 2, errors: 0 }
└── duration_ms: 45
```

### Trace Diff Semantics

When comparing traces (original vs replay):

```
TraceDiff
├── match_count: 1          // Same decision in both
├── original_only: [        // Notified in original, not in replay
│   { user: "user_d", original: "notified", replay: "skipped", reason: "new_block" }
│   ]
├── replay_only: [          // Notified in replay, not in original
│   { user: "user_b", original: "skipped", replay: "notified", reason: "cache_reset" }
│   ]
├── decision_changes: [     // Different skip reasons
│   { user: "user_c", original_reason: "throttled", replay_reason: "dedupe" }
│   ]
└── summary: "1 match, 1 regression, 1 new notification, 1 reason change"
```

---

## Configuration

### Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/events_debugger

# Redis
REDIS_URL=redis://localhost:6379

# API
API_PORT=3001
API_HOST=0.0.0.0

# Workers
WORKER_CONCURRENCY=10
WORKER_POLL_INTERVAL_MS=100

# Fanout
FANOUT_TIMEOUT_MS=30000
FANOUT_MAX_TARGETS=10000

# Replay
REPLAY_ISOLATION=true
REPLAY_DEFAULT_DRY_RUN=true

# Tracing
TRACE_STREAM_MAX_LEN=100000
TRACE_RETENTION_DAYS=30

# Live Stream
WEBSOCKET_PORT=3002
STREAM_BATCH_SIZE=100
```

---

## Observability

### Metrics to Expose

```
# Event ingestion
events_ingested_total{type}
events_ingestion_duration_seconds

# Fanout processing
fanout_processed_total{status}
fanout_duration_seconds
fanout_targets_per_event
fanout_notifications_created_total
fanout_skips_total{reason}

# Replay
replays_executed_total{dry_run}
replay_duration_seconds
replay_diff_changes_total

# Cache
cache_hits_total{cache_type}
cache_misses_total{cache_type}

# Queue depth
event_queue_depth
replay_queue_depth

# Workers
workers_active
worker_lock_acquisitions_total
worker_lock_failures_total
```

### Logs

All services emit structured JSON logs:

```json
{
  "timestamp": "2024-01-15T10:30:05.123Z",
  "level": "info",
  "service": "fanout-worker",
  "trace_id": "abc-123",
  "event_id": "def-456",
  "message": "Fanout completed",
  "targets": 3,
  "notified": 1,
  "skipped": 2,
  "duration_ms": 45
}
```
