-- ==========================================================
-- AutoMax - Paso 2: Crear la tabla de vehículos
-- Ejecutar conectado a la base "automax_db".
-- ATENCIÓN: borra la tabla si ya existe (y sus datos).
-- ==========================================================

DROP TABLE IF EXISTS vehiculos;

CREATE TABLE vehiculos (
    id                  INTEGER       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,  -- Autoincrementable
    codigo              VARCHAR(15)   NOT NULL,                                  -- Código visible en el formulario
    marca               VARCHAR(40)   NOT NULL,
    modelo              VARCHAR(40)   NOT NULL,
    anio                SMALLINT      NOT NULL,
    color               VARCHAR(30)   NOT NULL,
    combustible         VARCHAR(20)   NOT NULL,
    precio              NUMERIC(12,2) NOT NULL,
    cantidad            INTEGER       NOT NULL,
    descripcion         VARCHAR(300)  NOT NULL,
    fecha_registro      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP,

    -- Reglas de negocio validadas también por la base de datos
    CONSTRAINT uq_vehiculos_codigo  UNIQUE (codigo),                             -- No permite códigos repetidos
    CONSTRAINT chk_codigo_no_vacio  CHECK (TRIM(codigo) <> ''),
    CONSTRAINT chk_anio_valido      CHECK (anio BETWEEN 1900 AND 2100),
    CONSTRAINT chk_precio_positivo  CHECK (precio > 0),
    CONSTRAINT chk_cantidad_valida  CHECK (cantidad >= 0),
    CONSTRAINT chk_combustible      CHECK (combustible IN ('Gasolina', 'Diésel', 'Híbrido', 'Eléctrico', 'GLP'))
);

COMMENT ON TABLE vehiculos IS 'Vehículos nuevos disponibles para la venta en AutoMax';
