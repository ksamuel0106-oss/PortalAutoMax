/* ==========================================================
   AutoMax - Funciones comunes a todas las páginas
   Se carga antes del script propio de cada página.
   ========================================================== */

'use strict';

// ---------- Constantes ----------
const API = '/api/vehiculos';                        // Dirección de la API en el servidor
const WHATSAPP = 'https://wa.me/18493431887';        // Chat directo de WhatsApp
const COMBUSTIBLES = ['Gasolina', 'Diésel', 'Híbrido', 'Eléctrico', 'GLP'];

// Formato de moneda dominicana
const formatoMoneda = new Intl.NumberFormat('es-DO', {
    style: 'currency',
    currency: 'DOP',
    minimumFractionDigits: 2
});

/* ==========================================================
   COMUNICACIÓN CON EL SERVIDOR (API + POSTGRESQL)
   ========================================================== */

// Envía una petición a la API y devuelve la respuesta en JSON.
// Si el servidor responde con error, lanza una excepción con su mensaje.
async function peticion(url, opciones) {
    let respuesta;
    try {
        respuesta = await fetch(url, Object.assign({
            headers: { 'Content-Type': 'application/json' }
        }, opciones));
    } catch (error) {
        throw { mensaje: 'No se pudo conectar con el servidor. ¿Está ejecutándose "npm start"?' };
    }

    let datos = {};
    try {
        datos = await respuesta.json();
    } catch (error) {
        // Respuesta sin JSON
    }

    if (!respuesta.ok) {
        throw {
            estado: respuesta.status,
            mensaje: datos.mensaje || 'Error del servidor (' + respuesta.status + ').',
            errores: datos.errores || {}
        };
    }
    return datos;
}

// Indicador de conexión con la base de datos (si la página lo tiene).
function marcarConexion(conectado) {
    const estado = document.getElementById('estadoConexion');
    if (!estado) return;
    estado.textContent = conectado ? 'Conectado a PostgreSQL' : 'Sin conexión con la base de datos';
    estado.className = 'estado-conexion ' + (conectado ? 'estado-conexion--ok' : 'estado-conexion--error');
}

/* ==========================================================
   MENSAJES EMERGENTES
   ========================================================== */

let temporizadorAviso = null;

function mostrarAviso(mensaje, tipo) {
    const aviso = document.getElementById('aviso');
    if (!aviso) return;
    aviso.textContent = mensaje;
    aviso.className = 'aviso visible aviso--' + tipo;
    clearTimeout(temporizadorAviso);
    temporizadorAviso = setTimeout(function () {
        aviso.classList.remove('visible');
    }, 3500);
}

/* ==========================================================
   FOTO DE CADA VEHÍCULO
   La foto se guarda en public/img/vehiculos/ con el código como
   nombre (VH-001.jpg). Se prueba .jpg, luego .png y .webp; si no
   existe ninguna, se muestra la foto genérica.
   ========================================================== */

const EXTENSIONES_FOTO = ['jpg', 'png', 'webp'];

function asignarFoto(img, codigo) {
    let intento = 0;
    img.onerror = function () {
        intento++;
        if (intento < EXTENSIONES_FOTO.length) {
            img.src = 'img/vehiculos/' + encodeURIComponent(codigo) + '.' + EXTENSIONES_FOTO[intento];
        } else {
            img.onerror = null;
            img.src = 'img/vehiculos/sin-foto.jpg';
        }
    };
    img.src = 'img/vehiculos/' + encodeURIComponent(codigo) + '.' + EXTENSIONES_FOTO[0];
}

/* ==========================================================
   TARJETA DE VEHÍCULO (Inicio e Inventario)
   Todo el texto se asigna con textContent para no inyectar HTML.
   ========================================================== */

function crearElemento(etiqueta, clase, texto) {
    const elemento = document.createElement(etiqueta);
    if (clase) elemento.className = clase;
    if (texto !== undefined) elemento.textContent = texto;
    return elemento;
}

function crearDato(titulo, valor) {
    const grupo = document.createElement('div');
    grupo.appendChild(crearElemento('dt', '', titulo));
    const dd = document.createElement('dd');
    if (valor instanceof Node) dd.appendChild(valor); else dd.textContent = valor;
    grupo.appendChild(dd);
    return grupo;
}

