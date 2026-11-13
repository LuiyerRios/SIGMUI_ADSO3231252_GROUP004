// Estado global de la aplicación
const state = {
  currentUser: null,
  selectedSpaceId: 'A7',
  spaces: []
};

// Inicializar espacios (32 espacios para Zona A)
function initSpaces() {
  const occupiedList = ['A9', 'A14', 'A18', 'A21', 'A27', 'A28', 'A7'];
  
  for (let i = 1; i <= 32; i++) {
    const id = `A${i}`;
    const isOccupied = occupiedList.includes(id);
    state.spaces.push({
      id: id,
      zone: 'Zone A',
      status: isOccupied ? 'occupied' : 'available',
      vehicle: isOccupied ? (id === 'A7' ? 'TYU-029' : 'ABC-' + Math.floor(100 + Math.random() * 900)) : '-',
      owner: isOccupied ? (id === 'A7' ? 'Mateo Díaz' : 'Cliente Registrado') : '-',
      entryTime: isOccupied ? '09:49' : '-',
      timeLeft: isOccupied ? '1h 17m' : '-'
    });
  }
}

// Renderizar la cuadrícula de espacios
function renderGrid() {
  const gridContainer = document.getElementById('spaces-grid');
  gridContainer.innerHTML = '';

  state.spaces.forEach(space => {
    const spaceEl = document.createElement('div');
    spaceEl.className = `space-item ${space.status} ${space.id === state.selectedSpaceId ? 'selected' : ''}`;
    spaceEl.innerHTML = `<span class="status-dot"></span> ${space.id}`;
    
    spaceEl.addEventListener('click', () => {
      selectSpace(space.id);
    });

    gridContainer.appendChild(spaceEl);
  });

  updateKPIs();
}

// Seleccionar un espacio y cargar sus detalles en el panel derecho
function selectSpace(id) {
  state.selectedSpaceId = id;
  const space = state.spaces.find(s => s.id === id);

  document.getElementById('selected-badge').innerText = space.id;
  document.getElementById('selected-title').innerText = `Space ${space.id}`;
  
  const pill = document.getElementById('selected-status-pill');
  pill.innerText = space.status.charAt(0).toUpperCase() + space.status.slice(1);
  pill.className = `status-pill ${space.status}`;

  document.getElementById('info-zone').innerText = space.zone;
  document.getElementById('info-vehicle').innerText = space.vehicle;
  document.getElementById('info-owner').innerText = space.owner;
  document.getElementById('info-time').innerText = space.entryTime;
  document.getElementById('info-timeleft').innerText = space.timeLeft;

  // Actualizar estados de botones de acción
  const btnAvail = document.getElementById('btn-available');
  const btnOcc = document.getElementById('btn-occupied');

  if (space.status === 'available') {
    btnAvail.className = 'btn-status active-available';
    btnOcc.className = 'btn-status';
  } else {
    btnAvail.className = 'btn-status';
    btnOcc.className = 'btn-status active-occupied';
  }

  renderGrid();
}

// Cambiar el estado (Available / Occupied) del espacio seleccionado
function updateSpaceStatus(newStatus) {
  const space = state.spaces.find(s => s.id === state.selectedSpaceId);
  if (!space) return;

  space.status = newStatus;
  if (newStatus === 'available') {
    space.vehicle = '-';
    space.owner = '-';
    space.entryTime = '-';
    space.timeLeft = '-';
  } else {
    space.vehicle = 'NEW-123';
    space.owner = 'Nuevo Ingreso';
    space.entryTime = 'Ahora';
    space.timeLeft = '2h 00m';
  }

  selectSpace(space.id);
}

// Recalcular métricas principales (KPIs)
function updateKPIs() {
  const total = state.spaces.length;
  const occupiedCount = state.spaces.filter(s => s.status === 'occupied').length;
  const availableCount = total - occupiedCount;
  const occupancyPercentage = Math.round((occupiedCount / total) * 100);

  document.getElementById('kpi-occupancy').innerText = `${occupancyPercentage}%`;
  document.getElementById('kpi-occupancy-sub').innerText = `${occupiedCount} of ${total} spaces in use`;
  document.getElementById('kpi-available').innerText = availableCount;
}

// Enrutamiento de inicio de sesión
document.addEventListener('DOMContentLoaded', () => {
  initSpaces();

  const loginView = document.getElementById('login-view');
  const adminView = document.getElementById('admin-view');
  const btnLogin = document.getElementById('btn-login');
  const btnLogout = document.getElementById('btn-logout');

  // Evento de Login
  btnLogin.addEventListener('click', () => {
    const role = document.getElementById('role-select').value;
    
    if (role === 'admin') {
      state.currentUser = 'Admin SIGMUI';
      loginView.classList.remove('active-view');
      adminView.classList.add('active-view');
      renderGrid();
      selectSpace('A7'); // Selecciona A7 por defecto como en la imagen
    } else {
      alert('Vista no disponible para rol estándar');
    }
  });

  // Evento de Logout
  btnLogout.addEventListener('click', () => {
    state.currentUser = null;
    adminView.classList.remove('active-view');
    loginView.classList.add('active-view');
  });
});