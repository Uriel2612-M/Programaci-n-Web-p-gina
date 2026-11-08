/* =========================================================
   dashboard.js — ADAPTADO PARA ROLES (Médico y Paciente)
   ========================================================= */

(async function iniciarDashboard() {
    const sesion = obtenerSesion();
    const nombreHeader = document.getElementById('header-name');
    if (sesion && nombreHeader) nombreHeader.textContent = ', ' + sesion.nombre;

    const rol = localStorage.getItem('rolUsuario');

    if (rol === 'paciente') {
        await cargarDashboardPaciente();
    } else {
        await cargarDashboardMedico();
    }
})();

/* ================= LÓGICA DEL PACIENTE ================= */
async function cargarDashboardPaciente() {
    const estadoExpediente = document.getElementById('pac-estado-expediente');
    const tarjetaCita = document.getElementById('pac-tarjeta-cita');
    const sinCitas = document.getElementById('pac-sin-citas');

    try {
        // 1. Obtenemos el correo del paciente logueado
        const { data: authData } = await supabaseClient.auth.getUser();
        if (!authData.user) throw new Error("No hay sesión");
        const correoPaciente = authData.user.email;

        // 2. Buscamos si el doctor ya lo registró en la tabla "paciente" usando su correo
        const { data: pacienteBD, error: errPac } = await supabaseClient
            .from('paciente')
            .select('id_paciente, nombre')
            .ilike('correo', correoPaciente) // Busca sin importar mayúsculas/minúsculas
            .maybeSingle();

        if (errPac) throw errPac;

        if (!pacienteBD) {
            estadoExpediente.innerHTML = 'Tu expediente aún no ha sido enlazado. <br>Por favor, asegúrate de proporcionarle a tu médico el correo: <strong>' + escaparHTML(correoPaciente) + '</strong>';
            return;
        }

        estadoExpediente.innerHTML = 'Expediente enlazado correctamente ✅';

        // 3. Buscamos si tiene citas a partir de hoy
        const hoy = hoyISO();
        const { data: proximasCitas, error: errCitas } = await supabaseClient
            .from('cita')
            .select('*')
            .eq('id_paciente', pacienteBD.id_paciente)
            .gte('fecha', hoy) // Mayor o igual a hoy
            .order('fecha', { ascending: true })
            .order('hora', { ascending: true })
            .limit(1);

        if (errCitas) throw errCitas;

        if (proximasCitas && proximasCitas.length > 0) {
            // Tiene cita
            const cita = proximasCitas[0];
            document.getElementById('pac-fecha-cita').textContent = formatoFecha(cita.fecha);
            document.getElementById('pac-hora-cita').textContent = cita.hora + ' hrs';
            tarjetaCita.style.display = 'block';
        } else {
            // No tiene cita
            sinCitas.style.display = 'block';
        }

    } catch (err) {
        console.error("Error en Dashboard Paciente:", err);
        estadoExpediente.innerHTML = '<span style="color:#d6455d;">Error al cargar tu información.</span>';
    }
}

/* ================= LÓGICA DEL MÉDICO ================= */
async function cargarDashboardMedico() {
    try {
        const [reqPacientes, reqCitas, reqRecetas] = await Promise.all([
            supabaseClient.from('paciente').select('*'),
            supabaseClient.from('cita').select('*, consulta(diagnostico)'),
            supabaseClient.from('receta').select('*')
        ]);

        if (reqPacientes.error) throw reqPacientes.error;
        if (reqCitas.error) throw reqCitas.error;
        if (reqRecetas.error) throw reqRecetas.error;

        pintarTarjetas(reqPacientes.data, reqCitas.data, reqRecetas.data);
        pintarTablaResumen(reqPacientes.data, reqCitas.data);
    } catch (err) {
        console.error("Error en Dashboard Médico:", err);
        mostrarAviso('No se pudieron cargar los datos', 'error');
    }
}

