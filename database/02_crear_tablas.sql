-- ==========================================================
-- AutoMax - Paso 2: Crear las tablas "vehiculos" y "usuarios" (instalación nueva)
-- Ejecutar conectado a la base "automax_db".
-- ATENCIÓN: borra las tablas si ya existen (y sus datos).
-- Si su base ya tiene vehículos, NO use este script: use 04_actualizar_base_existente.sql
-- ==========================================================

DROP TABLE IF EXISTS vehiculos;
DROP TABLE IF EXISTS usuarios;

CREATE TABLE vehiculos (
    id                  INTEGER       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,  -- Autoincrementable
    codigo              VARCHAR(15)   NOT NULL,                                  -- Código visible en el formulario
    marca               VARCHAR(40)   NOT NULL,
    modelo              VARCHAR(40)   NOT NULL,
    anio                SMALLINT      NOT NULL,
    color               VARCHAR(30)   NOT NULL,
    combustible         VARCHAR(20)   NOT NULL,
    transmision         VARCHAR(20)   NOT NULL DEFAULT 'Automática',
    condicion           VARCHAR(10)   NOT NULL DEFAULT 'Nuevo',                  -- Nuevo o Usado
    kilometraje         INTEGER       NOT NULL DEFAULT 0,                        -- 0 en los vehículos nuevos
    precio              NUMERIC(12,2) NOT NULL,
    cantidad            INTEGER       NOT NULL,
    descripcion         VARCHAR(300)  NOT NULL,
    foto                VARCHAR(255),                                            -- Nombre del archivo en frontend/img/vehiculos (opcional)
    fecha_registro      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP,

    -- Reglas de negocio validadas también por la base de datos
    CONSTRAINT uq_vehiculos_codigo  UNIQUE (codigo),                             -- No permite códigos repetidos
    CONSTRAINT chk_codigo_no_vacio  CHECK (TRIM(codigo) <> ''),
    CONSTRAINT chk_anio_valido      CHECK (anio BETWEEN 1900 AND 2100),
    CONSTRAINT chk_precio_positivo  CHECK (precio > 0),
    CONSTRAINT chk_cantidad_valida  CHECK (cantidad >= 0),
    CONSTRAINT chk_combustible      CHECK (combustible IN ('Gasolina', 'Diésel', 'Híbrido', 'Eléctrico', 'GLP')),
    CONSTRAINT chk_transmision      CHECK (transmision IN ('Automática', 'Manual', 'CVT', 'Doble embrague')),
    CONSTRAINT chk_condicion        CHECK (condicion IN ('Nuevo', 'Usado')),
    CONSTRAINT chk_kilometraje      CHECK (kilometraje >= 0 AND (condicion = 'Usado' OR kilometraje = 0))
);

COMMENT ON TABLE vehiculos IS 'Vehículos nuevos y usados disponibles para la venta en AutoMax';
COMMENT ON COLUMN vehiculos.foto IS 'Nombre del archivo de la foto en frontend/img/vehiculos; NULL = sin foto';


-- ==========================================================
-- Tabla de usuarios (login, registro y roles)
-- ==========================================================

CREATE TABLE usuarios (
    id              INTEGER       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,  -- Autoincrementable
    nombre          VARCHAR(80)   NOT NULL,
    correo          VARCHAR(120)  NOT NULL,
    password        VARCHAR(200)  NOT NULL,                                  -- Se guarda cifrada (hash scrypt), nunca en texto plano
    rol             VARCHAR(15)   NOT NULL DEFAULT 'usuario',                -- admin o usuario (el invitado no se guarda)
    fecha_registro  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_usuarios_correo     UNIQUE (correo),                       -- No permite correos duplicados
    CONSTRAINT chk_nombre_no_vacio    CHECK (TRIM(nombre) <> ''),
    CONSTRAINT chk_correo_minusculas  CHECK (correo = LOWER(correo)),        -- Evita "Ana@x.com" y "ana@x.com" como cuentas distintas
    CONSTRAINT chk_rol                CHECK (rol IN ('admin', 'usuario'))
);

COMMENT ON TABLE usuarios IS 'Usuarios registrados en el portal AutoMax';

-- ---------- Administrador del portal ----------
-- Correo: ventas@automaxlavega.com   Contraseña: 12345 (cifrada con scrypt)
-- Proyecto de aula: cambie esta contraseña si el portal se usa fuera de clase.
INSERT INTO usuarios (nombre, correo, password, rol)
VALUES ('Equipo AutoMax', 'ventas@automaxlavega.com',
        'scrypt$a3f1c9e27b5d4086f2e1b7c3d9a04e5f$0a12498375ab82d3bc0fc909f9c3f30a2c18ac1146951964f1b3226ae74f413ac6e7dc614bf500d2071045d3f50bd109dd2d10963df1685437554700fad49f9f', 'admin')
ON CONFLICT (correo) DO UPDATE SET nombre = EXCLUDED.nombre, rol = 'admin', password = EXCLUDED.password;
