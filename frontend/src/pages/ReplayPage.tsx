import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { ReplaySession, PaginatedResponse } from '../types';
import { Loading } from '../components/Loading';
import { formatDate, formatRelative, truncateId } from '../utils/format';
import clsx from 'clsx';

export function ReplayPage() {
  const [sessions, setSessions] = useState<ReplaySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // New replay form
  const [eventId, setEventId] = useState('');
  const [dryRun, setDryRun] = useState(true);
  const [resetCache, setResetCache] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  useEffect(() => {
    fetchSessions();
  }, []);
  
  async function fetchSessions() {
    setLoading(true);
    setError(null);
    
    try {
      const result: PaginatedResponse<ReplaySession> = await api.replay.list();
      setSessions(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load replay sessions');
    } finally {
      setLoading(false);
    }
  }
  
  async function startReplay(e: React.FormEvent) {
    e.preventDefault();
    if (!eventId.trim()) return;
    
    setSubmitting(true);
    try {
      await api.replay.start({
        event_id: eventId.trim(),
        dry_run: dryRun,
        reset_cache: resetCache,
      });
      setEventId('');
      fetchSessions();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to start replay');
    } finally {
      setSubmitting(false);
    }
  }
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return 'badge-success';
      case 'processing':
        return 'badge-info';
      case 'failed':
        return 'badge-error';
      default:
        return 'badge-neutral';
    }
  };
  
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Replay Console</h1>
      
      {/* New replay form */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold mb-4">Start New Replay</h2>
        <form onSubmit={startReplay} className="space-y-4">
          <div>
            <label className="block text-sm text-dark-muted mb-1">Event ID</label>
            <input
              type="text"
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
              placeholder="Enter event UUID..."
              className="input w-full"
            />
          </div>
          
          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={dryRun}
                onChange={(e) => setDryRun(e.target.checked)}
                className="w-4 h-4"
              />
              <span>Dry Run</span>
              <span className="text-dark-muted text-xs">(no notifications created)</span>
            </label>
            
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={resetCache}
                onChange={(e) => setResetCache(e.target.checked)}
                className="w-4 h-4"
              />
              <span>Reset Cache</span>
              <span className="text-dark-muted text-xs">(clear dedupe/throttle)</span>
            </label>
          </div>
          
          <button
            type="submit"
            disabled={submitting || !eventId.trim()}
            className="btn btn-primary disabled:opacity-50"
          >
            {submitting ? 'Starting...' : '🔄 Start Replay'}
          </button>
        </form>
      </div>
      
      {/* Recent sessions */}
      <div className="card">
        <div className="p-4 border-b border-dark-border">
          <h2 className="text-lg font-semibold">Recent Replay Sessions</h2>
        </div>
        
        {loading ? (
          <Loading />
        ) : error ? (
          <div className="p-4 text-dark-error">{error}</div>
        ) : sessions.length === 0 ? (
          <div className="p-8 text-center text-dark-muted">No replay sessions yet</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-dark-border/50">
              <tr className="text-left text-dark-muted">
                <th className="px-4 py-3">Session</th>
                <th className="px-4 py-3">Event</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Options</th>
                <th className="px-4 py-3">Diff</th>
                <th className="px-4 py-3">Initiated</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((session) => (
                <tr key={session.id} className="border-t border-dark-border hover:bg-dark-border/30">
                  <td className="px-4 py-3">
                    <Link
                      to={`/replay/${session.id}`}
                      className="font-mono text-dark-accent hover:underline"
                    >
                      {truncateId(session.id)}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      to={`/events/${session.original_event_id}`}
                      className="font-mono text-dark-accent hover:underline"
                    >
                      {truncateId(session.original_event_id)}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span className={clsx('badge', getStatusBadge(session.status))}>
                      {session.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {session.dry_run && <span className="badge badge-info">dry-run</span>}
                      {session.reset_cache && <span className="badge badge-warning">reset-cache</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-dark-muted">
                    {session.diff_summary?.summary || '-'}
                  </td>
                  <td className="px-4 py-3 text-dark-muted">
                    {formatRelative(session.initiated_at)}
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
