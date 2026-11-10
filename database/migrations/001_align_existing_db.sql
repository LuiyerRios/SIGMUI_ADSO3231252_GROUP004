-- =====================================================================
-- SIGMUI - Migración 001: alinear la BD existente con el modelo final
-- ---------------------------------------------------------------------
-- Para: la sigmui_db que ya existe (dump del 2026-10-09).
-- Conserva: usuarios, espacios del mapa (con su estado) y parking_config.
-- Ejecutar UNA SOLA VEZ en MySQL Workbench (rayo ⚡, script completo).
-- Si una línea falla, NO la vuelvas a ejecutar entera: copia el error
-- y el número de línea, y revísalo antes de seguir.
--
-- Una base de datos NUEVA (compañeros) NO usa este archivo:
-- se crea directamente con database/schema.sql.
-- =====================================================================

USE sigmui_db;
SET @OLD_SAFE_UPDATES = @@SQL_SAFE_UPDATES;
SET SQL_SAFE_UPDATES = 0;   -- Workbench bloquea los UPDATE sin llave; se restaura al final

-- ---------------------------------------------------------------------
-- 1. USERS: name -> full_name, roles driver/agent/admin, timestamps snake_case
-- ---------------------------------------------------------------------
ALTER TABLE users CHANGE COLUMN `name` `full_name` VARCHAR(100) NULL;
UPDATE users SET full_name = SUBSTRING_INDEX(email, '@', 1) WHERE full_name IS NULL OR full_name = '';
ALTER TABLE users MODIFY COLUMN full_name VARCHAR(100) NOT NULL;

ALTER TABLE users ADD COLUMN identity_document VARCHAR(20) NULL AFTER full_name;
ALTER TABLE users ADD UNIQUE KEY uq_users_identity_document (identity_document);
ALTER TABLE users ADD COLUMN phone VARCHAR(20) NULL AFTER email;

-- 'user' era el rol del conductor
UPDATE users SET role = 'driver' WHERE role IS NULL OR role NOT IN ('driver', 'agent', 'admin');
ALTER TABLE users MODIFY COLUMN role ENUM('driver', 'agent', 'admin') NOT NULL DEFAULT 'driver';
ALTER TABLE users ADD COLUMN email_verified_at DATETIME NULL AFTER role;

UPDATE users SET failed_attempts = 0 WHERE failed_attempts IS NULL;
ALTER TABLE users MODIFY COLUMN failed_attempts INT NOT NULL DEFAULT 0;

ALTER TABLE users CHANGE COLUMN `createdAt` `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE users CHANGE COLUMN `updatedAt` `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- ---------------------------------------------------------------------
-- 2. VEHICLES: solo se agrega la fecha de creación
-- ---------------------------------------------------------------------
ALTER TABLE vehicles ADD COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- ---------------------------------------------------------------------
-- 3. ZONES: la tabla actual usa id numérico (1-4) y no se relaciona con
--    las letras del mapa (A-F). Se guarda como zones_legacy y se crea
--    la nueva con código de letra + tarifas por hora y por día.
-- ---------------------------------------------------------------------
RENAME TABLE zones TO zones_legacy;

