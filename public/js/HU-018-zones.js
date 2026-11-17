// HU-018 (#35) · Guarda las tarifas y reglas de cada zona con PUT /api/admin/zones/:code
document.addEventListener('DOMContentLoaded', () => {
  const toast = (message, type) => {
    if (typeof window.showToast === 'function') window.showToast(message, type);
  };

  document.querySelectorAll('.zone-form').forEach((form) => {
    const errorBox = form.querySelector('[data-role="error"]');
    const summary = form.querySelector('[data-role="summary"]');
    const pill = form.querySelector('[data-role="open-pill"]');
    const button = form.querySelector('button[type="submit"]');

    const showError = (message) => {
      errorBox.textContent = message || '';
      errorBox.hidden = !message;
    };

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      showError('');

      const payload = {
        ratePerHour: form.ratePerHour.value.trim(),
        ratePerDay: form.ratePerDay.value.trim(),
        opensAt: form.opensAt.value,
        closesAt: form.closesAt.value,
        allowsExtension: form.allowsExtension.checked
      };

      button.disabled = true;
      try {
        const response = await fetch(`/api/admin/zones/${encodeURIComponent(form.dataset.zone)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          const message = data.error || 'Changes cannot be saved due to system failure.';
          showError(message);
          toast(message, 'error');
          return;
        }

        const zone = data.zone;
        summary.textContent = `${zone.rateHourText} / hour · ${zone.scheduleText} · ${zone.activeSessions} active`;
        pill.textContent = zone.isOpen ? 'Open now' : 'Closed now';
        pill.className = `pill whitespace-nowrap shrink-0 ${zone.isOpen ? 'pill-success' : 'pill-muted'}`;
        toast(data.message, 'success');
      } catch (error) {
        const message = 'Changes cannot be saved due to system failure.';
        showError(message);
        toast(message, 'error');
      } finally {
        button.disabled = false;
      }
    });
  });
});
