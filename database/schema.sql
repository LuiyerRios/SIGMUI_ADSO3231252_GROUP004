-- =====================================================================
-- SIGMUI - Esquema completo (única fuente de verdad de la base de datos)
-- ---------------------------------------------------------------------
-- Para crear la BD DESDE CERO (un compañero nuevo o un reinicio).
-- ⚠️ BORRA sigmui_db si ya existe.
-- Si ya tienes la BD con datos, usa database/migrations/ en su lugar.
-- Después de ejecutarlo: node seed.js  (crea usuarios de prueba)
-- =====================================================================

DROP DATABASE IF EXISTS sigmui_db;
CREATE DATABASE sigmui_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE sigmui_db;

-- HU-001 (login) / HU-002 (registro) / HU-009 / HU-012
CREATE TABLE users (
  id INT NOT NULL AUTO_INCREMENT,
  full_name VARCHAR(100) NOT NULL,
  identity_document VARCHAR(20) NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('driver', 'agent', 'admin') NOT NULL DEFAULT 'driver',
  email_verified_at DATETIME NULL,
  failed_attempts INT NOT NULL DEFAULT 0,
  lockout_until DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY email (email),
  UNIQUE KEY uq_users_identity_document (identity_document)
) ENGINE=InnoDB;

-- HU-009 / HU-012
CREATE TABLE user_tokens (
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
) ENGINE=InnoDB;

-- HU-002 (placa del conductor)
CREATE TABLE vehicles (
  id INT NOT NULL AUTO_INCREMENT,
  user_id INT NULL,
  plate VARCHAR(20) NOT NULL,
  brand_model VARCHAR(100) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY plate (plate),
  CONSTRAINT vehicles_ibfk_1 FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- HU-003 / HU-004 / HU-005 (zonas y tarifas)
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
) ENGINE=InnoDB;

-- HU-010 (configuración del mapa)
CREATE TABLE parking_config (
  id INT NOT NULL AUTO_INCREMENT,
  spaces_per_zone INT NOT NULL DEFAULT 10,
  zones_list VARCHAR(50) NOT NULL DEFAULT 'A,B,C,D',
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB;

-- HU-010 / HU-003 (espacios del mapa)
CREATE TABLE parking_spaces (
  id VARCHAR(10) NOT NULL,
  zone VARCHAR(5) NOT NULL,
  status ENUM('available', 'occupied') NOT NULL DEFAULT 'available',
  vehicle_id INT NULL,
  entry_time DATETIME NULL,
  description VARCHAR(255) NOT NULL DEFAULT 'Space available',
  PRIMARY KEY (id),
  KEY vehicle_id (vehicle_id),
  CONSTRAINT parking_spaces_ibfk_1 FOREIGN KEY (vehicle_id) REFERENCES vehicles (id) ON DELETE SET NULL,
  CONSTRAINT fk_spaces_zone FOREIGN KEY (zone) REFERENCES zones (code)
) ENGINE=InnoDB;

-- HU-004 (columna vertebral: la usan HU-005, HU-006, HU-007 y HU-008)
CREATE TABLE parking_sessions (
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
) ENGINE=InnoDB;

-- HU-005
CREATE TABLE session_extensions (
  id INT NOT NULL AUTO_INCREMENT,
  session_id INT NOT NULL,
  hours INT NOT NULL,
  amount INT NOT NULL,
  previous_end_time DATETIME NOT NULL,
  new_end_time DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_extensions_session FOREIGN KEY (session_id) REFERENCES parking_sessions (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- HU-007
CREATE TABLE fines (
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
) ENGINE=InnoDB;

-- HU-011
CREATE TABLE help_reports (
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
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Datos iniciales (tarifas iguales a las de las vistas: $2.000 hora / $20.000 día)
-- ---------------------------------------------------------------------
INSERT INTO zones (code, name, description, latitude, longitude, rate_per_hour, rate_per_day) VALUES
('A', 'Zone A', 'General vehicles - level 1',             3.45160000, -76.53200000, 2000, 20000),
('B', 'Zone B', 'Preferential zone for motorcycles',     3.45160000, -76.53200000, 2000, 20000),
('C', 'Zone C', 'Preferential / reduced mobility (PRM)', 3.45160000, -76.53200000, 2000, 20000),
('D', 'Zone D', 'Downtown blue zone - Calle 5',          3.45160000, -76.53200000, 2000, 20000),
('E', 'Zone E', NULL,                                    3.45160000, -76.53200000, 2000, 20000),
('F', 'Zone F', NULL,                                    3.45160000, -76.53200000, 2000, 20000);

INSERT INTO parking_config (id, spaces_per_zone, zones_list) VALUES (1, 10, 'A,B,C,D');

-- 40 espacios: A1-A10 ... D1-D10
INSERT INTO parking_spaces (id, zone)
WITH RECURSIVE n AS (SELECT 1 AS i UNION ALL SELECT i + 1 FROM n WHERE i < 10)
SELECT CONCAT(z.code, n.i), z.code FROM zones z CROSS JOIN n WHERE z.code IN ('A', 'B', 'C', 'D');
