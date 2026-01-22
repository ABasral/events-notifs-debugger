# Event & Notification Debugging Console

Internal debugging and observability tool for the Growth Engineering team.

Used to trace how raw user events (like, follow, comment) are transformed into notifications, and to debug fanout behavior per user.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (React/Vite)                │
│                      http://localhost:5173                  │
└─────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                     Backend (Express/Node.js)               │
│                      http://localhost:3001                  │
│  ┌─────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ Routes  │  │ Middleware  │  │ Services (future)       │  │
│  └─────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                    │                       │
                    ▼                       ▼
         ┌──────────────────┐    ┌──────────────────┐
         │   PostgreSQL     │    │      Redis       │
         │   Port 5432      │    │   Port 6379      │
         └──────────────────┘    └──────────────────┘
```

## Quick Start

### Using Docker Compose (recommended)

```bash
# Start all services
docker-compose up --build

# Access the app
# Frontend: http://localhost:5173
# Backend:  http://localhost:3001
# Health:   http://localhost:3001/health/detailed
```

### Manual Development

```bash
# Terminal 1: Start Postgres and Redis
docker-compose up postgres redis

# Terminal 2: Start backend
cd backend
npm install
npm run dev

# Terminal 3: Start frontend
cd frontend
npm install
npm run dev
```

## Project Structure

```
├── backend/
│   ├── src/
│   │   ├── config/         # Configuration management
│   │   ├── lib/            # Database & Redis clients
│   │   ├── middleware/     # Express middleware
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic (future)
│   │   └── index.js        # Entry point
│   ├── Dockerfile
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── lib/            # Utilities & constants
│   │   ├── pages/          # Page components (future)
│   │   ├── services/       # API client
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── Dockerfile
│   └── package.json
│
├── docker-compose.yml
└── README.md
```

## API Endpoints

### Health Checks

| Endpoint            | Description                                      |
| ------------------- | ------------------------------------------------ |
| `GET /health`       | Simple health check (server running)             |
| `GET /health/detailed` | Detailed health (includes Postgres + Redis)   |

### Future Endpoints (to be implemented)

- `GET /api/events` - Query events
- `GET /api/notifications` - Query notifications
- `GET /api/users/:id/fanout` - Debug user fanout

## Environment Variables

### Backend

| Variable          | Default              | Description                |
| ----------------- | -------------------- | -------------------------- |
| `NODE_ENV`        | `development`        | Environment                |
| `PORT`            | `3001`               | Server port                |
| `POSTGRES_HOST`   | `localhost`          | PostgreSQL host            |
| `POSTGRES_PORT`   | `5432`               | PostgreSQL port            |
| `POSTGRES_DB`     | `events_debugger`    | Database name              |
| `POSTGRES_USER`   | `postgres`           | Database user              |
| `POSTGRES_PASSWORD` | `postgres`         | Database password          |
| `REDIS_HOST`      | `localhost`          | Redis host                 |
| `REDIS_PORT`      | `6379`               | Redis port                 |
| `CORS_ORIGIN`     | `http://localhost:5173` | Allowed CORS origin     |

### Frontend

| Variable        | Default | Description        |
| --------------- | ------- | ------------------ |
| `VITE_API_URL`  | (empty) | Backend API URL    |

## Development

This is a skeleton project. Features will be added iteratively:

1. ✅ Project structure and health checks
2. 🔜 Database schema for events and notifications
3. 🔜 Event ingestion API
4. 🔜 Notification pipeline tracing
5. 🔜 User fanout debugging
6. 🔜 Real-time event streaming

## License

Internal tool - Growth Engineering Team
