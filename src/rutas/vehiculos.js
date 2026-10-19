/* ==========================================================
   API REST de vehículos
   GET    /api/vehiculos           -> Consultar todos
   GET    /api/vehiculos/:codigo   -> Consultar uno
   POST   /api/vehiculos           -> Registrar (INSERT)
   PUT    /api/vehiculos/:codigo   -> Modificar (UPDATE)
   DELETE /api/vehiculos/:codigo   -> Eliminar (DELETE)
   Todas las consultas usan parámetros ($1, $2...) para evitar inyección SQL.
   La llave primaria es "id" (autoincrementable); "codigo" es único.
   ========================================================== */

const express = require('express');
const { pool } = require('../db');
const { validarVehiculo } = require('../validaciones');

const router = express.Router();

// Columnas que se devuelven al navegador (precio se convierte a número)
const COLUMNAS = `id, codigo, marca, modelo, anio, color, combustible,
                  precio::float8 AS precio, cantidad, descripcion,
                  fecha_registro, fecha_actualizacion`;

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
router.post('/', async function (req, res, next) {
    const { datos, errores } = validarVehiculo(req.body);
    if (Object.keys(errores).length > 0) {
        return res.status(400).json({ mensaje: 'Datos inválidos.', errores });
    }

    try {
        // El "id" no se envía: PostgreSQL lo genera automáticamente
        const resultado = await pool.query(
            `INSERT INTO vehiculos
                (codigo, marca, modelo, anio, color, combustible, precio, cantidad, descripcion)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             RETURNING ${COLUMNAS}`,
            [datos.codigo, datos.marca, datos.modelo, datos.anio, datos.color,
             datos.combustible, datos.precio, datos.cantidad, datos.descripcion]
        );
        res.status(201).json(resultado.rows[0]);
    } catch (error) {
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
router.put('/:codigo', async function (req, res, next) {
    const codigo = req.params.codigo.toUpperCase();
    // El código identifica al vehículo y no se cambia
    const { datos, errores } = validarVehiculo({ ...req.body, codigo });
    if (Object.keys(errores).length > 0) {
        return res.status(400).json({ mensaje: 'Datos inválidos.', errores });
    }

    try {
        const resultado = await pool.query(
            `UPDATE vehiculos
                SET marca = $2, modelo = $3, anio = $4, color = $5, combustible = $6,
                    precio = $7, cantidad = $8, descripcion = $9,
                    fecha_actualizacion = CURRENT_TIMESTAMP
              WHERE codigo = $1
              RETURNING ${COLUMNAS}`,
            [codigo, datos.marca, datos.modelo, datos.anio, datos.color,
             datos.combustible, datos.precio, datos.cantidad, datos.descripcion]
        );
        if (resultado.rowCount === 0) {
            return res.status(404).json({ mensaje: 'Vehículo no encontrado.' });
        }
        res.json(resultado.rows[0]);
    } catch (error) {
        next(error);
    }
});

// ---------- ELIMINAR ----------
router.delete('/:codigo', async function (req, res, next) {
    try {
        const resultado = await pool.query(
            'DELETE FROM vehiculos WHERE codigo = $1 RETURNING codigo',
            [req.params.codigo.toUpperCase()]
        );
        if (resultado.rowCount === 0) {
            return res.status(404).json({ mensaje: 'Vehículo no encontrado.' });
        }
        res.json({ mensaje: 'Vehículo eliminado.', codigo: resultado.rows[0].codigo });
    } catch (error) {
        next(error);
    }
});

module.exports = router;