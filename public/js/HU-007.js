// HU-007 · Multa digital: envía POST /api/fines; el servidor vuelve a validar que la sesión siga vencida
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('fineForm');
  if (!form) return;
  const button = document.getElementById('issueBtn');
  const errorText = document.getElementById('fineError');
  const ticket = document.getElementById('ticketNumber');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    errorText.textContent = '';
    const location = document.getElementById('location').value.trim();
    if (location.length < 3) {
      errorText.textContent = 'Please enter the current location (3 to 150 characters).';
      return;
    }
    button.disabled = true;
    button.textContent = 'Issuing…';
    try {
      const response = await fetch('/api/fines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plate: form.dataset.plate,
          location,
          comments: document.getElementById('comments').value
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'The fine could not be saved. Please try again.');

      ticket.textContent = ` ${data.fineNumber}`;
      form.querySelectorAll('input, textarea').forEach((el) => { el.disabled = true; });
      button.hidden = true;
      document.getElementById('afterFine').hidden = false;
      if (typeof window.showToast === 'function') window.showToast(data.message, 'success');
    } catch (err) {
      errorText.textContent = err.message;
      button.disabled = false;
      button.textContent = 'Generate Ticket # Auto';
    }
  });
});
