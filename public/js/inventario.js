/* ==========================================================
   AutoMax - Página de Inventario
   Consulta (SELECT), búsqueda, filtro por combustible y
   eliminación (DELETE). La edición se hace en registrar.html.
   ========================================================== */

'use strict';

// ---------- Referencias al DOM ----------
const grilla   = document.getElementById('grillaVehiculos');
const buscador = document.getElementById('buscar');
const filtros  = document.getElementById('filtros');
const contador = document.getElementById('contador');

// ---------- Estado de la página ----------
let vehiculos = [];             // Copia en memoria de los vehículos consultados a la base de datos
let cargando = true;            // true mientras se consulta la base de datos
let errorCarga = '';            // Mensaje si la consulta falló
let filtroCombustible = '';     // '' = todos

// El combustible puede venir en la dirección: inventario.html?combustible=Híbrido
const parametros = new URLSearchParams(window.location.search);
if (COMBUSTIBLES.includes(parametros.get('combustible'))) {
    filtroCombustible = parametros.get('combustible');
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
   FILTROS
   ========================================================== */

function dibujarFiltros() {
    filtros.innerHTML = '';
    ['', ...COMBUSTIBLES].forEach(function (combustible) {
        const boton = document.createElement('button');
        boton.type = 'button';
        boton.className = 'filtro';
        boton.textContent = combustible === '' ? 'Todos' : combustible;
        boton.dataset.combustible = combustible;
        boton.setAttribute('aria-pressed', String(combustible === filtroCombustible));
        filtros.appendChild(boton);
    });
}

filtros.addEventListener('click', function (evento) {
    const boton = evento.target.closest('button[data-combustible]');
    if (!boton) return;
    filtroCombustible = boton.dataset.combustible;

    // Se guarda en la dirección para poder compartir el enlace filtrado
    const url = new URL(window.location.href);
    if (filtroCombustible) url.searchParams.set('combustible', filtroCombustible);
    else url.searchParams.delete('combustible');
    history.replaceState(null, '', url);

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
    if (conBoton) {
        const enlace = document.createElement('a');
        enlace.className = 'boton boton--primario';
        enlace.href = 'registrar.html';
        enlace.textContent = 'Registrar vehículo';
        caja.appendChild(enlace);
    }
    grilla.appendChild(caja);
}

// Dibuja las tarjetas con los vehículos que coinciden con la búsqueda y el filtro.
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

    const filtro = buscador.value.trim().toLowerCase();
    const lista = vehiculos.filter(function (v) {
        if (filtroCombustible && v.combustible !== filtroCombustible) return false;
        if (filtro === '') return true;
        return [v.codigo, v.marca, v.modelo, v.color, v.combustible, String(v.anio)]
            .some(function (valor) { return valor.toLowerCase().includes(filtro); });
    });

    contador.textContent = 'Mostrando ' + lista.length + ' de ' + vehiculos.length + ' vehículos';

    if (lista.length === 0) {
        if (vehiculos.length === 0) {
            mensajeVacio('No hay vehículos registrados. Use el formulario para agregar el primero.', true);
        } else {
            mensajeVacio('Ningún vehículo coincide con la búsqueda.');
        }
        return;
    }

    lista.forEach(function (v) {
        grilla.appendChild(crearTarjetaVehiculo(v, true));
    });
}

/* ==========================================================
   ELIMINACIÓN (DELETE)
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
    }
    await cargarVehiculos();
}

/* ==========================================================
   EVENTOS
   ========================================================== */

buscador.addEventListener('input', mostrarVehiculos);

// Un solo evento para todos los botones de las tarjetas (delegación de eventos)
grilla.addEventListener('click', function (evento) {
    const boton = evento.target.closest('button[data-accion]');
    if (!boton) return;
    if (boton.dataset.accion === 'eliminar') eliminarVehiculo(boton.dataset.codigo);
});

// ---------- Inicio ----------
// Al volver de registrar.html después de modificar un vehículo
if (parametros.get('actualizado')) {
    mostrarAviso('Vehículo ' + parametros.get('actualizado') + ' actualizado en la base de datos.', 'exito');
    const url = new URL(window.location.href);
    url.searchParams.delete('actualizado');
    history.replaceState(null, '', url);
}
dibujarFiltros();
cargarVehiculos();
