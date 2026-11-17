// HU-004 · Start parking: zona, vehículo y duración; el pago se revisa y confirma en HU-013 (POST /api/payments/parking)
document.addEventListener('DOMContentLoaded', () => {
  const zoneGroup = document.getElementById('zoneSelectGroup');
  const vehicleGroup = document.getElementById('vehicleSelectGroup');
  const durationGroup = document.getElementById('durationSelectGroup');
  const otherPlateCard = document.getElementById('otherPlateCard');
  const otherPlateBox = document.getElementById('otherPlateBox');
  const otherPlateInput = document.getElementById('otherPlate');

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
    if (summaryZonePlate) {
      summaryZonePlate.textContent = state.zone
        ? `Zone ${state.zone} · ${plate || 'No plate yet'} · Assigned when you start`
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
      if (!plate) {
        showError('Please enter a valid plate.');
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