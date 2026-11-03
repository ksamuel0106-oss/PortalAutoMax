/* ==========================================================
   AutoMax - Lógica de la pantalla de inicio de sesión
   Registro, login (contra PostgreSQL vía /api/usuarios)
   y acceso como invitado. La sesión se abre en el servidor;
   el navegador guarda solo una copia del nombre y el rol.
   ========================================================== */

'use strict';

const API_USUARIOS = '/api/usuarios';
const CLAVE_SESION = 'automaxSesion';
const CORREO_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Reglas de la contraseña (las mismas que revisa el servidor)
const PASSWORD_MIN = 10;
const PASSWORD_MAX = 64;
const PASSWORD_CARACTERES = /^[A-Za-zÑñ0-9!@#$%&*._\-+?]+$/;
const PASSWORD_NUMERO = /[0-9]/;

const tabLogin     = document.getElementById('tabLogin');
const tabRegistro  = document.getElementById('tabRegistro');
const formLogin    = document.getElementById('formLogin');
const formRegistro = document.getElementById('formRegistro');
const mensaje      = document.getElementById('mensaje');
const btnInvitado  = document.getElementById('btnInvitado');

// Si el servidor ya tiene una sesión abierta, entra directo al portal
fetch(API_USUARIOS + '/sesion', { credentials: 'same-origin', cache: 'no-store' })
    .then(function (respuesta) { if (respuesta.ok) window.location.replace('index.html'); })
    .catch(function () { /* sin servidor: el formulario mostrará el error al enviar */ });

/* ---------- Copia local del nombre y el rol (la sesión real está en el servidor) ---------- */
function guardarSesion(usuario) {
    try {
        sessionStorage.setItem(CLAVE_SESION, JSON.stringify({ nombre: usuario.nombre, rol: usuario.rol }));
    } catch (error) {
        // Navegador sin almacenamiento: el portal consulta el rol al servidor de todos modos
    }
}

function irAlPortal(usuario, retraso) {
    guardarSesion(usuario);
    setTimeout(function () { window.location.href = 'index.html'; }, retraso || 0);
}

/* ---------- Reglas de la contraseña en verde ---------- */
const reglas = {
    largo: function (p) { return p.length >= PASSWORD_MIN && p.length <= PASSWORD_MAX; },
    numero: function (p) { return PASSWORD_NUMERO.test(p); },
    caracteres: function (p) { return p.length > 0 && PASSWORD_CARACTERES.test(p); }
};

function revisarReglas() {
    const password = document.getElementById('regPassword').value;
    const confirmar = document.getElementById('regConfirmar').value;
    Object.keys(reglas).forEach(function (nombre) {
        const item = document.querySelector('[data-regla="' + nombre + '"]');
        item.classList.toggle('cumple', reglas[nombre](password));
        // Un símbolo no permitido se marca en rojo apenas se escribe
        if (nombre === 'caracteres') item.classList.toggle('falla', password.length > 0 && !PASSWORD_CARACTERES.test(password));
    });
    document.querySelector('[data-regla="coincide"]').classList.toggle('cumple', confirmar.length > 0 && confirmar === password);
}

function errorPassword(password) {
    if (password.length < PASSWORD_MIN) return 'La contraseña debe tener al menos ' + PASSWORD_MIN + ' caracteres.';
    if (password.length > PASSWORD_MAX) return 'Máximo ' + PASSWORD_MAX + ' caracteres.';
    if (!PASSWORD_NUMERO.test(password)) return 'La contraseña debe incluir al menos un número.';
    if (!PASSWORD_CARACTERES.test(password)) return 'Use solo letras, números y estos símbolos: ! @ # $ % & * . _ - + ?';
    return '';
}

document.getElementById('regPassword').addEventListener('input', revisarReglas);
document.getElementById('regConfirmar').addEventListener('input', revisarReglas);

/* ---------- Mensajes ---------- */
function mostrarMensaje(texto, tipo) {
    mensaje.textContent = texto;
    mensaje.className = 'mensaje mensaje--' + tipo;
}

function ocultarMensaje() {
    mensaje.className = 'mensaje oculto';
    mensaje.textContent = '';
}

function marcarError(id, texto) {
    const campo = document.getElementById(id);
    campo.classList.add('invalido');
    campo.setAttribute('aria-invalid', 'true');
    document.getElementById('error-' + id).textContent = texto;
}

function limpiarErrores(formulario) {
    formulario.querySelectorAll('input').forEach(function (campo) {
        campo.classList.remove('invalido');
        campo.removeAttribute('aria-invalid');
        const error = document.getElementById('error-' + campo.id);
        if (error) error.textContent = '';
    });
}

/* ---------- Petición al servidor ---------- */
async function enviar(ruta, datos) {
    let respuesta;
    try {
        respuesta = await fetch(API_USUARIOS + ruta, {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datos || {})
        });
    } catch (error) {
        throw { mensaje: 'No se pudo conectar con el servidor. ¿Está ejecutándose "npm start"?' };
    }
    let cuerpo = {};
    try { cuerpo = await respuesta.json(); } catch (error) { /* sin JSON */ }
    if (!respuesta.ok) {
        throw { mensaje: cuerpo.mensaje || 'Error del servidor (' + respuesta.status + ').', errores: cuerpo.errores || {} };
    }
    return cuerpo;
}

