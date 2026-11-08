/* =========================================================
   consultas.js — ADAPTADO PARA SUPABASE (Doble Guardado)
   ========================================================= */

const formConsulta = document.querySelector('.formulario-consulta form');
const selectPaciente = document.getElementById('paciente');
const inputFecha = document.getElementById('fecha');
const inputHora = document.getElementById('hora');

let pacientesConsulta = [];

/* ---------------- Selector de pacientes ---------------- */
async function cargarSelectorPacientes() {
    // Traemos los pacientes desde Supabase
    pacientesConsulta = (await DB.listar('paciente')).sort(function (a, b) { 
        return a.nombre.localeCompare(b.nombre); 
    });

    selectPaciente.innerHTML = '<option value="">Seleccione un paciente</option>' +
        pacientesConsulta.map(function (p) {
            // Usamos id_paciente que es la llave real
            return '<option value="' + escaparHTML(p.id_paciente) + '">' + escaparHTML(p.nombre) + '</option>';
        }).join('');

    const preseleccion = parametroURL('paciente');
    if (preseleccion) selectPaciente.value = preseleccion;
}

/* ---------------- Guardar consulta (Doble Guardado) ---------------- */
formConsulta.addEventListener('submit', async function (e) {
    e.preventDefault();

    const id_paciente = selectPaciente.value;
    const fecha = inputFecha.value;
    const hora = inputHora.value;
    const motivo = document.getElementById('motivo').value.trim();
    const diagnostico = document.getElementById('diagnostico').value.trim();
    const notas = document.getElementById('notas').value.trim();

    if (!id_paciente) {
        mostrarAviso('Selecciona un paciente', 'error');
        return;
    }

    try {
        // 1. Primero creamos la Cita
        const nuevaCita = {
            id_paciente: id_paciente,
            fecha: fecha,
            hora: hora,
            estado: 'Completada'
        };
        const citaGuardada = await DB.crear('cita', nuevaCita);

        // 2. Luego creamos la Consulta amarrada a esa Cita
        const nuevaConsulta = {
            id_cita: citaGuardada.id_cita,
            diagnostico: diagnostico,
            tratamiento: `Motivo: ${motivo} | Notas: ${notas}` 
        };
        await DB.crear('consulta', nuevaConsulta);

        mostrarAviso('Consulta registrada con éxito');
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

    try {
        // Hacemos una consulta directa a Supabase uniendo Cita, Consulta y Paciente
        const { data: consultas, error } = await supabaseClient
            .from('consulta')
            .select(`
                diagnostico,
                tratamiento,
                cita!inner(
                    fecha,
                    hora,
                    estado,
                    paciente(nombre)
                )
            `)
            .eq('cita.fecha', hoy)
            .order('id_consulta', { ascending: false });

        if (error) throw error;

        if (!consultas || consultas.length === 0) {
            contenedor.innerHTML = '<p style="font-size:13px;color:var(--texto-suave);">No hay consultas registradas hoy.</p>';
            return;
        }

        contenedor.innerHTML = consultas.map(function (c) {
            const detalle = c.diagnostico ? c.diagnostico : 'Sin diagnóstico registrado';
            const nombre = c.cita.paciente ? c.cita.paciente.nombre : 'Paciente desconocido';
            
            return '<div class="item-consulta">' +
                '<div class="info-paciente">' +
                    '<h4>' + escaparHTML(nombre) + '</h4>' +
                    '<p>' + escaparHTML(detalle) + '</p>' +
                '</div>' +
                '<div class="estado-consulta">' +
                    '<span class="fecha">' + escaparHTML(c.cita.hora || '') + '</span>' +
                    etiquetaEstado(c.cita.estado) +
                '</div>' +
            '</div>';
        }).join('');
    } catch (error) {
        console.error("Error al cargar consultas:", error);
    }
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