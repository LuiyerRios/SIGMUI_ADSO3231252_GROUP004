// Tipos de vehículo que entran a las zonas azules (HU-004, HU-014, HU-016) y su regla de placa
// Sin importar paymentRules para evitar una importación circular (paymentRules usa este archivo)
const normalize = (plate) => String(plate ?? '').toUpperCase().replace(/[\s-]/g, '');

export const VEHICLE_TYPES = ['Car', 'Motorcycle', 'SUV', 'Truck', 'Van', 'Bicycle', 'Other'];

// Ícono de Font Awesome para cada tipo (las vistas lo usan en tarjetas y listas)
export const VEHICLE_ICONS = {
  Car: 'fa-car',
  Motorcycle: 'fa-motorcycle',
  SUV: 'fa-truck-pickup',
  Truck: 'fa-truck',
  Van: 'fa-van-shuttle',
  Bicycle: 'fa-bicycle',
  Other: 'fa-car-side'
};

export const vehicleIcon = (type) => VEHICLE_ICONS[type] || VEHICLE_ICONS.Car;

// Devuelve el tipo tal como está en la lista, o null si no es válido ("motorcycle" → "Motorcycle")
export function normalizeVehicleType(value) {
  const text = String(value ?? '').trim().toLowerCase();
  return VEHICLE_TYPES.find((t) => t.toLowerCase() === text) || null;
}

// Formatos de placa en Colombia:
//  - Carro, camioneta (SUV), camión y van: 3 letras + 3 números (ABC123).
//  - Moto: 3 letras + 2 números + 1 letra (ABC12D); las motos más antiguas tienen placa tipo carro (ABC123),
//    así que para moto se aceptan los dos formatos.
//  - Bicicleta: no tiene placa; se registra con su número de serie (4 a 12 letras o números).
//  - Otro o sin tipo: se acepta cualquiera de los dos formatos de placa.
const CAR_PLATE = /^[A-Z]{3}\d{3}$/;
const MOTO_PLATE = /^[A-Z]{3}\d{2}[A-Z]$/;
const BIKE_SERIAL = /^[A-Z0-9]{4,12}$/;
const CAR_TYPES = ['Car', 'SUV', 'Truck', 'Van'];

export function isValidPlateForType(plate, type) {
  const value = normalize(plate);
  const t = normalizeVehicleType(type);
  if (t === 'Bicycle') return BIKE_SERIAL.test(value);
  if (CAR_TYPES.includes(t)) return CAR_PLATE.test(value);
  return CAR_PLATE.test(value) || MOTO_PLATE.test(value); // Motorcycle, Other o sin tipo
}

// Tipo que se deduce de la placa cuando el formulario no lo envía: letra al final = moto
export function guessVehicleType(plate) {
  return MOTO_PLATE.test(normalize(plate)) ? 'Motorcycle' : 'Car';
}

// Mensaje de error según el tipo elegido
export function plateErrorMessage(type) {
  const t = normalizeVehicleType(type);
  if (t === 'Bicycle') return 'Please enter the bicycle serial number (4 to 12 letters or numbers).';
  if (t === 'Motorcycle') return 'Please enter a valid motorcycle plate (ABC12D, or ABC123 for older motorcycles).';
  if (CAR_TYPES.includes(t)) return 'Please enter a valid plate (ABC123).';
  return 'Please enter a valid plate (ABC123 for cars or ABC12D for motorcycles).';
}

// Ejemplo para el placeholder del campo según el tipo
export function platePlaceholder(type) {
  const t = normalizeVehicleType(type);
  if (t === 'Bicycle') return 'GW1234BK';
  if (t === 'Motorcycle') return 'ABC12D';
  return 'ABC123';
}

// ---------------------------------------------------------------------------
// Zonas por clase de vehículo (migración 007): solo motos, solo bicicletas o generales
// (carro, SUV/camioneta, camión, van y otro).
export const ZONE_CLASSES = ['general', 'motorcycle', 'bicycle'];

export const ZONE_CLASS_LABELS = {
  general: 'Cars, SUVs, trucks, vans and others',
  motorcycle: 'Motorcycles only',
  bicycle: 'Bicycles only'
};

// Clase de zona que le corresponde a un tipo de vehículo
export function vehicleClassOf(type) {
  const t = normalizeVehicleType(type);
  if (t === 'Motorcycle') return 'motorcycle';
  if (t === 'Bicycle') return 'bicycle';
  return 'general';
}

// ¿El vehículo puede parquear en esa zona?
export function isTypeAllowedInZone(type, zoneClass) {
  return vehicleClassOf(type) === (ZONE_CLASSES.includes(zoneClass) ? zoneClass : 'general');
}

// Mensaje cuando el tipo no corresponde a la zona
export function zoneClassError(zoneCode, zoneClass) {
  if (zoneClass === 'motorcycle') return `Zone ${zoneCode} is for motorcycles only.`;
  if (zoneClass === 'bicycle') return `Zone ${zoneCode} is for bicycles only.`;
  return `Zone ${zoneCode} is for cars, SUVs, trucks, vans and other vehicles. Motorcycles and bicycles have their own zones.`;
}

// Tarifas por defecto (las mismas de la migración 007); la BD manda si el admin las cambia
export const DEFAULT_VEHICLE_RATES = {
  Bicycle: 500,
  Motorcycle: 1200,
  Car: 2400,
  SUV: 5000,
  Truck: 8000,
  Van: 3400,
  Other: 3400
};

// La tarifa por día es 10 veces la tarifa por hora
export const DAY_RATE_FACTOR = 10;
