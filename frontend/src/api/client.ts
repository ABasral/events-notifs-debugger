import { Event, User, Notification, FanoutLog, CreateEventResponse, ReplayResponse, EventWithTrace, ApiResponse } from '../types';

const API_BASE = '/api';

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }
  
  return response.json();
}

export const api = {
  // Events
  events: {
    list: () => request<ApiResponse<Event>>('/events'),
    get: (id: string) => request<Event>(`/events/${id}`),
    getTrace: (id: string) => request<EventWithTrace>(`/events/${id}/trace`),
    create: (data: { actor_id: string; type: string; target_id: string; metadata?: Record<string, any> }) =>
      request<CreateEventResponse>('/events', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    replay: (id: string) => request<ReplayResponse>(`/events/${id}/replay`, {
      method: 'POST',
    }),
  },
  
  // Users
  users: {
    list: () => request<ApiResponse<User>>('/users'),
    get: (id: string) => request<User>(`/users/${id}`),
    getNotifications: (id: string) => request<ApiResponse<Notification>>(`/users/${id}/notifications`),
  },
  
  // Health
  health: {
    check: () => request<any>('/health'),
  },
};
