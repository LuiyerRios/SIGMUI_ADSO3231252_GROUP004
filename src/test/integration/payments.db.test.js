import db from '../../config/db.js';
import { recordParkingPayment, recordExtensionPayment, PaymentError } from '../../services/paymentService.js';
import { getPayments, getPaymentsForExport } from '../../services/paymentHistoryService.js';
import { QueryTypes } from 'sequelize';

// Helper localToday() en hora local
function localToday() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

describe('HU-017 Payments DB Integration Tests', () => {
  let driverUserId;
  let adminUserId;
  let ratePerHour;
  const testPlate = 'ZZT99Z';

  beforeAll(async () => {
    // 1. Obtener usuarios y validar existencia
    const users = await db.query(
      "SELECT id, role, email FROM users WHERE email IN ('driver@sigmui.com', 'admin@sigmui.com')",
      { type: QueryTypes.SELECT }
    );
    const driver = users.find(u => u.email === 'driver@sigmui.com');
    const admin = users.find(u => u.email === 'admin@sigmui.com');

    if (!driver || !admin) {
      throw new Error('Run seed.js first');
    }

    driverUserId = driver.id;
    adminUserId = admin.id;

    // 2. Obtener tarifa por hora de la Zona A
    const zones = await db.query(
      "SELECT rate_per_hour FROM zones WHERE code = 'A' LIMIT 1",
      { type: QueryTypes.SELECT }
    );

    if (!zones || zones.length === 0) {
      throw new Error('Run seed.js first');
    }

    ratePerHour = Number(zones[0].rate_per_hour);

    // 3. Limpieza previa
    await db.query("DELETE FROM parking_sessions WHERE plate = ?", { replacements: [testPlate] });
  });

  afterAll(async () => {
    // Limpieza posterior
    await db.query("DELETE FROM parking_sessions WHERE plate = ?", { replacements: [testPlate] });
    await db.close();
  });

  test('1. recordParkingPayment saves paid/active session with correct calculated amount and 2h duration', async () => {
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
    expect(Number(saved.amount)).toBe(2 * ratePerHour);
    expect(saved.receipt_number).toMatch(/^TP-/);

    // Comprobar duración exacta de 2 horas (7,200,000 ms)
    const startTime = new Date(saved.start_time).getTime();
    const endTime = new Date(saved.end_time).getTime();
    expect(endTime - startTime).toBe(7200000);
  });

  test('2. Saved payment appears in getPayments history', async () => {
    // Arrange
    const todayStr = localToday();
    const filters = { from: todayStr, to: todayStr, zone: 'all', plate: testPlate, page: 1 };

    // Act
    const { rows, total } = await getPayments(filters);

    // Assert
    expect(total).toBeGreaterThanOrEqual(1);
    const match = rows.find(r => r.plate === testPlate);
    expect(match).toBeDefined();
    expect(match.type).toBe('parking');
    expect(Number(match.amount)).toBe(2 * ratePerHour);
  });

  test('3. Attempting parking payment on active plate throws 409 error with exact message', async () => {
    // Arrange & Act & Assert
    try {
      await recordParkingPayment(driverUserId, {
        plate: testPlate,
        zone: 'A',
        rateType: 'hour',
        quantity: 1
      });
      throw new Error('Should have thrown PaymentError');
    } catch (error) {
      expect(error).toBeInstanceOf(PaymentError);
      expect(error.status).toBe(409);
      expect(error.message).toBe('This vehicle already has an active parking session.');
    }
  });

  test('4. recordExtensionPayment updates end_time by 1h and adds extension receipt', async () => {
    // Arrange: Obtener sesión activa creada
    const activeSessions = await db.query(
      "SELECT id, receipt_number, end_time FROM parking_sessions WHERE plate = ? AND status = 'active' LIMIT 1",
      { replacements: [testPlate], type: QueryTypes.SELECT }
    );
    const session = activeSessions[0];
    const previousEndTime = new Date(session.end_time).getTime();

    // Act
    const extResult = await recordExtensionPayment(driverUserId, {
      sessionId: session.id,
      hours: 1
    });

    // Assert
    expect(extResult.amount).toBe(ratePerHour);
    expect(extResult.receiptNumber).toBe(`${session.receipt_number}-E${extResult.extensionId}`);

    // Comprobar que end_time aumentó 1 hora (3,600,000 ms)
    const updatedSessions = await db.query(
      "SELECT end_time FROM parking_sessions WHERE id = ?",
      { replacements: [session.id], type: QueryTypes.SELECT }
    );
    const newEndTime = new Date(updatedSessions[0].end_time).getTime();
    expect(newEndTime - previousEndTime).toBe(3600000);

    // Verificar en el historial
    const todayStr = localToday();
    const { rows } = await getPayments({ from: todayStr, to: todayStr, zone: 'all', plate: testPlate, page: 1 });
    const extRow = rows.find(r => r.type === 'extension' && r.plate === testPlate);
    expect(extRow).toBeDefined();
  });

  test('5. History summary totals match aggregated counts and revenue', async () => {
    // Arrange
    const todayStr = localToday();

    // Act
    const { summary } = await getPayments({ from: todayStr, to: todayStr, zone: 'all', plate: testPlate, page: 1 });

    // Assert
    expect(summary.count).toBe(2);
    expect(summary.parkingCount).toBe(1);
    expect(summary.extensionCount).toBe(1);
    expect(summary.revenue).toBe(3 * ratePerHour);
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
    // Arrange: Insertar sesión pending
    await db.query(
      `INSERT INTO parking_sessions 
        (receipt_number, user_id, plate, zone, rate_type, quantity, amount, start_time, end_time, status, payment_status, created_at)
       VALUES ('TP-PENDING-TEST', ?, ?, 'A', 'hour', 1, 2000, NOW(), DATE_ADD(NOW(), INTERVAL 1 HOUR), 'active', 'pending', NOW())`,
      { replacements: [driverUserId, testPlate] }
    );

    // Act
    const todayStr = localToday();
    const { rows } = await getPayments({ from: todayStr, to: todayStr, zone: 'all', plate: testPlate, page: 1 });

    // Assert
    const pendingRow = rows.find(r => r.receipt_number === 'TP-PENDING-TEST');
    expect(pendingRow).toBeUndefined();

    // Limpiar fila pending
    await db.query("DELETE FROM parking_sessions WHERE receipt_number = 'TP-PENDING-TEST'");
  });

  test('8. getPaymentsForExport returns matching rows and summary structure', async () => {
    // Arrange
    const todayStr = localToday();
    const filters = { from: todayStr, to: todayStr, zone: 'all', plate: testPlate, page: 1 };

    // Act
    const exportResult = await getPaymentsForExport(filters);

    // Assert
    expect(exportResult.rows.length).toBe(2);
    expect(exportResult.summary.count).toBe(2);
    expect(exportResult.summary.revenue).toBe(3 * ratePerHour);
  });
});