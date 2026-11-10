export function formatReportTitle(reportId) {
  if (!reportId) return 'Reply to your report';
  const paddedId = String(reportId).padStart(4, '0');
  return `Reply to your report #HR-${paddedId}`;
}

export function formatInboxDate(dateInput) {
  if (!dateInput) return '';
  const date = new Date(dateInput);
  const now = new Date();

  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isToday) return 'Today';
  if (isYesterday) return 'Yesterday';

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatInboxDetailDateTime(dateInput) {
  if (!dateInput) return '';
  const date = new Date(dateInput);
  const dateStr = formatInboxDate(date);
  const timeStr = date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  return `${dateStr} · ${timeStr}`;
}