// HU-006 · Verificación de placa: consulta GET /api/plates/:plate/status y pinta Active / Expired / Not registered
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('plateForm');
  const input = document.getElementById('plate-input');
  const errorText = document.getElementById('plate-error');
  const button = document.getElementById('checkBtn');
  const result = document.getElementById('result');
  if (!form) return;

  // Misma validación del servidor: sin vacíos, sin caracteres especiales, formato ABC123 / ABC12D
  function validate(raw) {
    if (!raw.trim()) return 'Please enter a license plate.';
    if (/[^A-Za-z0-9\s-]/.test(raw)) return 'Special characters are not allowed in the license plate.';
    const plate = raw.toUpperCase().replace(/[\s-]/g, '');
    if (!/^[A-Z]{3}\d{2}[A-Z0-9]$/.test(plate)) return 'Invalid license plate. Use ABC123 for cars or ABC12D for motorcycles.';
    return null;
  }

  // Tarjeta del diseño original, armada con textContent (sin innerHTML con datos)
  function card(type, icon, title, lines, badge) {
    const article = document.createElement('article');
    article.className = `card card--${type}`;
    const iconBox = document.createElement('div');
    iconBox.className = `card__icon icon-status--${type}`;
    const i = document.createElement('i');
    i.className = `fa-solid ${icon}`;
    iconBox.appendChild(i);
    const info = document.createElement('div');
    info.className = 'card__info';
    const h3 = document.createElement('h3');
    h3.textContent = title;
    info.appendChild(h3);
    lines.filter(Boolean).forEach((text) => {
      const p = document.createElement('p');
      p.textContent = text;
      info.appendChild(p);
    });
    article.append(iconBox, info);
    if (badge) {
      const span = document.createElement('span');
      span.className = `badge badge--${type}`;
      span.textContent = badge;
      article.appendChild(span);
    }
    return article;
  }

  function render(data) {
    result.replaceChildren();
    if (data.status === 'active') {
      result.appendChild(card('success', 'fa-check', 'PAYMENT PROCESSED', [
        `${data.plate} · Zone ${data.zone} · Space ${data.space}`,
        `${data.date} · ${data.range}`,
        `Time remaining: ${data.remaining}`
      ], 'Valid'));
      return;
    }
    if (data.status === 'expired') {
      result.appendChild(card('error', 'fa-xmark', 'PAYMENT INACTIVE', [
        `${data.plate} · Zone ${data.zone} · Space ${data.space}`,
        `${data.date} · ${data.range}`,
        `Expired ${data.expiredAgo} ago`
      ], 'Expired'));
      if (data.fine) {
        const note = card('neutral', 'fa-file-invoice', `FINE ${data.fine.number}`, [`Issued ${data.fine.issuedAt}`], null);
        result.appendChild(note);
      } else {
        const link = document.createElement('a');
        link.href = `/agent/fines/new?plate=${encodeURIComponent(data.plate)}`;
        link.className = 'btn-check';
        link.style.display = 'block';
        link.style.textAlign = 'center';
        link.style.textDecoration = 'none';
        link.textContent = 'ISSUE DIGITAL FINE';
        result.appendChild(link);
      }
      return;
    }
    const subtitle = document.createElement('h3');
    subtitle.className = 'results-area__subtitle';
    subtitle.textContent = 'NOT REGISTERED';
    result.append(subtitle, card('neutral', 'fa-circle-xmark', data.plate, ['The license plate has no parking payments.'], null));
  }

  async function check() {
    const message = validate(input.value);
    errorText.textContent = message || '';
    if (message) {
      result.replaceChildren();
      input.focus();
      return;
    }
    const plate = input.value.toUpperCase().replace(/[\s-]/g, '');
    button.disabled = true;
    button.textContent = 'CHECKING…';
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000); // timeout de 10 s
    try {
      const response = await fetch(`/api/plates/${encodeURIComponent(plate)}/status`, { signal: controller.signal });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'The plate could not be verified right now. Please try again.');
      render(data);
    } catch (err) {
      result.replaceChildren();
      errorText.textContent = err.name === 'AbortError'
        ? 'The server took too long to answer. Check your connection and try again.'
        : err.message;
    } finally {
      clearTimeout(timer);
      button.disabled = false;
      button.textContent = 'CHECK';
    }
  }

  input.addEventListener('input', () => {
    input.value = input.value.toUpperCase();
    errorText.textContent = '';
  });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    check();
  });

  // Si llega con ?plate= (por ejemplo al volver de la multa) se consulta de una vez
  if (input.value) check();
});
