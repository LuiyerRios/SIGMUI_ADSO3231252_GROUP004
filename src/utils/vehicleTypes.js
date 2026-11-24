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

// Las bicicletas no tienen placa en Colombia: se registran con su número de serie (4 a 12 letras o números).
// El resto usa el formato de placa colombiana (AAA123 carro, AAA12A moto).
export function isValidPlateForType(plate, type) {
  const value = normalize(plate);
  if (normalizeVehicleType(type) === 'Bicycle') return /^[A-Z0-9]{4,12}$/.test(value);
  return /^[A-Z]{3}\d{2}[A-Z0-9]$/.test(value);
}
