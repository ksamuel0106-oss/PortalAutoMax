/* ==========================================================
   Middleware: control de acceso por rol
   Roles: "admin" (todo), "usuario" (solo consulta) e
   "invitado" (solo consulta, sin cuenta).
   ========================================================== */

// Exige que haya una sesión abierta (cualquier rol).
function requiereSesion(req, res, next) {
    if (req.session && req.session.usuario) return next();
    res.status(401).json({ mensaje: 'Inicie sesión para continuar.' });
}

// Exige que la sesión sea de un administrador.
function requiereAdmin(req, res, next) {
    if (!req.session || !req.session.usuario) {
        return res.status(401).json({ mensaje: 'Inicie sesión como administrador para continuar.' });
    }
    if (req.session.usuario.rol !== 'admin') {
        return res.status(403).json({ mensaje: 'Solo un administrador puede registrar, editar o eliminar vehículos.' });
    }
    next();
}

module.exports = { requiereSesion, requiereAdmin };
