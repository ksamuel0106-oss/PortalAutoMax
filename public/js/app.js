/* ==========================================================
   AutoMax - Lógica del portal de vehículos
   Almacenamiento: PostgreSQL, a través de la API del servidor
   (/api/vehiculos). Ya no se usa localStorage.
   ========================================================== */

'use strict';

// ---------- Constantes ----------
const API = '/api/vehiculos';                        // Dirección de la API en el servidor
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
const cuerpoTabla      = document.getElementById('cuerpoTabla');
const buscador         = document.getElementById('buscar');
const aviso            = document.getElementById('aviso');
const inputCodigo      = document.getElementById('codigo');
const estadoConexion   = document.getElementById('estadoConexion');

// ---------- Estado de la aplicación ----------
let vehiculos = [];             // Copia en memoria de los vehículos consultados a la base de datos
let codigoEnEdicion = null;     // Código del vehículo que se está modificando (null = registro nuevo)
let temporizadorAviso = null;
let cargando = true;            // true mientras se consulta la base de datos
let errorCarga = '';            // Mensaje si la consulta falló

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

// SELECT: consulta todos los vehículos guardados en PostgreSQL.
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

// Indicador de conexión con la base de datos.
function marcarConexion(conectado) {
    estadoConexion.textContent = conectado ? 'Conectado a PostgreSQL' : 'Sin conexión con la base de datos';
    estadoConexion.className = 'estado-conexion ' + (conectado ? 'estado-conexion--ok' : 'estado-conexion--error');
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
// El servidor vuelve a validar todo antes de guardar en la base de datos.
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

    // 2. El código no puede repetirse (la base de datos también lo impide con PRIMARY KEY)
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
        } else {
            await peticion(API + '/' + encodeURIComponent(codigoEnEdicion),
                           { method: 'PUT', body: JSON.stringify(datos) });
            mostrarAviso('Vehículo ' + datos.codigo + ' actualizado en la base de datos.', 'exito');
        }
        reiniciarFormulario();
        await cargarVehiculos();
    } catch (error) {
        // Errores de validación devueltos por el servidor (ej.: código repetido)
        mostrarErrores(error.errores || {});
        enfocarPrimerError(error.errores || {});
        mostrarAviso(error.mensaje, 'error');
        if (error.estado === 404) {
            reiniciarFormulario();
            await cargarVehiculos();
        }
    } finally {
        bloquearFormulario(false);
    }
}

// Evita enviar el formulario dos veces mientras se espera la respuesta.
function bloquearFormulario(bloquear) {
    btnGuardar.disabled = bloquear;
    btnGuardar.textContent = bloquear
        ? 'Guardando...'
        : (codigoEnEdicion === null ? 'Guardar vehículo' : 'Actualizar vehículo');
}

// Carga los datos de un vehículo en el formulario para modificarlo.
function editarVehiculo(codigo) {
    const vehiculo = vehiculos.find(function (v) { return v.codigo === codigo; });
    if (!vehiculo) return;

    codigoEnEdicion = codigo;
    CAMPOS.forEach(function (campo) {
        formulario.elements[campo].value = vehiculo[campo];
    });
    mostrarErrores({});

    // El código identifica al vehículo, por eso no se modifica
    inputCodigo.readOnly = true;
    tituloFormulario.textContent = 'Modificar vehículo ' + codigo;
    btnGuardar.textContent = 'Actualizar vehículo';
    btnLimpiar.classList.add('oculto');
    btnCancelar.classList.remove('oculto');

    mostrarVehiculos();
    document.getElementById('registro').scrollIntoView({ behavior: 'smooth' });
    formulario.elements.marca.focus({ preventScroll: true });
}

// Deja el formulario listo para un registro nuevo.
function reiniciarFormulario() {
    formulario.reset();
    mostrarErrores({});
    codigoEnEdicion = null;
    inputCodigo.readOnly = false;
    tituloFormulario.textContent = 'Registrar vehículo';
    btnGuardar.textContent = 'Guardar vehículo';
    btnLimpiar.classList.remove('oculto');
    btnCancelar.classList.add('oculto');
    mostrarVehiculos();
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
        if (codigoEnEdicion === codigo) reiniciarFormulario();
        mostrarAviso('Vehículo ' + codigo + ' eliminado de la base de datos.', 'exito');
    } catch (error) {
        mostrarAviso(error.mensaje, 'error');
    }
    await cargarVehiculos();
}

/* ==========================================================
   CONSULTA (TABLA)
   ========================================================== */

// Crea una celda de tabla con texto (textContent evita inyectar HTML).
function crearCelda(texto, clase) {
    const celda = document.createElement('td');
    celda.textContent = texto;
    if (clase) celda.className = clase;
    return celda;
}

