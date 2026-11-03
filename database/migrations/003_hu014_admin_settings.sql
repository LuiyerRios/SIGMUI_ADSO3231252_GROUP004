-- =====================================================================
-- SIGMUI - Migración 003: HU-014 User Profile Settings
-- Agrega dirección y preferencias de configuración por usuario.
-- Conserva los datos existentes.
-- =====================================================================

USE sigmui_db;

ALTER TABLE users
  ADD COLUMN primary_address VARCHAR(255) NULL,
  ADD COLUMN preferred_language VARCHAR(10) NOT NULL DEFAULT 'en',
  ADD COLUMN preferred_theme VARCHAR(10) NOT NULL DEFAULT 'light',
  ADD COLUMN notify_account_activity BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN notify_system_events BOOLEAN NOT NULL DEFAULT TRUE;
