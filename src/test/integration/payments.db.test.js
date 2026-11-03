import db from '../../config/db.js';
import { recordParkingPayment, recordExtensionPayment, PaymentError } from '../../services/paymentService.js';
import { getPayments, getPaymentsForExport } from '../../services/paymentHistoryService.js';
import { QueryTypes } from 'sequelize';

describe('HU-017 Payments DB Integration Tests', () => {
  let driverUserId;
  let adminUserId;
  const testPlate = 'ZZT99Z';

  beforeAll(async () => {
    // 1. Obtener IDs de usuarios
    const users = await db.query(
      "SELECT id, role, email FROM users WHERE email IN ('driver@sigmui.com', 'admin@sigmui.com')",
      { type: QueryTypes.SELECT }
    );
    const driver = users.find(u => u.email === 'driver@sigmui.com');
    const admin = users.find(u => u.email === 'admin@sigmui.com');

    driverUserId = driver ? driver.id : 1;
    adminUserId = admin ? admin.id : 2;

    // 2. Limpieza previa por si acaso
    await db.query("DELETE FROM parking_sessions WHERE plate = ?", { replacements: [testPlate] });
  });

  afterAll(async () => {
    // Limpieza posterior
    await db.query("DELETE FROM parking_sessions WHERE plate = ?", { replacements: [testPlate] });
    await db.close();
  });

  test('1. recordParkingPayment saves paid/active session with correct calculated amount', async () => {
    // Arrange & Act
    const result = await recordParkingPayment(driverUserId, {
      plate: testPlate,
      zone: 'A',
      rateType: 'hour',
      quantity: 2
    });

    // Assert: Verificar en la BD directamente
    const sessions = await db.query(
      "SELECT * FROM parking_sessions WHERE receipt_number = ?",
      { replacements: [result.receiptNumber], type: QueryTypes.SELECT }
    );

    expect(sessions.length).toBe(1);
    const saved = sessions[0];
    expect(saved.payment_status).toBe('paid');
    expect(saved.status).toBe('active');
    expect(Number(saved.amount)).toBe(4000);
    expect(saved.receipt_number).toMatch(/^TP-/);
  });

  test('2. Saved payment appears in getPayments history', async () => {
    // Arrange
    const todayStr = new Date().toISOString().split('T')[0];
    const filters = { from: todayStr, to: todayStr, zone: 'all', plate: testPlate, page: 1 };

    // Act
    const { rows, total } = await getPayments(filters);

    // Assert
    expect(total).toBeGreaterThanOrEqual(1);
    const match = rows.find(r => r.plate === testPlate);
    expect(match).toBeDefined();
    expect(match.type).toBe('parking');
    expect(Number(match.amount)).toBe(4000);
  });

  test('3. Attempting parking payment on active plate throws 409 error', async () => {
    // Arrange & Act & Assert
    await expect(
      recordParkingPayment(driverUserId, {
        plate: testPlate,
        zone: 'A',
        rateType: 'hour',
        quantity: 1
      })
    ).rejects.toThrow(PaymentError);
  });

  test('4. recordExtensionPayment updates end_time and adds extension history record', async () => {
    // Arrange: Obtener ID de la sesión activa creada
    const activeSessions = await db.query(
      "SELECT id FROM parking_sessions WHERE plate = ? AND status = 'active' LIMIT 1",
      { replacements: [testPlate], type: QueryTypes.SELECT }
    );
    const sessionId = activeSessions[0].id;

    // Act
    const extResult = await recordExtensionPayment(driverUserId, {
      sessionId,
      hours: 1
    });

    // Assert
    expect(extResult.amount).toBe(2000);
    expect(extResult.receiptNumber).toContain('-E');

    // Verificar que aparece en el historial como tipo 'extension'
    const todayStr = new Date().toISOString().split('T')[0];
    const { rows } = await getPayments({ from: todayStr, to: todayStr, zone: 'all', plate: testPlate, page: 1 });
    const extRow = rows.find(r => r.type === 'extension' && r.plate === testPlate);
    expect(extRow).toBeDefined();
  });

  test('5. History summary totals match aggregated counts and revenue', async () => {
    // Arrange
    const todayStr = new Date().toISOString().split('T')[0];

    // Act
    const { summary } = await getPayments({ from: todayStr, to: todayStr, zone: 'all', plate: testPlate, page: 1 });

    // Assert
    expect(summary.count).toBe(2);
    expect(summary.parkingCount).toBe(1);
    expect(summary.extensionCount).toBe(1);
    expect(summary.revenue).toBe(6000);
  });

  test('6. Admin attempting to extend another driver session throws 404', async () => {
    // Arrange
    const activeSessions = await db.query(
      "SELECT id FROM parking_sessions WHERE plate = ? AND status = 'active' LIMIT 1",
      { replacements: [testPlate], type: QueryTypes.SELECT }
    );
    const sessionId = activeSessions[0].id;

    // Act & Assert
    await expect(
      recordExtensionPayment(adminUserId, { sessionId, hours: 1 })
    ).rejects.toThrow('Parking session not found.');
  });

  test('7. Pending sessions do NOT appear in payment history', async () => {
    // Arrange: Insertar sesión pending directamente
    await db.query(
      `INSERT INTO parking_sessions 
        (receipt_number, user_id, plate, zone, rate_type, quantity, amount, start_time, end_time, status, payment_status, created_at)
       VALUES ('TP-PENDING-TEST', ?, ?, 'A', 'hour', 1, 2000, NOW(), DATE_ADD(NOW(), INTERVAL 1 HOUR), 'active', 'pending', NOW())`,
      { replacements: [driverUserId, testPlate] }
    );

    // Act
    const todayStr = new Date().toISOString().split('T')[0];
    const { rows } = await getPayments({ from: todayStr, to: todayStr, zone: 'all', plate: testPlate, page: 1 });

    // Assert
    const pendingRow = rows.find(r => r.receipt_number === 'TP-PENDING-TEST');
    expect(pendingRow).toBeUndefined();

    // Limpiar fila pending
    await db.query("DELETE FROM parking_sessions WHERE receipt_number = 'TP-PENDING-TEST'");
  });

  test('8. getPaymentsForExport returns matching rows and summary structure', async () => {
    // Arrange
    const todayStr = new Date().toISOString().split('T')[0];
    const filters = { from: todayStr, to: todayStr, zone: 'all', plate: testPlate, page: 1 };

    // Act
    const exportResult = await getPaymentsForExport(filters);

    // Assert
    expect(exportResult.rows.length).toBe(2);
    expect(exportResult.summary.count).toBe(2);
    expect(exportResult.summary.revenue).toBe(6000);
  });
});