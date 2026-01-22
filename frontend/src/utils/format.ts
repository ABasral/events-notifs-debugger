export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString();
}

export function formatTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString();
}

export function truncateId(id: string, length: number = 8): string {
  return id.substring(0, length);
}

export function getEventTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    like: '❤️ Like',
    comment: '💬 Comment',
    follow: '👤 Follow',
  };
  return labels[type] || type;
}

export function getEventIcon(type: string): string {
  switch (type) {
    case 'like': return '❤️';
    case 'comment': return '💬';
    case 'follow': return '👤';
    default: return '📥';
  }
}

export function getStageIcon(stage: string): string {
  switch (stage) {
    case 'RECEIVED': return '📥';
    case 'VALIDATED': return '✅';
    case 'RECIPIENT_RESOLVED': return '🎯';
    case 'NOTIFICATION_CREATED': return '🔔';
    case 'COMPLETED': return '✔️';
    case 'ERROR': return '❌';
    default: return '•';
  }
}
