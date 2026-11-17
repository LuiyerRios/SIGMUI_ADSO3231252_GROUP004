// HU-016 · Manage users (admin): página y API JSON que usa public/js/HU-016.js
import bcrypt from 'bcryptjs';
import {
  validateUserUpdate, validateVehicleInput, checkAdminSafety,
  ROLE_TO_UI, STATUS_TO_UI, STATUS_FROM_UI
} from '../utils/userAdminRules.js';
import * as svc from '../services/userAdminService.js';

const SERVER_ERROR = 'The users could not be updated. Please try again.';
const asId = (value) => {
  const id = Number.parseInt(value, 10);
  return Number.isInteger(id) && id > 0 ? id : null;
};

// GET /admin/users
export const renderManageUsers = (req, res) => {
  res.render('HU-016', {
    title: 'Manage users | SIGMUI',
    activeMenu: 'users',
    pageTitle: 'Manage users',
    pageSubtitle: 'Roles and access of the system users'
  });
};

// GET /api/admin/users
export const listUsers = async (req, res) => {
  try {
    const { users, vehicles } = await svc.listUsersWithVehicles();
    const byOwner = new Map();
    vehicles.forEach((v) => {
      const [make = '', ...rest] = String(v.brand_model || '').split(' ');
      const item = {
        id: v.id,
        plate: v.plate,
        type: v.vehicle_type || 'Car',
        make,
        model: rest.join(' '),
        color: v.color || '',
        description: v.description || '',
        hasActiveSession: Boolean(Number(v.has_active_session))
      };
      if (!byOwner.has(v.user_id)) byOwner.set(v.user_id, []);
      byOwner.get(v.user_id).push(item);
    });

    res.json({
      users: users.map((u) => ({
        id: u.id,
        name: u.full_name,
        email: u.email,
        phone: u.phone || '',
        role: ROLE_TO_UI[u.role],
        status: STATUS_TO_UI[u.status],
        verified: Boolean(u.email_verified_at),
        joined: new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
        isSelf: u.id === req.session.user.id,
        hasActiveSession: Boolean(Number(u.has_active_session)),
        vehicles: byOwner.get(u.id) || []
      }))
    });
  } catch (err) {
    console.error('Error listing users (HU-016):', err);
    res.status(500).json({ error: 'The users could not be loaded. Please try again.' });
  }
};

// PUT /api/admin/users/:id
export const saveUser = async (req, res) => {
  const id = asId(req.params.id);
  const { value, error } = validateUserUpdate(req.body);
  if (!id) return res.status(404).json({ error: 'User not found.' });
  if (error) return res.status(400).json({ error });

  try {
    const target = await svc.findUser(id);
    if (!target) return res.status(404).json({ error: 'User not found.' });

    const safety = checkAdminSafety({
      actorId: req.session.user.id, target, next: value, activeAdmins: await svc.countActiveAdmins()
    });
    if (safety) return res.status(409).json({ error: safety });
    if (await svc.emailTaken(value.email, id)) return res.status(409).json({ error: 'A user with this email already exists.' });

    const passwordHash = value.password ? await bcrypt.hash(value.password, 10) : null;
    await svc.updateUser(id, value, passwordHash);
    if (id === req.session.user.id) req.session.user.name = value.fullName; // el sidebar muestra el nombre nuevo

    res.json({ message: passwordHash ? 'User and password updated successfully.' : 'User information updated successfully.' });
  } catch (err) {
    console.error('Error updating user (HU-016):', err);
    res.status(500).json({ error: SERVER_ERROR });
  }
};

// PATCH /api/admin/users/:id/status  { status: 'Active' | 'Suspended' }
export const changeUserStatus = async (req, res) => {
  const id = asId(req.params.id);
  const status = STATUS_FROM_UI[req.body.status];
  if (!id) return res.status(404).json({ error: 'User not found.' });
  if (!status) return res.status(400).json({ error: 'Please select a valid status.' });

  try {
    const target = await svc.findUser(id);
    if (!target) return res.status(404).json({ error: 'User not found.' });
    const safety = checkAdminSafety({
      actorId: req.session.user.id, target, next: { role: target.role, status }, activeAdmins: await svc.countActiveAdmins()
    });
    if (safety) return res.status(409).json({ error: safety });

    await svc.setUserStatus(id, status);
    res.json({ message: status === 'active' ? 'User reactivated successfully.' : 'User deactivated successfully.' });
  } catch (err) {
    console.error('Error changing user status (HU-016):', err);
    res.status(500).json({ error: SERVER_ERROR });
  }
};

// DELETE /api/admin/users/:id
export const removeUser = async (req, res) => {
  const id = asId(req.params.id);
  if (!id) return res.status(404).json({ error: 'User not found.' });

  try {
    const target = await svc.findUser(id);
    if (!target) return res.status(404).json({ error: 'User not found.' });
    const safety = checkAdminSafety({ actorId: req.session.user.id, target, activeAdmins: await svc.countActiveAdmins() });
    if (safety) return res.status(409).json({ error: safety });
    if (await svc.userHasActiveSession(id)) {
      return res.status(409).json({ error: 'This user has an active parking session. Try again when it ends.' });
    }

    await svc.deleteUser(id);
    res.json({ message: 'User deleted successfully.' });
  } catch (err) {
    console.error('Error deleting user (HU-016):', err);
    res.status(500).json({ error: SERVER_ERROR });
  }
};

// POST /api/admin/vehicles  ·  PUT /api/admin/vehicles/:id
export const saveVehicle = async (req, res) => {
  const vehicleId = req.params.id ? asId(req.params.id) : null;
  if (req.params.id && !vehicleId) return res.status(404).json({ error: 'Vehicle not found.' });
  const { value, error } = validateVehicleInput(req.body);
  if (error) return res.status(400).json({ error });

  try {
    if (!(await svc.findUser(value.ownerId))) return res.status(400).json({ error: 'The selected owner does not exist.' });
    if (await svc.plateTaken(value.plate, vehicleId || 0)) {
      return res.status(409).json({ error: 'A vehicle with this license plate already exists.' });
    }

    if (vehicleId) {
      const current = await svc.findVehicle(vehicleId);
      if (!current) return res.status(404).json({ error: 'Vehicle not found.' });
      // Con un parqueo activo no se cambia la placa ni el dueño (el agente la verifica por placa)
      const changesKey = current.plate !== value.plate || current.user_id !== value.ownerId;
      if (changesKey && await svc.plateHasActiveSession(current.plate)) {
        return res.status(409).json({ error: 'This vehicle has an active parking session; its plate and owner cannot change now.' });
      }
      await svc.updateVehicle(vehicleId, value);
    } else {
      await svc.insertVehicle(value);
    }
    res.json({ message: 'Vehicle information saved successfully.' });
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'A vehicle with this license plate already exists.' });
    }
    console.error('Error saving vehicle (HU-016):', err);
    res.status(500).json({ error: SERVER_ERROR });
  }
};

// DELETE /api/admin/vehicles/:id
export const removeVehicle = async (req, res) => {
  const id = asId(req.params.id);
  if (!id) return res.status(404).json({ error: 'Vehicle not found.' });
  try {
    const vehicle = await svc.findVehicle(id);
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found.' });
    if (await svc.plateHasActiveSession(vehicle.plate)) {
      return res.status(409).json({ error: 'You cannot delete a vehicle with an active parking session.' });
    }
    await svc.deleteVehicle(id);
    res.json({ message: 'Vehicle deleted successfully.' });
  } catch (err) {
    console.error('Error deleting vehicle (HU-016):', err);
    res.status(500).json({ error: SERVER_ERROR });
  }
};
