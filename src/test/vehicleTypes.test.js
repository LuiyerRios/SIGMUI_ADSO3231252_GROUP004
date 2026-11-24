// Tipos de vehículo y regla de placa según el tipo (Arrange / Act / Assert)
import { VEHICLE_TYPES, normalizeVehicleType, isValidPlateForType, vehicleIcon, guessVehicleType, plateErrorMessage } from '../utils/vehicleTypes.js';
import { validateParkingPayment } from '../utils/paymentRules.js';

describe('vehicleTypes', () => {
  test('incluye motos, camiones, camionetas y bicicletas', () => {
    expect(VEHICLE_TYPES).toEqual(expect.arrayContaining(['Car', 'Motorcycle', 'SUV', 'Truck', 'Van', 'Bicycle']));
  });

  test('normaliza el tipo sin importar mayúsculas y rechaza tipos desconocidos', () => {
    expect(normalizeVehicleType('motorcycle')).toBe('Motorcycle');
    expect(normalizeVehicleType('Plane')).toBeNull();
  });

  test('carros y motos usan placa colombiana; bicicletas, número de serie', () => {
    expect(isValidPlateForType('ABC123', 'Car')).toBe(true);
    expect(isValidPlateForType('ABC12D', 'Car')).toBe(false);
    expect(isValidPlateForType('ABC123', 'Truck')).toBe(true);
    expect(isValidPlateForType('ABC12D', 'Motorcycle')).toBe(true);
    // Motos antiguas con placa tipo carro
    expect(isValidPlateForType('ABC123', 'Motorcycle')).toBe(true);
    // Sin tipo (flujos viejos) se aceptan ambos formatos
    expect(isValidPlateForType('ABC12D', null)).toBe(true);
    expect(isValidPlateForType('SERIAL01', 'Car')).toBe(false);
    expect(isValidPlateForType('SERIAL01', 'Bicycle')).toBe(true);
    expect(isValidPlateForType('B1', 'Bicycle')).toBe(false);
  });

  test('deduce moto por la letra final y da el mensaje según el tipo', () => {
    expect(guessVehicleType('XYZ12A')).toBe('Motorcycle');
    expect(guessVehicleType('XYZ123')).toBe('Car');
    expect(plateErrorMessage('Motorcycle')).toMatch(/older motorcycles/);
  });

  test('cada tipo tiene un ícono y un tipo desconocido usa el del carro', () => {
    expect(vehicleIcon('Bicycle')).toBe('fa-bicycle');
    expect(vehicleIcon('???')).toBe('fa-car');
  });
});

describe('validateParkingPayment · espacio y vehículo', () => {
  test('conserva el espacio elegido, el tipo y la opción de guardar el vehículo', () => {
    // Arrange
    const body = { plate: 'gw1234bk', zone: 'a', spaceId: 'a26', rateType: 'hour', quantity: 1, vehicleType: 'bicycle', saveVehicle: 'true' };

    // Act
    const { data, error } = validateParkingPayment(body);

    // Assert
    expect(error).toBeNull();
    expect(data).toMatchObject({ plate: 'GW1234BK', zone: 'A', spaceId: 'A26', vehicleType: 'Bicycle', saveVehicle: true });
  });

  test('rechaza un espacio de otra zona', () => {
    const { error } = validateParkingPayment({ plate: 'ABC123', zone: 'A', spaceId: 'B4', rateType: 'hour', quantity: 1 });
    expect(error.status).toBe(400);
  });
});
