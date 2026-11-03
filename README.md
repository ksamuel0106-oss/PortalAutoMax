# AutoMax - Portal de Vehículos con login y roles

Portal web de AutoMax, agencia ficticia de vehículos nuevos y usados en La Vega, República Dominicana. Incluye inicio de sesión, registro de usuarios, acceso como invitado, roles y gestión completa de vehículos (CRUD) con fotos.

Tecnologías: HTML5, CSS3, JavaScript, Node.js, Express, PostgreSQL, librería `pg`, `cors`, `express-session` y `multer`.

## Estructura del proyecto

```
AgenciaVehiculos/
├── backend/
│   ├── server.js                      Punto de entrada del servidor
│   ├── config/
│   │   ├── db.js                      Conexión a PostgreSQL (Pool de "pg")
│   │   └── sesion.js                  Sesiones en el servidor (express-session)
│   ├── controladores/
│   │   ├── usuariosControlador.js     Registro, login, invitado, sesión y logout
│   │   └── vehiculosControlador.js    CRUD de vehículos
│   ├── modelos/
│   │   ├── usuarioModelo.js           Validación, cifrado scrypt y consultas de usuarios
│   │   └── vehiculoModelo.js          Validación y consultas de vehículos
│   ├── rutas/
│   │   ├── usuarios.js                /api/usuarios
│   │   └── vehiculos.js               /api/vehiculos
│   └── middleware/
│       ├── autenticacion.js           requiereSesion y requiereAdmin
│       ├── subidaFoto.js              Subida de fotos con multer
│       └── errores.js                 Rutas inexistentes y errores
├── frontend/
│   ├── login.html                     Inicio de sesión, registro e invitado (página de inicio)
│   ├── index.html                     Inicio del portal
│   ├── inventario.html                Vehículos nuevos, usados y (admin) todos
│   ├── registrar.html                 Registro y edición de vehículos (solo admin)
│   ├── nosotros.html
│   ├── sucursales.html
│   ├── contacto.html
│   ├── css/                           estilos.css y login.css
│   ├── js/                            sesion.js, comun.js y un archivo por página
│   └── img/                           marca, portada, banners, login, nosotros, sucursales, vehiculos
├── database/
│   ├── 01_crear_base_datos.sql        Crea automax_db
│   ├── 02_crear_tablas.sql            Instalación nueva: vehiculos y usuarios (borra lo que haya)
│   ├── 03_datos_vehiculos.sql         10 vehículos nuevos y 5 usados de ejemplo
│   ├── 04_actualizar_base_existente.sql  Agrega columnas, roles y administrador sin borrar datos
│   └── 05_pruebas.sql                 Pruebas de inserción y consulta (opcional)
├── package.json
└── .env.example
```

## Roles

| Acción | Administrador | Usuario registrado | Invitado |
|---|:---:|:---:|:---:|
| Ver vehículos nuevos y usados | Sí | Sí | Sí |
| Ver el inventario completo ("Todos") y el resumen | Sí | No | No |
| Registrar, editar y eliminar vehículos | Sí | No | No |

- Los usuarios que se registran desde el portal reciben el rol **usuario**.
- El **administrador** se crea con los scripts `02` o `04`:
  - Correo: `ventas@automaxlavega.com`
  - Contraseña: `12345`
  - Es una contraseña de aula. Si el portal se usa fuera de clase, cámbiela.
- El **invitado** no se guarda en la base de datos: solo abre una sesión de consulta.
- El permiso se revisa **en el servidor**: POST, PUT y DELETE de `/api/vehiculos` responden `401` sin sesión y `403` si el rol no es administrador.
- Con sesión de administrador, la barra superior se vuelve roja y muestra "Modo administrador".

Para convertir un usuario en administrador:

```sql
UPDATE usuarios SET rol = 'admin' WHERE correo = 'correo@ejemplo.com';
```

## Contraseñas

Al registrarse, la contraseña debe tener:

- mínimo 10 caracteres (máximo 64);
- al menos un número;
- solo letras, números y estos símbolos: `! @ # $ % & * . _ - + ?`

Cada regla se marca en verde en el formulario cuando se cumple. La contraseña se guarda cifrada con `scrypt` (módulo `crypto` de Node.js) y una sal aleatoria, con la forma `scrypt$sal$hash`.

## Instalación

**Requisitos:** Node.js 18 o superior y PostgreSQL 13 o superior (incluye pgAdmin).

**1. Base de datos**

