# MedAgenda — Agenda Médica

Aplicación web para gestionar una agenda médica: pacientes, consultas, recetas e historial clínico. Está hecha con **HTML, CSS y JavaScript puro**, sin frameworks ni dependencias.

---

## Funcionalidades

| Módulo | Qué hace |
|---|---|
| **Inicio de sesión** | Guarda el nombre y el rol del usuario (Doctor / Paciente) en la sesión. |
| **Barra lateral (global)** | Muestra el nombre, las iniciales y el rol del usuario, más el botón **Cerrar sesión**. |
| **Dashboard** | Tarjetas con el total de pacientes, las consultas de hoy, las recetas del mes y los casos pendientes. Tabla con los pacientes de movimiento más reciente. |
| **Pacientes** | Tabla de pacientes con edad calculada y última visita, buscador por nombre o aseguradora, y modal para registrar y editar. |
| **Consultas** | Selector de pacientes, registro de consulta con diagnóstico y lista de las consultas del día. |
| **Recetas** | El selector de *Consulta asociada* depende del paciente elegido. Medicamentos dinámicos (**+ Agregar** / Quitar) y lista de recetas recientes. |
| **Historial clínico** | Línea de tiempo que une paciente, consulta y medicamentos, con etiqueta **Pendiente** / **Completada**. |
| **Configuración** | Datos de la clínica precargados y editables. Los interruptores de notificaciones guardan su estado al momento. |
| **Detalle del paciente** | Ficha del paciente con pestañas de consultas y recetas. |
| **Registro / Perfil** | Pantallas de alta de cuenta y administración del perfil. |

---

## Estructura del proyecto

```
Programaci-n-Web-p-gina/
│
├── index.html               # Inicio de sesión
├── registro.html            # Registro de cuenta
├── dashboard.html           # Panel principal (Inicio)
├── pacientes.html           # Lista y alta de pacientes
├── detallepaciente.html     # Ficha de un paciente
├── consultas.html           # Registro de consultas
├── recetas.html             # Emisión de recetas
├── historial.html           # Historial clínico cronológico
├── configuracion.html       # Datos de la clínica y notificaciones
├── perfil.html              # Perfil y seguridad del usuario
├── README.md
│
├── css/
│   ├── global.css           # Variables, barra lateral, tablas, botones, etiquetas
│   ├── index.css
│   ├── registro.css
│   ├── dashboard.css
│   ├── pacientes.css
│   ├── detallepaciente.css
│   ├── consultas.css
│   ├── recetas.css
│   ├── historial.css
│   ├── configuracion.css
│   └── perfil.css
│
├── img/
│   ├── logo.png
│   ├── icono-dashboard.svg
│   ├── icono-pacientes.svg
│   ├── icono-consultas.svg
│   ├── icono-recetas.svg
│   ├── icono-historial.svg
│   ├── icono-configuracion.svg
│   ├── icono-perfil.svg
│   ├── tarjeta-pacientes.svg
│   ├── tarjeta-consultas.svg
│   ├── tarjeta-recetas.svg
│   └── tarjeta-pendientes.svg
│
└── js/
    ├── db.js                # Capa de datos (localStorage o API REST)
    ├── global.js            # Sesión, barra lateral, cerrar sesión y utilidades
    ├── login.js             # Inicio de sesión
    ├── fecha.js             # Saludo y fecha del encabezado
    ├── dashboard.js         # Tarjetas y tabla de pacientes recientes
    ├── pacientes.js         # Tabla, buscador, modal y formulario
    ├── consultas.js         # Selector, registro y consultas del día
    ├── recetas.js           # Consultas por paciente, medicamentos y recetas
    ├── historial.js         # Línea de tiempo y estados
    ├── configuracion.js     # Datos de la clínica y notificaciones
    └── detallepaciente.js   # Pestañas de la ficha del paciente
```

> ⚠️ La carpeta de scripts debe llamarse `js` en **minúsculas**. Los HTML la buscan así, y en servidores Linux o GitHub Pages los nombres distinguen mayúsculas.

---

## Scripts por página

Los scripts van antes de `</body>`. **`db.js` y `global.js` siempre van primero.**

