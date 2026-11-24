-- =====================================================================
-- SIGMUI - Migración 007: tarifas por tipo de vehículo, zonas por tipo
-- y espacios preferenciales (HU-004, HU-003, HU-019)
--  1. vehicle_rates: el precio depende del tipo de vehículo (ya no de la zona).
--     La tarifa por día es 10 veces la tarifa por hora.
--  2. zones.vehicle_class: zonas solo para motos, solo para bicicletas o generales
--     (carro, SUV/camioneta, camión, van y otro).
--  3. parking_spaces.space_type: los 3 primeros espacios de cada zona son preferenciales
--     (personas con discapacidad, embarazadas o trato especial).
--  4. parking_sessions.vehicle_type: el tipo con el que se cobró, para cobrar igual las extensiones.
-- Se puede ejecutar una sola vez sobre una base que ya tenga las migraciones 001 a 006.
-- =====================================================================

USE sigmui_db;

CREATE TABLE IF NOT EXISTS vehicle_rates (
  vehicle_type VARCHAR(20) NOT NULL,
  rate_per_hour INT NOT NULL,
  rate_per_day INT NOT NULL,
  PRIMARY KEY (vehicle_type)
) ENGINE=InnoDB;

INSERT INTO vehicle_rates (vehicle_type, rate_per_hour, rate_per_day) VALUES
  ('Bicycle',      500,   5000),
  ('Motorcycle',  1200,  12000),
  ('Car',         2400,  24000),
  ('SUV',         5000,  50000),
  ('Truck',       8000,  80000),
  ('Van',         3400,  34000),
  ('Other',       3400,  34000)
ON DUPLICATE KEY UPDATE rate_per_hour = VALUES(rate_per_hour), rate_per_day = VALUES(rate_per_day);

ALTER TABLE zones
  ADD COLUMN vehicle_class ENUM('general', 'motorcycle', 'bicycle') NOT NULL DEFAULT 'general' AFTER description;

-- Zona B: solo motos; zona E: solo bicicletas (el admin lo cambia en /admin/zones)
UPDATE zones SET vehicle_class = 'motorcycle', description = 'Motorcycles only' WHERE code = 'B';
UPDATE zones SET vehicle_class = 'bicycle', description = 'Bicycles only' WHERE code = 'E';

ALTER TABLE parking_spaces
  ADD COLUMN space_type ENUM('regular', 'preferential') NOT NULL DEFAULT 'regular' AFTER zone;

-- Los espacios 1, 2 y 3 de cada zona (A1, A2, A3, B1 …) quedan preferenciales
UPDATE parking_spaces
   SET space_type = 'preferential'
 WHERE CAST(SUBSTRING(id, 2) AS UNSIGNED) BETWEEN 1 AND 3;

ALTER TABLE parking_sessions
  ADD COLUMN vehicle_type VARCHAR(20) NULL AFTER plate;
