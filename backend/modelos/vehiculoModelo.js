/* ==========================================================
   Modelo: vehículos
   Reglas de validación y consultas SQL de la tabla "vehiculos".
   Todas las consultas usan parámetros ($1, $2...) para evitar
   inyección SQL.
   ========================================================== */

const { pool } = require('../config/db');

// ---------- Reglas ----------
const CAMPOS = ['codigo', 'marca', 'modelo', 'anio', 'color', 'combustible', 'transmision',
                'condicion', 'kilometraje', 'precio', 'cantidad', 'descripcion'];
const COMBUSTIBLES = ['Gasolina', 'Diésel', 'Híbrido', 'Eléctrico', 'GLP'];
const TRANSMISIONES = ['Automática', 'Manual', 'CVT', 'Doble embrague'];
const CONDICIONES = ['Nuevo', 'Usado'];
const ANIO_MIN = 1900;
const KM_MAXIMO = 1000000;
const LIMITES = { codigo: 15, marca: 40, modelo: 40, color: 30, descripcion: 300 };

// Columnas que se devuelven al navegador (precio se convierte a número)
const COLUMNAS = `id, codigo, marca, modelo, anio, color, combustible, transmision,
                  condicion, kilometraje, precio::float8 AS precio, cantidad, descripcion, foto,
                  fecha_registro, fecha_actualizacion`;

/* ==========================================================
   VALIDACIÓN
   Se repiten las mismas reglas del formulario porque una
   petición puede llegar sin pasar por el navegador.
   Recibe el cuerpo de la petición y devuelve { datos, errores }.
   ========================================================== */

function validarVehiculo(cuerpo) {
    const anioMax = new Date().getFullYear() + 1;
    const datos = {};
    const errores = {};

    CAMPOS.forEach(function (campo) {
        const valor = cuerpo && cuerpo[campo] !== undefined && cuerpo[campo] !== null
            ? String(cuerpo[campo]).trim()
            : '';
        datos[campo] = valor;
    });
    datos.codigo = datos.codigo.toUpperCase();

    // Obligatorios (el kilometraje depende de la condición)
    CAMPOS.forEach(function (campo) {
        if (campo !== 'kilometraje' && datos[campo] === '') errores[campo] = 'Este campo es obligatorio.';
    });

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
    if (!errores.transmision && !TRANSMISIONES.includes(datos.transmision)) {
        errores.transmision = 'Seleccione un tipo de transmisión válido.';
    }
    if (!errores.condicion && !CONDICIONES.includes(datos.condicion)) {
        errores.condicion = 'Seleccione si el vehículo es nuevo o usado.';
    }

    // Kilometraje: un nuevo sale con 0 km; un usado debe indicarlo
    if (datos.condicion === 'Nuevo') {
        datos.kilometraje = '0';
    } else if (datos.condicion === 'Usado') {
        if (datos.kilometraje === '') {
            errores.kilometraje = 'Indique el kilometraje del vehículo usado.';
        } else if (!/^\d+$/.test(datos.kilometraje) || Number(datos.kilometraje) <= 0) {
            errores.kilometraje = 'El kilometraje debe ser un número entero mayor que cero.';
        } else if (Number(datos.kilometraje) > KM_MAXIMO) {
            errores.kilometraje = 'El kilometraje excede el máximo permitido.';
        }
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
        datos.kilometraje = parseInt(datos.kilometraje, 10);
        datos.precio = Math.round(Number(datos.precio) * 100) / 100;
        datos.cantidad = parseInt(datos.cantidad, 10);
    }

    return { datos, errores };
}

/* ==========================================================
   CONSULTAS
   ========================================================== */

async function listar() {
    const resultado = await pool.query(
        `SELECT ${COLUMNAS} FROM vehiculos ORDER BY fecha_registro, codigo`
    );
    return resultado.rows;
}

async function buscarPorCodigo(codigo) {
    const resultado = await pool.query(
        `SELECT ${COLUMNAS} FROM vehiculos WHERE codigo = $1`, [codigo]
    );
    return resultado.rows[0] || null;
}

async function fotoActual(codigo) {
    const resultado = await pool.query('SELECT foto FROM vehiculos WHERE codigo = $1', [codigo]);
    return resultado.rowCount === 0 ? undefined : resultado.rows[0].foto;
}

// El "id" no se envía: PostgreSQL lo genera automáticamente
async function crear(d, foto) {
    const resultado = await pool.query(
        `INSERT INTO vehiculos
            (codigo, marca, modelo, anio, color, combustible, transmision, condicion,
             kilometraje, precio, cantidad, descripcion, foto)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         RETURNING ${COLUMNAS}`,
        [d.codigo, d.marca, d.modelo, d.anio, d.color, d.combustible, d.transmision, d.condicion,
         d.kilometraje, d.precio, d.cantidad, d.descripcion, foto]
    );
    return resultado.rows[0];
}

async function actualizar(codigo, d, foto) {
    const resultado = await pool.query(
        `UPDATE vehiculos
            SET marca = $2, modelo = $3, anio = $4, color = $5, combustible = $6,
                transmision = $7, condicion = $8, kilometraje = $9, precio = $10,
                cantidad = $11, descripcion = $12, foto = $13,
                fecha_actualizacion = CURRENT_TIMESTAMP
          WHERE codigo = $1
          RETURNING ${COLUMNAS}`,
        [codigo, d.marca, d.modelo, d.anio, d.color, d.combustible, d.transmision, d.condicion,
         d.kilometraje, d.precio, d.cantidad, d.descripcion, foto]
    );
    return resultado.rows[0] || null;
}

async function eliminar(codigo) {
    const resultado = await pool.query(
        'DELETE FROM vehiculos WHERE codigo = $1 RETURNING codigo, foto', [codigo]
    );
    return resultado.rows[0] || null;
}

module.exports = {
    validarVehiculo, listar, buscarPorCodigo, fotoActual, crear, actualizar, eliminar,
    COMBUSTIBLES, TRANSMISIONES, CONDICIONES
};
