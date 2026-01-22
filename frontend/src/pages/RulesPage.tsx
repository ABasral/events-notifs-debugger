import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { FanoutRule } from '../types';
import { Loading } from '../components/Loading';
import { formatRelative } from '../utils/format';
import clsx from 'clsx';

export function RulesPage() {
  const [rules, setRules] = useState<FanoutRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  
  useEffect(() => {
    fetchRules();
  }, [showInactive]);
  
  async function fetchRules() {
    setLoading(true);
    setError(null);
    
    try {
      const result = await api.rules.list(!showInactive);
      setRules(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load rules');
    } finally {
      setLoading(false);
    }
  }
  
  async function toggleActive(rule: FanoutRule) {
    try {
      if (rule.is_active) {
        await api.rules.deactivate(rule.id);
      } else {
        await api.rules.activate(rule.id);
      }
      fetchRules();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update rule');
    }
  }
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Fanout Rules</h1>
        
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="w-4 h-4"
          />
          <span>Show inactive rules</span>
        </label>
      </div>
      
      {loading ? (
        <Loading />
      ) : error ? (
        <div className="card p-4 text-dark-error">{error}</div>
      ) : rules.length === 0 ? (
        <div className="card p-8 text-center text-dark-muted">No rules found</div>
      ) : (
        <div className="space-y-4">
          {rules.map((rule) => (
            <div key={rule.id} className="card p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg font-semibold">{rule.name}</h2>
                    <span className={clsx(
                      'badge',
                      rule.is_active ? 'badge-success' : 'badge-neutral'
                    )}>
                      {rule.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <span className="badge badge-info">v{rule.version}</span>
                  </div>
                  {rule.description && (
                    <p className="text-dark-muted text-sm mt-1">{rule.description}</p>
                  )}
                </div>
                
                <button
                  onClick={() => toggleActive(rule)}
                  className={clsx(
                    'btn btn-sm',
                    rule.is_active ? 'btn-secondary' : 'btn-primary'
                  )}
                >
                  {rule.is_active ? 'Deactivate' : 'Activate'}
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-dark-muted">Event Types:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {rule.event_types.map((type) => (
                      <span key={type} className="badge badge-neutral">{type}</span>
                    ))}
                  </div>
                </div>
                
                <div>
                  <span className="text-dark-muted">Target Selector:</span>
                  <div className="mt-1">{rule.target_selector.type}</div>
                </div>
                
                <div>
                  <span className="text-dark-muted">Priority:</span>
                  <div className="mt-1">{rule.priority}</div>
                </div>
                
                <div>
                  <span className="text-dark-muted">Updated:</span>
                  <div className="mt-1">{formatRelative(rule.updated_at)}</div>
                </div>
              </div>
              
              {/* Throttle/Dedupe config */}
              <div className="flex gap-4 mt-4">
                {rule.throttle_config && (
                  <div className="text-sm">
                    <span className="text-dark-muted">Throttle:</span>
                    <span className="ml-2">
                      {rule.throttle_config.limit} / {rule.throttle_config.window_seconds}s
                    </span>
                  </div>
                )}
                
                {rule.dedupe_config && (
                  <div className="text-sm">
                    <span className="text-dark-muted">Dedupe:</span>
                    <span className="ml-2">{rule.dedupe_config.window_seconds}s window</span>
                  </div>
                )}
              </div>
              
              {/* View traces link */}
              <div className="mt-4 pt-4 border-t border-dark-border">
                <Link
                  to={`/traces?rule_id=${rule.id}`}
                  className="text-dark-accent hover:underline text-sm"
                >
                  View traces using this rule →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
