/* ==========================================================
   Configuración: conexión a PostgreSQL
   Usa un "pool" de conexiones: se reutilizan entre peticiones
   en lugar de abrir una conexión nueva cada vez.
   ========================================================== */

const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'automax_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || ''
});

// Columnas que el sistema necesita. Si falta alguna, se indica qué script ejecutar.
const COLUMNAS_REQUERIDAS = [
    ['vehiculos', 'foto'],
    ['vehiculos', 'transmision'],
    ['vehiculos', 'condicion'],
    ['vehiculos', 'kilometraje'],
    ['usuarios', 'rol']
];

// Comprueba que la base de datos responde y que existen las tablas y columnas del sistema.
async function probarConexion() {
    const resultado = await pool.query(
        `SELECT current_database() AS base,
                to_regclass('public.vehiculos') AS vehiculos,
                to_regclass('public.usuarios')  AS usuarios`
    );
    const fila = resultado.rows[0];
    if (!fila.vehiculos) {
        throw new Error('La tabla "vehiculos" no existe en "' + fila.base +
                        '". Ejecute database/02_crear_tablas.sql');
    }

    const columnas = await pool.query(
        `SELECT table_name, column_name FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name IN ('vehiculos', 'usuarios')`
    );
    const existentes = new Set(columnas.rows.map(function (c) { return c.table_name + '.' + c.column_name; }));
    const faltantes = COLUMNAS_REQUERIDAS
        .filter(function (par) { return !existentes.has(par[0] + '.' + par[1]); })
        .map(function (par) { return par[0] + '.' + par[1]; });

    if (!fila.usuarios || faltantes.length > 0) {
        throw new Error('A la base "' + fila.base + '" le falta ' +
                        (fila.usuarios ? 'la columna ' + faltantes.join(', ') : 'la tabla "usuarios"') +
                        '. Ejecute database/04_actualizar_base_existente.sql (no borra datos).');
    }
    return fila.base;
}

module.exports = { pool, probarConexion };
