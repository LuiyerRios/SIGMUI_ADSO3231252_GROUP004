document.addEventListener('DOMContentLoaded', () => {
  const sidebar = document.getElementById('sidebar');
  const sidebarToggle = document.getElementById('sidebarToggle');
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const overlay = document.getElementById('sidebarOverlay');
  const toast = document.getElementById('toast');

  // 1. Manejo del Sidebar (Plegado / Desplegado con LocalStorage)
  const isDesktop = window.innerWidth >= 1024;
  let savedState = null;

  try {
    savedState = localStorage.getItem('sigmui_sidebar_collapsed');
  } catch (e) {
    console.warn('LocalStorage unavailable:', e);
  }

  if (sidebar) {
    if (savedState === 'true') {
      sidebar.classList.add('collapsed');
    } else if (savedState === null && !isDesktop) {
      sidebar.classList.add('collapsed');
    }
  }

  if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
      try {
        localStorage.setItem('sigmui_sidebar_collapsed', sidebar.classList.contains('collapsed'));
      } catch (e) {
        console.warn('Cannot save sidebar state:', e);
      }
    });
  }

  // 2. Manejo de Menú en Móvil
  if (mobileMenuBtn && sidebar && overlay) {
    const closeMobileSidebar = () => {
      sidebar.classList.remove('mobile-open');
      overlay.classList.remove('show');
    };

    mobileMenuBtn.addEventListener('click', () => {
      sidebar.classList.add('mobile-open');
      overlay.classList.add('show');
    });

    overlay.addEventListener('click', closeMobileSidebar);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && sidebar.classList.contains('mobile-open')) {
        closeMobileSidebar();
      }
    });

    const menuLinks = sidebar.querySelectorAll('.sidebar-menu a');
    menuLinks.forEach(link => {
      link.addEventListener('click', closeMobileSidebar);
    });
  }

  // 3. Sistema Global de Toasts
  window.showToast = function(message, type = 'info') {
    if (!toast) return;

    toast.textContent = message;
    toast.className = 'toast show';

    if (type === 'success') toast.classList.add('toast-success');
    if (type === 'error') toast.classList.add('toast-error');

    setTimeout(() => {
      toast.classList.remove('show', 'toast-success', 'toast-error');
    }, 4000);
  };
});