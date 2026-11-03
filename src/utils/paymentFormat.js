export function formatCOP(amount) {
  const numericAmount = Number(amount) || 0;
  const formatted = new Intl.NumberFormat('en-US').format(numericAmount);
  return `$${formatted} COP`;
}

export function formatPaymentDate(dateInput) {
  if (!dateInput) return '';
  const date = new Date(dateInput);

  const month = date.toLocaleDateString('en-US', { month: 'short', timeZone: 'America/Bogota' });
  const day = date.toLocaleDateString('en-US', { day: '2-digit', timeZone: 'America/Bogota' });
  const time = date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'America/Bogota'
  });

  return `${month} ${day} · ${time}`;
}