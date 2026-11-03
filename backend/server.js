/* ==========================================================
   AutoMax - Servidor web (Node.js + Express + PostgreSQL)
   Backend:  backend/  (config, controladores, modelos, rutas, middleware)
   Frontend: frontend/ (html, css, js, img)
   ========================================================== */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const express = require('express');
const cors = require('cors');
const { pool, probarConexion } = require('./config/db');
const { sesion } = require('./config/sesion');
const { rutaNoEncontrada, manejarErrores } = require('./middleware/errores');
const rutasVehiculos = require('./rutas/vehiculos');
const rutasUsuarios = require('./rutas/usuarios');

const app = express();
const PUERTO = Number(process.env.PORT) || 3000;
const CARPETA_FRONTEND = path.join(__dirname, '..', 'frontend');

// ---------- Middlewares ----------
// CORS: acepta peticiones del propio portal y envía la cookie de sesión
app.use(cors({ origin: process.env.CORS_ORIGEN || 'http://localhost:' + PUERTO, credentials: true }));
app.use(express.json());                                   // Lee el JSON enviado por los formularios
app.use(sesion);                                           // Sesión del usuario en el servidor
// Sirve login.html como página de inicio; las demás páginas son el portal
app.use(express.static(CARPETA_FRONTEND, { index: 'login.html' }));

// ---------- Rutas de la API ----------
app.use('/api/usuarios', rutasUsuarios);
app.use('/api/vehiculos', rutasVehiculos);
app.use('/api', rutaNoEncontrada);

// ---------- Manejo de errores ----------
app.use(manejarErrores);

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
