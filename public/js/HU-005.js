// HU-005 · Extend time: anillo de tiempo restante, opciones de extensión y pago con POST /api/payments/extension
document.addEventListener('DOMContentLoaded', () => {
  const dataEl = document.getElementById('sessionData');
  if (!dataEl) return; // Sin sesión activa: no hay nada que animar

  const ring = document.getElementById('timeRing');
  const timeLeftEl = document.getElementById('timeLeft');
  const endsAtEl = document.getElementById('endsAt');
  const optionsEl = document.getElementById('extendOptions');
  const newEndEl = document.getElementById('newEndTime');
  const extraCostEl = document.getElementById('extraCost');
  const totalTodayEl = document.getElementById('totalToday');
  const extendBtn = document.getElementById('extendBtn');
  const errorBox = document.getElementById('extendError');
  const errorText = document.getElementById('extendErrorText');
  const historyList = document.getElementById('historyList');

  const RING_LENGTH = 2 * Math.PI * 84; // circunferencia del círculo (r = 84)

  const state = {
    sessionId: Number(dataEl.dataset.sessionId),
    start: new Date(dataEl.dataset.start),
    end: new Date(dataEl.dataset.end),
    space: dataEl.dataset.space,
    totalToday: Number(dataEl.dataset.totalToday) || 0,
    hours: 1,
    amount: 0,
    busy: false,
    expired: false
  };

  const pad = (n) => String(n).padStart(2, '0');
  const formatTime = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const formatCOP = (n) => `$${new Intl.NumberFormat('en-US').format(Math.round(n))} COP`;

  // Horas de la lista de historial en hora local del navegador
  document.querySelectorAll('.history-time').forEach((el) => {
    const t = new Date(el.dataset.time);
    if (!Number.isNaN(t.getTime())) el.textContent = `${formatTime(t)} · ${el.textContent}`;
  });

  const firstOption = optionsEl ? optionsEl.querySelector('.extend-option.selected') : null;
  if (firstOption) state.amount = Number(firstOption.dataset.amount);

  function showError(message) {
    if (!errorBox || !errorText) return;
    errorText.textContent = message;
    errorBox.classList.remove('hidden');
  }

  function hideError() {
    if (errorBox) errorBox.classList.add('hidden');
  }

  // Panel "New end time / Extra cost / Total today" y texto del botón
  function updatePanel() {
    const newEnd = new Date(state.end.getTime() + state.hours * 3600000);
    if (newEndEl) newEndEl.textContent = formatTime(newEnd);
    if (extraCostEl) extraCostEl.textContent = formatCOP(state.amount);
    if (totalTodayEl) totalTodayEl.textContent = formatCOP(state.totalToday + state.amount);
    const label = extendBtn ? extendBtn.querySelector('.btn-label') : null;
    if (label && !state.busy) label.textContent = `Extend ${state.hours} h`;
  }

  // Anillo y cuenta regresiva (cada segundo)
  function tick() {
    const now = Date.now();
    const total = Math.max(state.end.getTime() - state.start.getTime(), 1);
    const left = state.end.getTime() - now;

    if (left <= 0) {
      if (timeLeftEl) timeLeftEl.textContent = '0h 00m';
      if (endsAtEl) endsAtEl.textContent = 'Session ended';
      if (ring) ring.setAttribute('stroke-dashoffset', String(RING_LENGTH));
      if (!state.expired) {
        state.expired = true;
        if (extendBtn) extendBtn.disabled = true;
        showError('This parking session can no longer be extended.');
      }
      return;
    }

    const hours = Math.floor(left / 3600000);
    const minutes = Math.floor((left % 3600000) / 60000);
    if (timeLeftEl) timeLeftEl.textContent = `${hours}h ${pad(minutes)}m`;
    if (endsAtEl) endsAtEl.textContent = `ends ${formatTime(state.end)}`;

    const progress = Math.min(Math.max(left / total, 0), 1); // fracción de tiempo que queda
    if (ring) ring.setAttribute('stroke-dashoffset', String(RING_LENGTH * (1 - progress)));
  }

  // Elegir +1 h ... +4 h
  if (optionsEl) {
    optionsEl.addEventListener('click', (e) => {
      const option = e.target.closest('.extend-option');
      if (!option || state.busy) return;
      optionsEl.querySelectorAll('.extend-option').forEach((o) => o.classList.remove('selected'));
      option.classList.add('selected');
      state.hours = Number(option.dataset.hours);
      state.amount = Number(option.dataset.amount);
      hideError();
      updatePanel();
    });
  }

  // Agregar una fila al historial sin recargar
  function addHistoryRow(hours, amount) {
    const empty = document.getElementById('historyEmpty');
    if (empty) empty.remove();

    const li = document.createElement('li');
    li.className = 'flex items-start gap-3';

    const dot = document.createElement('span');
    dot.className = 'w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 bg-accent';

    const body = document.createElement('div');
    body.className = 'flex-1 min-w-0';
    const title = document.createElement('p');
    title.className = 'text-sm font-semibold text-ink';
    title.textContent = `Extended · ${state.space}`;
    const sub = document.createElement('p');
    sub.className = 'text-xs text-muted';
    sub.textContent = `${formatTime(new Date())} · ${hours} h`;
    body.append(title, sub);

    const price = document.createElement('span');
    price.className = 'text-sm font-bold text-ink';
    price.textContent = formatCOP(amount);

    li.append(dot, body, price);
    historyList.appendChild(li);
  }

  // Pagar la extensión
  if (extendBtn) {
    extendBtn.addEventListener('click', async () => {
      if (state.busy || state.expired) return;
      hideError();
      state.busy = true;
      extendBtn.disabled = true;
      const label = extendBtn.querySelector('.btn-label');
      if (label) label.textContent = 'Processing…';

      try {
        const response = await fetch('/api/payments/extension', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: state.sessionId, hours: state.hours })
        });
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          showError(data.error || 'The payment could not be processed. Please try again.');
        } else {
          const paidHours = state.hours;
          state.end = new Date(data.newEndTime);
          state.totalToday += Number(data.amount) || 0;
          addHistoryRow(paidHours, Number(data.amount) || 0);
          if (typeof window.showToast === 'function') {
            window.showToast(`Time extended until ${formatTime(state.end)}`, 'success');
          }
          tick();
        }
      } catch (err) {
        showError('The payment could not be processed. Please try again.');
      } finally {
        state.busy = false;
        extendBtn.disabled = state.expired;
        updatePanel();
      }
    });
  }

  updatePanel();
  tick();
  setInterval(() => {
    tick();
    if (!state.busy) updatePanel(); // la nueva hora de fin se mantiene al día
  }, 1000);
});