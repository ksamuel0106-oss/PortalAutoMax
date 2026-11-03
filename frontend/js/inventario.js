/* ==========================================================
   AutoMax - Página de vehículos (inventario)
   - Administrador: pestañas Todos, Nuevos y Usados, con Editar y
     Eliminar (DELETE) en cada tarjeta.
   - Usuario e invitado: solo Vehículos nuevos y Vehículos usados,
     para consultar.
   La condición viene en la dirección: inventario.html?condicion=Usado
   ========================================================== */

'use strict';

// ---------- Referencias al DOM ----------
const grilla        = document.getElementById('grillaVehiculos');
const buscador      = document.getElementById('buscar');
const filtros       = document.getElementById('filtros');
const contador      = document.getElementById('contador');
const pestanas      = document.getElementById('pestanasCondicion');
const banner        = document.getElementById('banner');
const bannerTitulo  = document.getElementById('bannerTitulo');
const bannerTexto   = document.getElementById('bannerTexto');

// ---------- Textos de cada vista ----------
const VISTAS = {
    Todos: {
        pestana: 'Todos', titulo: 'Inventario', clase: 'banner--inventario',
        texto: 'Todos los vehículos del inventario, nuevos y usados. Desde aquí puedes editarlos o eliminarlos.',
        nombre: 'vehículos'
    },
    Nuevo: {
        pestana: 'Nuevos', titulo: 'Vehículos nuevos', clase: 'banner--nuevos',
        texto: 'Vehículos 0 km de las principales marcas, con garantía de fábrica.',
        nombre: 'vehículos nuevos'
    },
    Usado: {
        pestana: 'Usados', titulo: 'Vehículos usados', clase: 'banner--usados',
        texto: 'Usados revisados por nuestro taller, con el kilometraje y el estado a la vista.',
        nombre: 'vehículos usados'
    }
};

// ---------- Estado de la página ----------
let vehiculos = [];             // Copia en memoria de los vehículos consultados a la base de datos
let cargando = true;            // true mientras se consulta la base de datos
let errorCarga = '';            // Mensaje si la consulta falló
let filtroCombustible = '';     // '' = todos
let condicion = 'Nuevo';        // Todos (solo admin), Nuevo o Usado
let esAdmin = false;

const parametros = new URLSearchParams(window.location.search);
if (COMBUSTIBLES.includes(parametros.get('combustible'))) {
    filtroCombustible = parametros.get('combustible');
}

// Guarda en la dirección la condición y el combustible, para poder compartir el enlace.
function actualizarDireccion() {
    const url = new URL(window.location.href);
    url.searchParams.set('condicion', condicion);
    if (filtroCombustible) url.searchParams.set('combustible', filtroCombustible);
    else url.searchParams.delete('combustible');
    ['actualizado', 'sinPermiso'].forEach(function (p) { url.searchParams.delete(p); });
    history.replaceState(null, '', url);
}

/* ==========================================================
   CONSULTA (SELECT)
   ========================================================== */

async function cargarVehiculos() {
    cargando = true;
    mostrarVehiculos();
    try {
        vehiculos = await peticion(API);
        errorCarga = '';
        marcarConexion(true);
    } catch (error) {
        vehiculos = [];
        errorCarga = error.mensaje;
        marcarConexion(false);
        mostrarAviso(error.mensaje, 'error');
    }
    cargando = false;
    mostrarVehiculos();
}

/* ==========================================================
   PESTAÑAS (CONDICIÓN), BANNER Y FILTROS
   ========================================================== */

function aplicarVista() {
    const vista = VISTAS[condicion];
    bannerTitulo.textContent = vista.titulo;
    bannerTexto.textContent = vista.texto;
    banner.classList.remove('banner--inventario', 'banner--nuevos', 'banner--usados');
    banner.classList.add(vista.clase);
    document.title = vista.titulo + ' | AutoMax';
    marcarCondicionActual(condicion);

    pestanas.querySelectorAll('button').forEach(function (boton) {
        const activa = boton.dataset.condicion === condicion;
        boton.classList.toggle('activa', activa);
        boton.setAttribute('aria-selected', String(activa));
    });
}

function dibujarPestanas() {
    pestanas.innerHTML = '';
    const lista = esAdmin ? ['Todos', 'Nuevo', 'Usado'] : ['Nuevo', 'Usado'];
    lista.forEach(function (c) {
        const boton = document.createElement('button');
        boton.type = 'button';
        boton.setAttribute('role', 'tab');
        boton.className = 'pestana-condicion';
        boton.dataset.condicion = c;
        boton.textContent = VISTAS[c].pestana;
        pestanas.appendChild(boton);
    });
}

pestanas.addEventListener('click', function (evento) {
    const boton = evento.target.closest('button[data-condicion]');
    if (!boton) return;
    condicion = boton.dataset.condicion;
    actualizarDireccion();
    aplicarVista();
    mostrarVehiculos();
});

