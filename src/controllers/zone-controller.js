// src/controllers/zone-controller.js

/**
 * Renderiza la vista de áreas disponibles al iniciar sesión
 */
export const renderAvailableAreas = async (req, res) => {
    try {
        res.render('HU-003', {
            title: 'SIGMUI - Áreas Disponibles'
        });
    } catch (error) {
        console.error('Error al renderizar las áreas disponibles:', error);
        res.status(500).send('Error interno del servidor');
    }
};