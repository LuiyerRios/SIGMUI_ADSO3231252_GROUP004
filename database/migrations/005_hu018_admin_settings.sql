-- =====================================================================
-- SIGMUI - Migración 005: HU-018 Admin profile settings (antes 003_hu014_admin_settings.sql)
-- Agrega dirección y preferencias de configuración por usuario.
-- Conserva los datos existentes. Sin estas columnas el login falla (el modelo User las lee).
-- =====================================================================

USE sigmui_db;

ALTER TABLE users
  ADD COLUMN primary_address VARCHAR(255) NULL,
  ADD COLUMN preferred_language VARCHAR(10) NOT NULL DEFAULT 'en',
  ADD COLUMN preferred_theme VARCHAR(10) NOT NULL DEFAULT 'light',
  ADD COLUMN notify_account_activity BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN notify_system_events BOOLEAN NOT NULL DEFAULT TRUE;