function mismoMes(isoDate, anio, mes) {
    if (!isoDate) return false;
    const d = new Date(isoDate);
    return d.getFullYear() === anio && d.getMonth() === mes;
}

function pintarTarjetas(pacientes, citas, recetas) {
    const hoy = hoyISO();
    const ahora = new Date();
    const anio = ahora.getFullYear();
    const mes = ahora.getMonth();
    const mesAnt = mes === 0 ? 11 : mes - 1;
    const anioAnt = mes === 0 ? anio - 1 : anio;

    const nuevosMes = pacientes.filter(p => mismoMes(p.created_at || new Date().toISOString(), anio, mes)).length;
    document.getElementById('dash-paciente').textContent = pacientes.length;
    document.getElementById('dash-paciente-detalle').textContent = '+' + nuevosMes + ' nuevos este mes';

    const citasHoy = citas.filter(c => c.fecha === hoy);
    const pendientesHoy = citasHoy.filter(c => c.estado === 'Pendiente').length;
    document.getElementById('dash-consultas').textContent = citasHoy.length;
    document.getElementById('dash-consultas-detalle').textContent = pendientesHoy + ' por atender';

    const recetasMes = recetas.filter(r => r.fecha_emision && mismoMes(r.fecha_emision, anio, mes)).length;
    const recetasMesAnt = recetas.filter(r => r.fecha_emision && mismoMes(r.fecha_emision, anioAnt, mesAnt)).length;
    const diferencia = recetasMes - recetasMesAnt;
    document.getElementById('dash-recetas').textContent = recetasMes;
    document.getElementById('dash-recetas-detalle').textContent = (diferencia >= 0 ? '+' : '') + Math.abs(diferencia) + ' vs mes anterior';

    const pendientes = citas.filter(c => c.estado === 'Pendiente').length;
    document.getElementById('dash-pendientes').textContent = pendientes;
    document.getElementById('dash-pendientes-detalle').textContent = pendientes === 1 ? 'Requiere seguimiento' : 'Requieren seguimiento';
}

function pintarTablaResumen(pacientes, citas) {
    const tbody = document.getElementById('table-resumen');
    
    const ordenadas = citas.slice().sort((a, b) => aFecha(b.fecha, b.hora) - aFecha(a.fecha, a.hora));

    const ultimaPorPaciente = {};
    ordenadas.forEach(c => {
        if (!ultimaPorPaciente[c.id_paciente]) ultimaPorPaciente[c.id_paciente] = c;
    });

    const recientes = pacientes.map(p => {
        const ultima = ultimaPorPaciente[p.id_paciente] || null;
        const fechaMov = ultima ? aFecha(ultima.fecha, ultima.hora) : new Date(p.created_at || 0);
        return { paciente: p, ultima: ultima, fechaMov: fechaMov };
    }).sort((a, b) => b.fechaMov - a.fechaMov).slice(0, 5); 

    if (recientes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--texto-suave);">Aún no hay pacientes registrados</td></tr>';
        return;
    }

    tbody.innerHTML = recientes.map(item => {
        const p = item.paciente;
        const estado = item.ultima ? item.ultima.estado : 'Sin consultas';
        const etiqueta = item.ultima ? etiquetaEstado(estado) : '<span class="etiqueta">Sin consultas</span>';
        
        return `<tr>
            <td class="celda-paciente">
                <span class="avatar">${escaparHTML(iniciales(p.nombre))}</span>
                <span class="nombre">${escaparHTML(p.nombre)}</span>
            </td>
            <td>${escaparHTML(p.aseguradora || '—')}</td>
            <td>${item.ultima ? formatoFecha(item.ultima.fecha) : '—'}</td>
            <td>${etiqueta}</td>
            <td><button class="btn-detalle" data-id="${escaparHTML(p.id_paciente)}" onclick="window.location.href='detallepaciente.html?id=${encodeURIComponent(p.id_paciente)}'">Ver detalle</button></td>
        </tr>`;
    }).join('');
}