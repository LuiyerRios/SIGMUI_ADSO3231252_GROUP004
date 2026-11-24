// HU-019 (#35) · Pruebas unitarias de tarifas y reglas por zona (Arrange / Act / Assert)
import {
  validateZoneSettings,
  validateVehicleRate,
  occupancyLevel,
  parseRate,
  isWithinSchedule,
  formatSchedule,
  ZONE_MESSAGES
} from '../utils/zoneRules.js';

const validBody = {
  vehicleClass: 'motorcycle',
  opensAt: '06:00',
  closesAt: '20:00',
  allowsExtension: true
};

describe('HU-019 · validateZoneSettings', () => {
  test('acepta datos válidos y normaliza el horario a HH:MM:SS', () => {
    // Arrange / Act
    const { value, error } = validateZoneSettings(validBody);

    // Assert
    expect(error).toBeUndefined();
    expect(value).toEqual({
      vehicleClass: 'motorcycle',
      opensAt: '06:00:00',
      closesAt: '20:00:00',
      allowsExtension: true
    });
  });

  test('rechaza una clase de zona desconocida', () => {
    expect(validateZoneSettings({ ...validBody, vehicleClass: 'planes' }).error).toBe(ZONE_MESSAGES.vehicleClass);
  });

  test.each(['', '0', '-100', 'abc', '12.5', '2000000'])('rechaza la tarifa "%s" de un tipo de vehículo', (rate) => {
    // Arrange
    const body = { ratePerHour: rate, ratePerDay: '22000' };

    // Act
    const { error } = validateVehicleRate(body);

    // Assert
    expect(error).toBe(ZONE_MESSAGES.rates);
  });

  test('rechaza un cierre igual o anterior a la apertura', () => {
    expect(validateZoneSettings({ ...validBody, closesAt: '06:00' }).error).toBe(ZONE_MESSAGES.schedule);
    expect(validateZoneSettings({ ...validBody, closesAt: '05:00' }).error).toBe(ZONE_MESSAGES.schedule);
  });

  test('rechaza horas con formato inválido', () => {
    expect(validateZoneSettings({ ...validBody, opensAt: '25:00' }).error).toBe(ZONE_MESSAGES.scheduleFormat);
  });

  test('interpreta la casilla de extensión desmarcada como false', () => {
    const { value } = validateZoneSettings({ ...validBody, allowsExtension: false });
    expect(value.allowsExtension).toBe(false);
  });
});

describe('HU-019 · horario de servicio', () => {
  test('parseRate solo acepta enteros positivos', () => {
    expect(parseRate('3000')).toBe(3000);
    expect(parseRate(' 3000 ')).toBe(3000);
    expect(parseRate('3e3')).toBeNull();
  });

  test('isWithinSchedule incluye la apertura y excluye el cierre', () => {
    expect(isWithinSchedule('06:00:00', '20:00:00', 6 * 60)).toBe(true);
    expect(isWithinSchedule('06:00:00', '20:00:00', 19 * 60 + 59)).toBe(true);
    expect(isWithinSchedule('06:00:00', '20:00:00', 20 * 60)).toBe(false);
    expect(isWithinSchedule('06:00:00', '20:00:00', 5 * 60)).toBe(false);
  });

  test('formatSchedule muestra "Open 24 hours" con el horario por defecto', () => {
    expect(formatSchedule('00:00:00', '23:59:00')).toBe('Open 24 hours');
    expect(formatSchedule('06:00:00', '20:00:00')).toBe('06:00 – 20:00');
  });
});

describe('HU-003 · occupancyLevel', () => {
  test('High desde 70%, Medium entre 30% y 69%, Low por debajo de 30%', () => {
    expect(occupancyLevel(40, 12)).toMatchObject({ percent: 70, level: 'High' });
    expect(occupancyLevel(40, 28)).toMatchObject({ percent: 30, level: 'Medium' });
    expect(occupancyLevel(40, 29)).toMatchObject({ percent: 28, level: 'Low' });
    expect(occupancyLevel(0, 0)).toMatchObject({ percent: 0, level: 'Low' });
  });
});
