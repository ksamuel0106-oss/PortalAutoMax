-- ==========================================================
-- AutoMax - Paso 4: Actualizar una base que ya tiene datos
-- Agrega lo que falte (foto, transmisión, condición, kilometraje,
-- tabla "usuarios" con roles y el administrador) sin borrar
-- ningún vehículo. Se puede ejecutar más de una vez.
-- Ejecutar conectado a la base "automax_db".
-- ==========================================================

-- 1. Columnas nuevas de la tabla vehiculos
ALTER TABLE vehiculos ADD COLUMN IF NOT EXISTS foto        VARCHAR(255);
ALTER TABLE vehiculos ADD COLUMN IF NOT EXISTS transmision VARCHAR(20) NOT NULL DEFAULT 'Automática';
ALTER TABLE vehiculos ADD COLUMN IF NOT EXISTS condicion   VARCHAR(10) NOT NULL DEFAULT 'Nuevo';
ALTER TABLE vehiculos ADD COLUMN IF NOT EXISTS kilometraje INTEGER     NOT NULL DEFAULT 0;

COMMENT ON COLUMN vehiculos.foto IS 'Nombre del archivo de la foto en frontend/img/vehiculos; NULL = sin foto';

-- Reglas de las columnas nuevas (solo se agregan si todavía no existen)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_transmision') THEN
        ALTER TABLE vehiculos ADD CONSTRAINT chk_transmision
            CHECK (transmision IN ('Automática', 'Manual', 'CVT', 'Doble embrague'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_condicion') THEN
        ALTER TABLE vehiculos ADD CONSTRAINT chk_condicion
            CHECK (condicion IN ('Nuevo', 'Usado'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_kilometraje') THEN
        ALTER TABLE vehiculos ADD CONSTRAINT chk_kilometraje
            CHECK (kilometraje >= 0 AND (condicion = 'Usado' OR kilometraje = 0));
    END IF;
END
$$;

-- 2. Tabla de usuarios con roles
CREATE TABLE IF NOT EXISTS usuarios (
    id              INTEGER       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,  -- Autoincrementable
    nombre          VARCHAR(80)   NOT NULL,
    correo          VARCHAR(120)  NOT NULL,
    password        VARCHAR(200)  NOT NULL,                                  -- Se guarda cifrada (hash scrypt), nunca en texto plano
    rol             VARCHAR(15)   NOT NULL DEFAULT 'usuario',                -- admin o usuario (el invitado no se guarda)
    fecha_registro  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_usuarios_correo     UNIQUE (correo),                       -- No permite correos duplicados
    CONSTRAINT chk_nombre_no_vacio    CHECK (TRIM(nombre) <> ''),
    CONSTRAINT chk_correo_minusculas  CHECK (correo = LOWER(correo))         -- Evita "Ana@x.com" y "ana@x.com" como cuentas distintas
);

-- Si la tabla ya existía sin roles, se agrega la columna
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS rol VARCHAR(15) NOT NULL DEFAULT 'usuario';

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_rol') THEN
        ALTER TABLE usuarios ADD CONSTRAINT chk_rol CHECK (rol IN ('admin', 'usuario'));
    END IF;
END
$$;

COMMENT ON TABLE usuarios IS 'Usuarios registrados en el portal AutoMax';

-- ---------- Administrador del portal ----------
-- Correo: ventas@automaxlavega.com   Contraseña: 12345 (cifrada con scrypt)
-- Proyecto de aula: cambie esta contraseña si el portal se usa fuera de clase.
INSERT INTO usuarios (nombre, correo, password, rol)
VALUES ('Equipo AutoMax', 'ventas@automaxlavega.com',
        'scrypt$a3f1c9e27b5d4086f2e1b7c3d9a04e5f$0a12498375ab82d3bc0fc909f9c3f30a2c18ac1146951964f1b3226ae74f413ac6e7dc614bf500d2071045d3f50bd109dd2d10963df1685437554700fad49f9f', 'admin')
ON CONFLICT (correo) DO UPDATE SET nombre = EXCLUDED.nombre, rol = 'admin', password = EXCLUDED.password;

-- Verificación: deben aparecer las columnas nuevas y el administrador
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE (table_name = 'vehiculos' AND column_name IN ('foto', 'transmision', 'condicion', 'kilometraje'))
   OR (table_name = 'usuarios' AND column_name = 'rol')
ORDER BY table_name, column_name;

SELECT id, nombre, correo, rol FROM usuarios WHERE rol = 'admin';
