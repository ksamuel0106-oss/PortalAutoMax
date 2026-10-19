/* ==========================================================
   Conexión a PostgreSQL
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

// Comprueba que la base de datos responde y que existe la tabla de vehículos.
async function probarConexion() {
    const resultado = await pool.query(
        "SELECT current_database() AS base, to_regclass('public.vehiculos') AS tabla"
    );
    const { base, tabla } = resultado.rows[0];
    if (!tabla) {
        throw new Error('La tabla "vehiculos" no existe en "' + base +
                        '". Ejecute database/02_crear_tablas.sql');
    }
    return base;
}

module.exports = { pool, probarConexion };
