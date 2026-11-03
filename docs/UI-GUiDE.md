# Guía de Estilos y Vistas UI · SIGMUI

Esta guía define cómo construir o migrar vistas al nuevo sistema de diseño basado en **Tailwind CSS v4 + Pug**.

## 1. Estructura de Controlador y Renderizado
En cada respuesta del controlador incluye `activeMenu`, `pageTitle` y `pageSubtitle`:

```javascript
res.render('HU-XXX', {
  title: 'Título de la Pestaña',
  activeMenu: 'home', // Clave coincidente en sidebar.pug (ej: 'zones', 'inbox', 'payments')
  pageTitle: 'Nombre de la Vista',
  pageSubtitle: 'Descripción corta de la pantalla'
});