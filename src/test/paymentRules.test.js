import {
  normalizePlate,
  isValidPlate,
  validateParkingPayment,
  validateExtensionPayment,
  calculateAmount,
  calculateEndTime,
  buildReceiptNumber
} from '../utils/paymentRules.js';

describe('HU-017 Payment Rules Unit Tests', () => {
  describe('normalizePlate & isValidPlate', () => {
    test('normalizes plate correctly converting to uppercase and stripping spaces/dashes', () => {
      // Arrange
      const rawPlate = ' abc-123 ';

      // Act
      const result = normalizePlate(rawPlate);

      // Assert
      expect(result).toBe('ABC123');
    });

    test('validates car (AAA123) and motorcycle (AAA12A) plates correctly', () => {
      // Arrange & Act & Assert
      expect(isValidPlate('ABC123')).toBe(true);
      expect(isValidPlate('XYZ98A')).toBe(true);
      expect(isValidPlate('INVALID')).toBe(false);
      expect(isValidPlate('123ABC')).toBe(false);
    });
  });

  describe('validateParkingPayment', () => {
    test('validates correct parking payment body', () => {
      // Arrange
      const body = { plate: 'ABC123', zone: 'A', spaceId: 'A1', rateType: 'hour', quantity: 2 };

      // Act
      const { data, error } = validateParkingPayment(body);

      // Assert
      expect(error).toBeNull();
      expect(data).toEqual({
        plate: 'ABC123',
        zone: 'A',
        spaceId: 'A1',
        rateType: 'hour',
        quantity: 2
      });
    });

    test('returns exact error message when plate is invalid', () => {
      // Arrange
      const body = { plate: 'BAD_PLATE', zone: 'A', rateType: 'hour', quantity: 1 };

      // Act
      const { error } = validateParkingPayment(body);

      // Assert
      expect(error).toEqual({ message: 'Please enter a valid plate.', status: 400 });
    });

    test('returns exact error message when zone is invalid', () => {
      // Arrange
      const body = { plate: 'ABC123', zone: 'Z', rateType: 'hour', quantity: 1 };

      // Act
      const { error } = validateParkingPayment(body);

      // Assert
      expect(error).toEqual({ message: 'Please select a valid zone.', status: 400 });
    });

    test('returns exact error message when quantity is out of range', () => {
      // Arrange
      const body = { plate: 'ABC123', zone: 'A', rateType: 'hour', quantity: 15 };

      // Act
      const { error } = validateParkingPayment(body);

      // Assert
      expect(error).toEqual({ message: 'Please enter a valid quantity.', status: 400 });
    });
  });

  describe('calculateAmount', () => {
    test('calculates hourly amount correctly', () => {
      // Arrange
      const rates = { ratePerHour: 2000, ratePerDay: 20000 };

      // Act
      const amount = calculateAmount('hour', 3, rates);

      // Assert
      expect(amount).toBe(6000);
    });

    test('calculates daily amount correctly', () => {
      // Arrange
      const rates = { ratePerHour: 2000, ratePerDay: 20000 };

      // Act
      const amount = calculateAmount('day', 2, rates);

      // Assert
      expect(amount).toBe(40000);
    });

    test('ignores amount sent by client body', () => {
      // Arrange
      const body = { plate: 'ABC123', zone: 'A', rateType: 'hour', quantity: 2, amount: 999999 };
      const { data } = validateParkingPayment(body);

      // Act
      const realAmount = calculateAmount(data.rateType, data.quantity, { ratePerHour: 2000, ratePerDay: 20000 });

      // Assert
      expect(realAmount).toBe(4000);
      expect(realAmount).not.toBe(999999);
    });
  });

  describe('calculateEndTime & buildReceiptNumber', () => {
    test('calculates end time for hourly and daily rates', () => {
      // Arrange
      const baseDate = new Date(2026, 10, 3, 10, 0, 0); // 3 de Noviembre 2026, 10:00:00 local

      // Act
      const endHourly = calculateEndTime(baseDate, 'hour', 2);
      const endDaily = calculateEndTime(baseDate, 'day', 1);

      // Assert
      expect(endHourly.getTime()).toBe(new Date(2026, 10, 3, 12, 0, 0).getTime());
      expect(endDaily.getTime()).toBe(new Date(2026, 10, 4, 10, 0, 0).getTime());
    });

    test('builds receipt number using predictable randomFn injection', () => {
      // Arrange
      const mockDate = new Date(2026, 10, 3, 12, 0, 0); // 3 de Noviembre 2026 local
      const fixedRandomFn = () => 0; // Siempre toma el primer carácter 'A'

      // Act
      const receipt = buildReceiptNumber(mockDate, fixedRandomFn);

      // Assert
      expect(receipt).toBe('TP-261103-AAAAAA');
      expect(receipt.length).toBeLessThanOrEqual(20);
    });
  });
});