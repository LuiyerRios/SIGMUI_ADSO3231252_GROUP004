import { validateResetEmail, validateNewPassword, classifyResetToken, RESET_MESSAGES } from '../utils/passwordResetRules.js';

describe('HU-009 Password Reset Rules Unit Tests', () => {
  test('validateResetEmail normalizes a valid email', () => {
    // Arrange & Act
    const result = validateResetEmail('  Driver@SIGMUI.com ');

    // Assert
    expect(result.value).toBe('driver@sigmui.com');
  });

  test('validateResetEmail rejects empty and malformed emails', () => {
    // Arrange & Act & Assert
    expect(validateResetEmail('').error).toBe(RESET_MESSAGES.emailRequired);
    expect(validateResetEmail('driver@').error).toBe(RESET_MESSAGES.emailInvalid);
  });

  test('validateNewPassword applies the HU-002 rule and the confirmation', () => {
    // Arrange & Act & Assert
    expect(validateNewPassword({ password: 'short', confirmPassword: 'short' }).error).toBe(RESET_MESSAGES.weak);
    expect(validateNewPassword({ password: 'NewPass123', confirmPassword: 'NewPass124' }).error).toBe(RESET_MESSAGES.mismatch);
    expect(validateNewPassword({ password: 'NewPass123', confirmPassword: 'NewPass123' }).value).toBe('NewPass123');
  });

  test('classifyResetToken detects valid, expired and used links', () => {
    // Arrange
    const now = new Date('2026-11-17T15:00:00Z');

    // Act & Assert
    expect(classifyResetToken(null, now)).toBe('invalid');
    expect(classifyResetToken({ usedAt: new Date(), expiresAt: '2026-11-17T16:00:00Z' }, now)).toBe('invalid');
    expect(classifyResetToken({ usedAt: null, expiresAt: '2026-11-17T14:59:00Z' }, now)).toBe('expired');
    expect(classifyResetToken({ usedAt: null, expiresAt: '2026-11-17T15:30:00Z' }, now)).toBe('valid');
  });
});
