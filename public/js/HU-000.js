// public/js/HU-000.js
// HU-000 · Home de Tech Parking.
// Todo lo de esta página es una DEMO interactiva: no llama a la API ni a rutas
// de otras HU. Solo los enlaces de cuenta (Sign in, Get started, Create account,
// I already have one) salen hacia /login y /signup.

(() => {
  const RATE_PER_HOUR = Number(document.body.dataset.rate) || 2000;
  const START_MINUTES = 8 * 60; // la demo siempre arranca a las 8:00 AM
  const REMINDER_BEFORE = 10;   // aviso 10 minutos antes de terminar
  const RING_LENGTH = 565.5;    // 2 · π · 90
  const RING_MAX_MINUTES = 120;

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  const formatCop = (value) => `$${Math.round(value).toLocaleString('es-CO')}`;

  // ---------- Aviso flotante ----------
  const toast = $('#demoToast');
  let toastTimer;
  const showToast = (message) => {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.remove('opacity-0', 'translate-y-2');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.add('opacity-0', 'translate-y-2'), 2600);
  };

  // ---------- Menú móvil ----------
  const menuButton = $('#menuButton');
  const mobileMenu = $('#mobileMenu');
  const setMenu = (open) => {
    if (!menuButton || !mobileMenu) return;
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    $('[data-menu-icon="open"]', menuButton).classList.toggle('hidden', open);
    $('[data-menu-icon="close"]', menuButton).classList.toggle('hidden', !open);
    mobileMenu.classList.toggle('opacity-0', !open);
    mobileMenu.classList.toggle('-translate-y-2', !open);
    mobileMenu.classList.toggle('pointer-events-none', !open);
  };
  menuButton?.addEventListener('click', () => setMenu(menuButton.getAttribute('aria-expanded') !== 'true'));
  $$('[data-menu-link]').forEach((link) => link.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });

  // ---------- Navegación activa (escritorio) ----------
  const navLinks = $$('[data-nav-link]');
  const setActiveNav = (hash) => {
    navLinks.forEach((link) => {
      const active = link.getAttribute('href') === hash;
      link.classList.toggle('bg-tp-pale', active);
      link.classList.toggle('text-tp-blue', active);
      link.classList.toggle('text-tp-navy', !active);
    });
  };
  if ('IntersectionObserver' in window && navLinks.length) {
    const sections = navLinks.map((l) => $(l.getAttribute('href'))).filter(Boolean);
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((entry) => { if (entry.isIntersecting) setActiveNav(`#${entry.target.id}`); });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach((s) => spy.observe(s));
  }

  // ---------- Mapa en vivo ----------
  const zones = {
    A: { name: 'Zone A · Downtown', free: 14, walk: '2 min', badge: 'Plenty of space', badgeClass: 'bg-[#dcfce7] text-[#166534]', tip: 'Best pick right now: closest to your destination with room to spare.', action: 'Navigate & park here', canPark: true },
    B: { name: 'Zone B · City Hall', free: 3, walk: '4 min', badge: 'Filling up', badgeClass: 'bg-[#ffedd5] text-[#9a3412]', tip: 'Only a few spaces left. Go now or pick Zone A for more room.', action: 'Navigate & park here', canPark: true },
    C: { name: 'Zone C · Main Square', free: 0, walk: '1 min', badge: 'Full', badgeClass: 'bg-[#fee2e2] text-[#991b1b]', tip: "No free spaces right now. We'll let you know when one opens up.", action: 'Notify me when free', canPark: false }
  };
  const badgeClasses = Object.values(zones).flatMap((z) => z.badgeClass.split(' '));
  const panel = $('#zonePanel');
  const markers = $$('[data-zone]');
  let selectedZone = 'A';

  const selectZone = (code) => {
    const zone = zones[code];
    if (!zone || !panel) return;
    selectedZone = code;

    markers.forEach((m) => {
      const on = m.dataset.zone === code;
      m.setAttribute('aria-pressed', String(on));
      $('[data-dot]', m).classList.toggle('tp-pulse', on);
      m.classList.toggle('z-[1]', !on);
      m.classList.toggle('z-[3]', on);
    });

    panel.classList.add('opacity-60');
    setTimeout(() => panel.classList.remove('opacity-60'), 150);

    $('[data-zone-name]', panel).textContent = zone.name;
    $('[data-zone-free]', panel).textContent = zone.free;
    $('[data-zone-walk]', panel).textContent = zone.walk;
    $('[data-zone-tip]', panel).textContent = zone.tip;
    $('[data-navigate-label]', panel).textContent = zone.action;

    const badge = $('[data-zone-badge]', panel);
    badge.classList.remove(...badgeClasses);
    badge.classList.add(...zone.badgeClass.split(' '));
    badge.textContent = zone.badge;
  };

  if (panel) panel.classList.add('transition-opacity', 'duration-150');
  markers.forEach((m) => m.addEventListener('click', () => selectZone(m.dataset.zone)));

  $('#searchForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const destination = $('#destination').value.trim();
    // Demo: siempre recomienda la zona con más espacios libres.
    const best = Object.entries(zones).sort((a, b) => b[1].free - a[1].free)[0][0];
    selectZone(best);
    showToast(destination ? `Demo: best zone near "${destination}" is ${zones[best].name}.` : `Demo: ${zones[best].name} has the most free spaces.`);
  });

  $('#navigateButton')?.addEventListener('click', () => {
    const zone = zones[selectedZone];
    showToast(zone.canPark
      ? `Demo mode: create an account to park in ${zone.name}.`
      : `Demo mode: we'd notify you when ${zone.name} has room.`);
  });

  // ---------- Carrusel del día (móvil) ----------
  const carousel = $('#dayCarousel');
  const dots = $$('[data-dot-index]');
  const setDot = (index) => {
    dots.forEach((dot, i) => {
      const on = i === index;
      dot.classList.toggle('w-5', on);
      dot.classList.toggle('bg-tp-blue', on);
      dot.classList.toggle('w-[6px]', !on);
      dot.classList.toggle('bg-tp-border', !on);
    });
  };
  if (carousel) {
    const cards = $$('article', carousel);
    let ticking = false;
    carousel.addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const left = carousel.scrollLeft;
        let index = 0;
        cards.forEach((card, i) => { if (Math.abs(card.offsetLeft - carousel.offsetLeft - 20 - left) < Math.abs(cards[index].offsetLeft - carousel.offsetLeft - 20 - left)) index = i; });
        if (left + carousel.clientWidth >= carousel.scrollWidth - 2) index = cards.length - 1;
        setDot(index);
        ticking = false;
      });
    }, { passive: true });
    dots.forEach((dot) => dot.addEventListener('click', () => {
      const card = cards[Number(dot.dataset.dotIndex)];
      carousel.scrollTo({ left: card.offsetLeft - carousel.offsetLeft - 20, behavior: 'smooth' });
    }));
  }

  // ---------- Simulador de duración ----------
  const formatClock = (minutes) => {
    const h24 = Math.floor(minutes / 60) % 24;
    const m = minutes % 60;
    const h12 = h24 % 12 || 12;
    return `${h12}:${String(m).padStart(2, '0')} ${h24 < 12 ? 'AM' : 'PM'}`;
  };
  const formatDuration = (minutes) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (!h) return `${m} min`;
    return m ? `${h} h ${m}` : `${h} h`;
  };
  const ring = $('#simRing');
  const durationButtons = $$('#durationButtons [data-minutes]');
  const setDuration = (minutes) => {
    durationButtons.forEach((btn) => {
      const on = Number(btn.dataset.minutes) === minutes;
      btn.setAttribute('aria-checked', String(on));
      btn.classList.toggle('bg-white', on);
      btn.classList.toggle('text-tp-navy', on);
      btn.classList.toggle('border-white', on);
      btn.classList.toggle('text-white', !on);
      btn.classList.toggle('border-white/35', !on);
      btn.classList.toggle('hover:border-white/70', !on);
    });
    const end = START_MINUTES + minutes;
    $('[data-sim="start"]').textContent = formatClock(START_MINUTES);
    $('[data-sim="reminder"]').textContent = formatClock(Math.max(START_MINUTES, end - REMINDER_BEFORE));
    $('[data-sim="end"]').textContent = formatClock(end);
    $('[data-sim="duration"]').textContent = formatDuration(minutes);
    $('[data-sim="cost"]').textContent = `${formatCop(RATE_PER_HOUR)} × time = ${formatCop(RATE_PER_HOUR * minutes / 60)}`;
    if (ring) ring.style.strokeDashoffset = String(RING_LENGTH * (1 - Math.min(minutes, RING_MAX_MINUTES) / RING_MAX_MINUTES));
  };
  durationButtons.forEach((btn) => btn.addEventListener('click', () => setDuration(Number(btn.dataset.minutes))));
  // Flechas del teclado dentro del grupo de tiempos
  $('#durationButtons')?.addEventListener('keydown', (e) => {
    if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    const i = durationButtons.findIndex((b) => b.getAttribute('aria-checked') === 'true');
    const next = durationButtons[(i + (e.key === 'ArrowRight' ? 1 : -1) + durationButtons.length) % durationButtons.length];
    next.focus();
    setDuration(Number(next.dataset.minutes));
  });

  // ---------- Comparación (pestañas móviles) ----------
  const compareTabs = $$('[data-compare-tab]');
  compareTabs.forEach((tab) => tab.addEventListener('click', () => {
    const which = tab.dataset.compareTab;
    compareTabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.classList.toggle('bg-white', on);
    });
    $$('[data-compare-card]').forEach((card) => card.classList.toggle('hidden', card.dataset.compareCard !== which));
  }));

  // ---------- Garaje ----------
  const plates = $$('[data-plate]');
  plates.forEach((plate) => plate.addEventListener('click', () => {
    plates.forEach((p) => {
      const on = p === plate;
      p.setAttribute('aria-pressed', String(on));
      p.classList.toggle('border-2', on);
      p.classList.toggle('border-tp-blue', on);
      p.classList.toggle('bg-tp-pale', on);
      p.classList.toggle('border-0', !on);
      p.classList.toggle('border-transparent', !on);
      p.classList.toggle('bg-tp-tile', !on);
      const state = $('[data-plate-state]', p);
      state.textContent = on ? 'Active' : 'Saved';
      state.classList.toggle('font-semibold', on);
      state.classList.toggle('text-tp-blue', on);
      state.classList.toggle('text-tp-soft', !on);
    });
  }));

  // ---------- Alerta ----------
  const alertBadge = $('#alertBadge');
  let extended = false;
  alertBadge?.addEventListener('click', () => {
    extended = !extended;
    $('[data-alert-text]', alertBadge).textContent = extended ? 'Extended +30 min' : '10 min left';
    $('[data-alert-extra]', alertBadge).textContent = extended ? ' · Undo?' : ' · Extend?';
    alertBadge.classList.toggle('bg-[#fff7ed]', !extended);
    alertBadge.classList.toggle('text-[#9a3412]', !extended);
    alertBadge.classList.toggle('bg-[#dcfce7]', extended);
    alertBadge.classList.toggle('text-[#166534]', extended);
  });

  // ---------- Enlaces del pie (aún sin página) ----------
  $$('[data-demo-link]').forEach((link) => link.addEventListener('click', (e) => {
    e.preventDefault();
    showToast(`${link.textContent.trim()} page coming soon.`);
  }));
})();
