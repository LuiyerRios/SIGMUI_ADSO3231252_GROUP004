import { validatePlateInput, classifyPlate, formatDuration, generateFineNumber, validateFineInput } from '../utils/agentRules.js';

describe('HU-006 / HU-007 Agent Rules Unit Tests', () => {
  describe('validatePlateInput', () => {
    test('normalizes a valid car or motorcycle plate', () => {
      // Arrange & Act & Assert
      expect(validatePlateInput(' abc-123 ').value).toBe('ABC123');
      expect(validatePlateInput('xyz12d').value).toBe('XYZ12D');
    });

    test('rejects empty input, special characters and wrong formats', () => {
      // Arrange & Act & Assert
      expect(validatePlateInput('   ').error).toMatch(/enter a license plate/);
      expect(validatePlateInput('ABC#23').error).toMatch(/Special characters/);
      expect(validatePlateInput('12ABC3').error).toMatch(/Invalid license plate/);
    });
  });

  describe('classifyPlate', () => {
    // Arrange
    const now = new Date('2026-11-17T15:00:00Z');

    test('classifies active, expired and not registered plates', () => {
      // Act & Assert
      expect(classifyPlate(null, now)).toBe('not_registered');
      expect(classifyPlate({ status: 'active', end_time: '2026-11-17T16:00:00Z' }, now)).toBe('active');
      expect(classifyPlate({ status: 'active', end_time: '2026-11-17T14:00:00Z' }, now)).toBe('expired');
      expect(classifyPlate({ status: 'completed', end_time: '2026-11-17T16:00:00Z' }, now)).toBe('expired');
    });
  });

  test('formatDuration shows hours and minutes', () => {
    // Arrange & Act & Assert
    expect(formatDuration(100 * 60000)).toBe('1 h 40 min');
    expect(formatDuration(45 * 60000)).toBe('45 min');
    expect(formatDuration(2 * 3600000)).toBe('2 h');
  });

  test('generateFineNumber uses the Colombia date and a 6-character code', () => {
    // Arrange
    const now = new Date('2026-11-18T03:00:00Z'); // 17 nov en Colombia

    // Act
    const number = generateFineNumber(now, () => 0);

    // Assert
    expect(number).toBe('FN-261117-AAAAAA');
  });

  test('validateFineInput requires a location and limits comments', () => {
    // Arrange & Act & Assert
    expect(validateFineInput({ plate: 'ABC123', location: 'Zone A · A7' }).value).toEqual({ plate: 'ABC123', location: 'Zone A · A7', comments: null });
    expect(validateFineInput({ plate: 'ABC123', location: '' }).error).toMatch(/location/);
    expect(validateFineInput({ plate: 'ABC123', location: 'Zone A', comments: 'x'.repeat(301) }).error).toMatch(/Comments/);
  });
});
