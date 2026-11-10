(() => {
  const users = [
    { id: 1, name: 'Admin SIGMUI', email: 'admin@sigmui.co', phone: '+57 300 123 4567', role: 'Admin', verified: true, status: 'Active', joined: 'Sep 01, 2026', isSelf: true, vehicles: [] },
    { id: 2, name: 'Luiver Rios Blanco', email: 'luiver@example.com', phone: '+57 300 000 0001', role: 'Client', verified: true, status: 'Active', joined: 'Sep 24, 2026', vehicles: [{ plate: 'ABC-123', type: 'Car', make: 'Toyota', model: 'Corolla', color: 'Gray', description: 'Personal vehicle' }] },
    { id: 3, name: 'Carlos Pérez', email: 'agente.perez@sigmui.co', phone: '+57 300 000 0002', role: 'Traffic Agent', verified: true, status: 'Active', joined: 'Sep 03, 2026', vehicles: [] },
    { id: 4, name: 'Laura Gómez', email: 'laura.gomez@mail.com', phone: '+57 300 000 0003', role: 'Client', verified: true, status: 'Active', joined: 'Oct 02, 2026', vehicles: [{ plate: 'XYZ-789', type: 'Motorcycle', make: 'Yamaha', model: 'MT-07', color: 'Black', description: 'Work motorcycle' }] },
    { id: 5, name: 'Ana Torres', email: 'ana.t@mail.com', phone: '+57 300 000 0004', role: 'Client', verified: false, status: 'Active', joined: 'Oct 18, 2026', vehicles: [] },
    { id: 6, name: 'Diego Ruiz', email: 'druiz@mail.com', phone: '+57 300 000 0005', role: 'Client', verified: true, status: 'Suspended', joined: 'Sep 12, 2026', vehicles: [] },
    { id: 7, name: 'Sofía Ramírez', email: 'agente.ramirez@sigmui.co', phone: '+57 300 000 0006', role: 'Traffic Agent', verified: true, status: 'Active', joined: 'Sep 05, 2026', vehicles: [] },
    { id: 8, name: 'Mateo Díaz', email: 'mateo.diaz@mail.com', phone: '+57 300 000 0007', role: 'Client', verified: true, status: 'Active', joined: 'Oct 10, 2026', vehicles: [{ plate: 'KLM-456', type: 'SUV', make: 'Toyota', model: 'RAV4', color: 'White', description: 'Family vehicle' }] },
    { id: 9, name: 'Valentina Cruz', email: 'vcruz@mail.com', phone: '+57 300 000 0008', role: 'Client', verified: false, status: 'Active', joined: 'Oct 19, 2026', vehicles: [] }
  ];

  const $ = (selector) => document.querySelector(selector);
  const tableBody = $('#usersTableBody');
  const editOverlay = $('#editOverlay');
  const vehicleOverlay = $('#vehicleOverlay');
  const deleteOverlay = $('#deleteOverlay');
  const deleteVehicleOverlay = $('#deleteVehicleOverlay');
  let activeUserId = null;
  let editingVehicleIndex = null;
  let pendingDeleteUserId = null;
  let pendingDeleteVehicleIndex = null;
  let roleFilter = 'all';
  let statusFilter = 'all';
  let toastTimer;

  const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));

  const initials = (name) => name.trim().split(/\s+/).slice(0, 2).map(part => part[0] || '').join('').toUpperCase();
  const getUser = (id) => users.find(user => user.id === Number(id));
  const roleLabel = (role) => role === 'Admin' ? 'Administrator' : role === 'Traffic Agent' ? 'Agent' : 'Client';
  const plateExists = (plate, userId, vehicleIndex) => {
    const normalized = plate.trim().toUpperCase();
    return users.some(user => user.vehicles.some((vehicle, index) =>
      vehicle.plate.trim().toUpperCase() === normalized &&
      !(user.id === userId && index === vehicleIndex)
    ));
  };

  function showToast(message, isError = false) {
    const toast = $('#toast');
    toast.textContent = message;
    toast.classList.toggle('toast-error', isError);
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 3200);
  }

  function renderUsers() {
    const query = $('#userSearch').value.trim().toLowerCase();
    const globalQuery = $('#globalSearch').value.trim().toLowerCase();
    const filtered = users.filter(user => {
      const vehicleText = user.vehicles.map(vehicle => vehicle.plate).join(' ').toLowerCase();
      const matchesQuery = !query || [user.name, user.email, user.role, vehicleText].join(' ').toLowerCase().includes(query);
      const matchesGlobal = !globalQuery || vehicleText.includes(globalQuery);
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;
      const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
      return matchesQuery && matchesGlobal && matchesRole && matchesStatus;
    });

    tableBody.innerHTML = filtered.map(user => `
      <tr>
        <td><div class="name-cell"><span class="user-avatar">${escapeHtml(initials(user.name))}</span><span class="user-name">${escapeHtml(user.name)}</span>${user.isSelf ? '<span class="you-badge">You</span>' : ''}</div></td>
        <td class="email-cell">${escapeHtml(user.email)}</td>
        <td><span class="role-badge role-${user.role === 'Admin' ? 'admin' : user.role === 'Traffic Agent' ? 'agent' : 'client'}">${escapeHtml(roleLabel(user.role))}</span></td>
        <td><span class="${user.verified ? 'verified' : 'not-verified'}">${user.verified ? 'Yes' : 'No'}</span></td>
        <td><span class="status-cell"><i class="status-dot ${user.status === 'Active' ? 'dot-active' : 'dot-inactive'}"></i>${user.status === 'Active' ? 'Active' : 'Inactive'}</span></td>
        <td class="joined-cell">${escapeHtml(user.joined)}</td>
        <td><div class="action-cell">
          <button class="action-icon edit-action" type="button" data-action="edit" data-id="${user.id}" aria-label="Edit ${escapeHtml(user.name)}" title="Edit user">✎</button>
          <button class="action-icon delete-action" type="button" data-action="delete" data-id="${user.id}" aria-label="Delete ${escapeHtml(user.name)}" title="Delete user" ${user.isSelf ? 'disabled' : ''}>♜</button>
          <button class="status-button ${user.status === 'Active' ? 'deactivate-button' : 'reactivate-button'}" type="button" data-action="toggle-status" data-id="${user.id}">${user.status === 'Active' ? 'Deactivate' : 'Reactivate'}</button>
        </div></td>
      </tr>
    `).join('');

    $('#resultCount').textContent = `${filtered.length} of ${users.length} users`;
    $('#emptyState').hidden = filtered.length !== 0;
  }

  function openEdit(userId) {
    const user = getUser(userId);
    if (!user) return;
    activeUserId = user.id;
    $('#editName').value = user.name;
    $('#editEmail').value = user.email;
    $('#editPhone').value = user.phone || '';
    $('#editRole').value = user.role;
    $('#editStatus').value = user.status;
    $('#editPassword').value = '';
    renderVehicles();
    editOverlay.hidden = false;
    document.body.classList.add('modal-open');
    $('#editName').focus();
  }

  function closeEdit() {
    editOverlay.hidden = true;
    vehicleOverlay.hidden = true;
    if (deleteVehicleOverlay.hidden) document.body.classList.remove('modal-open');
    activeUserId = null;
  }

  function renderVehicles() {
    const user = getUser(activeUserId);
    const list = $('#vehicleList');
    if (!user || user.vehicles.length === 0) {
      list.innerHTML = '<div class="no-vehicles">No vehicles linked to this user yet.</div>';
      return;
    }
    list.innerHTML = user.vehicles.map((vehicle, index) => `
      <article class="vehicle-card">
        <div class="vehicle-symbol">${vehicle.type === 'Motorcycle' ? '♞' : '▰'}</div>
        <div class="vehicle-info">
          <div class="vehicle-title-row"><strong>${escapeHtml(vehicle.plate)}</strong><span class="vehicle-type">${escapeHtml(vehicle.type)}</span></div>
          <p>${escapeHtml([vehicle.make, vehicle.model, vehicle.color].filter(Boolean).join(' · ') || 'Details not provided')}</p>
          <p class="vehicle-description">${escapeHtml(vehicle.description || 'No description')}</p>
        </div>
        <div class="vehicle-actions">
          <button class="action-icon edit-action" type="button" data-vehicle-action="edit" data-index="${index}" aria-label="Edit vehicle ${escapeHtml(vehicle.plate)}" title="Edit vehicle">✎</button>
          <button class="action-icon delete-action" type="button" data-vehicle-action="delete" data-index="${index}" aria-label="Delete vehicle ${escapeHtml(vehicle.plate)}" title="Delete vehicle">♜</button>
        </div>
      </article>
    `).join('');
  }

  function openVehicleForm(index = null) {
    const user = getUser(activeUserId);
    if (!user) return;
    editingVehicleIndex = index;
    const vehicle = index === null ? { plate: '', type: '', make: '', model: '', color: '', description: '' } : user.vehicles[index];
    $('#vehicleDialogTitle').textContent = index === null ? 'Add vehicle' : 'Edit vehicle';
    $('#vehiclePlate').value = vehicle.plate;
    $('#vehicleType').value = vehicle.type;
    $('#vehicleMake').value = vehicle.make || '';
    $('#vehicleModel').value = vehicle.model || '';
    $('#vehicleColor').value = vehicle.color || '';
    $('#vehicleDescription').value = vehicle.description || '';
    $('#vehicleOwner').innerHTML = users.map(item => `<option value="${item.id}">${escapeHtml(item.name)}</option>`).join('');
    $('#vehicleOwner').value = String(activeUserId);
    vehicleOverlay.hidden = false;
    $('#vehiclePlate').focus();
  }

  function closeVehicleForm() {
    vehicleOverlay.hidden = true;
    editingVehicleIndex = null;
  }

  function openDeleteUser(userId) {
    const user = getUser(userId);
    if (!user) return;
    if (user.isSelf) {
      showToast('You cannot delete the active administrator account.', true);
      return;
    }
    const activeAdmins = users.filter(item => item.role === 'Admin' && item.status === 'Active').length;
    if (user.role === 'Admin' && user.status === 'Active' && activeAdmins <= 1) {
      showToast('You cannot delete the last active administrator.', true);
      return;
    }
    pendingDeleteUserId = user.id;
    $('#deleteDescription').textContent = `Are you sure you want to delete ${user.name}? This action cannot be undone.`;
    deleteOverlay.hidden = false;
  }

  function closeDeleteUser() {
    deleteOverlay.hidden = true;
    pendingDeleteUserId = null;
  }

  tableBody.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const userId = Number(button.dataset.id);
    if (button.dataset.action === 'edit') openEdit(userId);
    if (button.dataset.action === 'delete') openDeleteUser(userId);
    if (button.dataset.action === 'toggle-status') {
      const user = getUser(userId);
      if (!user) return;
      if (user.isSelf && user.status === 'Active') {
        showToast('You cannot suspend the active logged-in administrator.', true);
        return;
      }
      if (user.role === 'Admin' && user.status === 'Active' && users.filter(item => item.role === 'Admin' && item.status === 'Active').length <= 1) {
        showToast('You cannot suspend the last active administrator.', true);
        return;
      }
      user.status = user.status === 'Active' ? 'Suspended' : 'Active';
      renderUsers();
      showToast(`User ${user.status === 'Active' ? 'reactivated' : 'deactivated'} successfully.`);
    }
  });

  $('#userSearch').addEventListener('input', renderUsers);
  $('#globalSearch').addEventListener('input', renderUsers);
  $('#roleFilters').addEventListener('click', event => {
    const button = event.target.closest('[data-role]');
    if (!button) return;
    roleFilter = button.dataset.role;
    $('#roleFilters').querySelectorAll('.filter-chip').forEach(chip => chip.classList.toggle('selected', chip === button));
    renderUsers();
  });
  $('#statusFilters').addEventListener('click', event => {
    const button = event.target.closest('[data-status]');
    if (!button) return;
    statusFilter = button.dataset.status;
    $('#statusFilters').querySelectorAll('.filter-chip').forEach(chip => chip.classList.toggle('selected', chip === button));
    renderUsers();
  });

  $('#editUserForm').addEventListener('submit', event => {
    event.preventDefault();
    const user = getUser(activeUserId);
    if (!user) return;
    const name = $('#editName').value.trim();
    const email = $('#editEmail').value.trim();
    const role = $('#editRole').value;
    if (!role) {
      showToast('Please select a valid user role (Admin, Client, Traffic Agent).', true);
      return;
    }
    if (users.some(item => item.id !== user.id && item.email.toLowerCase() === email.toLowerCase())) {
      showToast('A user with this email already exists.', true);
      return;
    }
    if (user.isSelf && $('#editStatus').value !== 'Active') {
      showToast('You cannot suspend the active logged-in administrator.', true);
      return;
    }
    const activeAdminsAfter = users.filter(item => item.role === 'Admin' && item.status === 'Active' && item.id !== user.id).length +
      (role === 'Admin' && $('#editStatus').value === 'Active' ? 1 : 0);
    if (activeAdminsAfter < 1) {
      showToast('At least one active administrator must remain.', true);
      return;
    }
    user.name = name;
    user.email = email;
    user.phone = $('#editPhone').value.trim();
    user.role = role;
    user.status = $('#editStatus').value;
    // The password field is intentionally not stored in browser-side demo code.
    const passwordProvided = $('#editPassword').value.length > 0;
    renderUsers();
    closeEdit();
    showToast(passwordProvided ? 'Profile saved. Connect a secure backend to change passwords.' : 'User information updated successfully.');
  });

  $('#vehicleList').addEventListener('click', event => {
    const button = event.target.closest('button[data-vehicle-action]');
    if (!button) return;
    const index = Number(button.dataset.index);
    if (button.dataset.vehicleAction === 'edit') openVehicleForm(index);
    if (button.dataset.vehicleAction === 'delete') {
      pendingDeleteVehicleIndex = index;
      $('#deleteVehicleOverlay').hidden = false;
    }
  });

  $('#addVehicle').addEventListener('click', () => openVehicleForm());
  $('#vehicleForm').addEventListener('submit', event => {
    event.preventDefault();
    const user = getUser(activeUserId);
    if (!user) return;
    const plate = $('#vehiclePlate').value.trim().toUpperCase();
    if (plateExists(plate, user.id, editingVehicleIndex)) {
      showToast('A vehicle with this license plate already exists.', true);
      return;
    }
    const vehicle = {
      plate,
      type: $('#vehicleType').value,
      make: $('#vehicleMake').value.trim(),
      model: $('#vehicleModel').value.trim(),
      color: $('#vehicleColor').value.trim(),
      description: $('#vehicleDescription').value.trim()
    };
    const ownerId = Number($('#vehicleOwner').value);
    if (editingVehicleIndex === null) {
      getUser(ownerId).vehicles.push(vehicle);
    } else if (ownerId === user.id) {
      user.vehicles[editingVehicleIndex] = vehicle;
    } else {
      user.vehicles.splice(editingVehicleIndex, 1);
      getUser(ownerId).vehicles.push(vehicle);
    }
    closeVehicleForm();
    renderVehicles();
    renderUsers();
    showToast('Vehicle information saved successfully.');
  });

  $('#confirmDelete').addEventListener('click', () => {
    const user = getUser(pendingDeleteUserId);
    if (!user) return closeDeleteUser();
    const activeAdmins = users.filter(item => item.role === 'Admin' && item.status === 'Active').length;
    if (user.isSelf || (user.role === 'Admin' && user.status === 'Active' && activeAdmins <= 1)) {
      closeDeleteUser();
      showToast('Cannot delete the active logged-in administrator account or the last remaining active Admin.', true);
      return;
    }
    const index = users.findIndex(item => item.id === user.id);
    users.splice(index, 1);
    closeDeleteUser();
    renderUsers();
    showToast('User deleted successfully.');
  });

  $('#confirmDeleteVehicle').addEventListener('click', () => {
    const user = getUser(activeUserId);
    if (user && pendingDeleteVehicleIndex !== null) {
      user.vehicles.splice(pendingDeleteVehicleIndex, 1);
      renderVehicles();
      renderUsers();
      showToast('Vehicle deleted successfully.');
    }
    $('#deleteVehicleOverlay').hidden = true;
    pendingDeleteVehicleIndex = null;
  });

  $('#closeEdit').addEventListener('click', closeEdit);
  $('#cancelEdit').addEventListener('click', closeEdit);
  $('#closeVehicle').addEventListener('click', closeVehicleForm);
  $('#cancelVehicle').addEventListener('click', closeVehicleForm);
  $('#closeDelete').addEventListener('click', closeDeleteUser);
  $('#cancelDelete').addEventListener('click', closeDeleteUser);
  $('#closeDeleteVehicle').addEventListener('click', () => { $('#deleteVehicleOverlay').hidden = true; });
  $('#cancelDeleteVehicle').addEventListener('click', () => { $('#deleteVehicleOverlay').hidden = true; pendingDeleteVehicleIndex = null; });

  [editOverlay, vehicleOverlay, deleteOverlay, deleteVehicleOverlay].forEach(overlay => {
    overlay.addEventListener('click', event => {
      if (event.target !== overlay) return;
      if (overlay === editOverlay) closeEdit();
      if (overlay === vehicleOverlay) closeVehicleForm();
      if (overlay === deleteOverlay) closeDeleteUser();
      if (overlay === deleteVehicleOverlay) { overlay.hidden = true; pendingDeleteVehicleIndex = null; }
    });
  });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    if (!deleteVehicleOverlay.hidden) { deleteVehicleOverlay.hidden = true; pendingDeleteVehicleIndex = null; }
    else if (!deleteOverlay.hidden) closeDeleteUser();
    else if (!vehicleOverlay.hidden) closeVehicleForm();
    else if (!editOverlay.hidden) closeEdit();
  });

  renderUsers();
})();