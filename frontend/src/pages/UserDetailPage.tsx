import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import { User, Notification, TraceStep, PaginatedResponse } from '../types';
import { Loading } from '../components/Loading';
import { formatDate, formatRelative, getDecisionBadge, getReasonLabel, truncateId } from '../utils/format';

export function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [user, setUser] = useState<User | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [decisions, setDecisions] = useState<TraceStep[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'notifications' | 'decisions'>('notifications');
  
  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id]);
  
  async function fetchData() {
    setLoading(true);
    setError(null);
    
    try {
      const [userData, notifData, decisionsData, statsData] = await Promise.all([
        api.users.get(id!),
        api.users.getNotifications(id!, { limit: '20' }),
        api.users.getDecisions(id!, { limit: '50' }),
        api.users.getNotificationStats(id!),
      ]);
      
      setUser(userData);
      setNotifications(notifData.data);
      setDecisions(decisionsData.data);
      setStats(statsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load user');
    } finally {
      setLoading(false);
    }
  }
  
  if (loading) return <Loading />;
  if (error) return <div className="card p-4 text-dark-error">{error}</div>;
  if (!user) return <div className="card p-4 text-dark-muted">User not found</div>;
  
  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-dark-muted">
        <Link to="/users" className="hover:text-dark-accent">Users</Link>
        <span>/</span>
        <span>{user.id}</span>
      </div>
      
      {/* User header */}
      <div className="card p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold mb-1">{user.display_name || user.id}</h1>
            {user.username && <p className="text-dark-muted">@{user.username}</p>}
            <p className="text-dark-muted font-mono text-sm mt-1">{user.id}</p>
          </div>
        </div>
        
        {/* Stats grid */}
        <div className="grid grid-cols-4 gap-4 mt-4">
          <div className="p-3 bg-dark-bg rounded">
            <div className="text-2xl font-bold">{stats?.total || 0}</div>
            <div className="text-dark-muted text-sm">Total Notifications</div>
          </div>
          
          {stats?.by_type && Object.entries(stats.by_type).slice(0, 3).map(([type, count]) => (
            <div key={type} className="p-3 bg-dark-bg rounded">
              <div className="text-2xl font-bold">{count as number}</div>
              <div className="text-dark-muted text-sm capitalize">{type}</div>
            </div>
          ))}
        </div>
        
        {/* Preferences and blocks */}
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <h3 className="text-sm text-dark-muted mb-2">Preferences</h3>
            <div className="flex flex-wrap gap-1">
              {Object.entries(user.preferences).map(([key, value]) => (
                <span
                  key={key}
                  className={`badge ${value ? 'badge-success' : 'badge-neutral'}`}
                >
                  {key}: {value ? 'ON' : 'OFF'}
                </span>
              ))}
            </div>
          </div>
          
          <div>
            <h3 className="text-sm text-dark-muted mb-2">Blocks & Mutes</h3>
            <div className="text-sm">
              <div>Blocked: {user.blocked_users.length > 0 ? user.blocked_users.join(', ') : 'None'}</div>
              <div>Muted: {user.muted_users.length > 0 ? user.muted_users.join(', ') : 'None'}</div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="border-b border-dark-border">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('notifications')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'notifications'
                ? 'border-dark-accent text-dark-accent'
                : 'border-transparent text-dark-muted hover:text-dark-text'
            }`}
          >
            Notifications ({notifications.length})
          </button>
          <button
            onClick={() => setActiveTab('decisions')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'decisions'
                ? 'border-dark-accent text-dark-accent'
                : 'border-transparent text-dark-muted hover:text-dark-text'
            }`}
          >
            All Decisions ({decisions.length})
          </button>
        </div>
      </div>
      
      {/* Tab content */}
      {activeTab === 'notifications' ? (
        <div className="card overflow-hidden">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-dark-muted">No notifications</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-dark-border/50">
                <tr className="text-left text-dark-muted">
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">From</th>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Created</th>
                </tr>
              </thead>
              <tbody>
                {notifications.map((notif) => (
                  <tr key={notif.id} className="border-t border-dark-border hover:bg-dark-border/30">
                    <td className="px-4 py-3">{notif.notification_type}</td>
                    <td className="px-4 py-3">
                      <Link to={`/users/${notif.actor_user_id}`} className="text-dark-accent hover:underline">
                        {notif.actor_user_id}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{notif.title || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`badge badge-${notif.status === 'delivered' || notif.status === 'read' ? 'success' : 'info'}`}>
                        {notif.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-dark-muted">
                      {formatRelative(notif.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <div className="card overflow-hidden">
          {decisions.length === 0 ? (
            <div className="p-8 text-center text-dark-muted">No decisions</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-dark-border/50">
                <tr className="text-left text-dark-muted">
                  <th className="px-4 py-3">Trace</th>
                  <th className="px-4 py-3">Step</th>
                  <th className="px-4 py-3">Decision</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3">Rule</th>
                  <th className="px-4 py-3">Time</th>
                </tr>
              </thead>
              <tbody>
                {decisions.map((step) => (
                  <tr key={step.id} className="border-t border-dark-border hover:bg-dark-border/30">
                    <td className="px-4 py-3 font-mono text-dark-accent">
                      {truncateId(step.trace_id)}
                    </td>
                    <td className="px-4 py-3">{step.step_type}</td>
                    <td className="px-4 py-3">
                      <span className={getDecisionBadge(step.decision) + ' badge'}>
                        {step.decision}
                      </span>
                    </td>
                    <td className="px-4 py-3">{getReasonLabel(step.reason_code)}</td>
                    <td className="px-4 py-3 text-dark-muted">{step.rule_name || '-'}</td>
                    <td className="px-4 py-3 text-dark-muted">
                      {formatRelative(step.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
