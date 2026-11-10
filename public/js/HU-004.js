document.addEventListener('DOMContentLoaded', () => {
  const vehicleSelectGroup = document.getElementById('vehicleSelectGroup');
  const durationSelectGroup = document.getElementById('durationSelectGroup');
  const startParkingForm = document.getElementById('startParkingForm');

  const summarySpaceCode = document.getElementById('summarySpaceCode');
  const summaryZonePlate = document.getElementById('summaryZonePlate');
  const summaryStartsVal = document.getElementById('summaryStartsVal');
  const summaryEndsVal = document.getElementById('summaryEndsVal');
  const summaryDurationVal = document.getElementById('summaryDurationVal');
  const summaryRateVal = document.getElementById('summaryRateVal');
  const summaryTotalAmount = document.getElementById('summaryTotalAmount');

  const inputPlate = document.getElementById('inputPlate');
  const inputDuration = document.getElementById('inputDuration');

  let selectedPlate = 'KJT-482';
  let selectedHours = 1;
  const ratePerHour = 2000;

  // 1. Selección de Vehículo
  if (vehicleSelectGroup) {
    vehicleSelectGroup.addEventListener('click', (e) => {
      const card = e.target.closest('button.vehicle-card');
      if (!card) return;

      document.querySelectorAll('.vehicle-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');

      selectedPlate = card.getAttribute('data-plate') || 'KJT-482';
      if (inputPlate) inputPlate.value = selectedPlate;

      updateSummary();
    });
  }

  // 2. Selección de Duración
  if (durationSelectGroup) {
    durationSelectGroup.addEventListener('click', (e) => {
      const btn = e.target.closest('button.duration-chip');
      if (!btn) return;

      document.querySelectorAll('.duration-chip').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      selectedHours = parseFloat(btn.getAttribute('data-hours')) || 1;
      if (inputDuration) inputDuration.value = selectedHours;

      updateSummary();
    });
  }

  // 3. Formateador a Pesos Colombianos
  function formatCOP(amount) {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    }).format(amount);
  }

  // 4. Actualización Dinámica del Resumen de Compra
  function updateSummary() {
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');

    const startHours = pad(now.getHours());
    const startMinutes = pad(now.getMinutes());
    if (summaryStartsVal) summaryStartsVal.textContent = `Now · ${startHours}:${startMinutes}`;

    const endTime = new Date(now.getTime() + selectedHours * 60 * 60 * 1000);
    const endHours = pad(endTime.getHours());
    const endMinutes = pad(endTime.getMinutes());
    if (summaryEndsVal) summaryEndsVal.textContent = `${endHours}:${endMinutes}`;

    if (summaryDurationVal) {
      summaryDurationVal.textContent = selectedHours === 0.5 ? '30 min' : `${selectedHours} h`;
    }

    const currentZone = document.getElementById('inputZone') ? document.getElementById('inputZone').value : 'A';
    if (summaryZonePlate) {
      summaryZonePlate.textContent = `Zone ${currentZone} · ${selectedPlate}`;
    }

    const totalCost = selectedHours * ratePerHour;
    if (summaryTotalAmount) {
      summaryTotalAmount.textContent = formatCOP(totalCost);
    }
  }

  updateSummary();

  // 5. Envío de Formulario
  if (startParkingForm) {
    startParkingForm.addEventListener('submit', (e) => {
      const submitBtn = document.getElementById('startParkingSubmitBtn');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.classList.add('opacity-75');
      }
    });
  }
});