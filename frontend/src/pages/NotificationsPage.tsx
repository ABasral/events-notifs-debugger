import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { User, Notification } from '../types';
import { Loading } from '../components/Loading';
import clsx from 'clsx';

export function NotificationsPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingNotifs, setLoadingNotifs] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    fetchUsers();
  }, []);
  
  useEffect(() => {
    if (selectedUserId) {
      fetchNotifications(selectedUserId);
    } else {
      setNotifications([]);
    }
  }, [selectedUserId]);
  
  async function fetchUsers() {
    setLoading(true);
    setError(null);
    
    try {
      const result = await api.users.list();
      setUsers(result.data);
      
      // Auto-select first user
      if (result.data.length > 0) {
        setSelectedUserId(result.data[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }
  
  async function fetchNotifications(userId: string) {
    setLoadingNotifs(true);
    
    try {
      const result = await api.users.getNotifications(userId);
      setNotifications(result.data);
    } catch (err) {
      console.error('Failed to load notifications:', err);
      setNotifications([]);
    } finally {
      setLoadingNotifs(false);
    }
  }
  
  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleString();
  }
  
  function getSelectedUser() {
    return users.find(u => u.id === selectedUserId);
  }
  
  if (loading) return <Loading />;
  if (error) return <div className="card p-4 text-dark-error">{error}</div>;
  
  const selectedUser = getSelectedUser();
  
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">User Notifications</h1>
      
      {/* User Selector */}
      <div className="card p-6">
        <label className="block text-sm text-dark-muted mb-2">Select User</label>
        <select
          value={selectedUserId}
          onChange={(e) => setSelectedUserId(e.target.value)}
          className="input w-full max-w-xs"
        >
          <option value="">Choose a user...</option>
          {users.map(user => (
            <option key={user.id} value={user.id}>
              {user.username} ({user.email || 'no email'})
            </option>
          ))}
        </select>
        
        {selectedUser && (
          <div className="mt-4 p-4 bg-dark-bg rounded">
            <div className="text-lg font-semibold mb-2">
              👤 {selectedUser.username}
            </div>
            <div className="text-sm text-dark-muted">
              <div>ID: <span className="font-mono">{selectedUser.id}</span></div>
              <div>Email: {selectedUser.email || 'N/A'}</div>
              <div>Joined: {formatDate(selectedUser.created_at)}</div>
            </div>
          </div>
        )}
      </div>
      
      {/* Notifications List */}
      {selectedUserId && (
        <div className="card overflow-hidden">
          <div className="p-4 border-b border-dark-border flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              Notifications ({notifications.length})
            </h2>
            <button
              onClick={() => fetchNotifications(selectedUserId)}
              className="btn btn-secondary text-sm"
            >
              🔄 Refresh
            </button>
          </div>
          
          {loadingNotifs ? (
            <Loading />
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center text-dark-muted">
              No notifications for this user.
            </div>
          ) : (
            <div className="divide-y divide-dark-border">
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={clsx(
                    'p-4 hover:bg-dark-border/30 transition-colors',
                    !notif.is_read && 'bg-dark-accent/5'
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {!notif.is_read && (
                          <span className="w-2 h-2 rounded-full bg-dark-accent" />
                        )}
                        <span className="font-medium">{notif.message}</span>
                      </div>
                      <div className="text-sm text-dark-muted mt-1">
                        {formatDate(notif.created_at)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={clsx(
                        'badge',
                        notif.is_read ? 'badge-neutral' : 'badge-success'
                      )}>
                        {notif.is_read ? 'Read' : 'Unread'}
                      </span>
                      <Link
                        to={`/events/${notif.event_id}`}
                        className="btn btn-secondary text-xs px-2 py-1"
                      >
                        View Event
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}