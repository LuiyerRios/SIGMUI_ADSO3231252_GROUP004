document.addEventListener('DOMContentLoaded', () => {
  const adminSpacesGrid = document.getElementById('adminSpacesGrid');
  const adminZoneChips = document.getElementById('adminZoneChips');
  
  // Elementos del Panel Lateral
  const adminPanelSpaceCode = document.getElementById('adminPanelSpaceCode');
  const adminPanelSpaceTitle = document.getElementById('adminPanelSpaceTitle');
  const adminPanelSpaceStatus = document.getElementById('adminPanelSpaceStatus');
  const panelValZone = document.getElementById('panelValZone');
  const panelValVehicle = document.getElementById('panelValVehicle');
  const panelValOwner = document.getElementById('panelValOwner');
  const panelValEntryTime = document.getElementById('panelValEntryTime');
  const panelValTimeLeft = document.getElementById('panelValTimeLeft');
  const btnSetAvailable = document.getElementById('btnSetAvailable');
  const btnSetOccupied = document.getElementById('btnSetOccupied');
  const sessionOccupiedNote = document.getElementById('sessionOccupiedNote');

  // Elementos de Redimensionamiento
  const triggerResizeBtn = document.getElementById('triggerResizeBtn');
  const resizeConfirmAlert = document.getElementById('resizeConfirmAlert');
  const confirmResizeBtn = document.getElementById('confirmResizeBtn');
  const cancelResizeBtn = document.getElementById('cancelResizeBtn');

  let selectedSpaceData = null;
  let countdownTimer = null;

  // 1. Manejador de Cambio de Zona mediante Chips
  if (adminZoneChips) {
    adminZoneChips.addEventListener('click', (e) => {
      const chip = e.target.closest('button.chip');
      if (!chip) return;

      const zoneCode = chip.getAttribute('data-zone');
      document.querySelectorAll('#adminZoneChips button.chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');

      if (adminSpacesGrid) {
        adminSpacesGrid.setAttribute('data-current-zone', zoneCode);
      }
      refreshData();
    });
  }

  // 2. Selección de Espacio en la Cuadrícula
  if (adminSpacesGrid) {
    adminSpacesGrid.addEventListener('click', (e) => {
      const btn = e.target.closest('button.space-grid-item');
      if (!btn) return;

      const spaceId = btn.getAttribute('data-space-id');
      const occupied = btn.getAttribute('data-occupied') === 'true';
      const source = btn.getAttribute('data-source');
      const plate = btn.getAttribute('data-plate');
      const owner = btn.getAttribute('data-owner');
      const startTime = btn.getAttribute('data-start-time');
      const endTime = btn.getAttribute('data-end-time');

      selectAdminSpace({
        id: spaceId,
        zone: spaceId.charAt(0),
        occupied,
        source,
        plate,
        owner,
        startTime,
        endTime
      });
    });
  }

  function selectAdminSpace(space) {
    selectedSpaceData = space;

    document.querySelectorAll('.space-grid-item').forEach(b => b.classList.remove('selected'));
    const targetBtn = document.querySelector(`.space-grid-item[data-space-id="${space.id}"]`);
    if (targetBtn) targetBtn.classList.add('selected');

    if (adminPanelSpaceCode) adminPanelSpaceCode.textContent = space.id;
    if (adminPanelSpaceTitle) adminPanelSpaceTitle.textContent = `Space ${space.id}`;
    if (panelValZone) panelValZone.textContent = `Zone ${space.zone}`;

    if (adminPanelSpaceStatus) {
      if (space.occupied) {
        adminPanelSpaceStatus.textContent = space.source === 'session' ? 'Occupied (Session)' : 'Occupied (Manual)';
        adminPanelSpaceStatus.className = 'pill pill-danger';
      } else {
        adminPanelSpaceStatus.textContent = 'Available';
        adminPanelSpaceStatus.className = 'pill pill-success';
      }
    }

    if (panelValVehicle) panelValVehicle.textContent = space.plate || '—';
    if (panelValOwner) panelValOwner.textContent = space.owner || '—';

    // Formatear hora de entrada
    if (panelValEntryTime) {
      if (space.startTime) {
        const d = new Date(space.startTime);
        const pad = n => String(n).padStart(2, '0');
        panelValEntryTime.textContent = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
      } else {
        panelValEntryTime.textContent = '—';
      }
    }

    // Iniciar temporizador de tiempo restante
    if (countdownTimer) clearInterval(countdownTimer);
    updateSpaceTimeLeft();
    if (space.endTime) {
      countdownTimer = setInterval(updateSpaceTimeLeft, 1000);
    }

    // Botones de acción manual
    if (space.source === 'session') {
      if (btnSetAvailable) { btnSetAvailable.disabled = true; btnSetAvailable.className = 'btn btn-secondary w-full opacity-50 cursor-not-allowed'; }
      if (btnSetOccupied) { btnSetOccupied.disabled = true; btnSetOccupied.className = 'btn btn-danger w-full opacity-50 cursor-not-allowed'; }
      if (sessionOccupiedNote) {
        const d = new Date(space.endTime);
        const pad = n => String(n).padStart(2, '0');
        sessionOccupiedNote.textContent = `Occupied by a paid session · ends ${pad(d.getHours())}:${pad(d.getMinutes())}`;
        sessionOccupiedNote.classList.remove('hidden');
      }
    } else {
      if (sessionOccupiedNote) sessionOccupiedNote.classList.add('hidden');
      
      if (btnSetAvailable) {
        btnSetAvailable.disabled = false;
        btnSetAvailable.className = !space.occupied ? 'btn btn-success w-full' : 'btn btn-secondary w-full';
      }
      if (btnSetOccupied) {
        btnSetOccupied.disabled = false;
        btnSetOccupied.className = space.occupied ? 'btn btn-danger w-full' : 'btn btn-secondary w-full';
      }
    }
  }

  function updateSpaceTimeLeft() {
    if (!panelValTimeLeft) return;

    if (!selectedSpaceData || !selectedSpaceData.endTime) {
      panelValTimeLeft.textContent = '—';
      return;
    }

    const end = new Date(selectedSpaceData.endTime).getTime();
    const now = new Date().getTime();
    const diff = end - now;

    if (diff <= 0) {
      panelValTimeLeft.textContent = 'Expired';
      return;
    }

    const h = Math.floor(diff / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const s = Math.floor((diff % (1000 * 60)) / 1000);
    const pad = n => String(n).padStart(2, '0');

    panelValTimeLeft.textContent = h > 0 ? `${h}h ${pad(m)}m` : `${pad(m)}m ${pad(s)}s`;
  }

  // 3. Modificación Manual de Estado (PUT /api/parking-spaces/:id)
  async function updateSpaceStatus(newStatus) {
    if (!selectedSpaceData) return;

    try {
      const response = await fetch(`/api/parking-spaces/${selectedSpaceData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      const resData = await response.json();

      if (!response.ok) {
        if (window.showToast) window.showToast(resData.error || 'Failed to update space.', 'error');
        return;
      }

      if (window.showToast) window.showToast('Space status updated.', 'success');
      refreshData();
    } catch (err) {
      console.error('Error updating space status:', err);
      if (window.showToast) window.showToast('Network error while updating space.', 'error');
    }
  }

  if (btnSetAvailable) btnSetAvailable.addEventListener('click', () => updateSpaceStatus('available'));
  if (btnSetOccupied) btnSetOccupied.addEventListener('click', () => updateSpaceStatus('occupied'));

  // 4. Redimensionamiento del Mapa (POST /api/parking-config)
  if (triggerResizeBtn && resizeConfirmAlert) {
    triggerResizeBtn.addEventListener('click', () => {
      resizeConfirmAlert.classList.remove('hidden');
    });
  }

  if (cancelResizeBtn && resizeConfirmAlert) {
    cancelResizeBtn.addEventListener('click', () => {
      resizeConfirmAlert.classList.add('hidden');
    });
  }

  if (confirmResizeBtn) {
    confirmResizeBtn.addEventListener('click', async () => {
      const spacesPerZone = document.getElementById('inputSpacesPerZone').value;
      const zonesRangeStr = document.getElementById('selectZonesRange').value;
      const zones = zonesRangeStr.split(',');

      try {
        const response = await fetch('/api/parking-config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ spacesPerZone: Number(spacesPerZone), zones })
        });

        const resData = await response.json();

        if (!response.ok) {
          if (window.showToast) window.showToast(resData.error || 'Cannot resize map.', 'error');
          resizeConfirmAlert.classList.add('hidden');
          return;
        }

        if (window.showToast) window.showToast('Map resized successfully.', 'success');
        resizeConfirmAlert.classList.add('hidden');
        window.location.reload();
      } catch (err) {
        console.error('Error resizing map:', err);
        if (window.showToast) window.showToast('Network error during resize.', 'error');
        resizeConfirmAlert.classList.add('hidden');
      }
    });
  }

  // 5. Refresco Periódico AJAX (cada 30 s)
  async function refreshData() {
    if (document.hidden) return;

    const currentZone = adminSpacesGrid ? adminSpacesGrid.getAttribute('data-current-zone') : 'A';

    try {
      const response = await fetch('/api/parking-spaces');
      if (!response.ok) return;

      const data = await response.json();

      // Actualizar Tarjetas de Estadísticas
      if (data.stats) {
        const statOccupancyPercent = document.getElementById('statOccupancyPercent');
        const statOccupancySub = document.getElementById('statOccupancySub');
        const statFreeCount = document.getElementById('statFreeCount');
        const statFreeSub = document.getElementById('statFreeSub');
        const statTodayBookings = document.getElementById('statTodayBookings');

        if (statOccupancyPercent) statOccupancyPercent.textContent = `${data.stats.occupancyPercent}%`;
        if (statOccupancySub) statOccupancySub.textContent = `${data.stats.occupied} of ${data.stats.total} spaces in use`;
        if (statFreeCount) statFreeCount.textContent = data.stats.free;
        if (statFreeSub) statFreeSub.textContent = `Across ${data.stats.zonesCount} zones`;
        if (statTodayBookings) statTodayBookings.textContent = data.stats.todayBookings;
        const statTodayRevenue = document.getElementById('statTodayRevenue');
        if (statTodayRevenue) statTodayRevenue.textContent = `$${new Intl.NumberFormat('en-US').format(Number(data.stats.todayRevenue) || 0)} COP`;
      }

      // Actualizar Chips de Zonas
      if (data.spaces) {
        const zonesInUse = Array.from(new Set(data.spaces.map(s => s.zone)));
        zonesInUse.forEach(zCode => {
          const freeCount = data.spaces.filter(s => s.zone === zCode && !s.occupied).length;
          const chip = document.querySelector(`#adminZoneChips button[data-zone="${zCode}"]`);
          if (chip) chip.textContent = `Zone ${zCode} · ${freeCount} free`;
        });

        // Actualizar Cuadrícula
        if (adminSpacesGrid) {
          adminSpacesGrid.innerHTML = '';
          const currentZoneSpaces = data.spaces.filter(s => s.zone === currentZone);

          currentZoneSpaces.forEach(space => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = `space-grid-item ${space.occupied ? 'occupied' : 'available'}`;
            btn.setAttribute('data-space-id', space.id);
            btn.setAttribute('data-occupied', space.occupied ? 'true' : 'false');
            btn.setAttribute('data-source', space.source || '');
            btn.setAttribute('data-plate', space.plate || '');
            btn.setAttribute('data-owner', space.owner || '');
            btn.setAttribute('data-start-time', space.startTime || '');
            btn.setAttribute('data-end-time', space.endTime || '');

            const dot = document.createElement('span');
            dot.className = 'space-dot';

            const code = document.createElement('span');
            code.className = 'space-code';
            code.textContent = space.id;

            btn.appendChild(dot);
            btn.appendChild(code);
            adminSpacesGrid.appendChild(btn);
          });

          // Reestablecer Selección
          if (selectedSpaceData) {
            const updatedSelected = data.spaces.find(s => s.id === selectedSpaceData.id);
            if (updatedSelected) {
              selectAdminSpace(updatedSelected);
            }
          }
        }
      }
    } catch (err) {
      console.warn('Error refreshing admin spaces data:', err);
    }
  }

  setInterval(refreshData, 30000);
});