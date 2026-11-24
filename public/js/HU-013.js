// HU-013 · Simulación de pago y My payments: horas locales y "Confirm simulation" → POST /api/payments/parking (el servidor guarda y asigna el espacio)
document.addEventListener('DOMContentLoaded', () => {
  const root = document.getElementById('paymentSimulation');

  const confirmBtn = document.getElementById('confirmBtn');
  const backLink = document.getElementById('backLink');
  const afterConfirm = document.getElementById('afterConfirm');
  const errorBox = document.getElementById('simulationError');
  const errorText = document.getElementById('simulationErrorText');

  const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const pad = (n) => String(n).padStart(2, '0');
  // Mismo formato del diseño: "20 oct · 09:12"
  const formatStamp = (d) => `${d.getDate()} ${MONTHS[d.getMonth()]} · ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const formatCOP = (n) => `$${new Intl.NumberFormat('en-US').format(Math.round(Number(n) || 0))} COP`;
  const setText = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };

  function paintTimes() {
    document.querySelectorAll('.js-local-time').forEach((el) => {
      const t = new Date(el.dataset.time);
      if (!Number.isNaN(t.getTime())) el.textContent = formatStamp(t);
    });
  }

  function showError(message) {
    errorText.textContent = message;
    errorBox.hidden = false;
    errorBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  paintTimes(); // también formatea las fechas de la lista "My payments"

  // HU-004: descarga del recibo en PDF; si el servidor falla se muestra el error sin salir de la página
  document.addEventListener('click', async (event) => {
    const link = event.target.closest('[data-receipt-pdf]');
    if (!link || link.getAttribute('href') === '#') return;
    event.preventDefault();
    try {
      const response = await fetch(link.href, { headers: { Accept: 'application/json, application/pdf' } });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'The receipt could not be generated. Please try again.');
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = (response.headers.get('Content-Disposition') || '').match(/filename="([^"]+)"/)?.[1] || 'receipt.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      if (typeof window.showToast === 'function') window.showToast(err.message, 'error');
    }
  });
  if (!root || !confirmBtn) return; // recibo ya confirmado: solo se muestran las horas

  confirmBtn.addEventListener('click', async () => {
    errorBox.hidden = true;
    const label = confirmBtn.querySelector('.btn-label');
    confirmBtn.disabled = true;
    label.textContent = 'Processing…';

    try {
      const response = await fetch('/api/payments/parking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plate: root.dataset.plate,
          zone: root.dataset.zone,
          // Espacio elegido (vacío = el servidor asigna el primero libre), tipo y si se guarda la placa
          spaceId: root.dataset.spaceId || undefined,
          vehicleType: root.dataset.vehicleType || undefined,
          saveVehicle: root.dataset.saveVehicle === 'true',
          preferentialConfirmed: root.dataset.preferentialConfirmed === 'true',
          rateType: root.dataset.rateType,
          quantity: Number(root.dataset.quantity)
        })
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        showError(data.error || 'The payment could not be processed. Please try again.');
        confirmBtn.disabled = false;
        label.textContent = 'Confirm simulation';
        return;
      }

      // El recibo pasa a mostrar los datos que guardó el servidor
      const space = data.spaceId || data.zone;
      setText('receiptCode', data.receiptNumber);
      const pdfLink = document.getElementById('receiptPdfLink');
      if (pdfLink) pdfLink.href = `/parking/receipt/${encodeURIComponent(data.receiptNumber)}`;
      setText('receiptSpace', `${data.zone} · ${space}`);
      setText('zonePill', `Zone ${data.zone} · ${space}`);
      setText('receiptTotal', formatCOP(data.amount));
      setText('receiptDetail', `Simulated parking charge for zone ${data.zone} · ${space}. Does not result in any actual account activity.`);
      document.getElementById('startTime').dataset.time = data.startTime;
      document.getElementById('endTime').dataset.time = data.endTime;
      document.getElementById('receiptDate').dataset.time = data.startTime;
      paintTimes();

      setText('confirmTitle', 'Payment confirmed');
      setText('confirmText', `Your parking in space ${space} is active. Keep receipt ${data.receiptNumber}.`);
      confirmBtn.hidden = true;
      backLink.hidden = true;
      afterConfirm.hidden = false;
      if (typeof window.showToast === 'function') {
        window.showToast(`Payment completed. Receipt ${data.receiptNumber}`, 'success');
        // HU-004: la placa nueva quedó en "Mis vehículos"
        if (data.vehicleSaved) window.showToast(`Vehicle ${root.dataset.plate} saved to your account.`, 'success');
      }
      if (data.vehicleSaved) setText('vehicleDesc', `${root.dataset.vehicleType || 'Car'} · Saved to your vehicles`);
    } catch (err) {
      showError('The payment could not be processed. Please try again.');
      confirmBtn.disabled = false;
      label.textContent = 'Confirm simulation';
    }
  });
});
