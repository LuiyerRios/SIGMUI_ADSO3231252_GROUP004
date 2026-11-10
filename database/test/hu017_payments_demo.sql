INSERT INTO parking_sessions 
(receipt_number, user_id, vehicle_id, plate, zone, space_id, rate_type, quantity, amount, start_time, end_time, status, payment_status, created_at)
SELECT 
  CONCAT('DEMO-P-', n.i),
  (SELECT id FROM users WHERE email = 'driver@sigmui.com' LIMIT 1),
  (SELECT id FROM vehicles WHERE plate = 'ABC123' LIMIT 1),
  CASE (n.i % 3) WHEN 0 THEN 'ABC123' WHEN 1 THEN 'XYZ987' ELSE 'MNO456' END,
  CASE (n.i % 6) WHEN 0 THEN 'A' WHEN 1 THEN 'B' WHEN 2 THEN 'C' WHEN 3 THEN 'D' WHEN 4 THEN 'E' ELSE 'F' END,
  NULL,
  CASE WHEN (n.i % 2 = 0) THEN 'hour' ELSE 'day' END,
  CASE WHEN (n.i % 2 = 0) THEN (n.i % 5) + 1 ELSE 1 END,
  CASE WHEN (n.i % 2 = 0) THEN ((n.i % 5) + 1) * 2000 ELSE 20000 END,
  DATE_SUB(NOW(), INTERVAL (n.i * 16) HOUR),
  CASE WHEN (n.i % 2 = 0) 
    THEN DATE_ADD(DATE_SUB(NOW(), INTERVAL (n.i * 16) HOUR), INTERVAL ((n.i % 5) + 1) HOUR)
    ELSE DATE_ADD(DATE_SUB(NOW(), INTERVAL (n.i * 16) HOUR), INTERVAL 1 DAY)
  END,
  'expired',
  'paid',
  DATE_SUB(NOW(), INTERVAL (n.i * 16) HOUR)
FROM (
  SELECT 1 AS i UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5
  UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10
  UNION ALL SELECT 11 UNION ALL SELECT 12 UNION ALL SELECT 13 UNION ALL SELECT 14 UNION ALL SELECT 15
  UNION ALL SELECT 16 UNION ALL SELECT 17 UNION ALL SELECT 18 UNION ALL SELECT 19 UNION ALL SELECT 20
  UNION ALL SELECT 21 UNION ALL SELECT 22 UNION ALL SELECT 23 UNION ALL SELECT 24 UNION ALL SELECT 25
  UNION ALL SELECT 26 UNION ALL SELECT 27 UNION ALL SELECT 28 UNION ALL SELECT 29 UNION ALL SELECT 30
) n;

INSERT INTO parking_sessions 
(receipt_number, user_id, vehicle_id, plate, zone, space_id, rate_type, quantity, amount, start_time, end_time, status, payment_status, created_at)
SELECT 
  CONCAT('DEMO-PENDING-', n.i),
  (SELECT id FROM users WHERE email = 'driver@sigmui.com' LIMIT 1),
  (SELECT id FROM vehicles WHERE plate = 'ABC123' LIMIT 1),
  'PND12A',
  'A',
  NULL,
  'hour',
  1,
  2000,
  NOW(),
  DATE_ADD(NOW(), INTERVAL 1 HOUR),
  'cancelled',
  'pending',
  NOW()
FROM (SELECT 1 AS i UNION ALL SELECT 2 UNION ALL SELECT 3) n;

INSERT INTO session_extensions (session_id, hours, amount, previous_end_time, new_end_time, created_at)
SELECT 
  ps.id,
  1,
  2000,
  ps.end_time,
  DATE_ADD(ps.end_time, INTERVAL 1 HOUR),
  DATE_ADD(ps.start_time, INTERVAL 30 MINUTE)
FROM parking_sessions ps
WHERE ps.receipt_number LIKE 'DEMO-P-%'
LIMIT 10;

-- DELETE se FROM session_extensions se JOIN parking_sessions ps ON se.session_id = ps.id WHERE ps.receipt_number LIKE 'DEMO-%';
-- DELETE FROM parking_sessions WHERE receipt_number LIKE 'DEMO-%';