// HU-016 · Manage users: tabla, filtros, panel de edición y vehículos (diseño de Juan Esteban Villota)
// Los datos vienen de la BD con /api/admin/users; cada cambio se guarda en el servidor y la tabla se recarga.
(() => {
  const root = document.getElementById('manageUsers');
  if (!root) return;

  let users = [];
  const $ = (selector) => document.querySelector(selector);
  const tableBody = $('#usersTableBody');
  const editOverlay = $('#editOverlay');
  const vehicleOverlay = $('#vehicleOverlay');
  const deleteOverlay = $('#deleteOverlay');
  const deleteVehicleOverlay = $('#deleteVehicleOverlay');
  let activeUserId = null;
  let editingVehicleId = null;
  let pendingDeleteUserId = null;
  let pendingDeleteVehicleId = null;
  let roleFilter = 'all';
  let statusFilter = 'all';
  let toastTimer;

  const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));

  const initials = (name) => name.trim().split(/\s+/).slice(0, 2).map(part => part[0] || '').join('').toUpperCase();
  const getUser = (id) => users.find(user => user.id === Number(id));
  const getVehicle = (user, id) => (user ? user.vehicles.find(v => v.id === Number(id)) : null);
  const roleLabel = (role) => role === 'Admin' ? 'Administrator' : role === 'Traffic Agent' ? 'Agent' : 'Client';
  const rolePill = (role) => role === 'Admin' ? 'pill-accent' : role === 'Traffic Agent' ? 'pill-info' : 'pill-muted';
  const avatarColor = (id) => ['bg-primary', 'bg-accent', 'bg-tech', 'bg-success', 'bg-warning'][id % 5];

  function showToast(message, isError = false) {
    const toast = $('#toast');
    toast.textContent = message;
    toast.classList.toggle('toast-error', isError);
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 3200);
  }

  // Llamada a la API; devuelve el JSON o lanza el mensaje de error del servidor
  async function api(method, url, body) {
    const response = await fetch(url, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'The request could not be completed. Please try again.');
    return data;
  }

  async function loadUsers() {
    try {
      const data = await api('GET', '/api/admin/users');
      users = data.users;
      renderUsers();
      if (activeUserId && !editOverlay.hidden) renderVehicles();
    } catch (err) {
      $('#resultCount').textContent = '';
      showToast(err.message, true);
    }
  }

  function renderUsers() {
    const query = $('#userSearch').value.trim().toLowerCase();
    const filtered = users.filter(user => {
      const vehicleText = user.vehicles.map(vehicle => vehicle.plate).join(' ').toLowerCase();
      const matchesQuery = !query || [user.name, user.email, roleLabel(user.role), vehicleText].join(' ').toLowerCase().includes(query);
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;
      const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
      return matchesQuery && matchesRole && matchesStatus;
    });

    tableBody.innerHTML = filtered.map(user => `
      <tr>
        <td data-label="Name"><div class="flex items-center gap-2.5 min-w-0">
          <span class="w-8 h-8 rounded-full text-white text-[11px] font-bold flex items-center justify-center shrink-0 ${avatarColor(user.id)}">${escapeHtml(initials(user.name))}</span>
          <span class="font-semibold text-ink truncate max-w-[160px]">${escapeHtml(user.name)}</span>
          ${user.isSelf ? '<span class="pill pill-accent">You</span>' : ''}
        </div></td>
        <td data-label="Email" class="text-muted">${escapeHtml(user.email)}</td>
        <td data-label="Role"><span class="pill ${rolePill(user.role)}">${escapeHtml(roleLabel(user.role))}</span></td>
        <td data-label="Verified"><span class="text-xs font-semibold ${user.verified ? 'text-success' : 'text-warning'}">${user.verified ? 'Yes' : 'No'}</span></td>
        <td data-label="Status"><span class="inline-flex items-center gap-1.5 text-xs font-semibold ${user.status === 'Active' ? 'text-success' : 'text-danger'}"><i class="w-2 h-2 rounded-full ${user.status === 'Active' ? 'bg-success' : 'bg-danger'}"></i>${user.status === 'Active' ? 'Active' : 'Inactive'}</span></td>
        <td data-label="Joined" class="text-muted">${escapeHtml(user.joined)}</td>
        <td data-label=""><div class="flex items-center gap-2">
          <button class="btn btn-ghost" type="button" data-action="edit" data-id="${user.id}" aria-label="Edit ${escapeHtml(user.name)}" title="Edit user"><i class="fas fa-pen"></i></button>
          <button class="btn btn-ghost text-danger" type="button" data-action="delete" data-id="${user.id}" aria-label="Delete ${escapeHtml(user.name)}" title="${user.isSelf ? 'You cannot delete your own account' : 'Delete user'}" ${user.isSelf ? 'disabled' : ''}><i class="fas fa-trash"></i></button>
          <button class="btn ${user.status === 'Active' ? 'btn-secondary text-danger' : 'btn-secondary text-success'} whitespace-nowrap" type="button" data-action="toggle-status" data-id="${user.id}" ${user.isSelf ? 'disabled title="You cannot change your own account."' : ''}>${user.status === 'Active' ? 'Deactivate' : 'Reactivate'}</button>
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
    // El admin en sesión no puede quitarse el rol ni suspenderse
    $('#editRole').disabled = user.isSelf;
    $('#editStatus').disabled = user.isSelf;
    renderVehicles();
    editOverlay.hidden = false;
    document.body.classList.add('modal-open');
    $('#editName').focus();
  }

  function closeEdit() {
    editOverlay.hidden = true;
    vehicleOverlay.hidden = true;
    document.body.classList.remove('modal-open');
    activeUserId = null;
  }

  function renderVehicles() {
    const user = getUser(activeUserId);
    const list = $('#vehicleList');
    if (!user || user.vehicles.length === 0) {
      list.innerHTML = '<div class="no-vehicles">No vehicles linked to this user yet.</div>';
      return;
    }
    list.innerHTML = user.vehicles.map(vehicle => `
      <article class="vehicle-card">
        <div class="vehicle-symbol"><i class="fas ${vehicle.type === 'Motorcycle' ? 'fa-motorcycle' : 'fa-car'}"></i></div>
        <div class="vehicle-info">
          <div class="vehicle-title-row"><strong>${escapeHtml(vehicle.plate)}</strong><span class="vehicle-type">${escapeHtml(vehicle.type)}</span>${vehicle.hasActiveSession ? '<span class="pill pill-warning">Parked now</span>' : ''}</div>
          <p>${escapeHtml([vehicle.make, vehicle.model, vehicle.color].filter(Boolean).join(' · ') || 'Details not provided')}</p>
          <p class="vehicle-description">${escapeHtml(vehicle.description || 'No description')}</p>
        </div>
        <div class="vehicle-actions">
          <button class="btn btn-ghost" type="button" data-vehicle-action="edit" data-id="${vehicle.id}" aria-label="Edit vehicle ${escapeHtml(vehicle.plate)}" title="Edit vehicle"><i class="fas fa-pen"></i></button>
          <button class="btn btn-ghost text-danger" type="button" data-vehicle-action="delete" data-id="${vehicle.id}" aria-label="Delete vehicle ${escapeHtml(vehicle.plate)}" title="Delete vehicle"><i class="fas fa-trash"></i></button>
        </div>
      </article>
    `).join('');
  }

  function openVehicleForm(vehicleId = null) {
    const user = getUser(activeUserId);
    if (!user) return;
    editingVehicleId = vehicleId;
    const vehicle = vehicleId === null
      ? { plate: '', type: '', make: '', model: '', color: '', description: '' }
      : getVehicle(user, vehicleId);
    $('#vehicleDialogTitle').textContent = vehicleId === null ? 'Add vehicle' : 'Edit vehicle';
    $('#vehiclePlate').value = vehicle.plate;
    $('#vehicleType').value = vehicle.type;
    $('#vehicleMake').value = vehicle.make || '';
    $('#vehicleModel').value = vehicle.model || '';
    $('#vehicleColor').value = vehicle.color || '';
    $('#vehicleDescription').value = vehicle.description || '';
    $('#vehicleOwner').innerHTML = users
      .map(item => `<option value="${item.id}">${escapeHtml(item.name)} · ${escapeHtml(roleLabel(item.role))}</option>`)
      .join('');
    $('#vehicleOwner').value = String(activeUserId);
    vehicleOverlay.hidden = false;
    $('#vehiclePlate').focus();
  }

  function closeVehicleForm() {
    vehicleOverlay.hidden = true;
    editingVehicleId = null;
  }

  function openDeleteUser(userId) {
    const user = getUser(userId);
    if (!user) return;
    if (user.isSelf) {
      showToast('You cannot delete your own account.', true);
      return;
    }
    pendingDeleteUserId = user.id;
    $('#deleteDescription').textContent = `Are you sure you want to delete ${user.name}? Their vehicles will be removed too. Payments and fines stay in the history.`;
    deleteOverlay.hidden = false;
  }

  function closeDeleteUser() {
    deleteOverlay.hidden = true;
    pendingDeleteUserId = null;
  }

  // Bloquea un botón mientras se guarda para evitar dobles envíos
  async function withBusy(button, task) {
    if (button) button.disabled = true;
    try {
      await task();
    } catch (err) {
      showToast(err.message, true);
    } finally {
      if (button) button.disabled = false;
    }
  }

  // HU-016 (#33): cada cambio pide confirmación antes de enviarse
  const confirmOverlay = $('#confirmChangeOverlay');
  let pendingChange = null;
  function askConfirm(title, text, action) {
    $('#confirmChangeTitle').textContent = title;
    $('#confirmChangeText').textContent = text;
    pendingChange = action;
    confirmOverlay.hidden = false;
  }
  function closeConfirm() {
    confirmOverlay.hidden = true;
    pendingChange = null;
  }
  $('#closeConfirmChange').addEventListener('click', closeConfirm);
  $('#cancelConfirmChange').addEventListener('click', closeConfirm);
  $('#acceptConfirmChange').addEventListener('click', () => {
    const action = pendingChange;
    closeConfirm();
    if (action) action();
  });

  tableBody.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const userId = Number(button.dataset.id);
    if (button.dataset.action === 'edit') openEdit(userId);
    if (button.dataset.action === 'delete') openDeleteUser(userId);
    if (button.dataset.action === 'toggle-status') {
      const user = getUser(userId);
      if (!user) return;
      const next = user.status === 'Active' ? 'Suspended' : 'Active';
      const verb = next === 'Active' ? 'Reactivate' : 'Deactivate';
      askConfirm(`${verb} user?`, `Are you sure you want to ${verb.toLowerCase()} ${user.name}?`, () => withBusy(button, async () => {
        const data = await api('PATCH', `/api/admin/users/${user.id}/status`, { status: next });
        await loadUsers();
        showToast(data.message);
      }));
    }
  });

  $('#userSearch').addEventListener('input', renderUsers);
  $('#roleFilters').addEventListener('click', event => {
    const button = event.target.closest('[data-role]');
    if (!button) return;
    roleFilter = button.dataset.role;
    $('#roleFilters').querySelectorAll('.chip').forEach(chip => chip.classList.toggle('active', chip === button));
    renderUsers();
  });
  $('#statusFilters').addEventListener('click', event => {
    const button = event.target.closest('[data-status]');
    if (!button) return;
    statusFilter = button.dataset.status;
    $('#statusFilters').querySelectorAll('.chip').forEach(chip => chip.classList.toggle('active', chip === button));
    renderUsers();
  });

  $('#editUserForm').addEventListener('submit', event => {
    event.preventDefault();
    const user = getUser(activeUserId);
    if (!user) return;
    const submit = event.submitter || $('#editUserForm button[type="submit"]');
    askConfirm('Save changes?', `Are you sure you want to update ${user.name}?`, () => withBusy(submit, async () => {
      const data = await api('PUT', `/api/admin/users/${user.id}`, {
        name: $('#editName').value,
        email: $('#editEmail').value,
        phone: $('#editPhone').value,
        role: $('#editRole').value,
        status: $('#editStatus').value,
        password: $('#editPassword').value
      });
      closeEdit();
      await loadUsers();
      showToast(data.message);
    }));
  });

  $('#vehicleList').addEventListener('click', event => {
    const button = event.target.closest('button[data-vehicle-action]');
    if (!button) return;
    const vehicleId = Number(button.dataset.id);
    if (button.dataset.vehicleAction === 'edit') openVehicleForm(vehicleId);
    if (button.dataset.vehicleAction === 'delete') {
      pendingDeleteVehicleId = vehicleId;
      deleteVehicleOverlay.hidden = false;
    }
  });

  $('#addVehicle').addEventListener('click', () => openVehicleForm());
  $('#vehiclePlate').addEventListener('input', () => {
    $('#vehiclePlate').value = $('#vehiclePlate').value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  });
  $('#vehicleForm').addEventListener('submit', event => {
    event.preventDefault();
    const submit = event.submitter || $('#vehicleForm button[type="submit"]');
    const payload = {
      plate: $('#vehiclePlate').value,
      type: $('#vehicleType').value,
      make: $('#vehicleMake').value,
      model: $('#vehicleModel').value,
      color: $('#vehicleColor').value,
      description: $('#vehicleDescription').value,
      ownerId: Number($('#vehicleOwner').value)
    };
    withBusy(submit, async () => {
      const data = editingVehicleId === null
        ? await api('POST', '/api/admin/vehicles', payload)
        : await api('PUT', `/api/admin/vehicles/${editingVehicleId}`, payload);
      closeVehicleForm();
      await loadUsers();
      showToast(data.message);
    });
  });

  $('#confirmDelete').addEventListener('click', event => {
    const user = getUser(pendingDeleteUserId);
    if (!user) return closeDeleteUser();
    withBusy(event.currentTarget, async () => {
      try {
        const data = await api('DELETE', `/api/admin/users/${user.id}`);
        await loadUsers();
        showToast(data.message);
      } finally {
        closeDeleteUser();
      }
    });
  });

  $('#confirmDeleteVehicle').addEventListener('click', event => {
    const vehicleId = pendingDeleteVehicleId;
    withBusy(event.currentTarget, async () => {
      try {
        const data = await api('DELETE', `/api/admin/vehicles/${vehicleId}`);
        await loadUsers();
        showToast(data.message);
      } finally {
        deleteVehicleOverlay.hidden = true;
        pendingDeleteVehicleId = null;
      }
    });
  });

  $('#closeEdit').addEventListener('click', closeEdit);
  $('#cancelEdit').addEventListener('click', closeEdit);
  $('#closeVehicle').addEventListener('click', closeVehicleForm);
  $('#cancelVehicle').addEventListener('click', closeVehicleForm);
  $('#closeDelete').addEventListener('click', closeDeleteUser);
  $('#cancelDelete').addEventListener('click', closeDeleteUser);
  $('#closeDeleteVehicle').addEventListener('click', () => { deleteVehicleOverlay.hidden = true; pendingDeleteVehicleId = null; });
  $('#cancelDeleteVehicle').addEventListener('click', () => { deleteVehicleOverlay.hidden = true; pendingDeleteVehicleId = null; });

  [editOverlay, vehicleOverlay, deleteOverlay, deleteVehicleOverlay].forEach(overlay => {
    overlay.addEventListener('click', event => {
      if (event.target !== overlay) return;
      if (overlay === editOverlay) closeEdit();
      if (overlay === vehicleOverlay) closeVehicleForm();
      if (overlay === deleteOverlay) closeDeleteUser();
      if (overlay === deleteVehicleOverlay) { overlay.hidden = true; pendingDeleteVehicleId = null; }
    });
  });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    if (!deleteVehicleOverlay.hidden) { deleteVehicleOverlay.hidden = true; pendingDeleteVehicleId = null; }
    else if (!deleteOverlay.hidden) closeDeleteUser();
    else if (!vehicleOverlay.hidden) closeVehicleForm();
    else if (!editOverlay.hidden) closeEdit();
  });

  loadUsers();
})();
