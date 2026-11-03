/* ==========================================================
   Controlador: vehículos (CRUD)
   Recibe la petición, valida con el modelo y responde.
   La foto (opcional) llega en el campo "foto" por multer.
   En PUT, quitarFoto=true elimina la foto actual.
   ========================================================== */

const Vehiculo = require('../modelos/vehiculoModelo');
const { borrarFoto } = require('../middleware/subidaFoto');

// ---------- CONSULTAR TODOS ----------
async function listar(req, res, next) {
    try {
        res.json(await Vehiculo.listar());
    } catch (error) {
        next(error);
    }
}

// ---------- CONSULTAR UNO ----------
async function obtener(req, res, next) {
    try {
        const vehiculo = await Vehiculo.buscarPorCodigo(req.params.codigo.toUpperCase());
        if (!vehiculo) return res.status(404).json({ mensaje: 'Vehículo no encontrado.' });
        res.json(vehiculo);
    } catch (error) {
        next(error);
    }
}

// ---------- REGISTRAR ----------
async function crear(req, res, next) {
    const fotoNueva = req.file ? req.file.filename : null;

    const { datos, errores } = Vehiculo.validarVehiculo(req.body);
    if (Object.keys(errores).length > 0) {
        borrarFoto(fotoNueva);
        return res.status(400).json({ mensaje: 'Datos inválidos.', errores });
    }

    try {
        res.status(201).json(await Vehiculo.crear(datos, fotoNueva));
    } catch (error) {
        borrarFoto(fotoNueva);
        // 23505 = violación de restricción UNIQUE (código repetido)
        if (error.code === '23505') {
            return res.status(409).json({
                mensaje: 'Código repetido.',
                errores: { codigo: 'Ya existe un vehículo con el código ' + datos.codigo + '.' }
            });
        }
        next(error);
    }
}

// ---------- MODIFICAR ----------
async function actualizar(req, res, next) {
    const codigo = req.params.codigo.toUpperCase();
    const fotoNueva = req.file ? req.file.filename : null;
    const quitarFoto = String(req.body.quitarFoto) === 'true';

    // El código identifica al vehículo y no se cambia
    const { datos, errores } = Vehiculo.validarVehiculo({ ...req.body, codigo });
    if (Object.keys(errores).length > 0) {
        borrarFoto(fotoNueva);
        return res.status(400).json({ mensaje: 'Datos inválidos.', errores });
    }

    try {
        const fotoAnterior = await Vehiculo.fotoActual(codigo);
        if (fotoAnterior === undefined) {
            borrarFoto(fotoNueva);
            return res.status(404).json({ mensaje: 'Vehículo no encontrado.' });
        }

        // Nueva foto > quitar foto > dejar la que estaba
        const fotoFinal = fotoNueva || (quitarFoto ? null : fotoAnterior);
        const vehiculo = await Vehiculo.actualizar(codigo, datos, fotoFinal);

        if (fotoAnterior && fotoAnterior !== fotoFinal) borrarFoto(fotoAnterior);
        res.json(vehiculo);
    } catch (error) {
        borrarFoto(fotoNueva);
        next(error);
    }
}

// ---------- ELIMINAR ----------
async function eliminar(req, res, next) {
    try {
        const eliminado = await Vehiculo.eliminar(req.params.codigo.toUpperCase());
        if (!eliminado) return res.status(404).json({ mensaje: 'Vehículo no encontrado.' });
        borrarFoto(eliminado.foto);
        res.json({ mensaje: 'Vehículo eliminado.', codigo: eliminado.codigo });
    } catch (error) {
        next(error);
    }
}

module.exports = { listar, obtener, crear, actualizar, eliminar };
