// HU-014 · Settings: requisitos de la contraseña en vivo y placa en mayúsculas (los formularios hacen POST normal)
document.addEventListener('DOMContentLoaded', () => {
  const newPassword = document.getElementById('newPassword');
  const rules = document.getElementById('passwordRules');
  if (newPassword && rules) {
    const checks = {
      length: (v) => v.length >= 8,
      upper: (v) => /[A-Z]/.test(v),
      number: (v) => /[0-9]/.test(v)
    };
    newPassword.addEventListener('input', () => {
      rules.querySelectorAll('li[data-rule]').forEach((li) => {
        const ok = checks[li.dataset.rule](newPassword.value);
        li.classList.toggle('text-emerald-600', ok);
        li.classList.toggle('text-gray-400', !ok);
        const dot = li.querySelector('.rule-dot');
        dot.classList.toggle('bg-emerald-500', ok);
        dot.classList.toggle('bg-gray-300', !ok);
      });
    });
  }

  const plate = document.getElementById('plate');
  const vehicleType = document.getElementById('vehicle_type');
  const plateLabel = document.getElementById('plateLabel');
  // Las bicicletas se registran con su número de serie en vez de placa
  const syncPlateField = () => {
    if (!plate || !vehicleType) return;
    const type = vehicleType.value;
    if (plateLabel) plateLabel.textContent = type === 'Bicycle' ? 'Serial number' : 'Plate';
    // Motos: placa con letra final o la antigua tipo carro
    plate.placeholder = type === 'Bicycle' ? 'GW1234BK' : type === 'Motorcycle' ? 'ABC12D or ABC123' : 'ABC123';
    plate.maxLength = type === 'Bicycle' ? 12 : 6;
  };
  if (vehicleType) {
    vehicleType.addEventListener('change', syncPlateField);
    syncPlateField();
  }
  if (plate) {
    plate.addEventListener('input', () => {
      plate.value = plate.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    });
  }
});