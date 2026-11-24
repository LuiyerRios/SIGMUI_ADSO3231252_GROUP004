// HU-008 (#43) · Indicador de carga del dashboard: el reporte se consulta en el servidor y puede tardar
document.addEventListener('DOMContentLoaded', () => {
  const loading = document.getElementById('dashLoading');
  const form = document.getElementById('periodForm');
  const from = document.getElementById('dashFrom');
  const to = document.getElementById('dashTo');
  const show = () => { if (loading) loading.hidden = false; };

  // El rango debe ser válido antes de enviarlo (el servidor también lo valida)
  if (form) {
    form.addEventListener('submit', (event) => {
      if (from && to && from.value && to.value && from.value > to.value) {
        event.preventDefault();
        if (typeof window.showToast === 'function') window.showToast('The start date must be before the end date.', 'error');
        return;
      }
      show();
    });
  }
  document.querySelectorAll('.js-loading').forEach((link) => link.addEventListener('click', show));

  // Exportar: la descarga no cambia de página, así que el aviso se oculta solo
  document.querySelectorAll('.js-export').forEach((link) => link.addEventListener('click', () => {
    show();
    setTimeout(() => { if (loading) loading.hidden = true; }, 2500);
  }));
});
