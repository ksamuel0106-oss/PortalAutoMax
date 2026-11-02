/* ==========================================================
   AutoMax - Página de Registrar
   Registro (INSERT) y actualización (UPDATE) de vehículos.
   Las validaciones son las mismas de la versión anterior;
   el servidor las vuelve a revisar antes de guardar.
   ========================================================== */

'use strict';

// ---------- Constantes ----------
const ANIO_MIN = 1900;                               // Año mínimo aceptado
const ANIO_MAX = new Date().getFullYear() + 1;       // Se acepta el modelo del próximo año
const CAMPOS = ['codigo', 'marca', 'modelo', 'anio', 'color',
                'combustible', 'precio', 'cantidad', 'descripcion'];

// ---------- Referencias al DOM ----------
const formulario       = document.getElementById('formVehiculo');
const tituloFormulario = document.getElementById('tituloFormulario');
const btnGuardar       = document.getElementById('btnGuardar');
const btnLimpiar       = document.getElementById('btnLimpiar');
const btnCancelar      = document.getElementById('btnCancelar');
const inputCodigo      = document.getElementById('codigo');

// ---------- Estado de la página ----------
let vehiculos = [];             // Vehículos de la base, para avisar de códigos repetidos
let codigoEnEdicion = null;     // Código del vehículo que se está modificando (null = registro nuevo)

/* ==========================================================
   CONSULTA (SELECT)
   ========================================================== */

async function cargarVehiculos() {
    try {
        vehiculos = await peticion(API);
        marcarConexion(true);
    } catch (error) {
        vehiculos = [];
        marcarConexion(false);
        mostrarAviso(error.mensaje, 'error');
    }
}

/* ==========================================================
   LECTURA Y VALIDACIÓN DEL FORMULARIO
   ========================================================== */

// Obtiene los valores escritos en el formulario (sin espacios sobrantes).
function obtenerDatosFormulario() {
    const datos = {};
    CAMPOS.forEach(function (campo) {
        datos[campo] = formulario.elements[campo].value.trim();
    });
    datos.codigo = datos.codigo.toUpperCase();
    return datos;
}

// Valida los datos y devuelve un objeto { campo: 'mensaje de error' }.
function validar(datos) {
    const errores = {};

    // 1. Todos los campos son obligatorios
    CAMPOS.forEach(function (campo) {
        const elemento = formulario.elements[campo];
        if (datos[campo] === '') {
            // Un campo numérico con texto no válido llega vacío; se informa como no numérico
            errores[campo] = (elemento.validity && elemento.validity.badInput)
                ? 'Debe ingresar un valor numérico.'
                : 'Este campo es obligatorio.';
        }
    });

    // 2. El código no puede repetirse (la base de datos también lo impide con UNIQUE)
    if (!errores.codigo && codigoEnEdicion === null) {
        const repetido = vehiculos.some(function (v) { return v.codigo === datos.codigo; });
        if (repetido) {
            errores.codigo = 'Ya existe un vehículo con el código ' + datos.codigo + '.';
        }
    }

    // 3. El año debe ser válido (entero de 4 dígitos dentro del rango)
    if (!errores.anio) {
        const anio = Number(datos.anio);
        if (!/^\d{4}$/.test(datos.anio) || anio < ANIO_MIN || anio > ANIO_MAX) {
            errores.anio = 'Ingrese un año válido entre ' + ANIO_MIN + ' y ' + ANIO_MAX + '.';
        }
    }

    // 4. El precio debe ser numérico y mayor que cero
    if (!errores.precio) {
        const precio = Number(datos.precio);
        if (isNaN(precio) || precio <= 0) {
            errores.precio = 'El precio debe ser mayor que cero.';
        }
    }

    // 5. La cantidad debe ser numérica (número entero, 0 o más)
    if (!errores.cantidad) {
        if (!/^\d+$/.test(datos.cantidad)) {
            errores.cantidad = 'La cantidad debe ser un número entero (0 o más).';
        }
    }

    return errores;
}

// Muestra los errores debajo de cada campo y marca los campos inválidos.
function mostrarErrores(errores) {
    CAMPOS.forEach(function (campo) {
        const elemento = formulario.elements[campo];
        const mensaje = document.getElementById('error-' + campo);
        if (errores[campo]) {
            elemento.classList.add('invalido');
            elemento.setAttribute('aria-invalid', 'true');
            mensaje.textContent = errores[campo];
        } else {
            elemento.classList.remove('invalido');
            elemento.removeAttribute('aria-invalid');
            mensaje.textContent = '';
        }
    });
}

// Enfoca el primer campo con error, en el orden del formulario.
function enfocarPrimerError(errores) {
    const primerError = CAMPOS.find(function (campo) { return errores[campo]; });
    if (primerError) formulario.elements[primerError].focus();
    return Boolean(primerError);
}

