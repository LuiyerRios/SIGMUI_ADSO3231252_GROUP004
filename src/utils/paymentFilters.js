export function parseFilters(query = {}, today = new Date()) {
  let from = query.from ? String(query.from).trim() : '';
  let to = query.to ? String(query.to).trim() : '';

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

  const defaultToDate = new Date(today);
  const defaultFromDate = new Date(today);
  defaultFromDate.setDate(defaultFromDate.getDate() - 30);

  const defaultTo = defaultToDate.toISOString().split('T')[0];
  const defaultFrom = defaultFromDate.toISOString().split('T')[0];

  if (!dateRegex.test(from)) from = defaultFrom;
  if (!dateRegex.test(to)) to = defaultTo;

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