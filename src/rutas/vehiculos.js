/* ==========================================================
   API REST de vehículos
   GET    /api/vehiculos           -> Consultar todos
   GET    /api/vehiculos/:codigo   -> Consultar uno
   POST   /api/vehiculos           -> Registrar (INSERT)
   PUT    /api/vehiculos/:codigo   -> Modificar (UPDATE)
   DELETE /api/vehiculos/:codigo   -> Eliminar (DELETE)
   Todas las consultas usan parámetros ($1, $2...) para evitar inyección SQL.
   La llave primaria es "id" (autoincrementable); "codigo" es único.

   FOTO (opcional): POST y PUT aceptan multipart/form-data con un
   archivo en el campo "foto" (JPG, PNG o WebP, hasta 5 MB).
   El archivo se guarda en public/img/vehiculos/ y la columna "foto"
   guarda su nombre. En PUT, quitarFoto=true elimina la foto actual.
   POST y PUT siguen aceptando JSON sin foto (por ejemplo, desde Postman).
   ========================================================== */

const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { pool } = require('../db');
const { validarVehiculo } = require('../validaciones');

const router = express.Router();

// Columnas que se devuelven al navegador (precio se convierte a número)
const COLUMNAS = `id, codigo, marca, modelo, anio, color, combustible,
                  precio::float8 AS precio, cantidad, descripcion, foto,
                  fecha_registro, fecha_actualizacion`;

/* ==========================================================
   CONFIGURACIÓN DE LA SUBIDA DE FOTOS (multer)
   ========================================================== */

const CARPETA_FOTOS = path.join(__dirname, '..', '..', 'public', 'img', 'vehiculos');
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

/* ==========================================================
   CONSULTAS
   ========================================================== */

// ---------- CONSULTAR TODOS ----------
router.get('/', async function (req, res, next) {
    try {
        const resultado = await pool.query(
            `SELECT ${COLUMNAS} FROM vehiculos ORDER BY fecha_registro, codigo`
        );
        res.json(resultado.rows);
    } catch (error) {
        next(error);
    }
});

// ---------- CONSULTAR UNO ----------
router.get('/:codigo', async function (req, res, next) {
    try {
        const resultado = await pool.query(
            `SELECT ${COLUMNAS} FROM vehiculos WHERE codigo = $1`,
            [req.params.codigo.toUpperCase()]
        );
        if (resultado.rowCount === 0) {
            return res.status(404).json({ mensaje: 'Vehículo no encontrado.' });
        }
        res.json(resultado.rows[0]);
    } catch (error) {
        next(error);
    }
});

// ---------- REGISTRAR ----------
router.post('/', recibirFoto, async function (req, res, next) {
    const fotoNueva = req.file ? req.file.filename : null;

    const { datos, errores } = validarVehiculo(req.body);
    if (Object.keys(errores).length > 0) {
        borrarFoto(fotoNueva);
        return res.status(400).json({ mensaje: 'Datos inválidos.', errores });
    }

    try {
        // El "id" no se envía: PostgreSQL lo genera automáticamente
        const resultado = await pool.query(
            `INSERT INTO vehiculos
                (codigo, marca, modelo, anio, color, combustible, precio, cantidad, descripcion, foto)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             RETURNING ${COLUMNAS}`,
            [datos.codigo, datos.marca, datos.modelo, datos.anio, datos.color,
             datos.combustible, datos.precio, datos.cantidad, datos.descripcion, fotoNueva]
        );
        res.status(201).json(resultado.rows[0]);
    } catch (error) {
        borrarFoto(fotoNueva);
        // 23505 = violación de restricción UNIQUE (código repetido)
        if (error.code === '23505') {
            return res.status(409).json({
                mensaje: 'Código repetido.',
                errores: { codigo: 'Ya existe un vehículo con el código ' + datos.codigo + '.' }
            });
        }
        next(error);
    }
});

// ---------- MODIFICAR ----------
router.put('/:codigo', recibirFoto, async function (req, res, next) {
    const codigo = req.params.codigo.toUpperCase();
    const fotoNueva = req.file ? req.file.filename : null;
    const quitarFoto = String(req.body.quitarFoto) === 'true';

    // El código identifica al vehículo y no se cambia
    const { datos, errores } = validarVehiculo({ ...req.body, codigo });
    if (Object.keys(errores).length > 0) {
        borrarFoto(fotoNueva);
        return res.status(400).json({ mensaje: 'Datos inválidos.', errores });
    }

    try {
        // Foto anterior, para borrarla si se reemplaza o se quita
        const anterior = await pool.query('SELECT foto FROM vehiculos WHERE codigo = $1', [codigo]);
        if (anterior.rowCount === 0) {
            borrarFoto(fotoNueva);
            return res.status(404).json({ mensaje: 'Vehículo no encontrado.' });
        }
        const fotoAnterior = anterior.rows[0].foto;

        // Nueva foto > quitar foto > dejar la que estaba
        const fotoFinal = fotoNueva || (quitarFoto ? null : fotoAnterior);

        const resultado = await pool.query(
            `UPDATE vehiculos
                SET marca = $2, modelo = $3, anio = $4, color = $5, combustible = $6,
                    precio = $7, cantidad = $8, descripcion = $9, foto = $10,
                    fecha_actualizacion = CURRENT_TIMESTAMP
              WHERE codigo = $1
              RETURNING ${COLUMNAS}`,
            [codigo, datos.marca, datos.modelo, datos.anio, datos.color,
             datos.combustible, datos.precio, datos.cantidad, datos.descripcion, fotoFinal]
        );

        if (fotoAnterior && fotoAnterior !== fotoFinal) borrarFoto(fotoAnterior);
        res.json(resultado.rows[0]);
    } catch (error) {
        borrarFoto(fotoNueva);
        next(error);
    }
});

// ---------- ELIMINAR ----------
router.delete('/:codigo', async function (req, res, next) {
    try {
        const resultado = await pool.query(
            'DELETE FROM vehiculos WHERE codigo = $1 RETURNING codigo, foto',
            [req.params.codigo.toUpperCase()]
        );
        if (resultado.rowCount === 0) {
            return res.status(404).json({ mensaje: 'Vehículo no encontrado.' });
        }
        borrarFoto(resultado.rows[0].foto);
        res.json({ mensaje: 'Vehículo eliminado.', codigo: resultado.rows[0].codigo });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