/* ==========================================================
   REGISTRO (INSERT) Y ACTUALIZACIÓN (UPDATE)
   ========================================================== */

async function manejarEnvio(evento) {
    evento.preventDefault();

    const datos = obtenerDatosFormulario();
    const errores = validar(datos);
    mostrarErrores(errores);

    if (enfocarPrimerError(errores)) {
        mostrarAviso('Revise los campos marcados en rojo.', 'error');
        return;
    }

    const esNuevo = codigoEnEdicion === null;
    bloquearFormulario(true);

    try {
        if (esNuevo) {
            await peticion(API, { method: 'POST', body: JSON.stringify(datos) });
            mostrarAviso('Vehículo ' + datos.codigo + ' registrado en la base de datos.', 'exito');
            reiniciarFormulario();
            await cargarVehiculos();
        } else {
            await peticion(API + '/' + encodeURIComponent(codigoEnEdicion),
                           { method: 'PUT', body: JSON.stringify(datos) });
            // Vuelve al inventario, que muestra el aviso de actualización
            window.location.href = 'inventario.html?actualizado=' + encodeURIComponent(datos.codigo);
            return;
        }
    } catch (error) {
        // Errores de validación devueltos por el servidor (ej.: código repetido)
        mostrarErrores(error.errores || {});
        enfocarPrimerError(error.errores || {});
        mostrarAviso(error.mensaje, 'error');
        if (error.estado === 404) {
            reiniciarFormulario();
            await cargarVehiculos();
        }
    }
    bloquearFormulario(false);
}

// Evita enviar el formulario dos veces mientras se espera la respuesta.
function bloquearFormulario(bloquear) {
    btnGuardar.disabled = bloquear;
    btnGuardar.textContent = bloquear
        ? 'Guardando...'
        : (codigoEnEdicion === null ? 'Guardar vehículo' : 'Actualizar vehículo');
}

// Carga los datos de un vehículo en el formulario para modificarlo.
function editarVehiculo(vehiculo) {
    codigoEnEdicion = vehiculo.codigo;
    CAMPOS.forEach(function (campo) {
        formulario.elements[campo].value = vehiculo[campo];
    });
    mostrarErrores({});

    // El código identifica al vehículo, por eso no se modifica
    inputCodigo.readOnly = true;
    tituloFormulario.textContent = 'Modificar vehículo ' + vehiculo.codigo;
    document.title = 'Modificar ' + vehiculo.codigo + ' | AutoMax';
    btnGuardar.textContent = 'Actualizar vehículo';
    btnLimpiar.classList.add('oculto');
    btnCancelar.classList.remove('oculto');
    formulario.elements.marca.focus();
}

// Deja el formulario listo para un registro nuevo.
function reiniciarFormulario() {
    formulario.reset();
    mostrarErrores({});
    codigoEnEdicion = null;
    inputCodigo.readOnly = false;
    tituloFormulario.textContent = 'Registrar vehículo';
    document.title = 'Registrar vehículo | AutoMax';
    btnGuardar.textContent = 'Guardar vehículo';
    btnLimpiar.classList.remove('oculto');
    btnCancelar.classList.add('oculto');

    // Quita ?editar=... de la dirección
    const url = new URL(window.location.href);
    if (url.searchParams.has('editar')) {
        url.searchParams.delete('editar');
        history.replaceState(null, '', url);
    }
}

// Si la dirección trae ?editar=VH-001, se consulta ese vehículo (SELECT) y se carga.
async function revisarEdicion() {
    const codigo = new URLSearchParams(window.location.search).get('editar');
    if (!codigo) return;
    try {
        const vehiculo = await peticion(API + '/' + encodeURIComponent(codigo));
        editarVehiculo(vehiculo);
    } catch (error) {
        mostrarAviso(error.mensaje, 'error');
        reiniciarFormulario();
    }
}

/* ==========================================================
   EVENTOS
   ========================================================== */

formulario.addEventListener('submit', manejarEnvio);
btnLimpiar.addEventListener('click', reiniciarFormulario);
btnCancelar.addEventListener('click', function () {
    window.location.href = 'inventario.html';
});

// Al escribir en un campo se borra su mensaje de error
formulario.addEventListener('input', function (evento) {
    const campo = evento.target;
    if (campo.classList.contains('invalido')) {
        campo.classList.remove('invalido');
        campo.removeAttribute('aria-invalid');
        document.getElementById('error-' + campo.name).textContent = '';
    }
});

// ---------- Inicio ----------
document.getElementById('anio').placeholder = 'Ej: ' + new Date().getFullYear();
cargarVehiculos();
revisarEdicion();
