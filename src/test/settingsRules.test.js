import {
  validateProfile,
  isStrongPassword,
  validatePasswordChange,
  validateVehicle,
  SETTINGS_MESSAGES
} from '../utils/settingsRules.js';

describe('HU-014 Settings Rules Unit Tests', () => {
  describe('validateProfile', () => {
    test('accepts a valid name and phone and trims them', () => {
      // Arrange
      const body = { full_name: '  Luiyer Rios  ', phone: ' +57 300 123 4567 ' };

      // Act
      const result = validateProfile(body);

      // Assert
      expect(result.value).toEqual({ fullName: 'Luiyer Rios', phone: '+57 300 123 4567' });
    });

    test('stores an empty phone as null', () => {
      // Arrange & Act
      const result = validateProfile({ full_name: 'Ana Gomez', phone: '' });

      // Assert
      expect(result.value.phone).toBeNull();
    });

    test('rejects a short name or an invalid phone', () => {
      // Arrange & Act & Assert
      expect(validateProfile({ full_name: 'Al' }).error).toBe('profile');
      expect(validateProfile({ full_name: 'Ana Gomez', phone: 'abc' }).error).toBe('profile');
    });
  });

  describe('password change', () => {
    test('applies the HU-002 rule (8+ chars, uppercase and number)', () => {
      // Arrange & Act & Assert
      expect(isStrongPassword('Parking2026')).toBe(true);
      expect(isStrongPassword('parking2026')).toBe(false);
      expect(isStrongPassword('Parking')).toBe(false);
      expect(isStrongPassword('Pa1')).toBe(false);
    });

    test('returns the right error code for each case', () => {
      // Arrange
      const base = { currentPassword: 'OldPass123', newPassword: 'NewPass123', confirmPassword: 'NewPass123' };

      // Act & Assert
      expect(validatePasswordChange({ ...base, currentPassword: '' }).error).toBe('password_required');
      expect(validatePasswordChange({ ...base, newPassword: 'weak', confirmPassword: 'weak' }).error).toBe('password_weak');
      expect(validatePasswordChange({ ...base, confirmPassword: 'Other123' }).error).toBe('password_match');
      expect(validatePasswordChange({ ...base, newPassword: 'OldPass123', confirmPassword: 'OldPass123' }).error).toBe('password_same');
      expect(validatePasswordChange(base).value).toEqual({ currentPassword: 'OldPass123', newPassword: 'NewPass123' });
    });
  });

  describe('validateVehicle', () => {
    test('normalizes the plate and accepts car and motorcycle formats', () => {
      // Arrange & Act
      const car = validateVehicle({ plate: ' abc-123 ', brand_model: 'Mazda 3' });
      const moto = validateVehicle({ plate: 'xyz12a' });

      // Assert
      expect(car.value).toEqual({ plate: 'ABC123', brandModel: 'Mazda 3' });
      expect(moto.value).toEqual({ plate: 'XYZ12A', brandModel: null });
    });

    test('rejects invalid plates and long brand names', () => {
      // Arrange & Act & Assert
      expect(validateVehicle({ plate: '12ABC3' }).error).toBe('plate_invalid');
      expect(validateVehicle({ plate: 'ABC123', brand_model: 'x'.repeat(61) }).error).toBe('brand_long');
    });
  });

  test('every error code has a user message', () => {
    // Arrange
    const codes = ['profile', 'password_required', 'password_current', 'password_weak', 'password_match',
      'password_same', 'plate_invalid', 'plate_taken', 'brand_long', 'vehicle_active', 'vehicle_not_found', 'server'];

    // Act & Assert
    codes.forEach((code) => expect(SETTINGS_MESSAGES.error[code]).toEqual(expect.any(String)));
  });
});