- **Instalación nueva:** en pgAdmin, sobre la base `postgres`, ejecute `01_crear_base_datos.sql`. Luego, sobre `automax_db`, ejecute `02_crear_tablas.sql` y, si quiere datos de ejemplo, `03_datos_vehiculos.sql`.
- **Base que ya tiene vehículos:** no ejecute el `02`. Ejecute `04_actualizar_base_existente.sql` sobre `automax_db`. Agrega `transmision`, `condicion`, `kilometraje`, `foto`, la tabla `usuarios` con roles y el administrador, sin borrar datos. Si además ejecuta el `03`, los 15 vehículos de ejemplo reciben transmisión, condición y kilometraje (5 pasan a usados); sus fotos se conservan.

**2. Archivo `.env`.** Copie `.env.example` con el nombre `.env` y complete sus datos:

```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=automax_db
DB_USER=postgres
DB_PASSWORD=su_contraseña
PORT=3000
SESSION_SECRET=un-texto-largo-cualquiera
```

**3. Dependencias e inicio** (desde la carpeta del proyecto):

```bash
npm install
npm start
```

La terminal debe mostrar:

```
Conectado a PostgreSQL, base de datos "automax_db".
AutoMax disponible en http://localhost:3000
```

**4. Abrir** <http://localhost:3000>. Se abre la pantalla de inicio de sesión.

## API REST

| Método | Ruta | Permiso | Descripción |
|---|---|---|---|
| POST | `/api/usuarios/registro` | Público | Registra un usuario (rol "usuario") |
| POST | `/api/usuarios/login` | Público | Verifica correo y contraseña y abre la sesión |
| POST | `/api/usuarios/invitado` | Público | Abre una sesión de invitado |
| GET | `/api/usuarios/sesion` | Con sesión | Devuelve el usuario y su rol |
| POST | `/api/usuarios/logout` | Con sesión | Cierra la sesión |
| GET | `/api/vehiculos` | Público | Consulta todos los vehículos |
| GET | `/api/vehiculos/:codigo` | Público | Consulta un vehículo |
| POST | `/api/vehiculos` | Admin | Registra un vehículo (JSON o con foto) |
| PUT | `/api/vehiculos/:codigo` | Admin | Modifica un vehículo |
| DELETE | `/api/vehiculos/:codigo` | Admin | Elimina un vehículo y su foto |

Todas las consultas usan parámetros (`$1, $2, ...`), lo que evita la inyección SQL.

**Probar con Postman:** primero haga `POST /api/usuarios/login` con el correo y la contraseña del administrador. Postman guarda la cookie de sesión y la envía en las peticiones siguientes. Sin ese paso, POST, PUT y DELETE responden `401`.

Ejemplo de cuerpo JSON para registrar un usado:

```json
{
  "codigo": "VH-020",
  "marca": "Honda",
  "modelo": "Fit",
  "anio": 2018,
  "color": "Gris",
  "combustible": "Gasolina",
  "transmision": "CVT",
  "condicion": "Usado",
  "kilometraje": 91000,
  "precio": 650000,
  "cantidad": 1,
  "descripcion": "Hatchback usado de un solo dueño."
}
```

Valores aceptados: `combustible` Gasolina, Diésel, Híbrido, Eléctrico o GLP; `transmision` Automática, Manual, CVT o Doble embrague; `condicion` Nuevo o Usado. Un vehículo nuevo se guarda siempre con 0 km.

## Fotos de los vehículos

La foto es opcional y se sube desde Registro de vehículos, con "Elegir archivo" o arrastrándola desde la computadora. Acepta JPG, PNG o WebP de hasta 5 MB; el navegador la reduce a un máximo de 1200 × 900 px antes de enviarla. Se guarda en `frontend/img/vehiculos/` y la columna `foto` guarda su nombre. Las fotos subidas no van a GitHub (están en `.gitignore`).

## Problemas comunes

| Mensaje | Solución |
|---|---|
| `password authentication failed` | Revise `DB_USER` y `DB_PASSWORD` en `.env`. |
| `database "automax_db" does not exist` | Ejecute `database/01_crear_base_datos.sql`. |
| `La tabla "vehiculos" no existe` | Ejecute `database/02_crear_tablas.sql` sobre `automax_db`. |
| `le falta la columna ...` o `la tabla "usuarios"` | Ejecute `database/04_actualizar_base_existente.sql` (no borra datos). |
| `Aviso: falta SESSION_SECRET` | Agregue `SESSION_SECRET` al `.env`. |
| `ECONNREFUSED` | Inicie el servicio de PostgreSQL (Windows: Servicios, postgresql). |
| `EADDRINUSE: address already in use :::3000` | Cambie `PORT` en `.env` (ej.: 3001). |
| `Cannot find module 'express-session'` | Ejecute `npm install`. |
