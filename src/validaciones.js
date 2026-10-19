/* ==========================================================
   Validaciones del lado del servidor
   Se repiten las mismas reglas del formulario porque una
   petición puede llegar sin pasar por el navegador.
   ========================================================== */

const CAMPOS = ['codigo', 'marca', 'modelo', 'anio', 'color',
                'combustible', 'precio', 'cantidad', 'descripcion'];
const COMBUSTIBLES = ['Gasolina', 'Diésel', 'Híbrido', 'Eléctrico', 'GLP'];
const ANIO_MIN = 1900;
const LIMITES = { codigo: 15, marca: 40, modelo: 40, color: 30, descripcion: 300 };

// Recibe el cuerpo de la petición y devuelve { datos, errores }.
function validarVehiculo(cuerpo) {
    const anioMax = new Date().getFullYear() + 1;
    const datos = {};
    const errores = {};

    // Todos los campos obligatorios
    CAMPOS.forEach(function (campo) {
        const valor = cuerpo && cuerpo[campo] !== undefined && cuerpo[campo] !== null
            ? String(cuerpo[campo]).trim()
            : '';
        datos[campo] = valor;
        if (valor === '') errores[campo] = 'Este campo es obligatorio.';
    });
    datos.codigo = datos.codigo.toUpperCase();

    // Longitud máxima de los campos de texto
    Object.keys(LIMITES).forEach(function (campo) {
        if (!errores[campo] && datos[campo].length > LIMITES[campo]) {
            errores[campo] = 'Máximo ' + LIMITES[campo] + ' caracteres.';
        }
    });

    if (!errores.anio) {
        const anio = Number(datos.anio);
        if (!/^\d{4}$/.test(datos.anio) || anio < ANIO_MIN || anio > anioMax) {
            errores.anio = 'Ingrese un año válido entre ' + ANIO_MIN + ' y ' + anioMax + '.';
        }
    }

    if (!errores.combustible && !COMBUSTIBLES.includes(datos.combustible)) {
        errores.combustible = 'Seleccione un tipo de combustible válido.';
    }

    if (!errores.precio) {
        const precio = Number(datos.precio);
        if (isNaN(precio) || precio <= 0) {
            errores.precio = 'El precio debe ser mayor que cero.';
        } else if (precio >= 10000000000) {
            errores.precio = 'El precio excede el máximo permitido.';
        }
    }

    if (!errores.cantidad) {
        if (!/^\d+$/.test(datos.cantidad)) {
            errores.cantidad = 'La cantidad debe ser un número entero (0 o más).';
        } else if (Number(datos.cantidad) > 1000000) {
            errores.cantidad = 'La cantidad excede el máximo permitido.';
        }
    }

    // Conversión a los tipos de la base de datos
    if (Object.keys(errores).length === 0) {
        datos.anio = parseInt(datos.anio, 10);
        datos.precio = Math.round(Number(datos.precio) * 100) / 100;
        datos.cantidad = parseInt(datos.cantidad, 10);
    }

    return { datos, errores };
}

module.exports = { validarVehiculo };
