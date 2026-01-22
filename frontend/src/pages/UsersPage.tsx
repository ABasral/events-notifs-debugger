import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { User, PaginatedResponse } from '../types';
import { Loading } from '../components/Loading';
import { formatRelative } from '../utils/format';

export function UsersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  useEffect(() => {
    fetchUsers();
  }, [searchParams]);
  
  async function fetchUsers() {
    setLoading(true);
    setError(null);
    
    try {
      const q = searchParams.get('q');
      if (q) {
        const result = await api.users.search(q);
        setUsers(result.data);
      } else {
        const params: Record<string, string> = {};
        searchParams.forEach((value, key) => {
          if (value) params[key] = value;
        });
        const result: PaginatedResponse<User> = await api.users.list(params);
        setUsers(result.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }
  
  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (searchTerm.trim()) {
      setSearchParams({ q: searchTerm.trim() });
    } else {
      setSearchParams({});
    }
  }
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Users</h1>
      </div>
      
      {/* Search */}
      <form onSubmit={handleSearch} className="card p-4">
        <div className="flex gap-4">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search users by ID, username, or display name..."
            className="input flex-1"
          />
          <button type="submit" className="btn btn-primary">Search</button>
          <button
            type="button"
            onClick={() => {
              setSearchTerm('');
              setSearchParams({});
            }}
            className="btn btn-secondary"
          >
            Clear
          </button>
        </div>
      </form>
      
      {/* Users list */}
      {loading ? (
        <Loading />
      ) : error ? (
        <div className="card p-4 text-dark-error">{error}</div>
      ) : users.length === 0 ? (
        <div className="card p-8 text-center text-dark-muted">
          No users found
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-dark-border/50">
              <tr className="text-left text-dark-muted">
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Notifications</th>
                <th className="px-4 py-3">Last Notification</th>
                <th className="px-4 py-3">Blocked/Muted</th>
                <th className="px-4 py-3">Preferences</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-t border-dark-border hover:bg-dark-border/30">
                  <td className="px-4 py-3">
                    <Link to={`/users/${user.id}`} className="flex flex-col hover:text-dark-accent">
                      <span className="font-mono text-dark-accent">{user.id}</span>
                      {user.username && (
                        <span className="text-dark-muted text-xs">@{user.username}</span>
                      )}
                      {user.display_name && (
                        <span className="text-xs">{user.display_name}</span>
                      )}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{user.total_notifications}</td>
                  <td className="px-4 py-3 text-dark-muted">
                    {user.last_notification_at
                      ? formatRelative(user.last_notification_at)
                      : 'Never'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-dark-muted">
                      {user.blocked_users.length} blocked, {user.muted_users.length} muted
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      {Object.entries(user.preferences).map(([key, value]) => (
                        <span
                          key={key}
                          className={`badge text-xs ${value ? 'badge-success' : 'badge-neutral'}`}
                        >
                          {key}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
