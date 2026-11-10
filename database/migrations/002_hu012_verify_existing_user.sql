-- Migration 002: Marca como verificados a todos los usuarios existentes antes de la HU-012
-- Fecha: 2026-10-13

UPDATE users 
SET email_verified_at = NOW() 
WHERE email_verified_at IS NULL;