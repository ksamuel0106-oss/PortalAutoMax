/* ==========================================================
   Middleware: rutas inexistentes y manejo de errores
   ========================================================== */

function rutaNoEncontrada(req, res) {
    res.status(404).json({ mensaje: 'Ruta no encontrada.' });
}

function manejarErrores(error, req, res, next) {
    // JSON mal formado enviado al servidor
    if (error.type === 'entity.parse.failed') {
        return res.status(400).json({ mensaje: 'El formato de los datos no es válido.' });
    }
    // Errores de conexión con PostgreSQL
    if (['ECONNREFUSED', 'ENOTFOUND', '28P01', '3D000', '57P01'].includes(error.code)) {
        console.error('Error de conexión con PostgreSQL:', error.message);
        return res.status(503).json({ mensaje: 'No hay conexión con la base de datos.' });
    }
    // Restricciones CHECK o valores fuera de rango
    if (['23514', '22003', '22001'].includes(error.code)) {
        return res.status(400).json({ mensaje: 'La base de datos rechazó los datos: ' + error.message });
    }
    console.error(error);
    res.status(500).json({ mensaje: 'Error interno del servidor.' });
}

module.exports = { rutaNoEncontrada, manejarErrores };