/* ---------- Pestañas ---------- */
function cambiarPestana(registro) {
    tabLogin.classList.toggle('activa', !registro);
    tabRegistro.classList.toggle('activa', registro);
    tabLogin.setAttribute('aria-selected', String(!registro));
    tabRegistro.setAttribute('aria-selected', String(registro));
    formLogin.classList.toggle('oculto', registro);
    formRegistro.classList.toggle('oculto', !registro);
    ocultarMensaje();
    limpiarErrores(formLogin);
    limpiarErrores(formRegistro);
    (registro ? document.getElementById('regNombre') : document.getElementById('loginCorreo')).focus();
}

tabLogin.addEventListener('click', function () { cambiarPestana(false); });
tabRegistro.addEventListener('click', function () { cambiarPestana(true); });

/* ---------- Inicio de sesión ---------- */
formLogin.addEventListener('submit', async function (evento) {
    evento.preventDefault();
    ocultarMensaje();
    limpiarErrores(formLogin);

    const correo = document.getElementById('loginCorreo').value.trim();
    const password = document.getElementById('loginPassword').value;
    let valido = true;

    if (!correo) { marcarError('loginCorreo', 'Escriba su correo.'); valido = false; }
    else if (!CORREO_VALIDO.test(correo)) { marcarError('loginCorreo', 'Escriba un correo válido.'); valido = false; }
    if (!password) { marcarError('loginPassword', 'Escriba su contraseña.'); valido = false; }
    if (!valido) return;

    const boton = document.getElementById('btnLogin');
    boton.disabled = true;
    boton.textContent = 'Verificando...';
    try {
        const respuesta = await enviar('/login', { correo, password });
        mostrarMensaje(respuesta.mensaje, 'exito');                       // Acceso correcto
        irAlPortal(respuesta.usuario, 900);
    } catch (error) {
        mostrarMensaje(error.mensaje, 'error');                           // Acceso incorrecto
        document.getElementById('loginPassword').value = '';
        boton.disabled = false;
        boton.textContent = 'Iniciar sesión';
    }
});

/* ---------- Registro ---------- */
formRegistro.addEventListener('submit', async function (evento) {
    evento.preventDefault();
    ocultarMensaje();
    limpiarErrores(formRegistro);

    const nombre = document.getElementById('regNombre').value.trim();
    const correo = document.getElementById('regCorreo').value.trim();
    const password = document.getElementById('regPassword').value;
    const confirmar = document.getElementById('regConfirmar').value;
    let valido = true;

    if (!nombre) { marcarError('regNombre', 'Escriba su nombre.'); valido = false; }
    if (!correo) { marcarError('regCorreo', 'Escriba su correo.'); valido = false; }
    else if (!CORREO_VALIDO.test(correo)) { marcarError('regCorreo', 'Escriba un correo válido.'); valido = false; }
    const fallaPassword = errorPassword(password);
    if (fallaPassword) { marcarError('regPassword', fallaPassword); valido = false; }
    if (confirmar !== password || !confirmar) { marcarError('regConfirmar', 'Las contraseñas no coinciden.'); valido = false; }
    if (!valido) return;

    const boton = document.getElementById('btnRegistro');
    boton.disabled = true;
    boton.textContent = 'Registrando...';
    try {
        const respuesta = await enviar('/registro', { nombre, correo, password });
        formRegistro.reset();
        revisarReglas();
        cambiarPestana(false);
        document.getElementById('loginCorreo').value = respuesta.usuario.correo;
        document.getElementById('loginPassword').focus();
        mostrarMensaje(respuesta.mensaje + ' Ahora puede iniciar sesión.', 'exito');
    } catch (error) {
        const mapa = { nombre: 'regNombre', correo: 'regCorreo', password: 'regPassword' };
        Object.keys(error.errores || {}).forEach(function (campo) {
            if (mapa[campo]) marcarError(mapa[campo], error.errores[campo]);
        });
        mostrarMensaje(error.mensaje, 'error');
    } finally {
        boton.disabled = false;
        boton.textContent = 'Registrarme';
    }
});

/* ---------- Invitado ---------- */
btnInvitado.addEventListener('click', async function () {
    ocultarMensaje();
    btnInvitado.disabled = true;
    try {
        const respuesta = await enviar('/invitado');
        irAlPortal(respuesta.usuario);
    } catch (error) {
        mostrarMensaje(error.mensaje, 'error');
        btnInvitado.disabled = false;
    }
});

/* ---------- Mostrar / ocultar contraseña ---------- */
document.querySelectorAll('.ver-clave').forEach(function (boton) {
    boton.addEventListener('click', function () {
        const campo = document.getElementById(boton.dataset.objetivo);
        const visible = campo.type === 'text';
        campo.type = visible ? 'password' : 'text';
        boton.textContent = visible ? 'Ver' : 'Ocultar';
    });
});

// Al escribir en un campo se borra su error
document.querySelectorAll('.form-acceso input').forEach(function (campo) {
    campo.addEventListener('input', function () {
        if (!campo.classList.contains('invalido')) return;
        campo.classList.remove('invalido');
        campo.removeAttribute('aria-invalid');
        document.getElementById('error-' + campo.id).textContent = '';
    });
});
