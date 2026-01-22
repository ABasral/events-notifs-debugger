import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Environment
  env: process.env.NODE_ENV || 'development',
  
  // API Server
  api: {
    port: parseInt(process.env.API_PORT || '3001', 10),
    host: process.env.API_HOST || '0.0.0.0',
  },
  
  // WebSocket Server
  websocket: {
    port: parseInt(process.env.WEBSOCKET_PORT || '3002', 10),
  },
  
  // PostgreSQL
  database: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/events_debugger',
    poolSize: parseInt(process.env.DATABASE_POOL_SIZE || '20', 10),
  },
  
  // Redis
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  
  // Workers
  worker: {
    concurrency: parseInt(process.env.WORKER_CONCURRENCY || '10', 10),
    pollIntervalMs: parseInt(process.env.WORKER_POLL_INTERVAL_MS || '100', 10),
  },
  
  // Fanout Settings
  fanout: {
    timeoutMs: parseInt(process.env.FANOUT_TIMEOUT_MS || '30000', 10),
    maxTargets: parseInt(process.env.FANOUT_MAX_TARGETS || '10000', 10),
  },
  
  // Replay Settings
  replay: {
    isolation: process.env.REPLAY_ISOLATION !== 'false',
    defaultDryRun: process.env.REPLAY_DEFAULT_DRY_RUN !== 'false',
  },
  
  // Tracing Settings
  tracing: {
    streamMaxLen: parseInt(process.env.TRACE_STREAM_MAX_LEN || '100000', 10),
    retentionDays: parseInt(process.env.TRACE_RETENTION_DAYS || '30', 10),
  },
  
  // Cache TTLs (in seconds)
  cache: {
    idempotencyTtl: 24 * 60 * 60, // 24 hours
    dedupeTtl: 60 * 60, // 1 hour
    throttleWindowSec: 60 * 60, // 1 hour
    userPrefsTtl: 5 * 60, // 5 minutes
    workerLockTtl: 30, // 30 seconds
  },
} as const;

export type Config = typeof config;
