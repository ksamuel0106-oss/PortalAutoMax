-- ==========================================================
-- AutoMax - Paso 3: Datos de ejemplo (10 nuevos y 5 usados)
-- Ejecutar conectado a la base "automax_db".
-- Precios, kilometrajes y cantidades son ficticios, solo para pruebas.
-- Si un código ya existe, se actualizan sus datos (la foto se conserva).
-- ==========================================================

INSERT INTO vehiculos (codigo, marca, modelo, anio, color, combustible, transmision, condicion,
                       kilometraje, precio, cantidad, descripcion)
VALUES
    ('VH-001', 'Toyota',     'Corolla',  2026, 'Blanco perla', 'Gasolina',  'CVT',        'Nuevo',      0, 1450000.00, 5, 'Sedán compacto con cámara de reversa y asistente de carril.'),
    ('VH-002', 'Honda',      'Civic',    2026, 'Gris plata',   'Gasolina',  'CVT',        'Nuevo',      0, 1680000.00, 4, 'Sedán con pantalla táctil y conectividad para celular.'),
    ('VH-003', 'Hyundai',    'Tucson',   2021, 'Azul marino',  'Diésel',    'Automática', 'Usado',  48500, 1390000.00, 1, 'SUV mediana de un solo dueño, mantenimientos al día en taller.'),
    ('VH-004', 'Kia',        'Sportage', 2026, 'Rojo',         'Gasolina',  'Automática', 'Nuevo',      0, 1950000.00, 6, 'SUV compacta con sensores de estacionamiento.'),
    ('VH-005', 'Toyota',     'Hilux',    2026, 'Blanco',       'Diésel',    'Manual',     'Nuevo',      0, 2850000.00, 4, 'Camioneta doble cabina 4x4, ideal para trabajo pesado.'),
    ('VH-006', 'Toyota',     'Prius',    2020, 'Gris oscuro',  'Híbrido',   'CVT',        'Usado',  62300,  990000.00, 1, 'Hatchback híbrido de bajo consumo, batería revisada.'),
    ('VH-007', 'Toyota',     'RAV4',     2026, 'Verde oliva',  'Híbrido',   'CVT',        'Nuevo',      0, 2650000.00, 3, 'SUV híbrida, cómoda para ciudad y carretera.'),
    ('VH-008', 'Hyundai',    'Ioniq 5',  2026, 'Blanco',       'Eléctrico', 'Automática', 'Nuevo',      0, 3200000.00, 2, 'SUV 100 % eléctrica, compatible con carga rápida.'),
    ('VH-009', 'Nissan',     'Leaf',     2025, 'Azul cielo',   'Eléctrico', 'Automática', 'Nuevo',      0, 2400000.00, 0, 'Vehículo eléctrico urbano. Agotado temporalmente.'),
    ('VH-010', 'Ford',       'Ranger',   2022, 'Negro',        'Diésel',    'Automática', 'Usado',  35800, 1850000.00, 1, 'Camioneta doble cabina con caja protegida y gomas nuevas.'),
    ('VH-011', 'Mitsubishi', 'L200',     2019, 'Plateado',     'Diésel',    'Manual',     'Usado',  87200, 1150000.00, 2, 'Camioneta de trabajo con historial de servicio completo.'),
    ('VH-012', 'Mazda',      'CX-5',     2026, 'Rojo cereza',  'Gasolina',  'Automática', 'Nuevo',      0, 2200000.00, 4, 'SUV con interior en piel sintética y diseño deportivo.'),
    ('VH-013', 'Hyundai',    'Elantra',  2026, 'Negro',        'Gasolina',  'CVT',        'Nuevo',      0, 1550000.00, 7, 'Sedán moderno con buen rendimiento de combustible.'),
    ('VH-014', 'Kia',        'K5',       2021, 'Blanco',       'GLP',       'Automática', 'Usado',  41000, 1080000.00, 1, 'Sedán mediano con sistema de GLP instalado y certificado.'),
    ('VH-015', 'Suzuki',     'Swift',    2026, 'Amarillo',     'Gasolina',  'Manual',     'Nuevo',      0,  980000.00, 8, 'Hatchback compacto, económico y fácil de estacionar.')
ON CONFLICT (codigo) DO UPDATE SET
    marca = EXCLUDED.marca, modelo = EXCLUDED.modelo, anio = EXCLUDED.anio, color = EXCLUDED.color,
    combustible = EXCLUDED.combustible, transmision = EXCLUDED.transmision,
    condicion = EXCLUDED.condicion, kilometraje = EXCLUDED.kilometraje,
    precio = EXCLUDED.precio, cantidad = EXCLUDED.cantidad, descripcion = EXCLUDED.descripcion;

-- Verificación
SELECT codigo, marca, modelo, anio, condicion, kilometraje, transmision, precio
FROM vehiculos
ORDER BY condicion, codigo;