function dibujarFiltros() {
    filtros.innerHTML = '';
    ['', ...COMBUSTIBLES].forEach(function (combustible) {
        const boton = document.createElement('button');
        boton.type = 'button';
        boton.className = 'filtro';
        boton.textContent = combustible === '' ? 'Todos los combustibles' : combustible;
        boton.dataset.combustible = combustible;
        boton.setAttribute('aria-pressed', String(combustible === filtroCombustible));
        filtros.appendChild(boton);
    });
}

filtros.addEventListener('click', function (evento) {
    const boton = evento.target.closest('button[data-combustible]');
    if (!boton) return;
    filtroCombustible = boton.dataset.combustible;
    actualizarDireccion();
    dibujarFiltros();
    mostrarVehiculos();
});

/* ==========================================================
   DIBUJO DE LAS TARJETAS
   ========================================================== */

function mensajeVacio(texto, conBoton) {
    const caja = document.createElement('div');
    caja.className = 'estado-vacio';
    const parrafo = document.createElement('p');
    parrafo.textContent = texto;
    caja.appendChild(parrafo);
    if (conBoton && esAdmin) {
        const enlace = document.createElement('a');
        enlace.className = 'boton boton--primario';
        enlace.href = 'registrar.html';
        enlace.textContent = 'Registrar vehículo';
        caja.appendChild(enlace);
    }
    grilla.appendChild(caja);
}

// Dibuja las tarjetas que coinciden con la condición, el combustible y la búsqueda.
function mostrarVehiculos() {
    grilla.innerHTML = '';

    if (cargando) {
        contador.textContent = '';
        mensajeVacio('Consultando vehículos en la base de datos...');
        return;
    }
    if (errorCarga) {
        contador.textContent = '';
        mensajeVacio(errorCarga);
        return;
    }

    const deLaCondicion = vehiculos.filter(function (v) {
        return condicion === 'Todos' || v.condicion === condicion;
    });
    const filtro = buscador.value.trim().toLowerCase();
    const lista = deLaCondicion.filter(function (v) {
        if (filtroCombustible && v.combustible !== filtroCombustible) return false;
        if (filtro === '') return true;
        return [v.codigo, v.marca, v.modelo, v.color, v.combustible, v.transmision, String(v.anio)]
            .some(function (valor) { return valor.toLowerCase().includes(filtro); });
    });

    contador.textContent = 'Mostrando ' + lista.length + ' de ' + deLaCondicion.length + ' ' + VISTAS[condicion].nombre;

    if (lista.length === 0) {
        if (deLaCondicion.length === 0) {
            mensajeVacio('Todavía no hay ' + VISTAS[condicion].nombre + ' en el inventario.', true);
        } else {
            mensajeVacio('Ningún vehículo coincide con la búsqueda.');
        }
        return;
    }

    lista.forEach(function (v) {
        grilla.appendChild(crearTarjetaVehiculo(v, esAdmin));
    });
}

/* ==========================================================
   ELIMINACIÓN (DELETE) - solo administrador
   ========================================================== */

async function eliminarVehiculo(codigo) {
    const vehiculo = vehiculos.find(function (v) { return v.codigo === codigo; });
    if (!vehiculo) return;

    const confirmar = confirm('¿Desea eliminar el vehículo ' + vehiculo.codigo + ' (' +
                              vehiculo.marca + ' ' + vehiculo.modelo + ')?');
    if (!confirmar) return;

    try {
        await peticion(API + '/' + encodeURIComponent(codigo), { method: 'DELETE' });
        mostrarAviso('Vehículo ' + codigo + ' eliminado de la base de datos.', 'exito');
    } catch (error) {
        mostrarAviso(error.mensaje, 'error');
        if (error.estado === 401) { window.location.href = 'login.html'; return; }
    }
    await cargarVehiculos();
}

/* ==========================================================
   EVENTOS E INICIO
   ========================================================== */

buscador.addEventListener('input', mostrarVehiculos);

// Un solo evento para todos los botones de las tarjetas (delegación de eventos)
grilla.addEventListener('click', function (evento) {
    const boton = evento.target.closest('button[data-accion]');
    if (!boton) return;
    if (boton.dataset.accion === 'eliminar' && esAdmin) eliminarVehiculo(boton.dataset.codigo);
});

// Espera a saber el rol (js/sesion.js) antes de dibujar la página.
window.sesionLista.then(function (usuario) {
    esAdmin = usuario.rol === 'admin';

    // Condición pedida en la dirección; Todos solo existe para el administrador
    const pedida = parametros.get('condicion');
    if (pedida === 'Usado' || pedida === 'Nuevo') condicion = pedida;
    else condicion = esAdmin ? 'Todos' : 'Nuevo';
    if (pedida === 'Todos' && esAdmin) condicion = 'Todos';

    // Avisos que llegan desde otras páginas
    if (parametros.get('actualizado')) {
        mostrarAviso('Vehículo ' + parametros.get('actualizado') + ' actualizado en la base de datos.', 'exito');
    } else if (parametros.get('sinPermiso')) {
        mostrarAviso('El registro de vehículos es solo para administradores.', 'error');
    }

    actualizarDireccion();
    dibujarPestanas();
    dibujarFiltros();
    aplicarVista();
    cargarVehiculos();
});
