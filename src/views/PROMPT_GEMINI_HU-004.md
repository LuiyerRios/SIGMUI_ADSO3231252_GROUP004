HU-003 quedó terminada. Seguimos en la MISMA rama refactor/driver-HU-003-HU-005 con HU-004. Reglas:
- Cambia SOLO los archivos listados. No toques package.json, layouts/app.pug, partials/*, HU-003 ni app.css salvo las líneas @source que pido.
- Sigue docs/UI-GUIDE.md: extends layouts/app, clases de componente + utilidades de Tailwind v4.
- IMPORTANTE en Pug: las clases con ':' (lg:, sm:, md:) o con '/' (bg-primary/10) van SIEMPRE dentro de class="..." — nunca en la forma corta .lg_col-span-8. Un solo bloque de atributos por etiqueta: div(id="x", class="...", data-a=b).
- Tailwind v4: la opacidad es bg-primary/10 (NO bg-opacity-10).
- Consultas parametrizadas, nada de alert()/confirm(), datos de la BD al DOM con textContent. Comentarios en español, interfaz en inglés.

# HU-004 · Start parking (mockup adjunto StartParking.png) con DATOS REALES

Los precios del mockup ($2.50) son de ejemplo: en la app van en pesos con formatCOP y salen de la tabla zones ($2,000/hora, $20,000/día).

Entrégalo en 2 partes y espera mi "continúa":

## PARTE A · Datos y asignación automática del espacio

1. src/services/driverParkingService.js — agrega SOLO:
   - getUserVehicles(userId) → [{ id, plate, brandModel }] de la tabla vehicles, ordenados por plate.

2. src/services/paymentService.js — cambia SOLO recordParkingPayment:
   - Si NO llega spaceId: dentro de la transacción, después de validar la zona, asigna el PRIMER espacio libre de la zona con la misma regla de ocupación de driverParkingService (status = 'occupied' o sesión activa pagada con end_time > NOW()):
       SELECT ps.id FROM parking_spaces ps
       WHERE ps.zone = ? AND ps.status = 'available'
         AND NOT EXISTS (SELECT 1 FROM parking_sessions s WHERE s.space_id = ps.id AND s.status = 'active' AND s.payment_status = 'paid' AND s.end_time > NOW())
       ORDER BY CHAR_LENGTH(ps.id), ps.id
       LIMIT 1 FOR UPDATE
     Si no hay ninguno → throw new PaymentError('There are no free spaces in this zone.', 409).
   - Si SÍ llega spaceId: además de comprobar que existe en esa zona, comprueba que esté libre con la misma regla; si no → throw new PaymentError('This space is no longer available.', 409).
   - Usa el espacio asignado en el INSERT y agrega spaceId y zone al objeto que devuelve.
   - No cambies nada más de ese archivo (recordExtensionPayment queda igual).

3. src/controllers/driverController.js — agrega renderStartParking:
   - Carga en paralelo getZonesOverview(), getUserVehicles(userId) y getActiveSessions(userId).
   - Zona preseleccionada: ?zone= si existe y tiene espacios libres; si no, la primera con espacios libres.
   - Renderiza HU-004 con: zones, vehicles, activeSessions, selectedZone, title 'Start parking | SIGMUI', activeMenu 'start_parking', pageTitle 'Start parking', pageSubtitle 'Pick a zone, your vehicle and the time'.
   - Error de BD → status 500, misma vista con arreglos vacíos y errorMessage 'The parking information is temporarily unavailable.'

4. src/routes/driverRoutes.js — cambia SOLO la línea de /parking/start para usar renderStartParking (importándolo). No toques las demás rutas.

## PARTE B · Vista y JS

1. src/views/HU-004.pug (extends layouts/app), igual al mockup:
   - Grid de 12 columnas: tarjeta principal class="card col-span-12 lg:col-span-8" y panel SUMMARY class="card col-span-12 lg:col-span-4".
   - Si hay errorMessage → .alert.alert-error arriba.
   - Si el conductor ya tiene sesión activa → .alert.alert-info: "You already have an active session in A2 · ABC123." con enlace "Extend time" (/parking/extend).
   - Título "Start a parking session" y subtítulo "Three quick steps. You can extend your time later from your phone."
   - Paso 1 (círculo numerado 1) "Choose a zone" / "We assign the first free space in that zone": un .chip por zona con el texto "Zone A · 25 free" y data-zone, data-rate-hour, data-rate-day; la preseleccionada con clase active; las zonas sin espacios libres con disabled y opacidad baja.
   - Paso 2 "Select your vehicle": una tarjeta por vehículo (ícono de carro, placa en negrita grande, brandModel en gris; data-plate) y la seleccionada con borde violeta (border-2 border-accent). La primera queda seleccionada. Al final, una tarjeta con borde punteado "+ Other plate" que muestra un input .input (id="otherPlate", maxlength 7, placeholder "ABC123") para escribir otra placa. Si no tiene vehículos, el input se muestra abierto desde el inicio.
   - Paso 3 "How long will you stay?" / "Maximum 4 hours, or a full day": chips 1 h, 2 h, 3 h, 4 h y 1 day (data-rate-type="hour"|"day", data-quantity). Seleccionado por defecto 1 h.
   - Separadores finos entre pasos (border-t border-line).
   - Panel SUMMARY: título "SUMMARY"; tarjeta degradada (bg-gradient-to-br from-primary to-tech, texto blanco, rounded-2xl) con "Your space", el código grande (antes de pagar dice "Auto" y debajo "Assigned when you start") y "Zone A · ABC123"; .data-list con Starts ("Now · 10:26"), Ends ("11:26"), Duration ("1 h" o "1 day"), Rate ("$2,000 COP / hour" o "$20,000 COP / day"); línea Total en grande; botón .btn.btn-primary.btn-block id="startParkingBtn" "Start parking →"; nota pequeña "The final amount is calculated by the server."
   - Debajo del botón, un contenedor oculto id="afterPayment" con dos botones: "Go to home" (/zones) y "Extend time" (/parking/extend).
   - Un .alert.alert-error oculto id="paymentError" dentro de la tarjeta del resumen.
   - En celular (< 1024 px) el resumen queda debajo; los chips y tarjetas de vehículo se envuelven sin scroll horizontal en 360 px.

2. public/js/HU-004.js (REEMPLAZA el archivo actual por completo):
   - Maneja la selección de zona, vehículo/otra placa y duración, y actualiza el resumen (Starts, Ends, Duration, Rate y Total) con formato "$2,000 COP" (Intl.NumberFormat('en-US') + " COP").
   - Placa de "Other plate": mayúsculas, sin espacios ni guiones.
   - Start parking: valida que haya placa; hace fetch POST /api/payments/parking con JSON { plate, zone, rateType, quantity } (SIN spaceId: lo asigna el servidor); botón deshabilitado con spinner mientras espera.
   - Éxito (201): el código grande muestra data.spaceId, la línea de abajo "Zone A · ABC123 · Receipt TP-…", Ends con la hora real de data.endTime, Total con data.amount; window.showToast(`Payment completed. Receipt ${data.receiptNumber}`, 'success'); oculta el botón Start parking y muestra #afterPayment.
   - Error: muestra data.error en #paymentError (textContent) y reactiva el botón.

3. Borra public/css/HU-004.css (la vista ya no lo usa).

4. src/styles/app.css — agrega SOLO: @source "../views/HU-004.pug"; y @source "../../public/js/HU-004.js";

En cada parte: archivos COMPLETOS, "Cómo probarlo" y "Qué NO quedó hecho".
