import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { Trace, PaginatedResponse } from '../types';
import { Loading } from '../components/Loading';
import { formatRelative, truncateId } from '../utils/format';
import clsx from 'clsx';

export function TracesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [traces, setTraces] = useState<Trace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ page: 1, total_pages: 1 });
  
  // Filters
  const [traceType, setTraceType] = useState(searchParams.get('trace_type') || '');
  const [status, setStatus] = useState(searchParams.get('status') || '');
  
  useEffect(() => {
    fetchTraces();
  }, [searchParams]);
  
  async function fetchTraces() {
    setLoading(true);
    setError(null);
    
    try {
      const params: Record<string, string> = {};
      searchParams.forEach((value, key) => {
        if (value) params[key] = value;
      });
      
      const result: PaginatedResponse<Trace> = await api.traces.list(params);
      setTraces(result.data);
      setPagination({
        page: result.pagination.page,
        total_pages: result.pagination.total_pages,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load traces');
    } finally {
      setLoading(false);
    }
  }
  
  function applyFilters(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (traceType) params.set('trace_type', traceType);
    if (status) params.set('status', status);
    params.set('page', '1');
    setSearchParams(params);
  }
  
  const getStatusBadge = (s: string) => {
    switch (s) {
      case 'completed': return 'badge-success';
      case 'processing': return 'badge-info';
      case 'failed': return 'badge-error';
      default: return 'badge-neutral';
    }
  };
  
  const getTypeBadge = (t: string) => {
    switch (t) {
      case 'live': return 'badge-success';
      case 'replay': return 'badge-info';
      case 'dry_run': return 'badge-warning';
      default: return 'badge-neutral';
    }
  };
  
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Traces</h1>
      
      {/* Filters */}
      <form onSubmit={applyFilters} className="card p-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-sm text-dark-muted mb-1">Type</label>
            <select
              value={traceType}
              onChange={(e) => setTraceType(e.target.value)}
              className="input"
            >
              <option value="">All types</option>
              <option value="live">Live</option>
              <option value="replay">Replay</option>
              <option value="dry_run">Dry Run</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm text-dark-muted mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="input"
            >
              <option value="">All statuses</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
            </select>
          </div>
          
          <div className="flex gap-2">
            <button type="submit" className="btn btn-primary">Filter</button>
            <button
              type="button"
              onClick={() => {
                setTraceType('');
                setStatus('');
                setSearchParams({});
              }}
              className="btn btn-secondary"
            >
              Clear
            </button>
          </div>
        </div>
      </form>
      
      {/* Traces list */}
      {loading ? (
        <Loading />
      ) : error ? (
        <div className="card p-4 text-dark-error">{error}</div>
      ) : traces.length === 0 ? (
        <div className="card p-8 text-center text-dark-muted">No traces found</div>
      ) : (
        <>
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-dark-border/50">
                <tr className="text-left text-dark-muted">
                  <th className="px-4 py-3">Trace ID</th>
                  <th className="px-4 py-3">Event</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Results</th>
                  <th className="px-4 py-3">Created</th>
                </tr>
              </thead>
              <tbody>
                {traces.map((trace) => (
                  <tr key={trace.id} className="border-t border-dark-border hover:bg-dark-border/30">
                    <td className="px-4 py-3">
                      <Link to={`/traces/${trace.id}`} className="font-mono text-dark-accent hover:underline">
                        {truncateId(trace.id)}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link to={`/events/${trace.event_id}`} className="font-mono text-dark-accent hover:underline">
                        {truncateId(trace.event_id)}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className={clsx('badge', getTypeBadge(trace.trace_type))}>
                        {trace.trace_type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={clsx('badge', getStatusBadge(trace.status))}>
                        {trace.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-dark-success">{trace.notified_count} ✓</span>
                      <span className="text-dark-muted mx-2">/</span>
                      <span className="text-dark-warning">{trace.skipped_count} ✗</span>
                      {trace.error_count > 0 && (
                        <>
                          <span className="text-dark-muted mx-2">/</span>
                          <span className="text-dark-error">{trace.error_count} !</span>
                        </>
                      )}
                    </td>
                    <td className="px-4 py-3 text-dark-muted">
                      {formatRelative(trace.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {pagination.total_pages > 1 && (
            <div className="flex justify-center gap-2">
              <button
                onClick={() => {
                  const params = new URLSearchParams(searchParams);
                  params.set('page', String(pagination.page - 1));
                  setSearchParams(params);
                }}
                disabled={pagination.page <= 1}
                className="btn btn-secondary disabled:opacity-50"
              >
                Previous
              </button>
              <span className="px-4 py-2 text-dark-muted">
                Page {pagination.page} of {pagination.total_pages}
              </span>
              <button
                onClick={() => {
                  const params = new URLSearchParams(searchParams);
                  params.set('page', String(pagination.page + 1));
                  setSearchParams(params);
                }}
                disabled={pagination.page >= pagination.total_pages}
                className="btn btn-secondary disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
