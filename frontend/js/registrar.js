/* ==========================================================
   AutoMax - Página de Registro de vehículos (solo administradores)
   Registro (INSERT) y actualización (UPDATE) de vehículos nuevos
   y usados. El servidor vuelve a revisar los datos y el rol
   antes de guardar.
   ========================================================== */

'use strict';

// ---------- Constantes ----------
const ANIO_MIN = 1900;                               // Año mínimo aceptado
const ANIO_MAX = new Date().getFullYear() + 1;       // Se acepta el modelo del próximo año
const CAMPOS = ['codigo', 'marca', 'modelo', 'anio', 'color', 'combustible',
                'transmision', 'condicion', 'kilometraje', 'precio', 'cantidad', 'descripcion'];

// ---------- Referencias al DOM ----------
const formulario       = document.getElementById('formVehiculo');
const tituloFormulario = document.getElementById('tituloFormulario');
const btnGuardar       = document.getElementById('btnGuardar');
const btnLimpiar       = document.getElementById('btnLimpiar');
const btnCancelar      = document.getElementById('btnCancelar');
const inputCodigo      = document.getElementById('codigo');
const selectCondicion  = document.getElementById('condicion');
const inputKilometraje = document.getElementById('kilometraje');
const ayudaKilometraje = document.getElementById('ayudaKilometraje');
const zonaFoto         = document.getElementById('zonaFoto');
const inputFoto        = document.getElementById('foto');
const vistaFoto        = document.getElementById('vistaFoto');
const textoFoto        = document.getElementById('textoFoto');
const btnElegirFoto    = document.getElementById('btnElegirFoto');
const btnQuitarFoto    = document.getElementById('btnQuitarFoto');
const errorFoto        = document.getElementById('error-foto');

// ---------- Reglas de la foto ----------
const TIPOS_FOTO = ['image/jpeg', 'image/png', 'image/webp'];
const FOTO_MAX_BYTES = 5 * 1024 * 1024;   // 5 MB
const FOTO_ANCHO_MAX = 1200;
const FOTO_ALTO_MAX = 900;

// ---------- Estado de la página ----------
let vehiculos = [];             // Vehículos de la base, para avisar de códigos repetidos
let codigoEnEdicion = null;     // Código del vehículo que se está modificando (null = registro nuevo)
let fotoNueva = null;           // Foto elegida y ya reducida (Blob), lista para enviar
let fotoActual = null;          // Nombre de la foto guardada del vehículo en edición
let quitarFoto = false;         // true = al guardar, se elimina la foto actual
let urlVista = null;            // Dirección temporal de la vista previa

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

// Un vehículo nuevo sale con 0 km; el kilometraje solo se escribe en los usados.
function ajustarKilometraje() {
    const usado = selectCondicion.value === 'Usado';
    inputKilometraje.disabled = !usado;
    if (!usado) {
        inputKilometraje.value = '';
        inputKilometraje.classList.remove('invalido');
        inputKilometraje.removeAttribute('aria-invalid');
        document.getElementById('error-kilometraje').textContent = '';
    }
    inputKilometraje.placeholder = usado ? 'Ej: 45000' : '0 km';
    ayudaKilometraje.textContent = usado
        ? 'Kilómetros recorridos según el odómetro.'
        : 'Los vehículos nuevos se registran con 0 km.';
}

// Obtiene los valores escritos en el formulario (sin espacios sobrantes).
function obtenerDatosFormulario() {
    const datos = {};
    CAMPOS.forEach(function (campo) {
        datos[campo] = formulario.elements[campo].value.trim();
    });
    datos.codigo = datos.codigo.toUpperCase();
    if (datos.condicion === 'Nuevo') datos.kilometraje = '0';
    return datos;
}

