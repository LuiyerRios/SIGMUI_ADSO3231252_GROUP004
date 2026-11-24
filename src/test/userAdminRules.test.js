import { validateUserUpdate, validateVehicleInput, checkAdminSafety } from '../utils/userAdminRules.js';

describe('HU-016 Manage Users Rules Unit Tests', () => {
  const validUser = { name: 'Laura Gomez', email: 'Laura@Mail.com', phone: '+57 300 111 2233', role: 'Client', status: 'Active', password: '' };

  describe('validateUserUpdate', () => {
    test('maps the UI role and status to the database values', () => {
      // Arrange & Act
      const result = validateUserUpdate({ ...validUser, role: 'Traffic Agent', status: 'Suspended' });

      // Assert
      expect(result.value).toMatchObject({ fullName: 'Laura Gomez', email: 'laura@mail.com', role: 'agent', status: 'suspended', password: null });
    });

    test('rejects invalid data with a clear message', () => {
      // Arrange & Act & Assert
      expect(validateUserUpdate({ ...validUser, name: 'Al' }).error).toMatch(/full name/);
      expect(validateUserUpdate({ ...validUser, email: 'nope' }).error).toMatch(/email/);
      expect(validateUserUpdate({ ...validUser, role: 'Root' }).error).toMatch(/role/);
      expect(validateUserUpdate({ ...validUser, password: 'weak' }).error).toMatch(/password/);
    });

    test('accepts a strong new password', () => {
      // Arrange & Act
      const result = validateUserUpdate({ ...validUser, password: 'NewPass123' });

      // Assert
      expect(result.value.password).toBe('NewPass123');
    });
  });

  describe('validateVehicleInput', () => {
    test('normalizes the plate and joins make and model', () => {
      // Arrange & Act
      const result = validateVehicleInput({ plate: 'abc-123', type: 'Car', make: 'Toyota', model: 'Corolla', ownerId: '4' });

      // Assert
      expect(result.value).toMatchObject({ plate: 'ABC123', vehicleType: 'Car', brandModel: 'Toyota Corolla', ownerId: 4 });
    });

    test('rejects a bad plate, type or owner', () => {
      // Arrange & Act & Assert
      expect(validateVehicleInput({ plate: '123ABC', type: 'Car', ownerId: 1 }).error).toMatch(/plate/);
      expect(validateVehicleInput({ plate: 'ABC123', type: 'Boat', ownerId: 1 }).error).toMatch(/type/);
      expect(validateVehicleInput({ plate: 'ABC123', type: 'Car' }).error).toMatch(/owner/);
    });
  });

  describe('checkAdminSafety', () => {
    const admin = { id: 1, role: 'admin', status: 'active' };

    test('the signed-in admin cannot suspend, demote or delete themselves', () => {
      // Arrange & Act & Assert
      expect(checkAdminSafety({ actorId: 1, target: admin, next: { role: 'admin', status: 'suspended' }, activeAdmins: 2 })).toBe('You cannot change your own account.');
      expect(checkAdminSafety({ actorId: 1, target: admin, next: { role: 'driver', status: 'active' }, activeAdmins: 2 })).toBe('You cannot change your own account.');
      expect(checkAdminSafety({ actorId: 1, target: admin, activeAdmins: 2 })).toMatch(/own account/);
    });

    test('at least one active administrator must remain', () => {
      // Arrange
      const otherAdmin = { id: 2, role: 'admin', status: 'active' };

      // Act & Assert
      expect(checkAdminSafety({ actorId: 1, target: otherAdmin, next: { role: 'driver', status: 'active' }, activeAdmins: 1 })).toMatch(/active administrator/);
      expect(checkAdminSafety({ actorId: 1, target: otherAdmin, activeAdmins: 1 })).toMatch(/last active administrator/);
      expect(checkAdminSafety({ actorId: 1, target: otherAdmin, activeAdmins: 2 })).toBeNull();
    });

    test('changes to drivers and agents are allowed', () => {
      // Arrange & Act & Assert
      expect(checkAdminSafety({ actorId: 1, target: { id: 5, role: 'driver', status: 'active' }, next: { role: 'driver', status: 'suspended' }, activeAdmins: 1 })).toBeNull();
    });
  });
});
