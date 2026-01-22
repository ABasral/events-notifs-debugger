import React, { useEffect, useRef } from 'react';
import clsx from 'clsx';
import { TraceStep } from '../types';
import { useAppStore } from '../stores/app-store';
import {
  formatDateShort,
  getStepTypeIcon,
  getDecisionColor,
  getDecisionBadge,
  getReasonLabel,
  truncateId,
} from '../utils/format';

export function LiveStream() {
  const steps = useAppStore((s) => s.liveSteps);
  const isConnected = useAppStore((s) => s.isStreamConnected);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll to bottom
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [steps]);
  
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">Live Trace Stream</h2>
          <div className="flex items-center gap-2">
            <span
              className={clsx(
                'w-2 h-2 rounded-full',
                isConnected ? 'bg-dark-success animate-pulse-slow' : 'bg-dark-error'
              )}
            />
            <span className="text-sm text-dark-muted">
              {isConnected ? 'Live' : 'Disconnected'}
            </span>
          </div>
        </div>
        
        <div className="text-sm text-dark-muted">
          {steps.length} steps
        </div>
      </div>
      
      {/* Stream */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto bg-dark-surface rounded-lg border border-dark-border"
      >
        {steps.length === 0 ? (
          <div className="flex items-center justify-center h-full text-dark-muted">
            Waiting for trace steps...
          </div>
        ) : (
          <table className="w-full text-sm font-mono">
            <thead className="sticky top-0 bg-dark-surface border-b border-dark-border">
              <tr className="text-left text-dark-muted">
                <th className="px-3 py-2">Time</th>
                <th className="px-3 py-2">Trace</th>
                <th className="px-3 py-2">Step</th>
                <th className="px-3 py-2">User</th>
                <th className="px-3 py-2">Decision</th>
                <th className="px-3 py-2">Reason</th>
              </tr>
            </thead>
            <tbody>
              {steps.map((step) => (
                <StreamRow key={step.id} step={step} />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function StreamRow({ step }: { step: TraceStep }) {
  return (
    <tr className="border-b border-dark-border/50 hover:bg-dark-border/30">
      <td className="px-3 py-2 text-dark-muted">
        {formatDateShort(step.started_at)}
      </td>
      <td className="px-3 py-2 text-dark-accent">
        {truncateId(step.trace_id)}
      </td>
      <td className="px-3 py-2">
        <span className="mr-2">{getStepTypeIcon(step.step_type)}</span>
        {step.step_type}
      </td>
      <td className="px-3 py-2 text-dark-accent">
        {step.target_user_id || '-'}
      </td>
      <td className="px-3 py-2">
        <span className={getDecisionColor(step.decision)}>
          {step.decision}
        </span>
      </td>
      <td className="px-3 py-2">
        <span className={clsx('badge text-xs', getDecisionBadge(step.decision))}>
          {getReasonLabel(step.reason_code)}
        </span>
      </td>
    </tr>
  );
}
