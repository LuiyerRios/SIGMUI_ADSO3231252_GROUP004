const { calcularTarifa, validarPlaca } = require('../src/utils/parkingCalculator');

describe('Pruebas unitarias: Módulo de Parqueadero', () => {

  describe('Función calcularTarifa', () => {

    test('debería retornar 0 si la permanencia está dentro del tiempo de gracia (<= 15 min)', () => {
      // 1. Arrange: Preparar datos
      const entrada = '2026-03-30T10:00:00';
      const salida = '2026-03-30T10:12:00'; // 12 minutos
      const tipo = 'AUTO';

      // 2. Act: Ejecutar función
      const resultado = calcularTarifa(entrada, salida, tipo);

      // 3. Assert: Comparar resultado
      expect(resultado).toBe(0);
    });

    test('debería cobrar 1 hora completa si supera el tiempo de gracia (ej. 20 min)', () => {
      // Arrange
      const entrada = '2026-03-30T10:00:00';
      const salida = '2026-03-30T10:20:00'; // 20 minutos -> Cobra 1 hora

      // Act
      const resultado = calcularTarifa(entrada, salida, 'AUTO');

      // Assert
      expect(resultado).toBe(3000);
    });

    test('debería calcular la tarifa correcta para una MOTO estacionada por 2 horas y 5 minutos', () => {
      // Arrange
      const entrada = '2026-03-30T10:00:00';
      const salida = '2026-03-30T12:05:00'; // 125 minutos -> Cobra 3 horas ($1500 * 3)

      // Act
      const resultado = calcularTarifa(entrada, salida, 'MOTO');

      // Assert
      expect(resultado).toBe(4500);
    });

    test('debería lanzar un error cuando se ingresa un tipo de vehículo no soportado', () => {
      // Arrange, Act & Assert
      expect(() => {
        calcularTarifa('2026-03-30T10:00:00', '2026-03-30T11:00:00', 'CAMION');
      }).toThrow('Tipo de vehículo no válido');
    });

    test('debería lanzar un error si la hora de salida es anterior a la entrada', () => {
      // Arrange
      const entrada = '2026-03-30T10:00:00';
      const salida = '2026-03-30T09:00:00';

      // Act & Assert
      expect(() => {
        calcularTarifa(entrada, salida, 'AUTO');
      }).toThrow('La hora de salida debe ser posterior a la hora de entrada');
    });

  });

  describe('Función validarPlaca', () => {

    test('debería retornar true para una placa de AUTO con formato correcto (AAA123)', () => {
      // Arrange & Act
      const esValida = validarPlaca('ABC123', 'AUTO');

      // Assert
      expect(esValida).toBe(true);
    });

    test('debería retornar false para una placa de AUTO con formato erróneo', () => {
      // Arrange & Act
      const esValida = validarPlaca('123ABC', 'AUTO');

      // Assert
      expect(esValida).toBe(false);
    });

    test('debería retornar true para una placa de MOTO con formato correcto (AAA12A)', () => {
      // Arrange & Act
      const esValida = validarPlaca('XYZ99E', 'MOTO');

      // Assert
      expect(esValida).toBe(true);
    });

  });

});