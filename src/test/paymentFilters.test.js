import { parseFilters } from '../utils/paymentFilters.js';

describe('HU-017 Payment Filters Unit Tests', () => {
  const mockToday = new Date(2026, 10, 3); // 2026-11-03 en hora local

  test('returns default 30 days date range when no query params are provided', () => {
    // Arrange & Act
    const { filters, error } = parseFilters({}, mockToday);

    // Assert
    expect(error).toBeNull();
    expect(filters.to).toBe('2026-11-03');
    expect(filters.from).toBe('2026-10-04');
    expect(filters.zone).toBe('all');
    expect(filters.plate).toBe('');
    expect(filters.page).toBe(1);
  });

  test('returns exact error message when start date is after end date', () => {
    // Arrange
    const query = { from: '2026-11-10', to: '2026-11-01' };

    // Act
    const { filters, error } = parseFilters(query, mockToday);

    // Assert
    expect(filters).toBeNull();
    expect(error).toBe('The start date must be before the end date.');
  });

  test('resets invalid real dates to default dates', () => {
    // Arrange
    const query = { from: '2026-13-45', to: '2026-11-03' };

    // Act
    const { filters, error } = parseFilters(query, mockToday);

    // Assert
    expect(error).toBeNull();
    expect(filters.from).toBe('2026-10-04');
  });

  test('normalizes zone and cleans plate with special characters', () => {
    // Arrange
    const query = { zone: 'invalid_zone', plate: 'abc-123!@#', page: '-5' };

    // Act
    const { filters } = parseFilters(query, mockToday);

    // Assert
    expect(filters.zone).toBe('all');
    expect(filters.plate).toBe('ABC123');
    expect(filters.page).toBe(1);
  });
});