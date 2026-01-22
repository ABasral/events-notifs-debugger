import React, { useState } from 'react';
import clsx from 'clsx';
import { TraceTree as TraceTreeType, UserDecision, RuleEvaluation } from '../types';
import {
  getDecisionBadge,
  getDecisionColor,
  getReasonLabel,
  getStepTypeIcon,
  formatDuration,
} from '../utils/format';

interface TraceTreeProps {
  tree: TraceTreeType;
}

export function TraceTree({ tree }: TraceTreeProps) {
  return (
    <div className="font-mono text-sm">
      {/* Summary */}
      <div className="mb-4 p-3 bg-dark-surface rounded-lg border border-dark-border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-dark-muted">Summary</span>
          <span className="text-dark-muted">{formatDuration(tree.duration_ms)}</span>
        </div>
        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-dark-success" />
            <span>{tree.summary.notified} notified</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-dark-warning" />
            <span>{tree.summary.skipped} skipped</span>
          </div>
          {tree.summary.errors > 0 && (
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-dark-error" />
              <span>{tree.summary.errors} errors</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Tree */}
      <div className="space-y-2">
        <TreeNode type="fanout_start" label="Fanout Start" />
        
        {tree.rules_evaluated.map((rule, idx) => (
          <RuleNode key={rule.rule.id} rule={rule} isLast={idx === tree.rules_evaluated.length - 1} />
        ))}
        
        <TreeNode type="fanout_end" label="Fanout End" />
      </div>
    </div>
  );
}

interface TreeNodeProps {
  type: string;
  label: string;
  children?: React.ReactNode;
  indent?: number;
}

function TreeNode({ type, label, children, indent = 0 }: TreeNodeProps) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = React.Children.count(children) > 0;
  
  return (
    <div style={{ marginLeft: indent * 16 }}>
      <div
        className={clsx(
          'flex items-center gap-2 py-1 px-2 rounded hover:bg-dark-border/30',
          hasChildren && 'cursor-pointer'
        )}
        onClick={() => hasChildren && setExpanded(!expanded)}
      >
        {hasChildren && (
          <span className="text-dark-muted">{expanded ? '▼' : '▶'}</span>
        )}
        <span>{getStepTypeIcon(type)}</span>
        <span>{label}</span>
      </div>
      {expanded && children && <div className="tree-line ml-3">{children}</div>}
    </div>
  );
}

interface RuleNodeProps {
  rule: RuleEvaluation;
  isLast: boolean;
}

function RuleNode({ rule, isLast }: RuleNodeProps) {
  const [expanded, setExpanded] = useState(true);
  
  return (
    <div className="ml-4">
      <div
        className="flex items-center gap-2 py-1 px-2 rounded hover:bg-dark-border/30 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="text-dark-muted">{expanded ? '▼' : '▶'}</span>
        <span>📋</span>
        <span className="text-dark-accent">{rule.rule.name}</span>
        <span className="text-dark-muted text-xs">v{rule.rule.version}</span>
        <span className="text-dark-muted text-xs">
          ({rule.user_decisions.length} users)
        </span>
      </div>
      
      {expanded && (
        <div className="ml-6 tree-line pl-4 space-y-1">
          {rule.user_decisions.map((decision) => (
            <UserDecisionNode key={decision.user_id} decision={decision} />
          ))}
        </div>
      )}
    </div>
  );
}

interface UserDecisionNodeProps {
  decision: UserDecision;
}

function UserDecisionNode({ decision }: UserDecisionNodeProps) {
  const [expanded, setExpanded] = useState(false);
  
  return (
    <div>
      <div
        className="flex items-center gap-2 py-1 px-2 rounded hover:bg-dark-border/30 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="text-dark-muted">{expanded ? '▼' : '▶'}</span>
        <span className={getDecisionColor(decision.outcome === 'notified' ? 'notify' : 'skip')}>
          {decision.outcome === 'notified' ? '✓' : '✗'}
        </span>
        <span className="text-dark-accent">{decision.user_id}</span>
        <span className={clsx('badge', getDecisionBadge(decision.outcome === 'notified' ? 'notify' : 'skip'))}>
          {getReasonLabel(decision.reason_code)}
        </span>
      </div>
      
      {expanded && decision.steps.length > 0 && (
        <div className="ml-6 tree-line pl-4 text-xs text-dark-muted space-y-1">
          {decision.steps.map((step, idx) => (
            <div key={step.id} className="flex items-center gap-2">
              <span>{getStepTypeIcon(step.step_type)}</span>
              <span>{step.step_type}</span>
              <span className={getDecisionColor(step.decision)}>
                {step.decision}
              </span>
              {step.cache_key && (
                <span className="text-dark-muted truncate max-w-xs" title={step.cache_key}>
                  {step.cache_key}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
