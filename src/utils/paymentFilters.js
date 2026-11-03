function formatDateLocal(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isValidRealDate(dateStr) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return (
    d.getFullYear() === year &&
    d.getMonth() === month - 1 &&
    d.getDate() === day
  );
}

export function parseFilters(query = {}, today = new Date()) {
  let from = query.from ? String(query.from).trim() : '';
  let to = query.to ? String(query.to).trim() : '';

  const defaultToDate = new Date(today);
  const defaultFromDate = new Date(today);
  defaultFromDate.setDate(defaultFromDate.getDate() - 30);

  const defaultTo = formatDateLocal(defaultToDate);
  const defaultFrom = formatDateLocal(defaultFromDate);

  if (!isValidRealDate(from)) from = defaultFrom;
  if (!isValidRealDate(to)) to = defaultTo;

  if (from > to) {
    return {
      filters: null,
      error: 'The start date must be before the end date.'
    };
  }

  const rawZone = String(query.zone ?? '').trim().toUpperCase();
  const zone = ['A', 'B', 'C', 'D', 'E', 'F'].includes(rawZone) ? rawZone : 'all';

  const rawPlate = String(query.plate ?? '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  const plate = rawPlate.slice(0, 10);

  const parsedPage = parseInt(query.page, 10);
  const page = Number.isInteger(parsedPage) && parsedPage >= 1 ? parsedPage : 1;

  return {
    filters: { from, to, zone, plate, page },
    error: null
  };
}