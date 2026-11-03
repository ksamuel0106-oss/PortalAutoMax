/* ==========================================================
   AutoMax - Sesión y rol en todas las páginas del portal
   Se carga en el <head>. Pregunta al servidor quién inició
   sesión (GET /api/usuarios/sesion):
   - Sin sesión: vuelve al login.
   - Con sesión: escribe la bienvenida y aplica el rol en
     <html data-rol="admin | usuario | invitado">. El CSS usa ese
     atributo para mostrar u ocultar opciones (.solo-admin,
     .solo-no-admin).
   El permiso real lo revisa el servidor en cada operación; esto
   solo ajusta lo que se ve.
   ========================================================== */

'use strict';

(function () {
    const CLAVE = 'automaxSesion';
    const ROTULOS = { admin: 'Administrador', usuario: 'Usuario', invitado: 'Invitado' };
    const raiz = document.documentElement;
    const meta = document.querySelector('meta[name="requiere-rol"]');
    const requiere = meta ? meta.content : null;

    function leerCopia() {
        try { return JSON.parse(sessionStorage.getItem(CLAVE)); } catch (error) { return null; }
    }
    function guardarCopia(usuario) {
        try { sessionStorage.setItem(CLAVE, JSON.stringify({ nombre: usuario.nombre, rol: usuario.rol })); } catch (error) { /* sin almacenamiento */ }
    }
    function borrarCopia() {
        try { sessionStorage.removeItem(CLAVE); } catch (error) { /* sin almacenamiento */ }
    }

    function sinPermiso() {
        window.location.replace('inventario.html?sinPermiso=1');
    }

    // Copia local: evita que el menú cambie de golpe mientras responde el servidor
    const copia = leerCopia();
    if (copia && copia.rol) {
        raiz.dataset.rol = copia.rol;
        if (requiere === 'admin' && copia.rol !== 'admin') sinPermiso();
    }

    function cuandoCargue(funcion) {
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', funcion);
        else funcion();
    }

    // Escribe "Bienvenido, nombre" y el rol en la barra superior.
    function pintarBarra(usuario) {
        cuandoCargue(function () {
            const nombre = document.getElementById('saludoNombre');
            const chip = document.getElementById('chipRol');
            const salir = document.getElementById('btnSalir');
            if (nombre) nombre.textContent = usuario.nombre;
            if (chip) chip.textContent = ROTULOS[usuario.rol] || '';
            if (salir) {
                // Texto largo en computadora y corto en el celular
                const invitado = usuario.rol === 'invitado';
                salir.textContent = '';
                const largo = document.createElement('span');
                largo.className = 'salir-largo';
                largo.textContent = invitado ? 'Iniciar sesión' : 'Cerrar sesión';
                const corto = document.createElement('span');
                corto.className = 'salir-corto';
                corto.textContent = invitado ? 'Entrar' : 'Salir';
                salir.append(largo, corto);
                salir.title = usuario.rol === 'invitado'
                    ? 'Ir a la pantalla de inicio de sesión'
                    : 'Cerrar la sesión de ' + usuario.nombre;
            }
        });
    }

    // Cierra la sesión en el servidor y vuelve al login.
    function cerrarSesion() {
        fetch('/api/usuarios/logout', { method: 'POST', credentials: 'same-origin' })
            .catch(function () { /* aunque falle, se vuelve al login */ })
            .then(function () {
                borrarCopia();
                window.location.href = 'login.html';
            });
    }

    cuandoCargue(function () {
        const salir = document.getElementById('btnSalir');
        if (salir) salir.addEventListener('click', cerrarSesion);
    });

    // Promesa que usan las páginas que dependen del rol (por ejemplo, el inventario).
    // Si no hay sesión, redirige y la promesa nunca se cumple.
    window.sesionLista = fetch('/api/usuarios/sesion', { credentials: 'same-origin', cache: 'no-store' })
        .then(function (respuesta) {
            if (!respuesta.ok) throw new Error('sin sesión');
            return respuesta.json();
        })
        .then(function (datos) {
            const usuario = datos.usuario;
            raiz.dataset.rol = usuario.rol;
            guardarCopia(usuario);
            if (requiere === 'admin' && usuario.rol !== 'admin') {
                sinPermiso();
                return new Promise(function () {});
            }
            pintarBarra(usuario);
            return usuario;
        })
        .catch(function () {
            borrarCopia();
            window.location.replace('login.html');
            return new Promise(function () {});
        });
})();
