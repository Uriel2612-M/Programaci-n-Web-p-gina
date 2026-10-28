/* =========================================================
   configuracion.js — configuracion.html
   - Precargar los datos de la clínica en los campos
   - Guardar los cambios al enviar el formulario
   - Los toggles de notificaciones guardan su estado al cambiar
   Requiere: db.js, global.js
   ========================================================= */

const CAMPOS_CONFIG = {
    nombre: 'conf-nombre',
    medico: 'conf-medico',
    especialidad: 'conf-especialidad',
    cedula: 'conf-cedula',
    telefono: 'conf-telefono',
    direccion: 'conf-direccion'
};

const TOGGLES = {
    recordatorios: 'noti-recordatorios',
    seguimiento: 'noti-seguimiento',
    resumen: 'noti-resumen',
    vencidas: 'noti-vencidas'
};

let configActual = null;

/* ---------------- Precargar ---------------- */
async function cargarConfiguracion() {
    configActual = await DB.obtenerConfig();

    // Si no hay médico guardado, se usa el nombre del usuario en sesión
    const sesion = obtenerSesion();
    if (!configActual.medico && sesion && sesion.rol === 'Doctor') configActual.medico = sesion.nombre;

    Object.keys(CAMPOS_CONFIG).forEach(function (llave) {
        document.getElementById(CAMPOS_CONFIG[llave]).value = configActual[llave] || '';
    });

    const notis = configActual.notificaciones || {};
    Object.keys(TOGGLES).forEach(function (llave) {
        document.getElementById(TOGGLES[llave]).checked = !!notis[llave];
    });
}

/* ---------------- Guardar datos de la clínica ---------------- */
document.getElementById('form-configuracion').addEventListener('submit', async function (e) {
    e.preventDefault();

    const cambios = {};
    Object.keys(CAMPOS_CONFIG).forEach(function (llave) {
        cambios[llave] = document.getElementById(CAMPOS_CONFIG[llave]).value.trim();
    });

    try {
        configActual = Object.assign({}, configActual, cambios);
        await DB.guardarConfig(configActual);
        mostrarAviso('Cambios guardados');
    } catch (err) {
        console.error(err);
        mostrarAviso('No se pudieron guardar los cambios', 'error');
    }
});

/* ---------------- Toggles de notificaciones ---------------- */
Object.keys(TOGGLES).forEach(function (llave) {
    const toggle = document.getElementById(TOGGLES[llave]);
    toggle.addEventListener('change', async function () {
        try {
            configActual.notificaciones = Object.assign({}, configActual.notificaciones, { [llave]: toggle.checked });
            await DB.guardarConfig(configActual);
            mostrarAviso(toggle.checked ? 'Notificación activada' : 'Notificación desactivada');
        } catch (err) {
            console.error(err);
            toggle.checked = !toggle.checked; // se regresa si falló
            mostrarAviso('No se pudo guardar la preferencia', 'error');
        }
    });
});

cargarConfiguracion().catch(function (err) {
    console.error(err);
    mostrarAviso('No se pudo cargar la configuración', 'error');
});