function crearBoton(texto, accion, codigo, clase) {
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.textContent = texto;
    boton.className = 'boton-tabla ' + clase;
    boton.dataset.accion = accion;
    boton.dataset.codigo = codigo;
    return boton;
}

// Fila única con un mensaje (cargando, vacío, error).
function filaMensaje(texto) {
    const fila = document.createElement('tr');
    fila.className = 'tabla__vacia';
    const celda = document.createElement('td');
    celda.colSpan = 9;
    celda.textContent = texto;
    fila.appendChild(celda);
    cuerpoTabla.appendChild(fila);
}

// Dibuja la tabla con todos los vehículos (o los que coinciden con la búsqueda).
function mostrarVehiculos() {
    cuerpoTabla.innerHTML = '';

    if (cargando) {
        filaMensaje('Consultando vehículos en la base de datos...');
        return;
    }
    if (errorCarga) {
        filaMensaje(errorCarga);
        actualizarResumen();
        return;
    }

    const filtro = buscador.value.trim().toLowerCase();
    const lista = vehiculos.filter(function (v) {
        if (filtro === '') return true;
        return [v.codigo, v.marca, v.modelo, v.color, v.combustible, String(v.anio)]
            .some(function (valor) { return valor.toLowerCase().includes(filtro); });
    });

    if (lista.length === 0) {
        filaMensaje(vehiculos.length === 0
            ? 'No hay vehículos registrados. Use el formulario para agregar el primero.'
            : 'Ningún vehículo coincide con la búsqueda.');
    }

    lista.forEach(function (v) {
        const fila = document.createElement('tr');
        fila.title = v.descripcion;   // La descripción se muestra al pasar el cursor
        if (v.codigo === codigoEnEdicion) fila.className = 'en-edicion';

        fila.appendChild(crearCelda(v.codigo, 'codigo'));
        fila.appendChild(crearCelda(v.marca));
        fila.appendChild(crearCelda(v.modelo));
        fila.appendChild(crearCelda(v.anio));
        fila.appendChild(crearCelda(v.color));
        fila.appendChild(crearCelda(v.combustible));
        fila.appendChild(crearCelda(formatoMoneda.format(v.precio), 'numero'));

        const celdaCantidad = document.createElement('td');
        celdaCantidad.className = 'numero';
        const etiqueta = document.createElement('span');
        etiqueta.className = 'etiqueta-stock' + (v.cantidad === 0 ? ' etiqueta-stock--agotado' : '');
        etiqueta.textContent = v.cantidad;
        celdaCantidad.appendChild(etiqueta);
        fila.appendChild(celdaCantidad);

        const celdaAcciones = document.createElement('td');
        const contenedor = document.createElement('div');
        contenedor.className = 'acciones';
        contenedor.appendChild(crearBoton('Editar', 'editar', v.codigo, 'boton-tabla--editar'));
        contenedor.appendChild(crearBoton('Eliminar', 'eliminar', v.codigo, 'boton-tabla--eliminar'));
        celdaAcciones.appendChild(contenedor);
        fila.appendChild(celdaAcciones);

        cuerpoTabla.appendChild(fila);
    });

    actualizarResumen();
}

// Actualiza las tarjetas de resumen del inventario.
function actualizarResumen() {
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

/* ==========================================================
   MENSAJES
   ========================================================== */

function mostrarAviso(mensaje, tipo) {
    aviso.textContent = mensaje;
    aviso.className = 'aviso visible aviso--' + tipo;
    clearTimeout(temporizadorAviso);
    temporizadorAviso = setTimeout(function () {
        aviso.classList.remove('visible');
    }, 3500);
}

/* ==========================================================
   EVENTOS
   ========================================================== */

formulario.addEventListener('submit', manejarEnvio);
btnLimpiar.addEventListener('click', reiniciarFormulario);
btnCancelar.addEventListener('click', reiniciarFormulario);
buscador.addEventListener('input', mostrarVehiculos);

// Un solo evento para todos los botones de la tabla (delegación de eventos)
cuerpoTabla.addEventListener('click', function (evento) {
    const boton = evento.target.closest('button[data-accion]');
    if (!boton) return;
    if (boton.dataset.accion === 'editar') editarVehiculo(boton.dataset.codigo);
    if (boton.dataset.accion === 'eliminar') eliminarVehiculo(boton.dataset.codigo);
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
document.getElementById('anioActual').textContent = new Date().getFullYear();
document.getElementById('anio').placeholder = 'Ej: ' + new Date().getFullYear();
cargarVehiculos();
