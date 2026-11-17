-- Migration 004: Gestión de usuarios del admin (HU-016)
-- Fecha: 2026-11-17
-- users.status: el admin puede suspender una cuenta (no puede iniciar sesión)
-- vehicles: tipo, color y descripción del formulario de vehículos

ALTER TABLE users
  ADD COLUMN status ENUM('active', 'suspended') NOT NULL DEFAULT 'active' AFTER role;

ALTER TABLE vehicles
  ADD COLUMN vehicle_type VARCHAR(20) NULL AFTER brand_model,
  ADD COLUMN color VARCHAR(40) NULL AFTER vehicle_type,
  ADD COLUMN description VARCHAR(150) NULL AFTER color;