// conAcciones = true agrega los botones Editar y Eliminar (Inventario).
function crearTarjetaVehiculo(v, conAcciones) {
    const tarjeta = crearElemento('article', 'vehiculo');
    tarjeta.dataset.codigo = v.codigo;

    // Foto con etiquetas de combustible y agotado
    const foto = crearElemento('div', 'vehiculo__foto');
    const img = document.createElement('img');
    img.alt = v.marca + ' ' + v.modelo + ' ' + v.anio;
    img.loading = 'lazy';
    asignarFoto(img, v.codigo);
    foto.appendChild(img);
    foto.appendChild(crearElemento('span', 'chip chip--combustible', v.combustible));
    if (v.cantidad === 0) foto.appendChild(crearElemento('span', 'chip chip--agotado', 'Agotado'));
    tarjeta.appendChild(foto);

    // Cuerpo
    const cuerpo = crearElemento('div', 'vehiculo__cuerpo');
    cuerpo.appendChild(crearElemento('p', 'vehiculo__codigo', v.codigo + ' · ' + v.anio));
    cuerpo.appendChild(crearElemento('h3', 'vehiculo__nombre', v.marca + ' ' + v.modelo));
    const descripcion = crearElemento('p', 'vehiculo__descripcion', v.descripcion);
    descripcion.title = v.descripcion;
    cuerpo.appendChild(descripcion);

    const datos = crearElemento('dl', 'vehiculo__datos');
    datos.appendChild(crearDato('Color', v.color));
    const stock = crearElemento('span', 'etiqueta-stock' + (v.cantidad === 0 ? ' etiqueta-stock--agotado' : ''), v.cantidad);
    datos.appendChild(crearDato('Disponibles', stock));
    cuerpo.appendChild(datos);

    cuerpo.appendChild(crearElemento('p', 'vehiculo__precio', formatoMoneda.format(v.precio)));

    if (conAcciones) {
        const acciones = crearElemento('div', 'vehiculo__acciones');
        const editar = crearElemento('a', 'boton boton--secundario boton--chico', 'Editar');
        editar.href = 'registrar.html?editar=' + encodeURIComponent(v.codigo);
        const eliminar = crearElemento('button', 'boton boton--peligro boton--chico', 'Eliminar');
        eliminar.type = 'button';
        eliminar.dataset.accion = 'eliminar';
        eliminar.dataset.codigo = v.codigo;
        acciones.appendChild(editar);
        acciones.appendChild(eliminar);
        cuerpo.appendChild(acciones);
    }

    tarjeta.appendChild(cuerpo);
    return tarjeta;
}

/* ==========================================================
   MENÚ, ENCABEZADO Y PIE (todas las páginas)
   ========================================================== */

function iniciarMenu() {
    const boton = document.getElementById('menuBoton');
    const menu = document.getElementById('menu');
    const cerrar = document.getElementById('menuCerrar');
    if (!boton || !menu) return;

    let fondo = null;

    function abrir() {
        menu.classList.add('abierto');
        boton.setAttribute('aria-expanded', 'true');
        fondo = crearElemento('div', 'menu-fondo');
        fondo.addEventListener('click', cerrarMenu);
        document.body.appendChild(fondo);
        menu.querySelector('a').focus();
    }

    function cerrarMenu() {
        menu.classList.remove('abierto');
        boton.setAttribute('aria-expanded', 'false');
        if (fondo) { fondo.remove(); fondo = null; }
    }

    boton.addEventListener('click', abrir);
    if (cerrar) cerrar.addEventListener('click', function () { cerrarMenu(); boton.focus(); });
    menu.addEventListener('click', function (evento) {
        if (evento.target.closest('a')) cerrarMenu();
    });
    document.addEventListener('keydown', function (evento) {
        if (evento.key === 'Escape' && menu.classList.contains('abierto')) { cerrarMenu(); boton.focus(); }
    });
}

// En Inicio el encabezado es transparente sobre la portada y se vuelve sólido al bajar.
function iniciarEncabezado() {
    const encabezado = document.getElementById('encabezado');
    if (!encabezado || !encabezado.classList.contains('encabezado--sobre')) return;
    function revisar() {
        encabezado.classList.toggle('encabezado--solido', window.scrollY > 40);
    }
    window.addEventListener('scroll', revisar, { passive: true });
    revisar();
}

iniciarMenu();
iniciarEncabezado();
const anioActual = document.getElementById('anioActual');
if (anioActual) anioActual.textContent = new Date().getFullYear();
