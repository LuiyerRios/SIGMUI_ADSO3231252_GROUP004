-- database/test/hu015_alert_demo.sql
-- Script de prueba manual para HU-015: crea una sesión activa que vence en 8 minutos.

INSERT INTO parking_sessions (
  receipt_number,
  user_id,
  vehicle_id,
  plate,
  zone,
  space_id,
  rate_type,
  quantity,
  amount,
  start_time,
  end_time,
  status,
  payment_status
) VALUES (
  'REC-DEMO-015',
    (SELECT id FROM vehicles WHERE plate = 'ABC123' LIMIT 1),
  1,
  'ABC123',
  'A',
  'A1',
  'hour',
  1,
  2000,
  DATE_SUB(NOW(), INTERVAL 52 MINUTE),
  DATE_ADD(NOW(), INTERVAL 8 MINUTE),
  'active',
  'paid'
);

-- Para limpiar la prueba manual, ejecuta:
-- DELETE FROM parking_sessions WHERE receipt_number = 'REC-DEMO-015';