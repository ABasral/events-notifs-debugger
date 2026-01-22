/**
 * API service for backend communication
 */

const API_BASE = import.meta.env.VITE_API_URL || '';

/**
 * Base fetch wrapper with error handling
 */
async function fetchApi(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;

  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Get basic health status
 */
export async function getHealth() {
  return fetchApi('/health');
}

/**
 * Get detailed health status including Postgres and Redis
 */
export async function getHealthDetailed() {
  return fetchApi('/health/detailed');
}

// Future API methods will be added here:
// export async function getEvents(params) { ... }
// export async function getNotifications(params) { ... }
// export async function getUserFanout(userId) { ... }
