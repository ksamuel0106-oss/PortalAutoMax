/* ==========================================================
   Controlador: usuarios (registro, login, invitado y sesión)
   La sesión se guarda en el servidor (express-session):
   req.session.usuario = { id, nombre, correo, rol }
   ========================================================== */

const Usuario = require('../modelos/usuarioModelo');

// Guarda el usuario en una sesión nueva (evita reutilizar un identificador anterior).
function abrirSesion(req, usuario) {
    return new Promise(function (resolver, rechazar) {
        req.session.regenerate(function (error) {
            if (error) return rechazar(error);
            req.session.usuario = usuario;
            req.session.save(function (errorGuardar) {
                if (errorGuardar) rechazar(errorGuardar); else resolver();
            });
        });
    });
}

// ---------- REGISTRO ----------
async function registro(req, res, next) {
    const { datos, errores } = Usuario.validarRegistro(req.body);
    if (Object.keys(errores).length > 0) {
        return res.status(400).json({ mensaje: 'Datos inválidos.', errores });
    }

    try {
        // Validación de correo duplicado antes de insertar
        if (await Usuario.existeCorreo(datos.correo)) {
            return res.status(409).json({
                mensaje: 'Ese correo ya está registrado.',
                errores: { correo: 'Ya existe una cuenta con este correo.' }
            });
        }
        const usuario = await Usuario.crear(datos.nombre, datos.correo, datos.password);
        res.status(201).json({ mensaje: 'Usuario registrado correctamente.', usuario: Usuario.usuarioPublico(usuario) });
    } catch (error) {
        // 23505 = UNIQUE (por si dos registros llegan al mismo tiempo)
        if (error.code === '23505') {
            return res.status(409).json({
                mensaje: 'Ese correo ya está registrado.',
                errores: { correo: 'Ya existe una cuenta con este correo.' }
            });
        }
        next(error);
    }
}

// ---------- INICIO DE SESIÓN ----------
async function login(req, res, next) {
    const correo = String((req.body && req.body.correo) || '').trim().toLowerCase();
    const password = req.body && typeof req.body.password === 'string' ? req.body.password : '';

    if (!correo || !password) {
        return res.status(400).json({ mensaje: 'Escriba su correo y contraseña.' });
    }

    try {
        const fila = await Usuario.buscarPorCorreo(correo);

        // Mismo mensaje si el correo no existe o la contraseña no coincide
        if (!fila || !Usuario.verificarPassword(password, fila.password)) {
            return res.status(401).json({ mensaje: 'Acceso incorrecto: correo o contraseña no válidos.' });
        }

        const usuario = Usuario.usuarioPublico(fila);
        await abrirSesion(req, { id: usuario.id, nombre: usuario.nombre, correo: usuario.correo, rol: usuario.rol });
        res.json({ mensaje: 'Acceso correcto. ¡Bienvenido, ' + usuario.nombre + '!', usuario });
    } catch (error) {
        next(error);
    }
}

// ---------- INVITADO ----------
async function invitado(req, res, next) {
    try {
        const usuario = { id: null, nombre: 'Invitado', correo: null, rol: 'invitado' };
        await abrirSesion(req, usuario);
        res.json({ mensaje: 'Acceso como invitado.', usuario });
    } catch (error) {
        next(error);
    }
}

// ---------- SESIÓN ACTUAL ----------
function sesionActual(req, res) {
    if (!req.session || !req.session.usuario) {
        return res.status(401).json({ mensaje: 'No hay una sesión abierta.' });
    }
    res.json({ usuario: req.session.usuario });
}

// ---------- CERRAR SESIÓN ----------
function logout(req, res, next) {
    if (!req.session) return res.json({ mensaje: 'Sesión cerrada.' });
    req.session.destroy(function (error) {
        if (error) return next(error);
        res.clearCookie('automax.sid');
        res.json({ mensaje: 'Sesión cerrada.' });
    });
}

module.exports = { registro, login, invitado, sesionActual, logout };
