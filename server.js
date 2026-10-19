/* ==========================================================
   AutoMax - Servidor web (Node.js + Express + PostgreSQL)
   ========================================================== */

require('dotenv').config();

const path = require('path');
const express = require('express');
const { pool, probarConexion } = require('./src/db');
const rutasVehiculos = require('./src/rutas/vehiculos');

const app = express();
const PUERTO = Number(process.env.PORT) || 3000;

// ---------- Middlewares ----------
app.use(express.json());                                   // Lee el JSON enviado por el formulario
app.use(express.static(path.join(__dirname, 'public')));   // Sirve index.html, css, js e img

// ---------- Rutas de la API ----------
app.use('/api/vehiculos', rutasVehiculos);

app.use('/api', function (req, res) {
    res.status(404).json({ mensaje: 'Ruta no encontrada.' });
});

// ---------- Manejo de errores ----------
app.use(function (error, req, res, next) {
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
});

// ---------- Inicio ----------
async function iniciar() {
    try {
        const base = await probarConexion();
        console.log('Conectado a PostgreSQL, base de datos "' + base + '".');
    } catch (error) {
        console.error('No se pudo conectar a PostgreSQL:', error.message);
        console.error('Revise los datos del archivo .env y que el servicio de PostgreSQL esté iniciado.');
        process.exit(1);
    }

    app.listen(PUERTO, function () {
        console.log('AutoMax disponible en http://localhost:' + PUERTO);
    });
}

// Cierra las conexiones al detener el servidor (Ctrl + C)
process.on('SIGINT', async function () {
    await pool.end();
    process.exit(0);
});

iniciar();
