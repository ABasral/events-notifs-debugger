import React from 'react';
import { Link } from 'react-router-dom';
import { Event } from '../types';
import { formatDateShort, getEventTypeLabel, truncateId } from '../utils/format';

interface EventCardProps {
  event: Event;
  compact?: boolean;
}

export function EventCard({ event, compact = false }: EventCardProps) {
  if (compact) {
    return (
      <Link
        to={`/events/${event.id}`}
        className="flex items-center gap-3 px-3 py-2 hover:bg-dark-border/50 rounded transition-colors"
      >
        <span className="text-dark-muted text-xs font-mono">
          {formatDateShort(event.occurred_at)}
        </span>
        <span className="text-sm">{getEventTypeLabel(event.event_type)}</span>
        <span className="text-dark-muted text-sm">
          {event.actor_user_id} → {event.target_user_id || 'N/A'}
        </span>
        <span className="text-dark-muted text-xs font-mono ml-auto">
          {truncateId(event.id)}
        </span>
      </Link>
    );
  }
  
  return (
    <Link
      to={`/events/${event.id}`}
      className="card p-4 hover:border-dark-accent transition-colors"
    >
      <div className="flex items-start justify-between mb-2">
        <span className="text-lg">{getEventTypeLabel(event.event_type)}</span>
        <span className="text-dark-muted text-xs font-mono">{truncateId(event.id)}</span>
      </div>
      
      <div className="text-sm space-y-1">
        <div className="flex gap-2">
          <span className="text-dark-muted">Actor:</span>
          <span className="text-dark-accent">{event.actor_user_id}</span>
        </div>
        {event.target_user_id && (
          <div className="flex gap-2">
            <span className="text-dark-muted">Target:</span>
            <span className="text-dark-accent">{event.target_user_id}</span>
          </div>
        )}
        {event.target_entity_id && (
          <div className="flex gap-2">
            <span className="text-dark-muted">Entity:</span>
            <span>{event.target_entity_type}/{event.target_entity_id}</span>
          </div>
        )}
      </div>
      
      <div className="mt-3 text-xs text-dark-muted">
        {formatDateShort(event.occurred_at)}
      </div>
    </Link>
  );
}
