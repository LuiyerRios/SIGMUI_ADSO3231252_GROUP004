// HU-018 (#35) · Pruebas unitarias de tarifas y reglas por zona (Arrange / Act / Assert)
import {
  validateZoneSettings,
  parseRate,
  isWithinSchedule,
  formatSchedule,
  ZONE_MESSAGES
} from '../utils/zoneRules.js';

const validBody = {
  ratePerHour: '2500',
  ratePerDay: '22000',
  opensAt: '06:00',
  closesAt: '20:00',
  allowsExtension: true
};

describe('HU-018 · validateZoneSettings', () => {
  test('acepta datos válidos y normaliza el horario a HH:MM:SS', () => {
    // Arrange / Act
    const { value, error } = validateZoneSettings(validBody);

    // Assert
    expect(error).toBeUndefined();
    expect(value).toEqual({
      ratePerHour: 2500,
      ratePerDay: 22000,
      opensAt: '06:00:00',
      closesAt: '20:00:00',
      allowsExtension: true
    });
  });

  test.each(['', '0', '-100', 'abc', '12.5', '2000000'])('rechaza la tarifa "%s"', (rate) => {
    // Arrange
    const body = { ...validBody, ratePerHour: rate };

    // Act
    const { error } = validateZoneSettings(body);

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

describe('HU-018 · horario de servicio', () => {
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
