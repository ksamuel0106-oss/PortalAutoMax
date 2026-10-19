-- ==========================================================
-- AutoMax - Paso 3 (opcional): Pruebas de inserción y consulta
-- Ejecutar conectado a la base "automax_db".
-- ==========================================================

-- ---------- PRUEBAS DE INSERCIÓN ----------
INSERT INTO vehiculos (codigo, marca, modelo, anio, color, combustible, precio, cantidad, descripcion)
VALUES
    ('VH-101', 'Toyota',  'Corolla', 2026, 'Blanco perla', 'Gasolina', 1450000.00, 5, 'Sedán 1.8L, transmisión automática'),
    ('VH-102', 'Honda',   'CR-V',    2026, 'Gris',         'Híbrido',  2350000.00, 3, 'SUV híbrida con tracción AWD'),
    ('VH-103', 'Hyundai', 'Tucson',  2025, 'Azul',         'Diésel',   1980000.50, 0, 'SUV diésel, edición limitada');

-- ---------- PRUEBAS DE CONSULTA ----------
-- 1. Todos los vehículos
SELECT codigo, marca, modelo, anio, color, combustible, precio, cantidad
FROM vehiculos
ORDER BY codigo;

-- 2. Un vehículo por su código
SELECT * FROM vehiculos WHERE codigo = 'VH-102';

-- 3. Vehículos con unidades disponibles
SELECT codigo, marca, modelo, cantidad FROM vehiculos WHERE cantidad > 0;

-- 4. Resumen del inventario
SELECT COUNT(*)                AS vehiculos_registrados,
       SUM(cantidad)           AS unidades_disponibles,
       SUM(precio * cantidad)  AS valor_inventario
FROM vehiculos;

-- ---------- PRUEBAS DE RESTRICCIONES (deben FALLAR) ----------
-- Descomente una a la vez para comprobar que la base de datos rechaza datos inválidos.
-- INSERT INTO vehiculos VALUES ('VH-101','Kia','Rio',2026,'Rojo','Gasolina',900000,2,'Código repetido');   -- PRIMARY KEY
-- INSERT INTO vehiculos VALUES ('VH-200','Kia','Rio',2026,'Rojo','Gasolina',0,2,'Precio cero');            -- chk_precio_positivo
-- INSERT INTO vehiculos VALUES ('VH-201','Kia','Rio',1800,'Rojo','Gasolina',900000,2,'Año inválido');      -- chk_anio_valido

-- ---------- LIMPIEZA (opcional) ----------
-- DELETE FROM vehiculos WHERE codigo IN ('VH-101', 'VH-102', 'VH-103');
