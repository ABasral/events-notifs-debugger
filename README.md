# Event & Notification Debugging Console

An internal developer tool for tracing, replaying, and inspecting how raw user events become notifications. Built for growth engineering teams who need deep visibility into their notification fanout system.

## Overview

This is **not** a user-facing app and **not** a generic admin panel. It is a **developer-only** trace, replay, and inspection system designed to answer questions like:

- Why did this user get a notification?
- Why was this other user skipped?
- What rule fired?
- What cache key blocked it?
- What would happen if we replay this event?

Every decision is explainable, traceable, and replayable.

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    DEBUGGING CONSOLE (Frontend)              │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐     │
│  │ Events │ │ Traces │ │ Users  │ │ Replay │ │ Stream │     │
│  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘     │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│                         API GATEWAY                          │
│  /events  /traces  /users  /replay  /rules  /stream (WS)    │
└──────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ Event Ingestion │  │ Fanout Workers  │  │  Replay Engine  │
└─────────────────┘  └─────────────────┘  └─────────────────┘
          │                   │                   │
          └───────────────────┼───────────────────┘
                              ▼
┌──────────────────────────────────────────────────────────────┐
│                        DATA LAYER                            │
│  ┌─────────────────────┐    ┌─────────────────────────────┐ │
│  │     PostgreSQL      │    │           Redis             │ │
│  │  - events           │    │  - idempotency keys         │ │
│  │  - traces           │    │  - dedupe cache             │ │
│  │  - trace_steps      │    │  - throttle buckets         │ │
│  │  - notifications    │    │  - event queue              │ │
│  │  - fanout_rules     │    │  - replay queue             │ │
│  │  - users            │    │  - live trace stream        │ │
│  └─────────────────────┘    └─────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 15+
- Redis 7+
- Docker & Docker Compose (optional)

### Option 1: Docker Compose (Recommended)

```bash
# Start all services
cd infra
docker-compose up -d

# Run migrations
docker-compose exec api npm run migrate

# Seed sample data
docker-compose exec api npm run seed
```

Access the console at http://localhost:3000

### Option 2: Manual Setup

```bash
# 1. Start PostgreSQL and Redis (or use managed services)

# 2. Backend
cd backend
npm install
cp .env.example .env  # Configure DATABASE_URL and REDIS_URL
npm run migrate
npm run seed
npm run dev           # Start API server

# In another terminal
npm run dev:worker    # Start fanout worker

# 3. Frontend
cd frontend
npm install
npm run dev
```

## Project Structure

```
events-notifs-debugger/
├── docs/
│   └── SYSTEM_DESIGN.md     # Detailed architecture document
├── backend/
│   ├── src/
│   │   ├── api/             # REST API routes
│   │   ├── config/          # Database and Redis configuration
│   │   ├── models/          # Data models and repositories
│   │   ├── services/        # Business logic
│   │   ├── workers/         # Background job processors
│   │   └── index.ts         # API entry point
│   ├── migrations/          # Database migrations
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── api/             # API client
│   │   ├── components/      # React components
│   │   ├── pages/           # Page components
│   │   ├── stores/          # Zustand stores
│   │   ├── types/           # TypeScript types
│   │   └── App.tsx          # Main app component
│   └── package.json
└── infra/
    ├── docker-compose.yml
    └── Dockerfile.*
```

## Core Concepts

### Events

Raw user actions that enter the system:
- Like, Follow, Comment, Mention, Reaction, DM, etc.
- Events are immutable and are the root of all debugging
- Each event gets a unique trace when processed

### Traces

A trace is the complete decision tree of one event processing:
- Shows every step of fanout processing
- Records every decision with reason codes
- Enables comparison between original and replay

### Trace Steps

Every decision point in fanout processing:
- `fanout_start` / `fanout_end` - Processing boundaries
- `rule_evaluate` - Which rule was checked
- `target_identify` - Which users were identified
- `dedupe_check` - Duplicate notification check
- `throttle_check` - Rate limit check
- `block_check` / `mute_check` - User relationship checks
- `preference_check` - User notification preferences
- `notification_create` / `notification_skip` - Final decision

### Reason Codes

Every skip has an explicit reason:
- `dedupe_hit` - Same notification recently sent
- `throttled` - Rate limit exceeded
- `blocked` - Actor is blocked by recipient
- `muted` - Actor is muted by recipient
- `pref_disabled` - User disabled this notification type
- `self_action` - Can't notify user of their own action

### Replay

Re-run fanout for debugging:
- Clone event with new trace ID
- Optional cache reset (clear dedupe/throttle)
- Dry-run mode (no notifications created)
- Produces diff comparing original vs replay

## API Reference

### Events

```
POST   /api/events              # Ingest new event
GET    /api/events              # List events with filters
GET    /api/events/:id          # Get event by ID
GET    /api/events/:id/trace    # Get trace for event
GET    /api/events/:id/tree     # Get trace as decision tree
```

### Traces

```
GET    /api/traces              # List traces with filters
GET    /api/traces/:id          # Get trace with all steps
GET    /api/traces/:id/tree     # Get trace as decision tree
GET    /api/traces/:id/diff/:other  # Compare two traces
```

### Users

```
GET    /api/users               # List users
GET    /api/users/search        # Search users
GET    /api/users/:id           # Get user details
GET    /api/users/:id/notifications  # Get user's notifications
GET    /api/users/:id/decisions # Get all decisions for user
```

### Replay

```
POST   /api/replay              # Start replay session
GET    /api/replay              # List replay sessions
GET    /api/replay/:id          # Get replay session
GET    /api/replay/:id/diff     # Get detailed diff
```

### Rules

```
GET    /api/rules               # List fanout rules
GET    /api/rules/:id           # Get rule details
POST   /api/rules/:id/activate  # Activate rule
POST   /api/rules/:id/deactivate # Deactivate rule
```

### WebSocket

```
WS     /api/stream              # Live trace step stream
```

## Frontend Views

### Event Explorer
- Timeline of all events
- Filter by user, type, time, status
- Click to view full trace

### Event Detail
- Full event information
- Trace tree visualization
- Per-user decision breakdown
- Quick replay buttons

### User Inspector
- All notifications for a user
- Their fanout history
- Preferences, blocks, mutes
- Decision statistics

### Replay Console
- Pick an event to replay
- Configure: dry-run, cache reset
- View side-by-side comparison
- See what changed and why

### Live Stream
- Watch fanout steps in real time
- Filter by event type, user
- Monitor system activity

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

# Replay
REPLAY_DEFAULT_DRY_RUN=true

# Tracing
TRACE_RETENTION_DAYS=30
```

## Development

### Running Tests

```bash
cd backend
npm test
```

### Adding a New Event Type

1. Add type to `EventTypes` in `backend/src/models/types.ts`
2. Add validation rule in event schema
3. Create fanout rule in database
4. Update frontend type definitions

### Creating a New Fanout Rule

```sql
INSERT INTO fanout_rules (name, event_types, target_selector, conditions, actions, priority, throttle_config, dedupe_config)
VALUES (
    'my_rule',
    ARRAY['my_event'],
    '{"type": "event_target"}',
    '[]',
    '[{"type": "notify"}]',
    100,
    '{"limit": 10, "window_seconds": 3600}',
    '{"window_seconds": 3600}'
);
```

## Philosophy

This tool exists for **engineering clarity**, not business reporting.

- Every decision must be explainable
- Every skip must have a reason
- Every outcome must be replayable
- No silent behavior

It should feel like **Chrome DevTools for notification systems**.
