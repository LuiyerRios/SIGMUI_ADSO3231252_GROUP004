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

  let selectedSpaceId = null;

  // 1. Manejo de Selección de Espacio en la Cuadrícula
  if (spacesGrid) {
    spacesGrid.addEventListener('click', (e) => {
      const button = e.target.closest('button.space-grid-item');
      if (!button || button.disabled) return;

      const spaceId = button.getAttribute('data-space-id');
      selectSpace(spaceId);
    });
  }

  function selectSpace(spaceId) {
    const allButtons = document.querySelectorAll('.space-grid-item');
    allButtons.forEach(btn => btn.classList.remove('selected'));

    const targetBtn = document.querySelector(`.space-grid-item[data-space-id="${spaceId}"]`);
    if (targetBtn && !targetBtn.disabled) {
      targetBtn.classList.add('selected');
      selectedSpaceId = spaceId;

      if (panelSpaceIdBadge) panelSpaceIdBadge.textContent = spaceId;
      if (panelSpaceTitle) panelSpaceTitle.textContent = `Space ${spaceId}`;
      if (panelSpaceStatusPill) {
        panelSpaceStatusPill.textContent = 'Available';
        panelSpaceStatusPill.className = 'pill pill-success';
      }

      const currentZone = spacesGrid ? spacesGrid.getAttribute('data-current-zone') : 'A';
      if (parkHereBtn) {
        parkHereBtn.href = `/parking/start?zone=${encodeURIComponent(currentZone)}&space=${encodeURIComponent(spaceId)}`;
      }
    }
  }

  // 2. Temporizador Cuenta Regresiva (Sesión Activa)
  function updateCountdown() {
    if (!statTimeRemainingSub || !statTimeRemaining) return;

    const endTimeStr = statTimeRemainingSub.getAttribute('data-end-time');
    if (!endTimeStr) {
      statTimeRemaining.textContent = '—';
      return;
    }

    const endTime = new Date(endTimeStr).getTime();
    const now = new Date().getTime();
    const diff = endTime - now;

    if (diff <= 0) {
      statTimeRemaining.textContent = 'Expired';
      statTimeRemainingSub.textContent = 'Session ended';
      return;
    }

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    const pad = n => String(n).padStart(2, '0');

    if (hours > 0) {
      statTimeRemaining.textContent = `${hours}h ${pad(minutes)}m`;
    } else {
      statTimeRemaining.textContent = `${pad(minutes)}m ${pad(seconds)}s`;
    }

    const endDate = new Date(endTimeStr);
    const endHours = pad(endDate.getHours());
    const endMinutes = pad(endDate.getMinutes());
    statTimeRemainingSub.textContent = `ends ${endHours}:${endMinutes}`;
  }

  updateCountdown();
  setInterval(updateCountdown, 1000);

  // 3. Autorefresco AJAX cada 30 segundos (solo con pestaña visible)
  async function refreshData() {
    if (document.hidden) return;

    const currentZone = spacesGrid ? spacesGrid.getAttribute('data-current-zone') : 'A';

    try {
      const response = await fetch(`/zones/data?zone=${encodeURIComponent(currentZone)}`);
      if (!response.ok) return;

      const data = await response.json();

      // Actualizar Estadísticas
      const statFreeCount = document.getElementById('statFreeCount');
      const statOccupancyPercent = document.getElementById('statOccupancyPercent');
      const statOccupancyText = document.getElementById('statOccupancyText');

      if (statFreeCount && data.totals) statFreeCount.textContent = data.totals.free;
      if (statOccupancyPercent && data.totals) statOccupancyPercent.textContent = `${data.totals.occupancyPercent}%`;
      if (statOccupancyText && data.totals) statOccupancyText.textContent = `${data.totals.occupied} of ${data.totals.total} spaces in use`;

      // Actualizar Chips de Zonas
      if (data.zones) {
        data.zones.forEach(z => {
          const chip = document.querySelector(`#zoneChipsContainer a[data-zone="${z.code}"]`);
          if (chip) {
            chip.textContent = `Zone ${z.code} · ${z.free} free`;
          }
        });
      }

      // Actualizar Grid de Espacios
      if (data.spaces && spacesGrid) {
        spacesGrid.innerHTML = '';
        data.spaces.forEach(space => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = `space-grid-item ${space.occupied ? 'occupied' : 'available'}`;
          btn.setAttribute('data-space-id', space.id);
          btn.setAttribute('data-occupied', space.occupied ? 'true' : 'false');
          btn.disabled = space.occupied;

          const dot = document.createElement('span');
          dot.className = 'space-dot';

          const code = document.createElement('span');
          code.className = 'space-code';
          code.textContent = space.id;

          btn.appendChild(dot);
          btn.appendChild(code);
          spacesGrid.appendChild(btn);
        });

        // Restaurar selección si sigue disponible
        if (selectedSpaceId) {
          const reTarget = document.querySelector(`.space-grid-item[data-space-id="${selectedSpaceId}"]`);
          if (reTarget && !reTarget.disabled) {
            reTarget.classList.add('selected');
          } else {
            selectedSpaceId = null;
            if (panelSpaceIdBadge) panelSpaceIdBadge.textContent = '—';
            if (panelSpaceTitle) panelSpaceTitle.textContent = 'Select a space';
          }
        }
      }

      // Actualizar información del panel
      if (data.selectedZone) {
        if (panelFreeVal) panelFreeVal.textContent = `${data.selectedZone.free} spaces`;
      }
      if (data.formattedRate && panelRateVal) {
        panelRateVal.textContent = data.formattedRate;
      }

    } catch (err) {
      console.warn('Error refreshing zones data:', err);
    }
  }

  setInterval(refreshData, 30000);
});