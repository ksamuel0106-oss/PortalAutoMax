/* ==========================================================
   Rutas: /api/vehiculos
   GET    /api/vehiculos           -> Consultar todos       (público)
   GET    /api/vehiculos/:codigo   -> Consultar uno         (público)
   POST   /api/vehiculos           -> Registrar (INSERT)    (solo admin)
   PUT    /api/vehiculos/:codigo   -> Modificar (UPDATE)    (solo admin)
   DELETE /api/vehiculos/:codigo   -> Eliminar (DELETE)     (solo admin)

   POST y PUT aceptan JSON o multipart/form-data con una foto
   en el campo "foto" (JPG, PNG o WebP, hasta 5 MB).
   El permiso se revisa antes de recibir la foto.
   ========================================================== */

const express = require('express');
const controlador = require('../controladores/vehiculosControlador');
const { requiereAdmin } = require('../middleware/autenticacion');
const { recibirFoto } = require('../middleware/subidaFoto');

const router = express.Router();

router.get('/', controlador.listar);
router.get('/:codigo', controlador.obtener);
router.post('/', requiereAdmin, recibirFoto, controlador.crear);
router.put('/:codigo', requiereAdmin, recibirFoto, controlador.actualizar);
router.delete('/:codigo', requiereAdmin, controlador.eliminar);

module.exports = router;
