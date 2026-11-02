# AutoMax – Portal de Vehículos con PostgreSQL

Versión 2 del portal de la agencia AutoMax. El formulario y el diseño son los mismos de la versión con LocalStorage; ahora los datos se guardan en una base de datos **PostgreSQL** a través de un servidor **Node.js + Express**.

## Arquitectura

```
Navegador (HTML/CSS/JS)  --fetch JSON-->  Servidor Node.js (Express)  --pg-->  PostgreSQL
     public/js/app.js                      server.js + src/                   automax_db.vehiculos
```

## Estructura del proyecto

```
AgenciaVehiculos/
├── public/                     Frontend, una página por módulo
│   ├── index.html              Inicio: portada, combustibles, resumen, recientes, servicios
│   ├── inventario.html         Consulta en tarjetas, búsqueda, filtro y eliminación
│   ├── registrar.html          Formulario de registro y edición (?editar=CODIGO)
│   ├── contacto.html           Datos de contacto y QR de WhatsApp
│   ├── css/estilos.css
│   ├── js/comun.js             API, avisos, menú y tarjeta de vehículo
│   ├── js/inicio.js
│   ├── js/inventario.js
│   ├── js/registrar.js
│   └── img/                    marca/, portada/, banners/, vehiculos/
├── src/
│   ├── db.js                   Conexión a PostgreSQL (Pool de "pg")
│   ├── validaciones.js         Validaciones del lado del servidor
│   └── rutas/vehiculos.js      API REST: SELECT, INSERT, UPDATE, DELETE
├── database/
│   ├── 01_crear_base_datos.sql
│   ├── 02_crear_tablas.sql     Tabla con id autoincrementable y codigo único
│   ├── 03_pruebas.sql          Pruebas de inserción y consulta
│   └── 04_datos_vehiculos.sql  15 vehículos de ejemplo
├── server.js                   Punto de entrada del servidor
├── package.json
└── .env.example                Plantilla de la configuración de conexión
```

### Fotos de los vehículos

Cada foto se guarda en `public/img/vehiculos/` con el código del vehículo como nombre, por ejemplo `VH-001.jpg`. Se acepta `.jpg`, `.png` o `.webp`. Si un vehículo no tiene foto, el portal muestra `sin-foto.jpg`.

## Requisitos

- [Node.js](https://nodejs.org) 18 o superior
- [PostgreSQL](https://www.postgresql.org/download/) 13 o superior (incluye pgAdmin)

## Instalación paso a paso

**1. Crear la base de datos.** En pgAdmin abra el *Query Tool* sobre la base `postgres` y ejecute `database/01_crear_base_datos.sql`.
O desde la terminal:

```bash
psql -U postgres -f database/01_crear_base_datos.sql
```

**2. Crear la tabla.** Abra el *Query Tool* sobre la base `automax_db` y ejecute `database/02_crear_tablas.sql`.

```bash
psql -U postgres -d automax_db -f database/02_crear_tablas.sql
```

**3. Configurar la conexión.** Copie `.env.example` con el nombre `.env` y escriba la contraseña de su usuario de PostgreSQL:

```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=automax_db
DB_USER=postgres
DB_PASSWORD=su_contraseña
PORT=3000
```

**4. Instalar dependencias** (desde la carpeta `AgenciaVehiculos`):

```bash
npm install
```

**5. Iniciar el servidor:**

```bash
npm start
```

Si todo está bien, la terminal muestra:

```
Conectado a PostgreSQL, base de datos "automax_db".
AutoMax disponible en http://localhost:3000
```

**6. Abrir** <http://localhost:3000> en el navegador.

> Importante: ya no se abre `index.html` con doble clic. La página debe abrirse desde `http://localhost:3000` para que pueda comunicarse con el servidor.

## API REST

| Método | Ruta                       | Operación SQL | Descripción                     |
|--------|----------------------------|---------------|---------------------------------|
| GET    | `/api/vehiculos`           | SELECT        | Consulta todos los vehículos    |
| GET    | `/api/vehiculos/:codigo`   | SELECT        | Consulta un vehículo            |
| POST   | `/api/vehiculos`           | INSERT        | Registra un vehículo            |
| PUT    | `/api/vehiculos/:codigo`   | UPDATE        | Modifica un vehículo            |
| DELETE | `/api/vehiculos/:codigo`   | DELETE        | Elimina un vehículo             |

Todas las consultas usan parámetros (`$1, $2, ...`), lo que evita la inyección SQL.

## Validaciones (en tres niveles)

| Regla                         | Formulario (JS) | Servidor (Node) | Base de datos              |
|-------------------------------|:---------------:|:---------------:|----------------------------|
| Campos obligatorios           | ✔               | ✔               | `NOT NULL`                 |
| Precio mayor que cero         | ✔               | ✔               | `CHECK (precio > 0)`       |
| Año válido                    | ✔               | ✔               | `CHECK (anio BETWEEN ...)` |
| Cantidad numérica             | ✔               | ✔               | `INTEGER`, `CHECK (>= 0)`  |
| Código no repetido            | ✔               | ✔               | `PRIMARY KEY`              |

## Pruebas de inserción y consulta

1. **Desde el portal:** registre un vehículo en el formulario y compruebe que aparece en la tabla. Cierre el navegador, vuelva a abrir `http://localhost:3000` y los datos siguen ahí porque se consultan en PostgreSQL.
2. **Desde PostgreSQL:** verifique que el registro llegó a la base de datos:

   ```sql
   SELECT * FROM vehiculos ORDER BY fecha_registro;
   ```

3. **Script de pruebas:** ejecute `database/03_pruebas.sql` para insertar datos de ejemplo, hacer consultas y comprobar que las restricciones rechazan datos inválidos. Los vehículos insertados por SQL aparecen en el portal al recargar la página.

## Problemas comunes

| Mensaje                                         | Solución                                                         |
|-------------------------------------------------|------------------------------------------------------------------|
| `password authentication failed`                | Revise `DB_USER` y `DB_PASSWORD` en el archivo `.env`.           |
| `database "automax_db" does not exist`          | Ejecute `database/01_crear_base_datos.sql`.                      |
| `La tabla "vehiculos" no existe`                | Ejecute `database/02_crear_tablas.sql` sobre `automax_db`.       |
| `ECONNREFUSED`                                  | Inicie el servicio de PostgreSQL (Windows: *Servicios* → postgresql). |
| `EADDRINUSE: address already in use :::3000`   | Cambie `PORT` en `.env` (ej.: 3001).                             |
| La tabla dice *"No se pudo conectar con el servidor"* | Ejecute `npm start` y abra la página desde `http://localhost:3000`. |
