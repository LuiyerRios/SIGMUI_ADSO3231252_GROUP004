// HU-003 · Find a space: selección de espacio, cuenta regresiva y auto-refresco cada 30 s
document.addEventListener('DOMContentLoaded', () => {
  const spacesGrid = document.getElementById('spacesGrid');
  const parkHereBtn = document.getElementById('parkHereBtn');
  const panelSpaceIdBadge = document.getElementById('panelSpaceIdBadge');
  const panelSpaceTitle = document.getElementById('panelSpaceTitle');
  const panelSpaceStatusPill = document.getElementById('panelSpaceStatusPill');
  const panelFreeVal = document.getElementById('panelFreeVal');
  const panelRateVal = document.getElementById('panelRateVal');
  const statTimeRemaining = document.getElementById('statTimeRemaining');
  const statTimeRemainingSub = document.getElementById('statTimeRemainingSub');

  const currentZone = spacesGrid ? spacesGrid.dataset.currentZone : 'A';
  let selectedSpaceId = null;

  // Vuelve el panel a su estado inicial (sin espacio elegido)
  function resetPanel() {
    selectedSpaceId = null;
    // Sin espacio elegido, "Park here" abre Start parking solo con la zona (asignación automática)
    if (parkHereBtn) parkHereBtn.href = `/parking/start?zone=${encodeURIComponent(currentZone)}`;
    if (panelSpaceIdBadge) panelSpaceIdBadge.textContent = '—';
    if (panelSpaceTitle) panelSpaceTitle.textContent = 'Select a space';
    if (panelSpaceStatusPill) {
      panelSpaceStatusPill.textContent = 'Pick one on the map';
      panelSpaceStatusPill.className = 'pill pill-muted';
    }
  }

  // 1. Seleccionar un espacio libre
  function selectSpace(spaceId) {
    document.querySelectorAll('.space-grid-item').forEach((btn) => btn.classList.remove('selected'));

    const target = spacesGrid
      ? Array.from(spacesGrid.querySelectorAll('.space-grid-item')).find((btn) => btn.dataset.spaceId === spaceId)
      : null;

    if (!target || target.disabled) {
      resetPanel();
      return;
    }

    target.classList.add('selected');
    selectedSpaceId = spaceId;
    const isPreferential = target.dataset.preferential === 'true';
    // El espacio elegido viaja a Start parking (HU-004) y se guarda tal cual al pagar
    if (parkHereBtn) {
      parkHereBtn.href = `/parking/start?zone=${encodeURIComponent(currentZone)}&space=${encodeURIComponent(spaceId)}`;
    }

    if (panelSpaceIdBadge) panelSpaceIdBadge.textContent = spaceId;
    if (panelSpaceTitle) panelSpaceTitle.textContent = `Space ${spaceId}`;
    if (panelSpaceStatusPill) {
      // Preferencial: discapacidad, embarazo o trato especial (migración 007)
      panelSpaceStatusPill.textContent = isPreferential ? 'Preferential · Available' : 'Available';
      panelSpaceStatusPill.className = isPreferential ? 'pill pill-info' : 'pill pill-success';
    }
  }

  if (spacesGrid) {
    spacesGrid.addEventListener('click', (e) => {
      const button = e.target.closest('button.space-grid-item');
      if (!button || button.disabled) return;
      selectSpace(button.dataset.spaceId);
    });
  }

  // 2. Cuenta regresiva de la sesión activa
  const pad = (n) => String(n).padStart(2, '0');
  const endIso = statTimeRemainingSub ? statTimeRemainingSub.dataset.endTime : '';
  const endTime = endIso ? new Date(endIso) : null;

  function updateCountdown() {
    if (!statTimeRemaining || !statTimeRemainingSub || !endTime || Number.isNaN(endTime.getTime())) return;

    const diff = endTime.getTime() - Date.now();
    if (diff <= 0) {
      statTimeRemaining.textContent = '0h 00m';
      statTimeRemainingSub.textContent = 'Session ended';
      return;
    }

    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    statTimeRemaining.textContent = `${hours}h ${pad(minutes)}m`;
    statTimeRemainingSub.textContent = `ends ${pad(endTime.getHours())}:${pad(endTime.getMinutes())}`;
  }

  updateCountdown();
  setInterval(updateCountdown, 1000);

  // 3. Auto-refresco cada 30 s (solo con la pestaña visible)
  function renderSpaces(spaces) {
    spacesGrid.replaceChildren();
    spaces.forEach((space) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `space-grid-item ${space.occupied ? 'occupied' : 'available'}${space.preferential ? ' preferential' : ''}`;
      btn.dataset.spaceId = space.id;
      btn.dataset.occupied = space.occupied ? 'true' : 'false';
      btn.dataset.preferential = space.preferential ? 'true' : 'false';
      btn.disabled = space.occupied;
      if (space.preferential) btn.title = 'Preferential space: disability, pregnancy or special attention';

      // Los preferenciales llevan el ícono de silla de ruedas en lugar del punto
      const dot = document.createElement(space.preferential ? 'i' : 'span');
      dot.className = space.preferential ? 'fas fa-wheelchair space-icon' : 'space-dot';
      const code = document.createElement('span');
      code.className = 'space-code';
      code.textContent = space.id;

      btn.append(dot, code);
      spacesGrid.appendChild(btn);
    });
  }

  // HU-003 (#37): si el servicio falla, las zonas se ven en gris con el mensaje exacto
  const liveErrorBox = document.getElementById('liveErrorBox');
  const liveErrorText = document.getElementById('liveErrorText');
  function showLiveError(message) {
    if (liveErrorText) liveErrorText.textContent = message;
    if (liveErrorBox) liveErrorBox.hidden = false;
    document.querySelectorAll('#zoneChipsContainer .chip, .space-grid-item').forEach((el) => el.classList.add('zone-stale'));
  }
  function hideLiveError() {
    if (liveErrorBox) liveErrorBox.hidden = true;
    document.querySelectorAll('.zone-stale').forEach((el) => el.classList.remove('zone-stale'));
  }

  async function refreshData() {
    if (document.hidden || !spacesGrid) return;

    try {
      const response = await fetch(`/zones/data?zone=${encodeURIComponent(currentZone)}`);
      if (!response.ok) {
        showLiveError('Occupancy information temporarily unavailable.');
        return;
      }
      const data = await response.json();
      hideLiveError();

      // Tarjetas de resumen
      if (data.totals) {
        const statFreeCount = document.getElementById('statFreeCount');
        const statOccupancyPercent = document.getElementById('statOccupancyPercent');
        const statOccupancyText = document.getElementById('statOccupancyText');
        if (statFreeCount) statFreeCount.textContent = data.totals.free;
        if (statOccupancyPercent) statOccupancyPercent.textContent = `${data.totals.occupancyPercent}%`;
        if (statOccupancyText) statOccupancyText.textContent = `${data.totals.occupied} of ${data.totals.total} spaces in use`;
      }

      // Chips de zona y "Free in this zone"
      if (Array.isArray(data.zones)) {
        data.zones.forEach((z) => {
          const chip = document.querySelector(`#zoneChipsContainer a[data-zone="${z.code}"]`);
          const chipText = chip ? chip.querySelector('.zone-chip-text') : null;
          if (chipText) chipText.textContent = `Zone ${z.code} · ${z.free} free`;
          const dot = chip ? chip.querySelector('.occupancy-dot') : null;
          if (dot && z.occupancy) {
            dot.className = `occupancy-dot occupancy-${z.occupancy.level.toLowerCase()}`;
            dot.title = `${z.occupancy.level} occupancy · ${z.occupancy.percent}%`;
          }
        });
        const zone = data.zones.find((z) => z.code === currentZone);
        if (zone && panelFreeVal) panelFreeVal.textContent = `${zone.free} of ${zone.total}`;
        const occ = document.getElementById('panelOccupancyVal');
        if (zone && occ && zone.occupancy) {
          occ.replaceChildren();
          const pill = document.createElement('span');
          pill.className = `pill ${zone.occupancy.pill}`;
          pill.textContent = `${zone.occupancy.level} · ${zone.occupancy.percent}%`;
          occ.appendChild(pill);
        }
      }

      if (data.formattedRate && panelRateVal) panelRateVal.textContent = data.formattedRate;

      // HU-019 (#35): horario de servicio de la zona y si está cerrada ahora
      const panelHoursVal = document.getElementById('panelHoursVal');
      if (panelHoursVal && data.scheduleText) {
        panelHoursVal.textContent = data.scheduleText;
        if (data.isOpen === false) {
          const closedPill = document.createElement('span');
          closedPill.className = 'pill pill-muted ml-2';
          closedPill.textContent = 'Closed';
          panelHoursVal.appendChild(closedPill);
        }
      }

      // Cuadrícula, conservando la selección si el espacio sigue libre
      if (Array.isArray(data.spaces)) {
        const keep = selectedSpaceId;
        renderSpaces(data.spaces);
        if (keep) selectSpace(keep);
      }
    } catch (err) {
      // Sin conexión: el mapa no se pudo cargar
      console.warn('Error refreshing zones data:', err);
      showLiveError('The map could not be loaded. Check your internet connection.');
    }
  }

  setInterval(refreshData, 30000);
});