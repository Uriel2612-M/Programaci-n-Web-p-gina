/* =========================================================
   consultas.js — consultas.html
   - Cargar los pacientes en el selector
   - Guardar el formulario con el diagnóstico
   - Lista derecha con las consultas del día
   Requiere: db.js, global.js
   ========================================================= */

const formConsulta = document.querySelector('.formulario-consulta form');
const selectPaciente = document.getElementById('paciente');
const inputFecha = document.getElementById('fecha');
const inputHora = document.getElementById('hora');

let pacientesConsulta = [];

function nombrePaciente(id) {
    const p = pacientesConsulta.find(function (x) { return String(x.id) === String(id); });
    return p ? p.nombre : 'Paciente eliminado';
}

/* ---------------- Selector de pacientes ---------------- */
async function cargarSelectorPacientes() {
    pacientesConsulta = (await DB.listar('pacientes')).sort(function (a, b) { return a.nombre.localeCompare(b.nombre); });

    selectPaciente.innerHTML = '<option value="">Seleccione un paciente</option>' +
        pacientesConsulta.map(function (p) {
            return '<option value="' + escaparHTML(p.id) + '">' + escaparHTML(p.nombre) + '</option>';
        }).join('');

    // Si se viene desde el detalle del paciente: consultas.html?paciente=ID
    const preseleccion = parametroURL('paciente');
    if (preseleccion) selectPaciente.value = preseleccion;
}

/* ---------------- Guardar consulta ---------------- */
formConsulta.addEventListener('submit', async function (e) {
    e.preventDefault();

    const datos = {
        paciente_id: selectPaciente.value,
        fecha: inputFecha.value,
        hora: inputHora.value,
        motivo: document.getElementById('motivo').value.trim(),
        diagnostico: document.getElementById('diagnostico').value.trim(),
        notas: document.getElementById('notas').value.trim()
    };

    if (!datos.paciente_id) {
        mostrarAviso('Selecciona un paciente', 'error');
        return;
    }
    datos.estado = estadoConsulta(datos);

    try {
        await DB.crear('consultas', datos);
        mostrarAviso('Consulta registrada');
        formConsulta.reset();
        valoresPorDefecto();
        await pintarConsultasDelDia();
    } catch (err) {
        console.error(err);
        mostrarAviso('No se pudo registrar la consulta', 'error');
    }
});

function valoresPorDefecto() {
    inputFecha.value = hoyISO();
    inputHora.value = horaActual();
}

/* ---------------- Lista: consultas del día ---------------- */
async function pintarConsultasDelDia() {
    const contenedor = document.getElementById('lista-consultas');
    const hoy = hoyISO();

    const consultasHoy = (await DB.listar('consultas'))
        .filter(function (c) { return c.fecha === hoy; })
        .sort(function (a, b) { return (a.hora || '').localeCompare(b.hora || ''); });

    if (consultasHoy.length === 0) {
        contenedor.innerHTML = '<p style="font-size:13px;color:var(--texto-suave);">No hay consultas registradas hoy.</p>';
        return;
    }

    contenedor.innerHTML = consultasHoy.map(function (c) {
        const detalle = c.diagnostico ? c.diagnostico : (c.motivo || 'Sin motivo registrado');
        return '<div class="item-consulta">' +
            '<div class="info-paciente">' +
                '<h4>' + escaparHTML(nombrePaciente(c.paciente_id)) + '</h4>' +
                '<p>' + escaparHTML(detalle) + '</p>' +
            '</div>' +
            '<div class="estado-consulta">' +
                '<span class="fecha">' + escaparHTML(c.hora || '') + '</span>' +
                etiquetaEstado(estadoConsulta(c)) +
            '</div>' +
        '</div>';
    }).join('');
}

/* ---------------- Arranque ---------------- */
(async function iniciarConsultas() {
    try {
        valoresPorDefecto();
        await cargarSelectorPacientes();
        await pintarConsultasDelDia();
    } catch (err) {
        console.error(err);
        mostrarAviso('No se pudieron cargar los datos', 'error');
    }
})();
