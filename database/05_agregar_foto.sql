-- ==========================================================
-- AutoMax - Paso 5: Agregar la columna de la foto
-- Para bases que ya tienen la tabla "vehiculos" con datos.
-- No borra nada. Ejecutar conectado a la base "automax_db".
-- ==========================================================

ALTER TABLE vehiculos
    ADD COLUMN IF NOT EXISTS foto VARCHAR(255);

COMMENT ON COLUMN vehiculos.foto IS 'Nombre del archivo de la foto en public/img/vehiculos; NULL = sin foto';

-- Verificación: debe aparecer la columna "foto"
SELECT column_name, data_type, character_maximum_length
FROM information_schema.columns
WHERE table_name = 'vehiculos'
ORDER BY ordinal_position;
