/* =========================================================
   consultas.js — ADAPTADO PARA ROLES (Seguridad y Doble Guardado)
   ========================================================= */

const formConsulta = document.querySelector('.formulario-consulta form');
const selectPaciente = document.getElementById('paciente');
const inputFecha = document.getElementById('fecha');
const inputHora = document.getElementById('hora');

let pacientesConsulta = [];
let rolActual = localStorage.getItem('rolUsuario');
let idPacienteFiltro = null;

/* ---------------- Selector de pacientes (Solo Médico) ---------------- */
async function cargarSelectorPacientes() {
    pacientesConsulta = (await DB.listar('paciente')).sort(function (a, b) { 
        return a.nombre.localeCompare(b.nombre); 
    });

    if (selectPaciente) {
        selectPaciente.innerHTML = '<option value="">Seleccione un paciente</option>' +
            pacientesConsulta.map(function (p) {
                return '<option value="' + escaparHTML(p.id_paciente) + '">' + escaparHTML(p.nombre) + '</option>';
            }).join('');

        const preseleccion = parametroURL('paciente');
        if (preseleccion) selectPaciente.value = preseleccion;
    }
}

/* ---------------- Guardar consulta (Solo Médico) ---------------- */
if (formConsulta) {
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
            // 1. Crear Cita
            const nuevaCita = {
                id_paciente: id_paciente,
                fecha: fecha,
                hora: hora,
                estado: 'Completada'
            };
            const citaGuardada = await DB.crear('cita', nuevaCita);

            // 2. Crear Consulta
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
}

function valoresPorDefecto() {
    if (inputFecha) inputFecha.value = hoyISO();
    if (inputHora) inputHora.value = horaActual();
}

/* ---------------- Lista: Consultas (Inteligente por Rol) ---------------- */
async function pintarConsultasDelDia() {
    const contenedor = document.getElementById('lista-consultas');
    const hoy = hoyISO();
    
    contenedor.innerHTML = '<p style="font-size:13px;color:var(--texto-suave);">Cargando consultas... ⏳</p>';

    try {
        let query = supabaseClient
            .from('consulta')
            .select(`
                diagnostico,
                tratamiento,
                cita!inner(
                    id_paciente,
                    fecha,
                    hora,
                    estado,
                    paciente(nombre)
                )
            `);

        // FILTRO DE SEGURIDAD
        if (rolActual === 'paciente') {
            if (!idPacienteFiltro) {
                contenedor.innerHTML = '<p style="font-size:13px;color:var(--texto-suave);">Expediente no enlazado.</p>';
                return;
            }
            // El paciente ve todas sus consultas recientes (sin importar que no sean de hoy)
            query = query.eq('cita.id_paciente', idPacienteFiltro).order('id_consulta', { ascending: false }).limit(20);
            
            // Cambiamos el título visual para que tenga sentido
            const tituloSeccion = document.querySelector('.tarjeta h2');
            if (tituloSeccion) tituloSeccion.textContent = 'Mis Consultas Recientes';
        } else {
            // El médico ve las de hoy
            query = query.eq('cita.fecha', hoy).order('id_consulta', { ascending: false });
        }

        const { data: consultas, error } = await query;

        if (error) throw error;

        if (!consultas || consultas.length === 0) {
            const msj = rolActual === 'paciente' ? 'No tienes consultas registradas aún.' : 'No hay consultas registradas hoy.';
            contenedor.innerHTML = `<p style="font-size:13px;color:var(--texto-suave);">${msj}</p>`;
            return;
        }

        contenedor.innerHTML = consultas.map(function (c) {
            const detalle = c.diagnostico ? c.diagnostico : 'Sin diagnóstico registrado';
            const nombre = c.cita.paciente ? c.cita.paciente.nombre : 'Paciente desconocido';
            
            // Si es paciente, mostramos la fecha además de la hora (porque son históricas)
            const tiempoMostrado = rolActual === 'paciente' ? `${formatoFecha(c.cita.fecha)} - ${c.cita.hora || ''}` : (c.cita.hora || '');

            return `<div class="item-consulta">
                <div class="info-paciente">
                    <h4>${escaparHTML(nombre)}</h4>
                    <p>${escaparHTML(detalle)}</p>
                </div>
                <div class="estado-consulta">
                    <span class="fecha">${escaparHTML(tiempoMostrado)}</span>
                    ${etiquetaEstado(c.cita.estado)}
                </div>
            </div>`;
        }).join('');
    } catch (error) {
        console.error("Error al cargar consultas:", error);
        contenedor.innerHTML = '<p style="font-size:13px;color:#d6455d;">Error al cargar datos.</p>';
    }
}

/* ---------------- Arranque ---------------- */
(async function iniciarConsultas() {
    try {
        if (rolActual === 'paciente') {
            // 1. Ocultar formulario de agregar consulta
            if (formConsulta) {
                const tarjetaForm = formConsulta.closest('.tarjeta-formulario') || formConsulta.parentElement;
                if (tarjetaForm) tarjetaForm.style.display = 'none';
                
                const contenedorDosColumnas = document.querySelector('.contenedor-dos-columnas');
                if (contenedorDosColumnas) contenedorDosColumnas.style.display = 'block';
            }

            // 2. Obtener ID real del paciente
            const { data: authData } = await supabaseClient.auth.getUser();
            if (authData.user) {
                const { data: pacienteBD } = await supabaseClient
                    .from('paciente')
                    .select('id_paciente')
                    .ilike('correo', authData.user.email)
                    .maybeSingle();

                if (pacienteBD) idPacienteFiltro = pacienteBD.id_paciente;
            }
        } else {
            // Lógica normal para el doctor
            valoresPorDefecto();
            await cargarSelectorPacientes();
        }

        await pintarConsultasDelDia();
    } catch (err) {
        console.error(err);
        mostrarAviso('No se pudieron cargar los datos', 'error');
    }
})();