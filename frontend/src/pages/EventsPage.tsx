import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { Event, User } from '../types';
import { Loading } from '../components/Loading';

export function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Create event form
  const [actorId, setActorId] = useState('');
  const [eventType, setEventType] = useState<'like' | 'comment' | 'follow'>('like');
  const [targetId, setTargetId] = useState('');
  const [creating, setCreating] = useState(false);
  
  useEffect(() => {
    fetchData();
  }, []);
  
  async function fetchData() {
    setLoading(true);
    setError(null);
    
    try {
      const [eventsRes, usersRes] = await Promise.all([
        api.events.list(),
        api.users.list(),
      ]);
      setEvents(eventsRes.data);
      setUsers(usersRes.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }
  
  async function createEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!actorId || !targetId) return;
    
    setCreating(true);
    try {
      await api.events.create({
        actor_id: actorId,
        type: eventType,
        target_id: targetId,
      });
      
      // Refresh events list
      const eventsRes = await api.events.list();
      setEvents(eventsRes.data);
      
      // Reset form
      setActorId('');
      setTargetId('');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create event');
    } finally {
      setCreating(false);
    }
  }
  
  async function replayEvent(eventId: string) {
    try {
      await api.events.replay(eventId);
      alert('Event replayed successfully!');
      // Refresh events list
      const eventsRes = await api.events.list();
      setEvents(eventsRes.data);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to replay event');
    }
  }
  
  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleString();
  }
  
  function getEventIcon(type: string) {
    switch (type) {
      case 'like': return '❤️';
      case 'comment': return '💬';
      case 'follow': return '👤';
      default: return '📥';
    }
  }
  
  function getUsernameById(id: string) {
    const user = users.find(u => u.id === id);
    return user?.username || id.substring(0, 8);
  }
  
  if (loading) return <Loading />;
  if (error) return <div className="card p-4 text-dark-error">{error}</div>;
  
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Event Explorer</h1>
      
      {/* Create Event Form */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold mb-4">Create New Event</h2>
        <form onSubmit={createEvent} className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-sm text-dark-muted mb-1">Actor (who)</label>
            <select
              value={actorId}
              onChange={(e) => setActorId(e.target.value)}
              className="input"
              required
            >
              <option value="">Select user...</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>{user.username}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm text-dark-muted mb-1">Event Type</label>
            <select
              value={eventType}
              onChange={(e) => setEventType(e.target.value as any)}
              className="input"
            >
              <option value="like">❤️ Like</option>
              <option value="comment">💬 Comment</option>
              <option value="follow">👤 Follow</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm text-dark-muted mb-1">Target (whom)</label>
            <select
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              className="input"
              required
            >
              <option value="">Select user...</option>
              {users.filter(u => u.id !== actorId).map(user => (
                <option key={user.id} value={user.id}>{user.username}</option>
              ))}
            </select>
          </div>
          
          <button
            type="submit"
            disabled={creating || !actorId || !targetId}
            className="btn btn-primary disabled:opacity-50"
          >
            {creating ? 'Creating...' : 'Create Event'}
          </button>
        </form>
      </div>
      
      {/* Events Table */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-dark-border">
          <h2 className="text-lg font-semibold">Events ({events.length})</h2>
        </div>
        
        {events.length === 0 ? (
          <div className="p-8 text-center text-dark-muted">
            No events yet. Create one above!
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-dark-border/50">
              <tr className="text-left text-dark-muted">
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Actor → Target</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id} className="border-t border-dark-border hover:bg-dark-border/30">
                  <td className="px-4 py-3">
                    <span className="text-lg mr-2">{getEventIcon(event.type)}</span>
                    <span className="capitalize">{event.type}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-dark-accent">{getUsernameById(event.actor_id)}</span>
                    <span className="text-dark-muted mx-2">→</span>
                    <span className="text-dark-accent">{getUsernameById(event.target_id)}</span>
                  </td>
                  <td className="px-4 py-3 text-dark-muted">
                    {formatDate(event.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Link
                        to={`/events/${event.id}`}
                        className="btn btn-secondary text-xs px-3 py-1"
                      >
                        View Trace
                      </Link>
                      <button
                        onClick={() => replayEvent(event.id)}
                        className="btn btn-primary text-xs px-3 py-1"
                      >
                        🔄 Replay
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