CREATE TABLE zones (
  code VARCHAR(5) NOT NULL,
  name VARCHAR(50) NOT NULL,
  description VARCHAR(255) NULL,
  latitude DECIMAL(10,8) NULL,
  longitude DECIMAL(11,8) NULL,
  rate_per_hour INT NOT NULL,
  rate_per_day INT NOT NULL,
  allows_extension BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tarifas iguales a las que muestran las vistas (HU-003/HU-004): $2.000 hora, $20.000 día.
-- La tabla vieja tenía 2500: si el equipo decide otra tarifa, solo cambia estos valores.
INSERT INTO zones (code, name, description, latitude, longitude, rate_per_hour, rate_per_day) VALUES
('A', 'Zone A', 'General vehicles - level 1',              3.45160000, -76.53200000, 2000, 20000),
('B', 'Zone B', 'Preferential zone for motorcycles',      3.45160000, -76.53200000, 2000, 20000),
('C', 'Zone C', 'Preferential / reduced mobility (PRM)',  3.45160000, -76.53200000, 2000, 20000),
('D', 'Zone D', 'Downtown blue zone - Calle 5',           3.45160000, -76.53200000, 2000, 20000),
('E', 'Zone E', NULL,                                     3.45160000, -76.53200000, 2000, 20000),
('F', 'Zone F', NULL,                                     3.45160000, -76.53200000, 2000, 20000);

-- ---------------------------------------------------------------------
-- 4. PARKING_SPACES: estado como ENUM y relación con zones
-- ---------------------------------------------------------------------
UPDATE parking_spaces SET status = 'available' WHERE status NOT IN ('available', 'occupied');
ALTER TABLE parking_spaces MODIFY COLUMN status ENUM('available', 'occupied') NOT NULL DEFAULT 'available';
UPDATE parking_spaces SET description = 'Space available' WHERE description IS NULL;
ALTER TABLE parking_spaces MODIFY COLUMN description VARCHAR(255) NOT NULL DEFAULT 'Space available';
ALTER TABLE parking_spaces ADD CONSTRAINT fk_spaces_zone FOREIGN KEY (zone) REFERENCES zones (code);

-- parking_config se deja igual.

-- ---------------------------------------------------------------------
-- 5. TABLAS NUEVAS (no existían)
-- ---------------------------------------------------------------------

-- HU-009 (recuperar contraseña) y HU-012 (verificar email)
CREATE TABLE IF NOT EXISTS user_tokens (
  id INT NOT NULL AUTO_INCREMENT,
  user_id INT NOT NULL,
  type ENUM('password_reset', 'email_verification') NOT NULL,
  token_hash CHAR(64) NOT NULL,
  expires_at DATETIME NOT NULL,
  used_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_token_hash (token_hash),
  CONSTRAINT fk_tokens_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- HU-004 (columna vertebral: la usan HU-005, HU-006, HU-007 y HU-008)
CREATE TABLE IF NOT EXISTS parking_sessions (
  id INT NOT NULL AUTO_INCREMENT,
  receipt_number VARCHAR(20) NOT NULL,
  user_id INT NULL,
  vehicle_id INT NULL,
  plate VARCHAR(20) NOT NULL,
  zone VARCHAR(5) NOT NULL,
  space_id VARCHAR(10) NULL,
  rate_type ENUM('hour', 'day') NOT NULL,
  quantity INT NOT NULL,
  amount INT NOT NULL,
  start_time DATETIME NOT NULL,
  end_time DATETIME NOT NULL,
  status ENUM('active', 'expired', 'cancelled') NOT NULL DEFAULT 'active',
  payment_status ENUM('pending', 'paid', 'failed') NOT NULL DEFAULT 'pending',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_sessions_receipt (receipt_number),
  KEY idx_sessions_plate (plate),
  KEY idx_sessions_start (start_time),
  CONSTRAINT fk_sessions_user    FOREIGN KEY (user_id)    REFERENCES users (id)          ON DELETE SET NULL,
  CONSTRAINT fk_sessions_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles (id)       ON DELETE SET NULL,
  CONSTRAINT fk_sessions_zone    FOREIGN KEY (zone)       REFERENCES zones (code),
  CONSTRAINT fk_sessions_space   FOREIGN KEY (space_id)   REFERENCES parking_spaces (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- HU-005
CREATE TABLE IF NOT EXISTS session_extensions (
  id INT NOT NULL AUTO_INCREMENT,
  session_id INT NOT NULL,
  hours INT NOT NULL,
  amount INT NOT NULL,
  previous_end_time DATETIME NOT NULL,
  new_end_time DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_extensions_session FOREIGN KEY (session_id) REFERENCES parking_sessions (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- HU-007
CREATE TABLE IF NOT EXISTS fines (
  id INT NOT NULL AUTO_INCREMENT,
  fine_number VARCHAR(20) NOT NULL,
  session_id INT NULL,
  plate VARCHAR(20) NOT NULL,
  agent_id INT NULL,
  location VARCHAR(150) NOT NULL,
  comments VARCHAR(300) NULL,
  amount INT NOT NULL,
  issued_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_fines_number (fine_number),
  CONSTRAINT fk_fines_session FOREIGN KEY (session_id) REFERENCES parking_sessions (id) ON DELETE SET NULL,
  CONSTRAINT fk_fines_agent   FOREIGN KEY (agent_id)   REFERENCES users (id)            ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- HU-011 (hoy no existía: por eso el formulario de ayuda no podía guardar)
CREATE TABLE IF NOT EXISTS help_reports (
  id INT NOT NULL AUTO_INCREMENT,
  user_id INT NULL,
  first_name VARCHAR(50) NOT NULL,
  last_name VARCHAR(50) NOT NULL,
  email VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  description VARCHAR(300) NOT NULL,
  status ENUM('Pending', 'In_Review', 'Resolved') NOT NULL DEFAULT 'Pending',
  response TEXT NULL,
  responded_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_help_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET SQL_SAFE_UPDATES = @OLD_SAFE_UPDATES;

-- ---------------------------------------------------------------------
-- 6. VERIFICACIÓN (ejecuta estas consultas al final y revisa)
-- ---------------------------------------------------------------------
-- SELECT id, full_name, email, role FROM users;            -> 2 filas: conductor = driver, admin = admin
-- SELECT COUNT(*) FROM parking_spaces;                     -> 60 (A-F, 10 cada una), con sus estados intactos
-- SELECT * FROM zones;                                     -> 6 filas (A-F)
-- SHOW TABLES;                                             -> 11 tablas (incluye zones_legacy)
--
-- Cuando todo funcione, borra la tabla vieja:
-- DROP TABLE zones_legacy;
