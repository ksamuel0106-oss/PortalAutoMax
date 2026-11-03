/* ==========================================================
   Modelo: usuarios
   Validación del registro, cifrado de contraseñas y consultas
   SQL de la tabla "usuarios".

   Las contraseñas NO se guardan en texto plano: se cifran con
   scrypt (módulo "crypto" incluido en Node.js) y una sal
   aleatoria. En la base queda "scrypt$<sal>$<hash>".
   ========================================================== */

const crypto = require('crypto');
const { pool } = require('../config/db');

// ---------- Reglas ----------
const CORREO_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PASSWORD_MIN = 10;
const PASSWORD_MAX = 64;
// Letras (incluida la ñ), números y estos símbolos: ! @ # $ % & * . _ - + ?
const PASSWORD_CARACTERES = /^[A-Za-zÑñ0-9!@#$%&*._\-+?]+$/;
const PASSWORD_NUMERO = /[0-9]/;

function texto(valor) {
    return valor === undefined || valor === null ? '' : String(valor).trim();
}

// Revisa los datos del formulario de registro. Devuelve { datos, errores }.
function validarRegistro(cuerpo) {
    const datos = {
        nombre: texto(cuerpo && cuerpo.nombre),
        correo: texto(cuerpo && cuerpo.correo).toLowerCase(),
        password: cuerpo && typeof cuerpo.password === 'string' ? cuerpo.password : ''
    };
    const errores = {};

    if (!datos.nombre) errores.nombre = 'Escriba su nombre.';
    else if (datos.nombre.length > 80) errores.nombre = 'Máximo 80 caracteres.';

    if (!datos.correo) errores.correo = 'Escriba su correo.';
    else if (!CORREO_VALIDO.test(datos.correo) || datos.correo.length > 120) errores.correo = 'Escriba un correo válido.';

    const p = datos.password;
    if (p.length < PASSWORD_MIN) errores.password = 'La contraseña debe tener al menos ' + PASSWORD_MIN + ' caracteres.';
    else if (p.length > PASSWORD_MAX) errores.password = 'Máximo ' + PASSWORD_MAX + ' caracteres.';
    else if (!PASSWORD_NUMERO.test(p)) errores.password = 'La contraseña debe incluir al menos un número.';
    else if (!PASSWORD_CARACTERES.test(p)) errores.password = 'Use solo letras, números y estos símbolos: ! @ # $ % & * . _ - + ?';

    return { datos, errores };
}

// ---------- Cifrado de contraseñas ----------

// Devuelve "scrypt$<sal>$<hash>" para guardar en la columna password.
function cifrarPassword(password) {
    const sal = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(password, sal, 64).toString('hex');
    return 'scrypt$' + sal + '$' + hash;
}

// Compara la contraseña escrita con la guardada en la base de datos.
function verificarPassword(password, guardada) {
    const partes = String(guardada).split('$');
    if (partes.length !== 3 || partes[0] !== 'scrypt') return false;
    const esperado = Buffer.from(partes[2], 'hex');
    const calculado = crypto.scryptSync(password, partes[1], esperado.length);
    return crypto.timingSafeEqual(esperado, calculado);
}

// Datos del usuario que se pueden enviar al navegador (nunca la contraseña)
function usuarioPublico(fila) {
    return { id: fila.id, nombre: fila.nombre, correo: fila.correo, rol: fila.rol, fecha_registro: fila.fecha_registro };
}

// ---------- Consultas ----------

async function existeCorreo(correo) {
    const resultado = await pool.query('SELECT 1 FROM usuarios WHERE correo = $1', [correo]);
    return resultado.rowCount > 0;
}

async function buscarPorCorreo(correo) {
    const resultado = await pool.query(
        'SELECT id, nombre, correo, password, rol, fecha_registro FROM usuarios WHERE correo = $1',
        [correo]
    );
    return resultado.rows[0] || null;
}

// Los usuarios que se registran desde el portal siempre tienen el rol "usuario".
async function crear(nombre, correo, password) {
    const resultado = await pool.query(
        `INSERT INTO usuarios (nombre, correo, password, rol)
         VALUES ($1, $2, $3, 'usuario')
         RETURNING id, nombre, correo, rol, fecha_registro`,
        [nombre, correo, cifrarPassword(password)]
    );
    return resultado.rows[0];
}

module.exports = { validarRegistro, verificarPassword, usuarioPublico, existeCorreo, buscarPorCorreo, crear };