| Página | Scripts (en orden) |
|---|---|
| `index.html` | `db.js`, `global.js`, `login.js` |
| `dashboard.html` | `db.js`, `global.js`, `fecha.js`, `dashboard.js` |
| `pacientes.html` | `db.js`, `global.js`, `pacientes.js` |
| `consultas.html` | `db.js`, `global.js`, `consultas.js` |
| `recetas.html` | `db.js`, `global.js`, `recetas.js` |
| `historial.html` | `db.js`, `global.js`, `historial.js` |
| `configuracion.html` | `db.js`, `global.js`, `configuracion.js` |
| `perfil.html` | `db.js`, `global.js` |
| `detallepaciente.html` | `db.js`, `global.js`, `detallepaciente.js` |

Ejemplo (`pacientes.html`):

```html
    <script src="js/db.js"></script>
    <script src="js/global.js"></script>
    <script src="js/pacientes.js"></script>
</body>
```

---

## Cómo ejecutarlo

1. Clona el repositorio:
   ```bash
   git clone https://github.com/<usuario>/Programaci-n-Web-p-gina.git
   ```
2. Abre `index.html` en el navegador. También puedes usar un servidor local, como la extensión *Live Server* de VS Code.
3. Inicia sesión con cualquier rol, usuario y contraseña. En modo local no se valida contra un servidor.

El proyecto trae **datos de ejemplo** (3 pacientes, 4 consultas y 2 recetas) para que puedas probar todas las pantallas desde el principio.

---

## Base de datos

Todo el acceso a datos pasa por `js/db.js`, así que las páginas no saben de dónde vienen los datos.

### Modo local (por defecto)
Los datos se guardan en el `localStorage` del navegador con el prefijo `medagenda_`. Para empezar desde cero, borra los datos del sitio en el navegador o pon `DATOS_DEMO: false`.

### Modo servidor
En `js/db.js`, pon la URL de tu API:

```js
const DB_CONFIG = {
    API_URL: 'http://localhost/medagenda/api',
    PREFIJO: 'medagenda_',
    DATOS_DEMO: true
};
```

La API debe responder JSON en estas rutas:

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/login` | Valida al usuario. Devuelve `{ nombre, rol }`. |
| `GET` | `/{tabla}` | Lista los registros. |
| `POST` | `/{tabla}` | Crea un registro y devuelve el registro con su `id`. |
| `PUT` | `/{tabla}/{id}` | Actualiza un registro. |
| `GET` | `/configuracion` | Devuelve la configuración de la clínica. |
| `PUT` | `/configuracion` | Guarda la configuración. |

Tablas: `pacientes`, `consultas`, `recetas`.

### Modelo de datos

**pacientes**
| Campo | Tipo |
|---|---|
| `id` | texto / entero |
| `nombre` | texto |
| `fecha_nacimiento` | fecha `YYYY-MM-DD` |
| `genero` | `M` / `F` |
| `telefono`, `correo` | texto |
| `aseguradora`, `poliza` | texto |
| `direccion`, `alergias`, `contacto_emergencia` | texto (opcional) |
| `creado` | fecha |

**consultas**
| Campo | Tipo |
|---|---|
| `id` | texto / entero |
| `paciente_id` | → `pacientes.id` |
| `fecha` | fecha `YYYY-MM-DD` |
| `hora` | `HH:MM` |
| `motivo`, `diagnostico`, `notas` | texto |
| `estado` | `Pendiente` / `Completada` |

**recetas**
| Campo | Tipo |
|---|---|
| `id` | texto / entero |
| `paciente_id` | → `pacientes.id` |
| `consulta_id` | → `consultas.id` |
| `fecha`, `hora` | fecha / hora |
| `medicamentos` | lista de `{ nombre, dosis, duracion }` |

**configuracion**
| Campo | Tipo |
|---|---|
| `nombre`, `medico`, `especialidad`, `cedula`, `telefono`, `direccion` | texto |
| `notificaciones` | `{ recordatorios, seguimiento, resumen, vencidas }` (booleanos) |

---

## Reglas de negocio

- **Estado de una consulta:** es **Completada** si ya pasó su fecha y hora y tiene diagnóstico. Es **Pendiente** si es futura o no tiene diagnóstico.
- **Casos pendientes (Dashboard):** total de consultas en estado *Pendiente*.
- **Recetas este mes:** recetas con fecha de emisión en el mes actual, comparadas con el mes anterior.
- **Sesión:** sin sesión, las páginas internas redirigen a `index.html`. Para desactivarlo mientras pruebas, usa `REQUIERE_SESION = false` en `js/global.js`.

---

## Tecnologías

- HTML5
- CSS3 (variables CSS, Flexbox), con la fuente *Plus Jakarta Sans*
- JavaScript (ES2017+, `async/await`, `fetch`, `localStorage`)
