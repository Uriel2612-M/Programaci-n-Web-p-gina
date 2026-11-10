/* =========================================================
   detalle-paciente.js — Carga del Expediente Completo
   ========================================================= */

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Candado de seguridad (Los pacientes no deben ver esta pantalla)
    const rolActual = localStorage.getItem('rolUsuario');
    if (rolActual === 'paciente') {
        window.location.replace('dashboard.html');
        return;
    }

    // 2. Extraer el ID del paciente de la URL (Ej. detallepaciente.html?id=5)
    const idPaciente = parametroURL('id');
    if (!idPaciente) {
        window.location.replace('pacientes.html');
        return;
    }

    // 3. Configurar el botón de "+ Nueva Consulta" para que pre-seleccione a este paciente
    const btnNuevaConsulta = document.getElementById('btn-nueva-consulta');
    if (btnNuevaConsulta) {
        btnNuevaConsulta.href = `consultas.html?paciente=${encodeURIComponent(idPaciente)}`;
    }

    try {
        // ================= A. CARGAR DATOS DEL PACIENTE =================
        const { data: paciente, error: errPac } = await supabaseClient
            .from('paciente')
            .select('*')
            .eq('id_paciente', idPaciente)
            .single();

        if (errPac || !paciente) throw errPac;

        // Llenar la cabecera
        document.getElementById('migas-nombre').textContent = paciente.nombre;
        document.getElementById('det-nombre').textContent = paciente.nombre;
        document.getElementById('det-avatar').textContent = iniciales(paciente.nombre);
        
        // Calcular edad para el resumen
        const edad = paciente.fecha_nacimiento ? calcularEdad(paciente.fecha_nacimiento) + ' años' : 'Edad no registrada';
        const genero = paciente.genero || 'No especificado';
        document.getElementById('det-resumen').textContent = `${edad} · ${genero}`;

        // Llenar los datos de contacto y seguro
        document.getElementById('det-telefono').textContent = paciente.telefono || '—';
        document.getElementById('det-email').textContent = paciente.correo || '—';
        document.getElementById('det-direccion').textContent = paciente.direccion || '—';
        document.getElementById('det-aseguradora').textContent = paciente.aseguradora || '—';
        document.getElementById('det-poliza').textContent = paciente.no_poliza || '—';

        // ================= B. CARGAR CONSULTAS E HISTORIAL =================
        const { data: citas, error: errCitas } = await supabaseClient
            .from('cita')
            .select(`
                id_cita, fecha, hora, estado,
                consulta(diagnostico, tratamiento)
            `)
            .eq('id_paciente', idPaciente)
            .order('fecha', { ascending: false })
            .order('hora', { ascending: false });

        if (errCitas) throw errCitas;

        const contenedorConsultas = document.getElementById('lista-consultas-paciente');
        const contadorConsultas = document.getElementById('contador-consultas');
        
        contadorConsultas.textContent = citas.length;

        if (citas.length > 0) {
            // Ponemos la última visita en la ficha principal
            document.getElementById('det-visita').textContent = formatoFecha(citas[0].fecha);

            // Pintamos la lista de consultas
            contenedorConsultas.innerHTML = citas.map(c => {
                const cons = Array.isArray(c.consulta) ? c.consulta[0] : c.consulta;
                const diagnostico = cons && cons.diagnostico ? cons.diagnostico : 'Sin diagnóstico';
                const tratamiento = cons && cons.tratamiento ? cons.tratamiento : 'Sin notas registradas';

                return `
                <div style="padding: 15px; border: 1px solid var(--borde); border-radius: 8px; margin-bottom: 15px; background: white;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                        <h4 style="margin: 0; color: var(--teal-oscuro);">${formatoFecha(c.fecha)} <span style="color: var(--texto-suave); font-weight: normal;">${c.hora || ''}</span></h4>
                        ${etiquetaEstado(c.estado)}
                    </div>
                    <p style="margin: 0 0 5px 0; font-weight: 600;">Diagnóstico: <span style="font-weight: normal;">${escaparHTML(diagnostico)}</span></p>
                    <p style="margin: 0; font-size: 13px; color: var(--texto-suave);"><strong>Notas:</strong> ${escaparHTML(tratamiento)}</p>
                </div>`;
            }).join('');
        } else {
            document.getElementById('det-visita').textContent = 'Sin visitas previas';
            contenedorConsultas.innerHTML = '<p style="color: var(--texto-suave);">El paciente no tiene consultas registradas.</p>';
        }

        // ================= C. CARGAR RECETAS =================
        const { data: recetas, error: errRecetas } = await supabaseClient
            .from('receta')
            .select(`
                id_receta, fecha_emision,
                consulta!inner(cita!inner(id_paciente)),
                detalle_receta(dosis, duracion, medicamento(nombre_comercial))
            `)
            .eq('consulta.cita.id_paciente', idPaciente)
            .order('fecha_emision', { ascending: false });

        if (errRecetas) throw errRecetas;

        const contenedorRecetas = document.getElementById('lista-recetas-paciente');
        const contadorRecetas = document.getElementById('contador-recetas');
        
        contadorRecetas.textContent = recetas.length;

        if (recetas.length > 0) {
            contenedorRecetas.innerHTML = recetas.map(r => {
                const detallesHTML = (r.detalle_receta || []).map(det => {
                    const nombreMed = det.medicamento ? det.medicamento.nombre_comercial : 'Med. Desconocido';
                    const specs = [det.dosis, det.duracion].filter(Boolean).join(' · ');
                    return `<li style="margin-bottom: 5px;"><strong>${escaparHTML(nombreMed)}:</strong> ${escaparHTML(specs)}</li>`;
                }).join('');

                return `
                <div style="padding: 15px; border: 1px solid var(--borde); border-radius: 8px; margin-bottom: 15px; background: white;">
                    <h4 style="margin: 0 0 10px 0; color: var(--teal-oscuro);">Receta del ${formatoFecha(r.fecha_emision)}</h4>
                    <ul style="margin: 0; padding-left: 20px; font-size: 13px;">
                        ${detallesHTML}
                    </ul>
                </div>`;
            }).join('');
        } else {
            contenedorRecetas.innerHTML = '<p style="color: var(--texto-suave);">El paciente no tiene recetas emitidas.</p>';
        }

    } catch (err) {
        console.error("Error al cargar detalle del paciente:", err);
        mostrarAviso('Error al cargar la información del paciente', 'error');
    }
});

/* ================= LÓGICA DE LAS PESTAÑAS (TABS) ================= */
const botonesTabs = document.querySelectorAll('.tab');
const panelesTabs = document.querySelectorAll('.panel-tab');

botonesTabs.forEach(boton => {
    boton.addEventListener('click', () => {
        // 1. Quitar la clase "activa" de todos los botones
        botonesTabs.forEach(b => b.classList.remove('activa'));
        // 2. Agregar la clase "activa" al botón que se hizo clic
        boton.classList.add('activa');

        // 3. Ocultar todos los paneles
        panelesTabs.forEach(p => p.classList.add('oculto'));
        // 4. Mostrar el panel correspondiente
        const idPanel = boton.getAttribute('data-panel');
        document.getElementById(idPanel).classList.remove('oculto');
    });
});