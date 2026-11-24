// HU-004 · Start parking: zona y espacio, vehículo (con su tipo) y duración; el pago se revisa y confirma en HU-013 (POST /api/payments/parking)
document.addEventListener('DOMContentLoaded', () => {
  const zoneGroup = document.getElementById('zoneSelectGroup');
  const vehicleGroup = document.getElementById('vehicleSelectGroup');
  const durationGroup = document.getElementById('durationSelectGroup');
  const otherPlateCard = document.getElementById('otherPlateCard');
  const otherPlateBox = document.getElementById('otherPlateBox');
  const otherPlateInput = document.getElementById('otherPlate');
  const otherTypeSelect = document.getElementById('otherType');
  const otherPlateLabel = document.getElementById('otherPlateLabel');
  const saveVehicleBox = document.getElementById('saveVehicle');
  const spaceSelect = document.getElementById('spaceSelect');

  // Espacios libres por zona que envía el servidor: { A: ['A3', …], … }
  let freeSpaces = {};
  try {
    freeSpaces = JSON.parse(spaceSelect ? spaceSelect.dataset.freeSpaces || '{}' : '{}');
  } catch (e) {
    freeSpaces = {};
  }

  const summarySpaceCode = document.getElementById('summarySpaceCode');
  const summaryZonePlate = document.getElementById('summaryZonePlate');
  const summaryStarts = document.getElementById('summaryStartsVal');
  const summaryEnds = document.getElementById('summaryEndsVal');
  const summaryDuration = document.getElementById('summaryDurationVal');
  const summaryRate = document.getElementById('summaryRateVal');
  const summaryTotal = document.getElementById('summaryTotalAmount');

  const startBtn = document.getElementById('startParkingBtn');
  const errorBox = document.getElementById('paymentError');
  const errorText = document.getElementById('paymentErrorText');
  const afterPayment = document.getElementById('afterPayment');

  const activeZoneChip = zoneGroup ? zoneGroup.querySelector('.zone-chip.active') : null;

  // Estado de la selección
  const state = {
    zone: activeZoneChip ? activeZoneChip.dataset.zone : null,
    rateHour: activeZoneChip ? Number(activeZoneChip.dataset.rateHour) : 0,
    rateDay: activeZoneChip ? Number(activeZoneChip.dataset.rateDay) : 0,
    plate: startBtn ? startBtn.dataset.firstPlate || '' : '',
    vehicleType: (vehicleGroup && vehicleGroup.querySelector('.vehicle-card.selected'))
      ? vehicleGroup.querySelector('.vehicle-card.selected').dataset.type || 'Car'
      : 'Car',
    spaceId: spaceSelect ? spaceSelect.value : '',
    useOtherPlate: !(startBtn && startBtn.dataset.firstPlate),
    rateType: 'hour',
    quantity: 1,
    paid: false
  };

  const pad = (n) => String(n).padStart(2, '0');
  const formatCOP = (n) => `$${new Intl.NumberFormat('en-US').format(Math.round(n))} COP`;
  const formatTime = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const normalizePlate = (value) => String(value || '').toUpperCase().replace(/[\s-]/g, '');

  function currentPlate() {
    return state.useOtherPlate ? normalizePlate(otherPlateInput ? otherPlateInput.value : '') : state.plate;
  }

  function currentVehicleType() {
    return state.useOtherPlate ? (otherTypeSelect ? otherTypeSelect.value : 'Car') : state.vehicleType;
  }

  // Llena la lista de espacios con los libres de la zona elegida
  function fillSpaces(zone) {
    if (!spaceSelect) return;
    const keep = spaceSelect.value;
    const list = freeSpaces[zone] || [];
    spaceSelect.replaceChildren();
    const auto = document.createElement('option');
    auto.value = '';
    auto.textContent = 'Auto · first free space';
    spaceSelect.appendChild(auto);
    list.forEach((id) => {
      const opt = document.createElement('option');
      opt.value = id;
      opt.textContent = id;
      spaceSelect.appendChild(opt);
    });
    spaceSelect.value = list.includes(keep) ? keep : '';
    state.spaceId = spaceSelect.value;
  }

  function showError(message) {
    if (!errorBox || !errorText) return;
    errorText.textContent = message;
    errorBox.classList.remove('hidden');
  }

  function hideError() {
    if (errorBox) errorBox.classList.add('hidden');
  }

  // Actualiza el resumen (solo para mostrar; el monto real lo calcula el servidor)
  function updateSummary() {
    if (state.paid) return;

    const now = new Date();
    const end = new Date(now);
    if (state.rateType === 'day') end.setDate(end.getDate() + state.quantity);
    else end.setHours(end.getHours() + state.quantity);

    const isDay = state.rateType === 'day';
    const rate = isDay ? state.rateDay : state.rateHour;
    const plate = currentPlate();

    if (summaryStarts) summaryStarts.textContent = `Now · ${formatTime(now)}`;
    if (summaryEnds) summaryEnds.textContent = isDay ? `Tomorrow · ${formatTime(end)}` : formatTime(end);
    if (summaryDuration) summaryDuration.textContent = isDay ? `${state.quantity} day` : `${state.quantity} h`;
    if (summaryRate) summaryRate.textContent = state.zone ? `${formatCOP(rate)} / ${isDay ? 'day' : 'hour'}` : '—';
    if (summaryTotal) summaryTotal.textContent = state.zone ? formatCOP(rate * state.quantity) : '—';
    if (summarySpaceCode) summarySpaceCode.textContent = state.spaceId || 'Auto';
    if (summaryZonePlate) {
      const where = state.spaceId ? 'Space you picked' : 'Assigned when you start';
      summaryZonePlate.textContent = state.zone
        ? `Zone ${state.zone} · ${plate || 'No plate yet'} · ${where}`
        : 'Choose a zone';
    }
  }

  // 1. Zona
  if (zoneGroup) {
    zoneGroup.addEventListener('click', (e) => {
      const chip = e.target.closest('.zone-chip');
      if (!chip || chip.disabled || state.paid) return;
      zoneGroup.querySelectorAll('.zone-chip').forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
      state.zone = chip.dataset.zone;
      state.rateHour = Number(chip.dataset.rateHour);
      state.rateDay = Number(chip.dataset.rateDay);
      fillSpaces(state.zone);
      if (startBtn) startBtn.disabled = false;
      hideError();
      updateSummary();
    });
  }

  // 2. Vehículo u otra placa
  if (vehicleGroup) {
    vehicleGroup.addEventListener('click', (e) => {
      const card = e.target.closest('.vehicle-card, .vehicle-card-add');
      if (!card || state.paid) return;
      vehicleGroup.querySelectorAll('.vehicle-card, .vehicle-card-add').forEach((c) => c.classList.remove('selected'));
      card.classList.add('selected');

      if (card === otherPlateCard) {
        state.useOtherPlate = true;
        if (otherPlateBox) otherPlateBox.classList.remove('hidden');
        if (otherPlateInput) otherPlateInput.focus();
      } else {
        state.useOtherPlate = false;
        state.plate = card.dataset.plate;
        state.vehicleType = card.dataset.type || 'Car';
        if (otherPlateBox) otherPlateBox.classList.add('hidden');
      }
      hideError();
      updateSummary();
    });
  }

  if (otherPlateInput) {
    otherPlateInput.addEventListener('input', () => {
      otherPlateInput.value = normalizePlate(otherPlateInput.value);
      updateSummary();
    });
  }

  // Las bicicletas no tienen placa: se usa su número de serie
  if (otherTypeSelect) {
    const syncPlateField = () => {
      const isBike = otherTypeSelect.value === 'Bicycle';
      if (otherPlateLabel) otherPlateLabel.textContent = isBike ? 'Serial number' : 'Plate';
      if (otherPlateInput) {
        otherPlateInput.placeholder = isBike ? 'GW1234BK' : 'ABC123';
        otherPlateInput.maxLength = isBike ? 12 : 7;
      }
    };
    otherTypeSelect.addEventListener('change', syncPlateField);
    syncPlateField();
  }

  if (spaceSelect) {
    spaceSelect.addEventListener('change', () => {
      state.spaceId = spaceSelect.value;
      updateSummary();
    });
  }

  // 3. Duración
  if (durationGroup) {
    durationGroup.addEventListener('click', (e) => {
      const chip = e.target.closest('.duration-chip');
      if (!chip || state.paid) return;
      durationGroup.querySelectorAll('.duration-chip').forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
      state.rateType = chip.dataset.rateType;
      state.quantity = Number(chip.dataset.quantity);
      updateSummary();
    });
  }

  // 4. Pagar e iniciar el parqueo
  if (startBtn) {
    startBtn.addEventListener('click', async () => {
      hideError();
      const plate = currentPlate();

      if (!state.zone) {
        showError('Please select a valid zone.');
        return;
      }
      const isBike = currentVehicleType() === 'Bicycle';
      const plateOk = isBike ? /^[A-Z0-9]{4,12}$/.test(plate) : /^[A-Z]{3}\d{2}[A-Z0-9]$/.test(plate);
      if (!plateOk) {
        showError(isBike ? 'Please enter the bicycle serial number (4 to 12 letters or numbers).' : 'Please enter a valid plate.');
        return;
      }

      // HU-013: antes de pagar se revisa el resumen en la simulación de pago; allí se confirma y se guarda
      const label = startBtn.querySelector('.btn-label');
      startBtn.disabled = true;
      if (label) label.textContent = 'Loading…';
      const params = new URLSearchParams({
        plate,
        zone: state.zone,
        rateType: state.rateType,
        quantity: String(state.quantity),
        vehicleType: currentVehicleType()
      });
      // Espacio elegido (si no, el servidor asigna el primero libre)
      if (state.spaceId) params.set('spaceId', state.spaceId);
      // Guardar la placa nueva en "Mis vehículos"
      if (state.useOtherPlate && saveVehicleBox && saveVehicleBox.checked) params.set('saveVehicle', 'true');
      window.location.href = `/payments/simulate?${params.toString()}`;
    });
  }

  // Al volver con "Back" desde HU-013 el navegador puede restaurar la página con el botón bloqueado
  window.addEventListener('pageshow', () => {
    if (!startBtn || state.paid) return;
    startBtn.disabled = !state.zone;
    const label = startBtn.querySelector('.btn-label');
    if (label) label.textContent = 'Start parking';
  });

  updateSummary();
  // Mantener la hora de inicio y fin al día mientras no se haya pagado
  setInterval(updateSummary, 30000);
});