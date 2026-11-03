/* ==========================================================
   Configuración: sesiones en el servidor (express-session)
   Al iniciar sesión el servidor guarda quién es el usuario y su
   rol; el navegador solo recibe una cookie con un identificador.
   ========================================================== */

const session = require('express-session');

const OCHO_HORAS = 8 * 60 * 60 * 1000;

if (!process.env.SESSION_SECRET) {
    console.warn('Aviso: falta SESSION_SECRET en el archivo .env. Se usa una clave de prueba.');
}

const sesion = session({
    name: 'automax.sid',
    secret: process.env.SESSION_SECRET || 'clave-de-prueba-automax',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,       // No se puede leer desde JavaScript
        sameSite: 'lax',      // No se envía en peticiones de otros sitios
        maxAge: OCHO_HORAS
    }
});

module.exports = { sesion };
