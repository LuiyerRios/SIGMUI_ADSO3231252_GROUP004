let occupancyChart;

document.addEventListener("DOMContentLoaded", () => {
  const dateInput = document.getElementById("filterDate");
  const today = new Date().toISOString().split('T')[0];
  if (dateInput) dateInput.value = today;

  initChart();
  loadDashboardData();

  if (dateInput) {
    dateInput.addEventListener("change", () => {
      loadDashboardData();
    });
  }

  // Event Listeners para exportación
  const btnPDF = document.getElementById("btnExportPDF");
  const btnExcel = document.getElementById("btnExportExcel");

  if (btnPDF) btnPDF.addEventListener("click", exportPDF);
  if (btnExcel) btnExcel.addEventListener("click", exportExcel);
});

function initChart() {
  const canvas = document.getElementById('occupancyChart');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  occupancyChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Alta (>=70%)', 'Media (30%-69%)', 'Baja (<30%)'],
      datasets: [{
        data: [0, 0, 0],
        backgroundColor: ['#ef4444', '#3b82f6', '#10b981'],
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { font: { weight: 'bold', size: 11 }, boxWidth: 12, padding: 8 }
        }
      }
    }
  });
}

async function loadDashboardData() {
  const alertBox = document.getElementById("alertBox");

  try {
    const response = await fetch('/api/parking-spaces');
    const spaces = await response.json();

    if (!spaces || spaces.length === 0) {
      showAlert("No hay datos disponibles");
      return;
    }

    // Procesa y agrupa dinámicamente los espacios cargados desde la BD
    const zones = {};

    spaces.forEach(space => {
      if (!zones[space.zone]) {
        zones[space.zone] = { occupied: 0, total: 0 };
      }
      zones[space.zone].total++;
      if (space.status === "occupied") {
        zones[space.zone].occupied++;
      }
    });

    let alta = 0, media = 0, baja = 0;

    Object.keys(zones).forEach(z => {
      const total = zones[z].total;
      const occupied = zones[z].occupied;
      const percentage = total > 0 ? (occupied / total) * 100 : 0;

      if (percentage >= 70) alta++;
      else if (percentage >= 30) media++;
      else baja++;
    });

    if (alertBox) {
      alertBox.classList.add("hidden");
      alertBox.classList.remove("flex");
    }

    // Actualiza la gráfica dinámicamente con los valores calculados
    if (occupancyChart) {
      occupancyChart.data.datasets[0].data = [alta, media, baja];
      occupancyChart.update();
    }

  } catch (error) {
    console.error("Error al cargar dashboard:", error);
    showAlert("Error al conectar con la base de datos");
  }
}

function showAlert(msg) {
  const alertBox = document.getElementById("alertBox");
  const alertText = document.getElementById("alertText");

  if (occupancyChart) {
    occupancyChart.data.datasets[0].data = [0, 0, 0];
    occupancyChart.update();
  }

  if (alertText) alertText.innerText = msg;
  if (alertBox) {
    alertBox.classList.remove("hidden");
    alertBox.classList.add("flex");
  }
}

// EXPORTACIÓN A PDF: Captura el gráfico e información del DOM en tiempo real
function exportPDF() {
  const reportElement = document.getElementById("reportArea");
  if (!reportElement) return;

  const dateValue = document.getElementById("filterDate")?.value || new Date().toISOString().split('T')[0];

  const opt = {
    margin:       10,
    filename:     `Reporte_Ocupacion_${dateValue}.pdf`,
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { scale: 2, useCORS: true },
    jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  html2pdf().set(opt).from(reportElement).save();
}

// EXPORTACIÓN A EXCEL: Extrae dinámicamente los datos actuales calculados en la gráfica
function exportExcel() {
  if (!occupancyChart) return;

  const dateValue = document.getElementById("filterDate")?.value || new Date().toISOString().split('T')[0];
  
  // Lee los datos exactamente como están en la gráfica en ese instante
  const currentData = occupancyChart.data.datasets[0].data; // Array: [alta, media, baja]
  const labels = occupancyChart.data.labels;                 // Array de etiquetas

  const totalZonas = currentData.reduce((a, b) => a + b, 0);

  const data = [
    ["REPORTE DINÁMICO DE OCUPACIÓN POR ZONA"],
    ["Fecha de Filtro", dateValue],
    [],
    ["Categoría", "Cantidad de Zonas", "Porcentaje del Total"],
    [labels[0], currentData[0], totalZonas > 0 ? `${((currentData[0] / totalZonas) * 100).toFixed(1)}%` : '0%'],
    [labels[1], currentData[1], totalZonas > 0 ? `${((currentData[1] / totalZonas) * 100).toFixed(1)}%` : '0%'],
    [labels[2], currentData[2], totalZonas > 0 ? `${((currentData[2] / totalZonas) * 100).toFixed(1)}%` : '0%'],
    [],
    ["Total Zonas Evaluadas", totalZonas]
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Ocupación Dinámica");

  XLSX.writeFile(workbook, `Reporte_Ocupacion_${dateValue}.xlsx`);
}