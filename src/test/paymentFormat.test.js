import { formatCOP, formatPaymentDate } from '../utils/paymentFormat.js';

describe('HU-017 Payment Format Unit Tests', () => {
  test('formats COP currency values correctly', () => {
    // Arrange & Act & Assert
    expect(formatCOP(0)).toBe('$0 COP');
    expect(formatCOP(2000)).toBe('$2,000 COP');
    expect(formatCOP(1234567)).toBe('$1,234,567 COP');
  });

  test('formats payment dates with short month, numeric day and 24h cycle', () => {
    // Arrange
    const date = new Date('2026-11-03T14:05:00-05:00');

    // Act
    const formatted = formatPaymentDate(date);

    // Assert
    expect(formatted).toContain('Nov');
    expect(formatted).toContain('3');
    expect(formatted).toContain('14:05');
  });
});