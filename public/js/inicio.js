/* ==========================================================
   AutoMax - Página de Inicio
   Consulta los vehículos (SELECT) para el resumen del
   inventario y los tres vehículos más recientes.
   ========================================================== */

'use strict';

const recientes = document.getElementById('recientes');

function mensajeRecientes(texto) {
    recientes.innerHTML = '';
    const caja = document.createElement('div');
    caja.className = 'estado-vacio';
    caja.textContent = texto;
    recientes.appendChild(caja);
}

// Actualiza las cifras de la franja de resumen.
function actualizarResumen(vehiculos) {
    let unidades = 0;
    let valor = 0;
    vehiculos.forEach(function (v) {
        unidades += v.cantidad;
        valor += v.precio * v.cantidad;
    });
    document.getElementById('totalModelos').textContent = vehiculos.length;
    document.getElementById('totalUnidades').textContent = unidades;
    document.getElementById('valorInventario').textContent = formatoMoneda.format(valor);
}

async function cargarInicio() {
    mensajeRecientes('Consultando vehículos en la base de datos...');
    try {
        const vehiculos = await peticion(API);
        actualizarResumen(vehiculos);

        if (vehiculos.length === 0) {
            mensajeRecientes('Todavía no hay vehículos registrados.');
            return;
        }

        // Los tres registrados más recientemente
        const ultimos = vehiculos.slice().sort(function (a, b) {
            return new Date(b.fecha_registro) - new Date(a.fecha_registro);
        }).slice(0, 3);

        recientes.innerHTML = '';
        ultimos.forEach(function (v) {
            recientes.appendChild(crearTarjetaVehiculo(v, false));
        });
    } catch (error) {
        mensajeRecientes(error.mensaje);
    }
}

cargarInicio();
