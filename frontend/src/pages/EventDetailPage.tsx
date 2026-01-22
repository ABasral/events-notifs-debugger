import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import { Event, FanoutLog, Notification, User } from '../types';
import { Loading } from '../components/Loading';
import clsx from 'clsx';

export function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [event, setEvent] = useState<Event | null>(null);
  const [logs, setLogs] = useState<FanoutLog[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replaying, setReplaying] = useState(false);
  
  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id]);
  
  async function fetchData() {
    setLoading(true);
    setError(null);
    
    try {
      const [traceData, usersRes] = await Promise.all([
        api.events.getTrace(id!),
        api.users.list(),
      ]);
      
      setEvent(traceData.event);
      setLogs(traceData.fanout_logs);
      setNotifications(traceData.notifications);
      setUsers(usersRes.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load event');
    } finally {
      setLoading(false);
    }
  }
  
  async function replayEvent() {
    if (!id) return;
    
    setReplaying(true);
    try {
      await api.events.replay(id);
      // Refresh data
      await fetchData();
      alert('Event replayed successfully!');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to replay event');
    } finally {
      setReplaying(false);
    }
  }
  
  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleString();
  }
  
  function formatTime(dateStr: string) {
    return new Date(dateStr).toLocaleTimeString();
  }
  
  function getEventIcon(type: string) {
    switch (type) {
      case 'like': return '❤️';
      case 'comment': return '💬';
      case 'follow': return '👤';
      default: return '📥';
    }
  }
  
  function getStageIcon(stage: string) {
    switch (stage) {
      case 'RECEIVED': return '📥';
      case 'VALIDATED': return '✅';
      case 'RECIPIENT_RESOLVED': return '🎯';
      case 'NOTIFICATION_CREATED': return '🔔';
      case 'COMPLETED': return '✔️';
      case 'ERROR': return '❌';
      default: return '•';
    }
  }
  
  function getStageColor(stage: string) {
    switch (stage) {
      case 'RECEIVED': return 'border-blue-500 bg-blue-500/10';
      case 'VALIDATED': return 'border-green-500 bg-green-500/10';
      case 'RECIPIENT_RESOLVED': return 'border-yellow-500 bg-yellow-500/10';
      case 'NOTIFICATION_CREATED': return 'border-purple-500 bg-purple-500/10';
      case 'COMPLETED': return 'border-green-600 bg-green-600/10';
      case 'ERROR': return 'border-red-500 bg-red-500/10';
      default: return 'border-gray-500 bg-gray-500/10';
    }
  }
  
  function getUsernameById(userId: string) {
    const user = users.find(u => u.id === userId);
    return user?.username || userId.substring(0, 8);
  }
  
  if (loading) return <Loading />;
  if (error) return <div className="card p-4 text-dark-error">{error}</div>;
  if (!event) return <div className="card p-4 text-dark-muted">Event not found</div>;
  
  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-dark-muted">
        <Link to="/events" className="hover:text-dark-accent">Events</Link>
        <span>/</span>
        <span>Trace Viewer</span>
      </div>
      
      {/* Event header */}
      <div className="card p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold mb-2">
              <span className="mr-2">{getEventIcon(event.type)}</span>
              <span className="capitalize">{event.type}</span> Event
            </h1>
            <p className="text-dark-muted font-mono text-sm">{event.id}</p>
          </div>
          
          <button
            onClick={replayEvent}
            disabled={replaying}
            className="btn btn-primary"
          >
            {replaying ? 'Replaying...' : '🔄 Replay Event'}
          </button>
        </div>
        
        {/* Event details */}
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-dark-muted">Actor:</span>
            <span className="ml-2 text-dark-accent">{getUsernameById(event.actor_id)}</span>
          </div>
          <div>
            <span className="text-dark-muted">Target:</span>
            <span className="ml-2 text-dark-accent">{getUsernameById(event.target_id)}</span>
          </div>
          <div>
            <span className="text-dark-muted">Created:</span>
            <span className="ml-2">{formatDate(event.created_at)}</span>
          </div>
        </div>
      </div>
      
      {/* Fanout Trace Timeline */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold mb-6">Fanout Trace Timeline</h2>
        
        {logs.length === 0 ? (
          <div className="text-dark-muted text-center p-8">
            No trace logs available.
          </div>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-dark-border" />
            
            {/* Timeline items */}
            <div className="space-y-4">
              {logs.map((log, index) => (
                <div key={log.id} className="relative pl-16">
                  {/* Timeline dot */}
                  <div className={clsx(
                    'absolute left-4 w-5 h-5 rounded-full border-2 flex items-center justify-center text-xs',
                    getStageColor(log.stage)
                  )}>
                    {getStageIcon(log.stage)}
                  </div>
                  
                  {/* Content */}
                  <div className={clsx(
                    'p-4 rounded-lg border',
                    getStageColor(log.stage)
                  )}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold">{log.stage}</span>
                      <span className="text-dark-muted text-xs">
                        {formatTime(log.created_at)}
                      </span>
                    </div>
                    
                    {/* Stage-specific data */}
                    <div className="text-sm space-y-1">
                      {log.stage === 'RECEIVED' && (
                        <>
                          <div><span className="text-dark-muted">Type:</span> {log.data.type}</div>
                          <div><span className="text-dark-muted">Actor:</span> {getUsernameById(log.data.actor_id)}</div>
                          <div><span className="text-dark-muted">Target:</span> {getUsernameById(log.data.target_id)}</div>
                        </>
                      )}
                      
                      {log.stage === 'VALIDATED' && (
                        <div className={log.data.is_valid ? 'text-dark-success' : 'text-dark-error'}>
                          {log.data.is_valid ? '✓ Valid' : `✗ Invalid: ${log.data.errors?.join(', ')}`}
                        </div>
                      )}
                      
                      {log.stage === 'RECIPIENT_RESOLVED' && (
                        <>
                          <div><span className="text-dark-muted">Rule:</span> {log.data.rule}</div>
                          <div><span className="text-dark-muted">Recipients:</span> {log.data.recipient_count}</div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {log.data.recipient_usernames?.map((username: string, i: number) => (
                              <span key={i} className="badge badge-info">{username}</span>
                            ))}
                          </div>
                        </>
                      )}
                      
                      {log.stage === 'NOTIFICATION_CREATED' && (
                        <>
                          <div><span className="text-dark-muted">User:</span> {log.data.username}</div>
                          <div><span className="text-dark-muted">Message:</span> {log.data.message}</div>
                        </>
                      )}
                      
                      {log.stage === 'COMPLETED' && (
                        <>
                          <div><span className="text-dark-muted">Total Notifications:</span> {log.data.total_notifications}</div>
                          {log.data.is_replay && <span className="badge badge-warning">Replay</span>}
                        </>
                      )}
                      
                      {log.stage === 'ERROR' && (
                        <div className="text-dark-error">{log.data.message}</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* Notifications Created */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold mb-4">
          Notifications Created ({notifications.length})
        </h2>
        
        {notifications.length === 0 ? (
          <div className="text-dark-muted text-center p-4">
            No notifications were created for this event.
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((notif) => (
              <div key={notif.id} className="p-3 bg-dark-bg rounded flex items-center justify-between">
                <div>
                  <span className="text-dark-accent">{getUsernameById(notif.user_id)}</span>
                  <span className="text-dark-muted mx-2">—</span>
                  <span>{notif.message}</span>
                </div>
                <span className={clsx(
                  'badge',
                  notif.is_read ? 'badge-neutral' : 'badge-success'
                )}>
                  {notif.is_read ? 'Read' : 'Unread'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
