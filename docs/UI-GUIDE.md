Guía del Sistema de Diseño UI · SIGMUI

1. Controlador y Parámetros

En cada res.render, envía activeMenu, pageTitle y pageSubtitle:

res.render('HU-001', { title: 'Home', activeMenu: 'home', pageTitle: 'Welcome', pageSubtitle: 'Overview' });


Claves activeMenu por rol (definidas en sidebar.pug):

driver: home, start_parking, extend_time, inbox, payments, settings, help

agent: verify_plate, new_fine, inbox, help

admin: zones, dashboard, users, payments, help_reports, settings

2. Estructura de Vista Pug Base

extends layouts/app
block styles
  //- CSS adicional si aplica
block content
  .card
    .card-header
      h2.card-title Título
block scripts
  script(src="/js/HU-001.js")


3. Compilación de Tailwind CSS v4

Desarrollo: npm run watch:css:app (compila en tiempo real).

Producción / Pre-commit: npm run build:css:app (minifica).

Importante: El archivo public/css/app.css SIEMPRE debe incluirse en los commits.

4. Registro de Fuentes (@source)

Al migrar o crear una vista, registra sus archivos en src/styles/app.css para que Tailwind escanee sus clases:

@source "../views/HU-001.pug";
@source "../../public/js/HU-001.js";


5. Clases de Componentes Reutilizables

.card / .card-header / .card-title / .card-subtitle: Contenedor blanco con sombra suave y cabecera.

.btn + .btn-primary | .btn-secondary | .btn-danger | .btn-success | .btn-ghost | .btn-block: Botones de acción.

.chip / .chip.active: Filtros redondos seleccionables.

.pill + .pill-success | .pill-danger | .pill-warning | .pill-info | .pill-muted | .pill-accent: Etiquetas de estado.

.field / .field label / .input / .select / .input-icon / .field-error: Campos de formulario estructurados.

.alert + .alert-error | .alert-success | .alert-info: Mensajes informativos o de error con ícono.

.stat-card / .stat-grid: Tarjeta de métrica con valor grande y contenedor en rejilla (4 columnas).

.data-list / .data-list-item / .data-list-label / .data-list-value: Pares de clave-valor separados por línea.

.table / .table-responsive: Tabla de datos con cabecera en mayúsculas y bordes suaves.

.empty-state: Mensaje centrado con ícono cuando no hay registros que mostrar.

.toast / .toast-success | .toast-error: Notificaciones emergentes (usar window.showToast(msg, type)).

.badge-soon: Indicador compacto para características en desarrollo dentro del menú.

6. Puntos de Quiebre (Breakpoints)

1024 px (lg): El sidebar pasa a estado colapsado (76 px) por defecto. .stat-grid se ajusta a 2 columnas.

768 px (md): El sidebar se oculta fuera de pantalla y se activa mediante el botón hamburguesa ☰ (#mobileMenuBtn).

640 px (sm): .stat-grid pasa a 1 columna. Las filas de .table se adaptan visualmente como tarjetas individuales usando data-label.