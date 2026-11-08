/* =========================================================
   historial.js — ADAPTADO PARA ROLES (Candado de Seguridad)
   ========================================================= */

(async function iniciarHistorial() {
    const contenedor = document.getElementById('lista-historial');
    contenedor.innerHTML = '<p style="padding:22px 24px;font-size:13px;color:var(--texto-suave);">Cargando expediente desde la nube... ⏳</p>';

    try {
        const rol = localStorage.getItem('rolUsuario');
        let idPacienteFiltro = null;

        // 1. CANDADO DE SEGURIDAD PARA PACIENTES
        if (rol === 'paciente') {
            const { data: authData } = await supabaseClient.auth.getUser();
            if (!authData.user) throw new Error("No hay sesión activa");
            
            const correoPaciente = authData.user.email;
            
            // Buscamos su ID real en la tabla paciente
            const { data: pacienteBD, error: errPac } = await supabaseClient
                .from('paciente')
                .select('id_paciente')
                .ilike('correo', correoPaciente)
                .maybeSingle();

            if (errPac) throw errPac;
            
            // Si el doctor aún no lo registra, no tiene historial que ver
            if (!pacienteBD) {
                contenedor.innerHTML = '<p style="padding:22px 24px;font-size:13px;color:var(--texto-suave);">Tu expediente aún no ha sido enlazado por la clínica.</p>';
                return;
            }
            
            idPacienteFiltro = pacienteBD.id_paciente;
        }

        // 2. ARMAMOS LA CONSULTA A SUPABASE
        let consultaSupabase = supabaseClient
            .from('cita')
            .select(`
                fecha, hora, estado, id_paciente,
                paciente!inner(nombre, fecha_nacimiento, aseguradora),
                consulta(
                    diagnostico, tratamiento,
                    receta(
                        detalle_receta(
                            dosis, duracion,
                            medicamento(nombre_comercial)
                        )
                    )
                )
            `)
            .order('fecha', { ascending: false })
            .order('hora', { ascending: false });

        // Si es paciente, le aplicamos el filtro estricto por su ID
        if (rol === 'paciente' && idPacienteFiltro) {
            consultaSupabase = consultaSupabase.eq('id_paciente', idPacienteFiltro);
        }

        // Ejecutamos la consulta
        const { data: historialBD, error } = await consultaSupabase;

        if (error) throw error;

        if (!historialBD || historialBD.length === 0) {
            contenedor.innerHTML = '<p style="padding:22px 24px;font-size:13px;color:var(--texto-suave);">No hay consultas en el historial.</p>';
            return;
        }

        // 3. FORMATEAMOS Y PINTAMOS
        const historialFormateado = historialBD.map(cita => {
            const cons = Array.isArray(cita.consulta) ? cita.consulta[0] : cita.consulta;
            let medsCapturados = [];

            if (cons && cons.receta) {
                const rec = Array.isArray(cons.receta) ? cons.receta[0] : cons.receta;
                if (rec && rec.detalle_receta) {
                    medsCapturados = rec.detalle_receta.map(det => ({
                        nombre: det.medicamento ? det.medicamento.nombre_comercial : 'Med. Desconocido',
                        dosis: det.dosis,
                        duracion: det.duracion
                    }));
                }
            }

            return {
                cita: cita,
                paciente: cita.paciente,
                consultaInfo: cons,
                medicamentos: medsCapturados,
                estado: cita.estado || 'Pendiente'
            };
        });

        contenedor.innerHTML = historialFormateado.map(pintarItem).join('');
    } catch (err) {
        console.error("Error al cargar historial:", err);
        contenedor.innerHTML = '<p style="padding:22px 24px;font-size:13px;color:#d6455d;">Error al cargar el historial.</p>';
    }
})();

function pintarItem(item) {
    const cita = item.cita;
    const p = item.paciente;
    const cons = item.consultaInfo;
    const completada = item.estado === 'Completada';

    const datosPaciente = [
        p.fecha_nacimiento ? calcularEdad(p.fecha_nacimiento) + ' años' : '',
        p.aseguradora || ''
    ].filter(Boolean).join(' · ');

    const motivoYNotas = cons && cons.tratamiento ? cons.tratamiento : 'Consulta general';
    const diagnostico = cons && cons.diagnostico ? cons.diagnostico : 'Sin diagnóstico registrado';

    const recetaHTML = item.medicamentos.length > 0
        ? '<div class="receta-tags"><span class="label-receta">Receta:</span>' +
            item.medicamentos.map(m => {
                const tooltip = escaparHTML([m.dosis, m.duracion].filter(Boolean).join(' · '));
                return `<span class="pill-medicamento" title="${tooltip}">${escaparHTML(m.nombre)}</span>`;
            }).join('') + '</div>'
        : '<div class="receta-tags"><span class="label-receta">Sin receta</span></div>';

    return `<div class="item-historial">
        <div class="col-fecha">
            <span class="punto-timeline ${completada ? 'verde' : 'rojo'}"></span>
            <span class="fecha-texto">${formatoFecha(cita.fecha)}</span>
            <span class="fecha-texto">${escaparHTML(cita.hora || '')}</span>
        </div>
        <div class="col-detalles">
            <div class="paciente-header">
                <span class="avatar">${escaparHTML(iniciales(p.nombre))}</span>
                <h4>${escaparHTML(p.nombre)}${datosPaciente ? ` <span class="texto-suave">${escaparHTML(datosPaciente)}</span>` : ''}</h4>
            </div>
            <div class="consulta-info">
                <h5>${escaparHTML(diagnostico)}</h5>
                <p>${escaparHTML(motivoYNotas)}</p>
            </div>
            ${recetaHTML}
        </div>
        <div class="col-estado">${etiquetaEstado(item.estado)}</div>
    </div>`;
}