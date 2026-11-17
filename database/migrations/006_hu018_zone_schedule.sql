-- =====================================================================
-- SIGMUI - Migración 006: HU-018 Tarifas y reglas por zona (issue #35)
-- Agrega el horario de servicio de cada zona. Las tarifas y la regla de
-- extensión ya existen (rate_per_hour, rate_per_day, allows_extension).
-- Por defecto la zona queda abierta todo el día para no bloquear a nadie;
-- el administrador lo cambia desde /admin/zones.
-- =====================================================================

USE sigmui_db;

ALTER TABLE zones
  ADD COLUMN opens_at TIME NOT NULL DEFAULT '00:00:00' AFTER allows_extension,
  ADD COLUMN closes_at TIME NOT NULL DEFAULT '23:59:00' AFTER opens_at;
