-- Migration 003: Tabla de notificaciones (HU-015)
-- Fecha: 2026-10-20

CREATE TABLE IF NOT EXISTS notifications (
  id INT NOT NULL AUTO_INCREMENT,
  user_id INT NOT NULL,
  type ENUM('support_reply', 'parking_alert', 'info') NOT NULL,
  title VARCHAR(150) NOT NULL,
  body TEXT NOT NULL,
  link VARCHAR(255) NULL,
  reference_id INT NULL,
  read_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_notif_user_read (user_id, read_at),
  UNIQUE KEY uq_notif_ref (user_id, type, reference_id),
  CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;