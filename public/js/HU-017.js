document.addEventListener('DOMContentLoaded', () => {
  // Función helper para prevenir XSS en la plantilla HTML del PDF
  function escapeHtml(value) {
    if (value === null || value === undefined) return '';
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // 1. Manejo de Filtros (Chips de Zona, Fechas y Placa con Debounce)
  const filtersForm = document.getElementById('filtersForm');
  const zoneInput = document.getElementById('zoneInput');
  const chipItems = document.querySelectorAll('.chip');

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

  // Filtros automáticos: Envío al cambiar campos date
  const dateInputs = document.querySelectorAll('.input-date');
  dateInputs.forEach(dateInput => {
    dateInput.addEventListener('change', () => {
      if (filtersForm) {
        filtersForm.submit();
      }
    });
  });

  // Filtros automáticos: Envío al escribir placa con espera de 500 ms (Debounce)
  const plateInput = document.querySelector('.input-plate');
  let plateTimeout = null;
  if (plateInput) {
    plateInput.addEventListener('input', () => {
      clearTimeout(plateTimeout);
      plateTimeout = setTimeout(() => {
        if (filtersForm) {
          filtersForm.submit();
        }
      }, 500);
    });
  }

  // Helper para obtener parámetros de exportación
  function getExportParams() {
    if (!filtersForm) return new URLSearchParams();
    const formData = new FormData(filtersForm);
    return new URLSearchParams(formData);
  }

  // 2. Exportar a Excel (SheetJS)
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
          window.showToast(result.error || 'Failed to export Excel.', 'error');
          return;
        }

        if (!result.rows || result.rows.length === 0) {
          window.showToast('No payments found for the selected filters.', 'info');
          return;
        }

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
        window.showToast('The payment history is temporarily unavailable.', 'error');
      } finally {
        exportExcelBtn.disabled = false;
        exportExcelBtn.innerHTML = originalText;
      }
    });
  }

  // 3. Exportar a PDF (html2pdf con sanitización HTML)
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
          window.showToast(result.error || 'Failed to export PDF.', 'error');
          return;
        }

        if (!result.rows || result.rows.length === 0) {
          window.showToast('No payments found for the selected filters.', 'info');
          return;
        }

        const from = escapeHtml(params.get('from') || 'N/A');
        const to = escapeHtml(params.get('to') || 'N/A');
        const zone = escapeHtml(params.get('zone') || 'all');

        const summaryRevenue = escapeHtml(result.summary.revenue);
        const summaryCount = escapeHtml(result.summary.count);
        const summaryParkingCount = escapeHtml(result.summary.parkingCount);
        const summaryExtensionCount = escapeHtml(result.summary.extensionCount);
        const summaryAverageTicket = escapeHtml(result.summary.averageTicket);

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
            <div>Total Revenue: <strong>${summaryRevenue}</strong></div>
            <div>Total Payments: <strong>${summaryCount}</strong></div>
            <div>Parking/Extensions: <strong>${summaryParkingCount}/${summaryExtensionCount}</strong></div>
            <div>Avg Ticket: <strong>${summaryAverageTicket}</strong></div>
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
                  <td style="padding: 6px;">${escapeHtml(r.date)}</td>
                  <td style="padding: 6px; font-weight: bold;">${escapeHtml(r.receipt)}</td>
                  <td style="padding: 6px; font-weight: bold;">${escapeHtml(r.plate)}</td>
                  <td style="padding: 6px;">${escapeHtml(r.driver)}</td>
                  <td style="padding: 6px; text-align: center;">${escapeHtml(r.zone)}</td>
                  <td style="padding: 6px; text-align: center;">${escapeHtml(r.type)}</td>
                  <td style="padding: 6px; text-align: right; font-weight: bold;">${escapeHtml(r.formattedAmount)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;

        const opt = {
          margin: 10,
          filename: `payments_${params.get('from') || 'all'}_${params.get('to') || 'all'}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2 },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
        };

        await html2pdf().set(opt).from(container).save();

      } catch (err) {
        console.error('PDF Export Error:', err);
        window.showToast('The payment history is temporarily unavailable.', 'error');
      } finally {
        exportPdfBtn.disabled = false;
        exportPdfBtn.innerHTML = originalText;
      }
    });
  }
});