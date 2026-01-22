import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import { ReplaySession, TraceTree as TraceTreeType } from '../types';
import { TraceTree } from '../components/TraceTree';
import { ReplayDiff } from '../components/ReplayDiff';
import { Loading } from '../components/Loading';
import { formatDate, truncateId } from '../utils/format';
import clsx from 'clsx';

export function ReplayDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [session, setSession] = useState<ReplaySession | null>(null);
  const [originalTree, setOriginalTree] = useState<TraceTreeType | null>(null);
  const [replayTree, setReplayTree] = useState<TraceTreeType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'diff' | 'original' | 'replay'>('diff');
  
  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id]);
  
  async function fetchData() {
    setLoading(true);
    setError(null);
    
    try {
      const sessionData = await api.replay.get(id!);
      setSession(sessionData);
      
      // Load trace trees
      const [origTree, repTree] = await Promise.all([
        api.traces.getTree(sessionData.original_trace_id).catch(() => null),
        sessionData.replay_trace_id
          ? api.traces.getTree(sessionData.replay_trace_id).catch(() => null)
          : null,
      ]);
      
      setOriginalTree(origTree);
      setReplayTree(repTree);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load replay session');
    } finally {
      setLoading(false);
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
  
  if (loading) return <Loading />;
  if (error) return <div className="card p-4 text-dark-error">{error}</div>;
  if (!session) return <div className="card p-4 text-dark-muted">Session not found</div>;
  
  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-dark-muted">
        <Link to="/replay" className="hover:text-dark-accent">Replay</Link>
        <span>/</span>
        <span>{truncateId(session.id)}</span>
      </div>
      
      {/* Session header */}
      <div className="card p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold mb-2">Replay Session</h1>
            <p className="text-dark-muted font-mono text-sm">{session.id}</p>
          </div>
          
          <span className={clsx('badge', getStatusBadge(session.status))}>
            {session.status}
          </span>
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-dark-muted">Original Event:</span>
            <Link
              to={`/events/${session.original_event_id}`}
              className="ml-2 text-dark-accent hover:underline font-mono"
            >
              {truncateId(session.original_event_id)}
            </Link>
          </div>
          <div>
            <span className="text-dark-muted">Initiated:</span>
            <span className="ml-2">{formatDate(session.initiated_at)}</span>
          </div>
          <div>
            <span className="text-dark-muted">By:</span>
            <span className="ml-2">{session.initiated_by}</span>
          </div>
          {session.completed_at && (
            <div>
              <span className="text-dark-muted">Completed:</span>
              <span className="ml-2">{formatDate(session.completed_at)}</span>
            </div>
          )}
        </div>
        
        <div className="flex gap-2 mt-4">
          {session.dry_run && <span className="badge badge-info">Dry Run</span>}
          {session.reset_cache && <span className="badge badge-warning">Cache Reset</span>}
        </div>
      </div>
      
      {/* Processing message */}
      {session.status === 'processing' && (
        <div className="card p-6 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-dark-accent border-t-transparent rounded-full mx-auto mb-4" />
          <p>Replay is processing...</p>
          <button onClick={fetchData} className="btn btn-secondary mt-4">
            Refresh
          </button>
        </div>
      )}
      
      {/* Failed message */}
      {session.status === 'failed' && (
        <div className="card p-6 text-center text-dark-error">
          Replay failed to complete.
        </div>
      )}
      
      {/* Completed - show tabs */}
      {session.status === 'completed' && (
        <>
          {/* Tabs */}
          <div className="border-b border-dark-border">
            <div className="flex gap-4">
              <button
                onClick={() => setActiveTab('diff')}
                className={clsx(
                  'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
                  activeTab === 'diff'
                    ? 'border-dark-accent text-dark-accent'
                    : 'border-transparent text-dark-muted hover:text-dark-text'
                )}
              >
                Diff
              </button>
              <button
                onClick={() => setActiveTab('original')}
                className={clsx(
                  'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
                  activeTab === 'original'
                    ? 'border-dark-accent text-dark-accent'
                    : 'border-transparent text-dark-muted hover:text-dark-text'
                )}
              >
                Original Trace
              </button>
              <button
                onClick={() => setActiveTab('replay')}
                className={clsx(
                  'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
                  activeTab === 'replay'
                    ? 'border-dark-accent text-dark-accent'
                    : 'border-transparent text-dark-muted hover:text-dark-text'
                )}
              >
                Replay Trace
              </button>
            </div>
          </div>
          
          {/* Tab content */}
          <div className="card p-6">
            {activeTab === 'diff' && session.diff_summary && (
              <ReplayDiff diff={session.diff_summary} />
            )}
            
            {activeTab === 'original' && (
              originalTree ? (
                <TraceTree tree={originalTree} />
              ) : (
                <div className="text-dark-muted text-center p-8">Original trace not available</div>
              )
            )}
            
            {activeTab === 'replay' && (
              replayTree ? (
                <TraceTree tree={replayTree} />
              ) : (
                <div className="text-dark-muted text-center p-8">Replay trace not available</div>
              )
            )}
          </div>
        </>
      )}
    </div>
  );
}
