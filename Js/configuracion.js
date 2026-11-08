/* =========================================================
   configuracion.js — Ajustes de la clínica y notificaciones
   (Se guarda en LocalStorage mediante db.js)
   ========================================================= */

const formConfig = document.getElementById('form-configuracion');

// 1. Cargar datos apenas abra la pantalla
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const config = await DB.obtenerConfig();

        // Llenar campos de texto (si existen datos previos)
        if (config.nombre) document.getElementById('conf-nombre').value = config.nombre;
        if (config.medico) document.getElementById('conf-medico').value = config.medico;
        if (config.especialidad) document.getElementById('conf-especialidad').value = config.especialidad;
        if (config.cedula) document.getElementById('conf-cedula').value = config.cedula;
        if (config.telefono) document.getElementById('conf-telefono').value = config.telefono;
        if (config.direccion) document.getElementById('conf-direccion').value = config.direccion;

        // Llenar los "switches" de notificaciones
        document.getElementById('noti-recordatorios').checked = !!config.notiRecordatorios;
        document.getElementById('noti-seguimiento').checked = !!config.notiSeguimiento;
        document.getElementById('noti-resumen').checked = !!config.notiResumen;
        document.getElementById('noti-vencidas').checked = !!config.notiVencidas;
        
    } catch (err) {
        console.error("Error al cargar la configuración:", err);
    }
});

// 2. Guardar datos al enviar el formulario
formConfig.addEventListener('submit', async (e) => {
    e.preventDefault();

    const nuevaConfig = {
        // Textos
        nombre: document.getElementById('conf-nombre').value.trim(),
        medico: document.getElementById('conf-medico').value.trim(),
        especialidad: document.getElementById('conf-especialidad').value.trim(),
        cedula: document.getElementById('conf-cedula').value.trim(),
        telefono: document.getElementById('conf-telefono').value.trim(),
        direccion: document.getElementById('conf-direccion').value.trim(),
        
        // Switches (true o false)
        notiRecordatorios: document.getElementById('noti-recordatorios').checked,
        notiSeguimiento: document.getElementById('noti-seguimiento').checked,
        notiResumen: document.getElementById('noti-resumen').checked,
        notiVencidas: document.getElementById('noti-vencidas').checked
    };

    try {
        await DB.guardarConfig(nuevaConfig);
        mostrarAviso('Configuración de clínica actualizada');
    } catch (err) {
        console.error("Error al guardar:", err);
        mostrarAviso('Error al guardar la configuración', 'error');
    }
});