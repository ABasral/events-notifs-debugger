import React from 'react';
import clsx from 'clsx';
import { TraceDiff, DecisionChange } from '../types';
import { getReasonLabel } from '../utils/format';

interface ReplayDiffProps {
  diff: TraceDiff;
}

export function ReplayDiff({ diff }: ReplayDiffProps) {
  const hasChanges =
    diff.original_only.length > 0 ||
    diff.replay_only.length > 0 ||
    diff.decision_changes.length > 0;
  
  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="p-4 bg-dark-surface rounded-lg border border-dark-border">
        <h3 className="text-lg font-semibold mb-2">Diff Summary</h3>
        <p className="text-dark-muted">{diff.summary}</p>
        
        <div className="flex gap-4 mt-3">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-dark-success" />
            <span>{diff.match_count} matches</span>
          </div>
          {diff.original_only.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-dark-error" />
              <span>{diff.original_only.length} regressions</span>
            </div>
          )}
          {diff.replay_only.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-dark-accent" />
              <span>{diff.replay_only.length} new</span>
            </div>
          )}
          {diff.decision_changes.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-dark-warning" />
              <span>{diff.decision_changes.length} changes</span>
            </div>
          )}
        </div>
      </div>
      
      {!hasChanges ? (
        <div className="text-center p-8 text-dark-muted">
          No differences detected. Replay produced identical results.
        </div>
      ) : (
        <>
          {/* Regressions (notified in original, skipped in replay) */}
          {diff.original_only.length > 0 && (
            <DiffSection
              title="Regressions"
              description="Users who were notified in original but skipped in replay"
              changes={diff.original_only}
              type="regression"
            />
          )}
          
          {/* New notifications (skipped in original, notified in replay) */}
          {diff.replay_only.length > 0 && (
            <DiffSection
              title="New Notifications"
              description="Users who were skipped in original but notified in replay"
              changes={diff.replay_only}
              type="new"
            />
          )}
          
          {/* Decision changes (same outcome, different reason) */}
          {diff.decision_changes.length > 0 && (
            <DiffSection
              title="Reason Changes"
              description="Users with same outcome but different skip reason"
              changes={diff.decision_changes}
              type="change"
            />
          )}
        </>
      )}
    </div>
  );
}

interface DiffSectionProps {
  title: string;
  description: string;
  changes: DecisionChange[];
  type: 'regression' | 'new' | 'change';
}

function DiffSection({ title, description, changes, type }: DiffSectionProps) {
  const borderColor = {
    regression: 'border-dark-error',
    new: 'border-dark-accent',
    change: 'border-dark-warning',
  }[type];
  
  return (
    <div className={clsx('p-4 bg-dark-surface rounded-lg border-l-4', borderColor, 'border border-dark-border')}>
      <h4 className="font-semibold mb-1">{title}</h4>
      <p className="text-sm text-dark-muted mb-3">{description}</p>
      
      <div className="space-y-2">
        {changes.map((change) => (
          <div
            key={change.user_id}
            className="flex items-center gap-4 p-2 bg-dark-bg rounded text-sm"
          >
            <span className="text-dark-accent font-mono">{change.user_id}</span>
            
            <div className="flex items-center gap-2">
              <span className={change.original_outcome === 'notified' ? 'text-dark-success' : 'text-dark-warning'}>
                {change.original_outcome}
              </span>
              <span className="text-dark-muted text-xs">
                ({getReasonLabel(change.original_reason)})
              </span>
            </div>
            
            <span className="text-dark-muted">→</span>
            
            <div className="flex items-center gap-2">
              <span className={change.replay_outcome === 'notified' ? 'text-dark-success' : 'text-dark-warning'}>
                {change.replay_outcome}
              </span>
              <span className="text-dark-muted text-xs">
                ({getReasonLabel(change.replay_reason)})
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
