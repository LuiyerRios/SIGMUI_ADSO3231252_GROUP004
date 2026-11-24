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
  const preferentialBox = document.getElementById('preferentialBox');
  const preferentialConfirm = document.getElementById('preferentialConfirm');
  const summaryType = document.getElementById('summaryTypeVal');

  // Tarifas por tipo de vehículo (migración 007): { Car: { ratePerHour, ratePerDay }, … }
  let rates = {};
  try {
    const btn = document.getElementById('startParkingBtn');
    rates = JSON.parse(btn ? btn.dataset.rates || '{}' : '{}');
  } catch (e) {
    rates = {};
  }
  const rateFor = (type) => rates[type] || rates.Other || { ratePerHour: 0, ratePerDay: 0 };
  // Clase de zona que le corresponde a cada tipo (igual que src/utils/vehicleTypes.js)
  const classOf = (type) => (type === 'Motorcycle' ? 'motorcycle' : type === 'Bicycle' ? 'bicycle' : 'general');

  // Espacios libres por zona que envía el servidor: { A: [{ id: 'A3', preferential: false }, …], … }
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

  // Misma regla del servidor (src/utils/vehicleTypes.js): motos con letra final o placa antigua tipo carro
  const CAR = { regex: /^[A-Z]{3}\d{3}$/, message: 'Please enter a valid plate (ABC123).', placeholder: 'ABC123', max: 6 };
  const PLATE_RULES = {
    Car: CAR, SUV: CAR, Truck: CAR, Van: CAR,
    Motorcycle: { regex: /^[A-Z]{3}\d{2}[A-Z0-9]$/, message: 'Please enter a valid motorcycle plate (ABC12D, or ABC123 for older motorcycles).', placeholder: 'ABC12D', max: 6 },
    Bicycle: { regex: /^[A-Z0-9]{4,12}$/, message: 'Please enter the bicycle serial number (4 to 12 letters or numbers).', placeholder: 'GW1234BK', max: 12 },
    Other: { regex: /^[A-Z]{3}\d{2}[A-Z0-9]$/, message: 'Please enter a valid plate.', placeholder: 'ABC123', max: 6 }
  };

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
    list.forEach((sp) => {
      const opt = document.createElement('option');
      opt.value = sp.id;
      opt.dataset.preferential = sp.preferential ? 'true' : 'false';
      opt.textContent = sp.preferential ? `${sp.id} · Preferential` : sp.id;
      spaceSelect.appendChild(opt);
    });
    spaceSelect.value = list.some((sp) => sp.id === keep) ? keep : '';
    state.spaceId = spaceSelect.value;
    syncPreferential();
  }

  // Muestra la confirmación solo si el espacio elegido es preferencial
  function syncPreferential() {
    if (!spaceSelect || !preferentialBox) return;
    const opt = spaceSelect.selectedOptions[0];
    const isPref = Boolean(opt && opt.dataset.preferential === 'true');
    preferentialBox.classList.toggle('hidden', !isPref);
    if (!isPref && preferentialConfirm) preferentialConfirm.checked = false;
  }

  // Habilita solo las zonas que aceptan el tipo de vehículo elegido; si la actual no sirve, pasa a la primera que sí
  function syncZonesWithVehicle() {
    if (!zoneGroup) return;
    const wanted = classOf(currentVehicleType());
    let firstOk = null;
    zoneGroup.querySelectorAll('.zone-chip').forEach((chip) => {
      const ok = chip.dataset.class === wanted && chip.dataset.unavailable !== 'true';
      chip.disabled = !ok;
      chip.classList.toggle('opacity-50', !ok);
      if (ok && !firstOk) firstOk = chip;
    });
    const current = state.zone ? zoneGroup.querySelector(`.zone-chip[data-zone="${state.zone}"]`) : null;
    if (!current || current.disabled) {
      zoneGroup.querySelectorAll('.zone-chip').forEach((c) => c.classList.remove('active'));
      if (firstOk) {
        firstOk.classList.add('active');
        state.zone = firstOk.dataset.zone;
        fillSpaces(state.zone);
        if (startBtn) startBtn.disabled = false;
      } else {
        state.zone = null;
        fillSpaces('');
        if (startBtn) startBtn.disabled = true;
        showError('There are no free zones for this vehicle type right now.');
      }
    }
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
    const type = currentVehicleType();
    const typeRate = rateFor(type);
    const rate = isDay ? typeRate.ratePerDay : typeRate.ratePerHour;
    if (summaryType) summaryType.textContent = type;
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
      syncZonesWithVehicle();
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
      const rule = PLATE_RULES[otherTypeSelect.value] || PLATE_RULES.Other;
      if (otherPlateLabel) otherPlateLabel.textContent = otherTypeSelect.value === 'Bicycle' ? 'Serial number' : 'Plate';
      if (otherPlateInput) {
        otherPlateInput.placeholder = otherTypeSelect.value === 'Motorcycle' ? 'ABC12D or ABC123' : rule.placeholder;
        otherPlateInput.maxLength = rule.max;
      }
    };
    otherTypeSelect.addEventListener('change', () => {
      syncPlateField();
      hideError();
      syncZonesWithVehicle();
      updateSummary();
    });
    syncPlateField();
  }

  if (spaceSelect) {
    spaceSelect.addEventListener('change', () => {
      state.spaceId = spaceSelect.value;
      syncPreferential();
      hideError();
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

      // HU-004 (#38): mensajes exactos de los criterios
      if (!state.zone) {
        showError('You must select a parking zone');
        return;
      }
      if (!plate) {
        showError('The license plate is mandatory.');
        return;
      }
      // Vehículos registrados: la placa ya se validó al guardarlos; solo se revisa el formato de su tipo
      const check = PLATE_RULES[currentVehicleType()] || PLATE_RULES.Other;
      if (!check.regex.test(plate)) {
        showError(check.message);
        return;
      }
      const prefOpt = spaceSelect ? spaceSelect.selectedOptions[0] : null;
      const needsConfirm = Boolean(prefOpt && prefOpt.dataset.preferential === 'true');
      if (needsConfirm && !(preferentialConfirm && preferentialConfirm.checked)) {
        showError('Please confirm that you need a preferential space, or pick another one.');
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
        quantity: String(state.quantity)
      });
      // Tipo del vehículo: decide el formato de placa válido y la tarifa (el servidor usa el registrado si existe)
      params.set('vehicleType', currentVehicleType());
      // Espacio elegido (si no, el servidor asigna el primero libre)
      if (state.spaceId) params.set('spaceId', state.spaceId);
      // Guardar la placa nueva en "Mis vehículos"
      if (state.useOtherPlate && saveVehicleBox && saveVehicleBox.checked) params.set('saveVehicle', 'true');
      if (needsConfirm) params.set('preferentialConfirmed', 'true');
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

  // Al llegar desde el mapa con una zona de motos o bicis, se elige un vehículo de esa clase
  // (uno registrado o "Other plate" con el tipo correspondiente) en vez de cambiar la zona
  (function alignVehicleToZone() {
    const chip = state.zone && zoneGroup ? zoneGroup.querySelector(`.zone-chip[data-zone="${state.zone}"]`) : null;
    if (!chip || !vehicleGroup || chip.dataset.class === classOf(currentVehicleType())) return;
    const match = Array.from(vehicleGroup.querySelectorAll('.vehicle-card')).find((c) => classOf(c.dataset.type) === chip.dataset.class);
    vehicleGroup.querySelectorAll('.vehicle-card, .vehicle-card-add').forEach((c) => c.classList.remove('selected'));
    if (match) {
      match.classList.add('selected');
      state.useOtherPlate = false;
      state.plate = match.dataset.plate;
      state.vehicleType = match.dataset.type;
      if (otherPlateBox) otherPlateBox.classList.add('hidden');
    } else if (otherPlateCard && otherTypeSelect) {
      otherPlateCard.classList.add('selected');
      state.useOtherPlate = true;
      otherTypeSelect.value = chip.dataset.class === 'motorcycle' ? 'Motorcycle' : chip.dataset.class === 'bicycle' ? 'Bicycle' : 'Car';
      otherTypeSelect.dispatchEvent(new Event('change'));
      if (otherPlateBox) otherPlateBox.classList.remove('hidden');
    }
  })();

  syncZonesWithVehicle();
  syncPreferential();
  updateSummary();
  // Mantener la hora de inicio y fin al día mientras no se haya pagado
  setInterval(updateSummary, 30000);
});