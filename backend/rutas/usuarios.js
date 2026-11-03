/* ==========================================================
   Rutas: /api/usuarios
   POST /api/usuarios/registro  -> Registrar un usuario nuevo (INSERT)
   POST /api/usuarios/login     -> Verificar correo y contraseña (SELECT) y abrir sesión
   POST /api/usuarios/invitado  -> Abrir sesión como invitado
   GET  /api/usuarios/sesion    -> Usuario y rol de la sesión actual
   POST /api/usuarios/logout    -> Cerrar la sesión
   ========================================================== */

const express = require('express');
const controlador = require('../controladores/usuariosControlador');

const router = express.Router();

router.post('/registro', controlador.registro);
router.post('/login', controlador.login);
router.post('/invitado', controlador.invitado);
router.get('/sesion', controlador.sesionActual);
router.post('/logout', controlador.logout);

module.exports = router;
