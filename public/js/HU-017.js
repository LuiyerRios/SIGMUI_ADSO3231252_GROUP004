document.addEventListener('DOMContentLoaded', () => {
  // 1. Manejo de Sidebar (Plegado / Desplegado + Mobile)
  const sidebar = document.getElementById('adminSidebar');
  const toggleBtn = document.getElementById('toggleSidebar');
  const mobileToggleBtn = document.getElementById('mobileToggle');
  const overlay = document.getElementById('sidebarOverlay');

  // Recuperar estado previo del sidebar
  try {
    const isCollapsed = localStorage.getItem('sigmui_sidebar_collapsed') === 'true';
    if (isCollapsed && sidebar) {
      sidebar.classList.add('collapsed');
    }
  } catch (e) {
    console.warn('LocalStorage not available:', e);
  }

  if (toggleBtn && sidebar) {
    toggleBtn.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
      try {
        localStorage.setItem(
          'sigmui_sidebar_collapsed',
          sidebar.classList.contains('collapsed')
        );
      } catch (e) {
        console.warn('Cannot save sidebar state:', e);
      }
    });
  }

  if (mobileToggleBtn && sidebar && overlay) {
    mobileToggleBtn.addEventListener('click', () => {
      sidebar.classList.add('mobile-open');
      overlay.classList.add('show');
    });

    overlay.addEventListener('click', () => {
      sidebar.classList.remove('mobile-open');
      overlay.classList.remove('show');
    });
  }

  // 2. Manejo de Filtros (Chips de Zona)
  const filtersForm = document.getElementById('filtersForm');
  const zoneInput = document.getElementById('zoneInput');
  const chipItems = document.querySelectorAll('.chip-item');

  chipItems.forEach(chip => {
    chip.addEventListener('click', (e) => {
      e.preventDefault();
      const selectedZone = chip.getAttribute('data-zone');
      if (zoneInput) {
        zoneInput.value = selectedZone;
      }
      if (filtersForm) {
        filtersForm.submit();
      }
    });
  });

  // Toast Notification Helper
  function showToast(message) {
    const toast = document.getElementById('toastNotification');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 4000);
  }

  // 3. Obtener Parámetros de Exportación
  function getExportParams() {
    if (!filtersForm) return new URLSearchParams();
    const formData = new FormData(filtersForm);
    return new URLSearchParams(formData);
  }

  // 4. Exportar a Excel (SheetJS)
  const exportExcelBtn = document.getElementById('exportExcelBtn');
  if (exportExcelBtn) {
    exportExcelBtn.addEventListener('click', async () => {
      const originalText = exportExcelBtn.innerHTML;
      exportExcelBtn.disabled = true;
      exportExcelBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Exporting...</span>';

      try {
        const params = getExportParams();
        const response = await fetch(`/admin/payments/export?${params.toString()}`);
        const result = await response.json();

        if (!response.ok) {
          showToast(result.error || 'Failed to export Excel.');
          return;
        }

        if (!result.rows || result.rows.length === 0) {
          showToast('No payments found for the selected filters.');
          return;
        }

        // Construir datos de hoja de cálculo
        const worksheetData = [
          ['DATE', 'RECEIPT', 'PLATE', 'DRIVER', 'ZONE', 'TYPE', 'AMOUNT']
        ];

        result.rows.forEach(row => {
          worksheetData.push([
            row.date,
            row.receipt,
            row.plate,
            row.driver,
            row.zone,
            row.type,
            row.amount
          ]);
        });

        // Filas de resumen al final
        worksheetData.push([]);
        worksheetData.push(['Total Revenue:', result.summary.revenue]);
        worksheetData.push(['Total Payments:', result.summary.count]);

        const ws = XLSX.utils.aoa_to_sheet(worksheetData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Payments');

        const from = params.get('from') || 'all';
        const to = params.get('to') || 'all';
        XLSX.writeFile(wb, `payments_${from}_${to}.xlsx`);

      } catch (err) {
        console.error('Excel Export Error:', err);
        showToast('The payment history is temporarily unavailable.');
      } finally {
        exportExcelBtn.disabled = false;
        exportExcelBtn.innerHTML = originalText;
      }
    });
  }

  // 5. Exportar a PDF (html2pdf)
  const exportPdfBtn = document.getElementById('exportPdfBtn');
  if (exportPdfBtn) {
    exportPdfBtn.addEventListener('click', async () => {
      const originalText = exportPdfBtn.innerHTML;
      exportPdfBtn.disabled = true;
      exportPdfBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Exporting...</span>';

      try {
        const params = getExportParams();
        const response = await fetch(`/admin/payments/export?${params.toString()}`);
        const result = await response.json();

        if (!response.ok) {
          showToast(result.error || 'Failed to export PDF.');
          return;
        }

        if (!result.rows || result.rows.length === 0) {
          showToast('No payments found for the selected filters.');
          return;
        }

        const from = params.get('from') || 'N/A';
        const to = params.get('to') || 'N/A';
        const zone = params.get('zone') || 'all';

        // Construir plantilla HTML temporal para renderizar el PDF
        const container = document.createElement('div');
        container.style.padding = '20px';
        container.style.fontFamily = 'sans-serif';
        container.style.color = '#172033';

        container.innerHTML = `
          <div style="margin-bottom: 20px; border-bottom: 2px solid #2565AE; padding-bottom: 10px;">
            <h2 style="color: #2565AE; margin: 0;">Tech Parking · Payment History Report</h2>
            <p style="font-size: 12px; color: #5B6B82; margin: 5px 0 0 0;">
              Period: <strong>${from}</strong> to <strong>${to}</strong> | Zone: <strong>${zone.toUpperCase()}</strong>
            </p>
          </div>

          <div style="display: flex; justify-content: space-between; margin-bottom: 20px; background: #F1F5FA; padding: 12px; border-radius: 8px; font-size: 12px;">
            <div>Total Revenue: <strong>${result.summary.revenue}</strong></div>
            <div>Total Payments: <strong>${result.summary.count}</strong></div>
            <div>Parking/Extensions: <strong>${result.summary.parkingCount}/${result.summary.extensionCount}</strong></div>
            <div>Avg Ticket: <strong>${result.summary.averageTicket}</strong></div>
          </div>

          <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
            <thead>
              <tr style="background-color: #2565AE; color: #ffffff;">
                <th style="padding: 6px; text-align: left;">Date</th>
                <th style="padding: 6px; text-align: left;">Receipt</th>
                <th style="padding: 6px; text-align: left;">Plate</th>
                <th style="padding: 6px; text-align: left;">Driver</th>
                <th style="padding: 6px; text-align: center;">Zone</th>
                <th style="padding: 6px; text-align: center;">Type</th>
                <th style="padding: 6px; text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${result.rows.map((r, i) => `
                <tr style="background-color: ${i % 2 === 0 ? '#ffffff' : '#f8fafc'}; border-bottom: 1px solid #e2e8f0;">
                  <td style="padding: 6px;">${r.date}</td>
                  <td style="padding: 6px; font-weight: bold;">${r.receipt}</td>
                  <td style="padding: 6px; font-weight: bold;">${r.plate}</td>
                  <td style="padding: 6px;">${r.driver}</td>
                  <td style="padding: 6px; text-align: center;">${r.zone}</td>
                  <td style="padding: 6px; text-align: center;">${r.type}</td>
                  <td style="padding: 6px; text-align: right; font-weight: bold;">${r.formattedAmount}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;

        const opt = {
          margin: 10,
          filename: `payments_${from}_${to}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2 },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
        };

        await html2pdf().set(opt).from(container).save();

      } catch (err) {
        console.error('PDF Export Error:', err);
        showToast('The payment history is temporarily unavailable.');
      } finally {
        exportPdfBtn.disabled = false;
        exportPdfBtn.innerHTML = originalText;
      }
    });
  }
});