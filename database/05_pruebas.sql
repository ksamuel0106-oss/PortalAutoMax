-- ==========================================================
-- AutoMax - Paso 5 (opcional): Pruebas de inserción y consulta
-- Ejecutar conectado a la base "automax_db".
-- ==========================================================

-- ---------- VEHÍCULOS: INSERCIÓN ----------
INSERT INTO vehiculos (codigo, marca, modelo, anio, color, combustible, transmision, condicion,
                       kilometraje, precio, cantidad, descripcion)
VALUES
    ('VH-101', 'Toyota',  'Corolla', 2026, 'Blanco perla', 'Gasolina', 'CVT',        'Nuevo',     0, 1450000.00, 5, 'Sedán 1.8L de prueba'),
    ('VH-102', 'Honda',   'CR-V',    2026, 'Gris',         'Híbrido',  'CVT',        'Nuevo',     0, 2350000.00, 3, 'SUV híbrida de prueba'),
    ('VH-103', 'Hyundai', 'Tucson',  2020, 'Azul',         'Diésel',   'Automática', 'Usado', 70500, 1180000.50, 1, 'SUV diésel usada de prueba')
ON CONFLICT (codigo) DO NOTHING;

-- ---------- VEHÍCULOS: CONSULTA ----------
-- 1. Todos los vehículos
SELECT id, codigo, marca, modelo, anio, condicion, kilometraje, transmision, combustible, precio, cantidad, foto
FROM vehiculos
ORDER BY id;

-- 2. Solo los nuevos y solo los usados
SELECT codigo, marca, modelo, anio, precio FROM vehiculos WHERE condicion = 'Nuevo' ORDER BY marca;
SELECT codigo, marca, modelo, anio, kilometraje, precio FROM vehiculos WHERE condicion = 'Usado' ORDER BY kilometraje;

-- 3. Un vehículo por su código
SELECT * FROM vehiculos WHERE codigo = 'VH-102';

-- 4. Resumen del inventario por condición
SELECT condicion,
       COUNT(*)                AS vehiculos,
       SUM(cantidad)           AS unidades,
       SUM(precio * cantidad)  AS valor_inventario
FROM vehiculos
GROUP BY condicion;

-- ---------- VEHÍCULOS: RESTRICCIONES (deben FALLAR) ----------
-- Descomente una a la vez para comprobar que la base de datos rechaza datos inválidos.
-- INSERT INTO vehiculos (codigo, marca, modelo, anio, color, combustible, transmision, condicion, kilometraje, precio, cantidad, descripcion)
--     VALUES ('VH-101', 'Kia', 'Rio', 2026, 'Rojo', 'Gasolina', 'Manual', 'Nuevo', 0, 900000, 2, 'Código repetido');      -- uq_vehiculos_codigo
-- INSERT INTO vehiculos (codigo, marca, modelo, anio, color, combustible, transmision, condicion, kilometraje, precio, cantidad, descripcion)
--     VALUES ('VH-200', 'Kia', 'Rio', 2026, 'Rojo', 'Gasolina', 'Manual', 'Nuevo', 0, 0, 2, 'Precio cero');               -- chk_precio_positivo
-- INSERT INTO vehiculos (codigo, marca, modelo, anio, color, combustible, transmision, condicion, kilometraje, precio, cantidad, descripcion)
--     VALUES ('VH-201', 'Kia', 'Rio', 2026, 'Rojo', 'Gasolina', 'Manual', 'Nuevo', 1500, 900000, 2, 'Nuevo con km');       -- chk_kilometraje
-- INSERT INTO vehiculos (codigo, marca, modelo, anio, color, combustible, transmision, condicion, kilometraje, precio, cantidad, descripcion)
--     VALUES ('VH-202', 'Kia', 'Rio', 2026, 'Rojo', 'Gasolina', 'Triptónica', 'Nuevo', 0, 900000, 2, 'Transmisión inválida'); -- chk_transmision

-- ---------- USUARIOS: CONSULTA ----------
-- Los usuarios se registran desde el portal para que la contraseña se guarde cifrada.
-- 1. Usuarios registrados y su rol (sin mostrar la contraseña)
SELECT id, nombre, correo, rol, fecha_registro FROM usuarios ORDER BY fecha_registro;

-- 2. Comprobar que la contraseña está cifrada (debe verse "scrypt$...")
SELECT correo, LEFT(password, 20) AS password_cifrada FROM usuarios;

-- 3. Convertir un usuario registrado en administrador (cambie el correo)
-- UPDATE usuarios SET rol = 'admin' WHERE correo = 'correo@ejemplo.com';

-- ---------- LIMPIEZA (opcional) ----------
-- DELETE FROM vehiculos WHERE codigo IN ('VH-101', 'VH-102', 'VH-103');
