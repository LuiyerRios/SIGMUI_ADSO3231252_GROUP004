const TARIFAS_POR_HORA = {
  AUTO: 3000,
  MOTO: 1500,
  BICICLETA: 500
};

const MINUTOS_GRACIA = 15;

/**
 * Calcula la tarifa a cobrar en el parqueadero
 */
function calcularTarifa(horaEntrada, horaSalida, tipoVehiculo) {
  if (!TARIFAS_POR_HORA[tipoVehiculo]) {
    throw new Error('Tipo de vehículo no válido');
  }

  const entrada = new Date(horaEntrada);
  const salida = new Date(horaSalida);
  const diferenciaMs = salida - entrada;

  if (isNaN(diferenciaMs) || diferenciaMs < 0) {
    throw new Error('La hora de salida debe ser posterior a la hora de entrada');
  }

  const minutosTotales = Math.ceil(diferenciaMs / (1000 * 60));

  // Aplicar minutos de gracia
  if (minutosTotales <= MINUTOS_GRACIA) {
    return 0;
  }

  // Se cobra por hora o fracción de hora transcurrida
  const horasACobrar = Math.ceil(minutosTotales / 60);
  return horasACobrar * TARIFAS_POR_HORA[tipoVehiculo];
}

/**
 * Valida el formato de la placa según el vehículo
 */
function validarPlaca(placa, tipoVehiculo) {
  if (!placa || typeof placa !== 'string') return false;

  const placaLimpia = placa.trim().toUpperCase();

  if (tipoVehiculo === 'AUTO') {
    // Formato AAA123
    return /^[A-Z]{3}\d{3}$/.test(placaLimpia);
  }

  if (tipoVehiculo === 'MOTO') {
    // Formato AAA12A
    return /^[A-Z]{3}\d{2}[A-Z]{1}$/.test(placaLimpia);
  }

  return true;
}

module.exports = { calcularTarifa, validarPlaca };