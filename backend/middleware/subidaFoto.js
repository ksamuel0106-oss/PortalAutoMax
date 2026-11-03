/* ==========================================================
   Middleware: subida de la foto del vehículo (multer)
   Acepta un archivo en el campo "foto": JPG, PNG o WebP de
   hasta 5 MB. Se guarda en frontend/img/vehiculos/.
   ========================================================== */

const path = require('path');
const fs = require('fs');
const multer = require('multer');

const CARPETA_FOTOS = path.join(__dirname, '..', '..', 'frontend', 'img', 'vehiculos');
const TIPOS_FOTO = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };
const TAMANO_MAXIMO = 5 * 1024 * 1024;   // 5 MB

fs.mkdirSync(CARPETA_FOTOS, { recursive: true });

const almacenamiento = multer.diskStorage({
    destination: CARPETA_FOTOS,
    // Nombre único: código + fecha, para que el navegador no muestre una foto vieja guardada en caché
    filename: function (req, archivo, cb) {
        const codigo = String(req.params.codigo || req.body.codigo || 'vehiculo')
            .toUpperCase().replace(/[^A-Z0-9-]/g, '');
        cb(null, (codigo || 'vehiculo') + '-' + Date.now() + TIPOS_FOTO[archivo.mimetype]);
    }
});

const subida = multer({
    storage: almacenamiento,
    limits: { fileSize: TAMANO_MAXIMO, files: 1 },
    fileFilter: function (req, archivo, cb) {
        if (TIPOS_FOTO[archivo.mimetype]) return cb(null, true);
        const error = new Error('La foto debe ser JPG, PNG o WebP.');
        error.code = 'TIPO_NO_PERMITIDO';
        cb(error);
    }
}).single('foto');

// Ejecuta multer y responde con un mensaje claro si la foto no es válida.
function recibirFoto(req, res, next) {
    subida(req, res, function (error) {
        if (!error) return next();
        let mensaje = 'No se pudo recibir la foto.';
        if (error.code === 'LIMIT_FILE_SIZE') mensaje = 'La foto no puede pesar más de 5 MB.';
        else if (error.code === 'TIPO_NO_PERMITIDO') mensaje = error.message;
        else if (error.code === 'LIMIT_UNEXPECTED_FILE' || error.code === 'LIMIT_FILE_COUNT') mensaje = 'Envíe una sola foto en el campo "foto".';
        res.status(400).json({ mensaje: mensaje, errores: { foto: mensaje } });
    });
}

// Borra un archivo de foto sin detener la petición si ya no existe.
function borrarFoto(nombre) {
    if (!nombre) return;
    const ruta = path.join(CARPETA_FOTOS, path.basename(nombre));
    fs.unlink(ruta, function () { /* si no existe, no pasa nada */ });
}

module.exports = { recibirFoto, borrarFoto };