// Valida los datos y devuelve un objeto { campo: 'mensaje de error' }.
function validar(datos) {
    const errores = {};

    // 1. Todos los campos son obligatorios (el kilometraje, solo en los usados)
    CAMPOS.forEach(function (campo) {
        const elemento = formulario.elements[campo];
        if (campo === 'kilometraje' && datos.condicion !== 'Usado') return;
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

    // 4. El kilometraje de un usado es un entero mayor que cero
    if (!errores.kilometraje && datos.condicion === 'Usado') {
        if (!/^\d+$/.test(datos.kilometraje) || Number(datos.kilometraje) <= 0) {
            errores.kilometraje = 'El kilometraje debe ser un número entero mayor que cero.';
        }
    }

    // 5. El precio debe ser numérico y mayor que cero
    if (!errores.precio) {
        const precio = Number(datos.precio);
        if (isNaN(precio) || precio <= 0) {
            errores.precio = 'El precio debe ser mayor que cero.';
        }
    }

    // 6. La cantidad debe ser numérica (número entero, 0 o más)
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
   FOTO: ELEGIR, ARRASTRAR, REDUCIR Y VISTA PREVIA
   ========================================================== */

// Reduce la imagen a un máximo de 1200 × 900 px y la convierte a JPG.
function reducirImagen(archivo) {
    return new Promise(function (resolver, rechazar) {
        const url = URL.createObjectURL(archivo);
        const imagen = new Image();
        imagen.onload = function () {
            const escala = Math.min(1, FOTO_ANCHO_MAX / imagen.naturalWidth, FOTO_ALTO_MAX / imagen.naturalHeight);
            const ancho = Math.round(imagen.naturalWidth * escala);
            const alto = Math.round(imagen.naturalHeight * escala);
            const lienzo = document.createElement('canvas');
            lienzo.width = ancho;
            lienzo.height = alto;
            const contexto = lienzo.getContext('2d');
            contexto.fillStyle = '#ffffff';            // Fondo blanco para PNG transparentes
            contexto.fillRect(0, 0, ancho, alto);
            contexto.drawImage(imagen, 0, 0, ancho, alto);
            URL.revokeObjectURL(url);
            lienzo.toBlob(function (blob) {
                if (blob) resolver(blob);
                else rechazar(new Error('No se pudo procesar la imagen. Pruebe con otro archivo.'));
            }, 'image/jpeg', 0.82);
        };
        imagen.onerror = function () {
            URL.revokeObjectURL(url);
            rechazar(new Error('No se pudo leer la imagen. Pruebe con otro archivo.'));
        };
        imagen.src = url;
    });
}

function mostrarErrorFoto(mensaje) {
    errorFoto.textContent = mensaje || '';
    zonaFoto.classList.toggle('zona-foto--error', Boolean(mensaje));
}

function mostrarVista(src) {
    vistaFoto.src = src;
    vistaFoto.classList.remove('oculto');
    textoFoto.classList.add('oculto');
    btnElegirFoto.textContent = 'Cambiar foto';
    btnQuitarFoto.classList.remove('oculto');
}

function ocultarVista() {
    vistaFoto.removeAttribute('src');
    vistaFoto.classList.add('oculto');
    textoFoto.classList.remove('oculto');
    btnElegirFoto.textContent = 'Elegir archivo';
    btnQuitarFoto.classList.add('oculto');
}

function liberarVista() {
    if (urlVista) { URL.revokeObjectURL(urlVista); urlVista = null; }
}

// Revisa el archivo, lo reduce y muestra la vista previa.
async function recibirArchivo(archivo) {
    mostrarErrorFoto('');
    if (!TIPOS_FOTO.includes(archivo.type)) {
        mostrarErrorFoto('La foto debe ser JPG, PNG o WebP.');
        return;
    }
    if (archivo.size > FOTO_MAX_BYTES) {
        mostrarErrorFoto('La foto no puede pesar más de 5 MB.');
        return;
    }
    try {
        fotoNueva = await reducirImagen(archivo);
        quitarFoto = false;
        liberarVista();
        urlVista = URL.createObjectURL(fotoNueva);
        mostrarVista(urlVista);
    } catch (error) {
        fotoNueva = null;
        mostrarErrorFoto(error.message);
    }
}

// Deja la foto vacía. Si el vehículo tenía una foto guardada, se borrará al guardar.
function quitarFotoElegida() {
    fotoNueva = null;
    liberarVista();
    if (fotoActual) quitarFoto = true;
    inputFoto.value = '';
    mostrarErrorFoto('');
    ocultarVista();
}

function reiniciarFoto() {
    fotoNueva = null;
    fotoActual = null;
    quitarFoto = false;
    liberarVista();
    inputFoto.value = '';
    mostrarErrorFoto('');
    ocultarVista();
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

    // Los datos y la foto viajan juntos en un FormData (multipart/form-data)
    const cuerpo = new FormData();
    CAMPOS.forEach(function (campo) { cuerpo.append(campo, datos[campo]); });
    if (fotoNueva) cuerpo.append('foto', fotoNueva, 'foto.jpg');
    else if (quitarFoto) cuerpo.append('quitarFoto', 'true');

    try {
        if (esNuevo) {
            await peticion(API, { method: 'POST', body: cuerpo });
            mostrarAviso('Vehículo ' + datos.codigo + ' registrado en la base de datos.', 'exito');
            reiniciarFormulario();
            await cargarVehiculos();
        } else {
            await peticion(API + '/' + encodeURIComponent(codigoEnEdicion),
                           { method: 'PUT', body: cuerpo });
            // Vuelve al inventario, que muestra el aviso de actualización
            window.location.href = 'inventario.html?actualizado=' + encodeURIComponent(datos.codigo);
            return;
        }
    } catch (error) {
        // Errores de validación devueltos por el servidor (ej.: código repetido)
        mostrarErrores(error.errores || {});
        if (error.errores && error.errores.foto) mostrarErrorFoto(error.errores.foto);
        enfocarPrimerError(error.errores || {});
        mostrarAviso(error.mensaje, 'error');
        // 401 = la sesión venció; 403 = el rol no es administrador
        if (error.estado === 401) { window.location.href = 'login.html'; return; }
        if (error.estado === 403) { window.location.href = 'inventario.html?sinPermiso=1'; return; }
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
    ajustarKilometraje();
    if (vehiculo.condicion === 'Usado') inputKilometraje.value = vehiculo.kilometraje;
    mostrarErrores({});

    // Foto guardada del vehículo
    reiniciarFoto();
    fotoActual = vehiculo.foto || null;
    if (fotoActual) mostrarVista(rutaFoto(fotoActual));

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
    ajustarKilometraje();
    mostrarErrores({});
    reiniciarFoto();
    codigoEnEdicion = null;
    inputCodigo.readOnly = false;
    tituloFormulario.textContent = 'Registrar vehículo';
    document.title = 'Registro de vehículos | AutoMax';
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
selectCondicion.addEventListener('change', function () {
    ajustarKilometraje();
    if (selectCondicion.value === 'Usado') inputKilometraje.focus();
});
btnLimpiar.addEventListener('click', reiniciarFormulario);
btnCancelar.addEventListener('click', function () {
    window.location.href = 'inventario.html';
});

// Foto: botón "Elegir archivo"
inputFoto.addEventListener('change', function () {
    if (inputFoto.files.length > 0) recibirArchivo(inputFoto.files[0]);
    inputFoto.value = '';   // Permite volver a elegir el mismo archivo
});
btnQuitarFoto.addEventListener('click', quitarFotoElegida);

// Foto: arrastrar y soltar desde la computadora
['dragenter', 'dragover'].forEach(function (tipo) {
    zonaFoto.addEventListener(tipo, function (evento) {
        evento.preventDefault();
        zonaFoto.classList.add('zona-foto--encima');
    });
});
zonaFoto.addEventListener('dragleave', function (evento) {
    if (!zonaFoto.contains(evento.relatedTarget)) zonaFoto.classList.remove('zona-foto--encima');
});
zonaFoto.addEventListener('drop', function (evento) {
    evento.preventDefault();
    zonaFoto.classList.remove('zona-foto--encima');
    const archivos = evento.dataTransfer.files;
    if (archivos.length > 0) {
        recibirArchivo(archivos[0]);
    } else {
        mostrarErrorFoto('Arrastre la foto desde una carpeta de su computadora. Si está en una página web, descárguela primero.');
    }
});
// Si la foto cae fuera de la zona, el navegador no la abre (así no se pierde el formulario)
['dragover', 'drop'].forEach(function (tipo) {
    window.addEventListener(tipo, function (evento) {
        if (!zonaFoto.contains(evento.target)) evento.preventDefault();
    });
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
ajustarKilometraje();
cargarVehiculos();
revisarEdicion();
