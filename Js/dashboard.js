
(async function iniciarDashboard() {
    const sesion = obtenerSesion();
    const nombreHeader = document.getElementById('header-name');
    if (sesion && nombreHeader) nombreHeader.textContent = ', ' + sesion.nombre;

    try {
        // Hacemos peticiones directas a Supabase para mayor control
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
        console.error("Error en Dashboard:", err);
        mostrarAviso('No se pudieron cargar los datos', 'error');
    }
})();

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

    // 1. Total de pacientes (usamos created_at por defecto en Supabase)
    const nuevosMes = pacientes.filter(p => mismoMes(p.created_at || new Date().toISOString(), anio, mes)).length;
    document.getElementById('dash-paciente').textContent = pacientes.length;
    document.getElementById('dash-paciente-detalle').textContent = '+' + nuevosMes + ' nuevos este mes';

    // 2. Consultas de hoy (leyendo desde la tabla Cita)
    const citasHoy = citas.filter(c => c.fecha === hoy);
    const pendientesHoy = citasHoy.filter(c => c.estado === 'Pendiente').length;
    document.getElementById('dash-consultas').textContent = citasHoy.length;
    document.getElementById('dash-consultas-detalle').textContent = pendientesHoy + ' por atender';

    // 3. Recetas este mes
    const recetasMes = recetas.filter(r => mismoMes(r.fecha, anio, mes)).length;
    const recetasMesAnt = recetas.filter(r => mismoMes(r.fecha, anioAnt, mesAnt)).length;
    const diferencia = recetasMes - recetasMesAnt;
    document.getElementById('dash-recetas').textContent = recetasMes;
    document.getElementById('dash-recetas-detalle').textContent = (diferencia >= 0 ? '+' : '') + Math.abs(diferencia) + ' vs mes anterior';

    // 4. Casos pendientes (citas sin completar)
    const pendientes = citas.filter(c => c.estado === 'Pendiente').length;
    document.getElementById('dash-pendientes').textContent = pendientes;
    document.getElementById('dash-pendientes-detalle').textContent = pendientes === 1 ? 'Requiere seguimiento' : 'Requieren seguimiento';
}

function pintarTablaResumen(pacientes, citas) {
    const tbody = document.getElementById('table-resumen');
    
    // Ordenamos citas de más reciente a más antigua
    const ordenadas = citas.slice().sort((a, b) => {
        return aFecha(b.fecha, b.hora) - aFecha(a.fecha, a.hora);
    });

    // Buscamos la última cita de cada paciente
    const ultimaPorPaciente = {};
    ordenadas.forEach(c => {
        if (!ultimaPorPaciente[c.id_paciente]) ultimaPorPaciente[c.id_paciente] = c;
    });

    // Unimos pacientes con su movimiento más reciente
    const recientes = pacientes.map(p => {
        const ultima = ultimaPorPaciente[p.id_paciente] || null;
        const fechaMov = ultima ? aFecha(ultima.fecha, ultima.hora) : new Date(p.created_at || 0);
        return { paciente: p, ultima: ultima, fechaMov: fechaMov };
    }).sort((a, b) => b.fechaMov - a.fechaMov).slice(0, 5); // Tomamos los 5 más recientes

    if (recientes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--texto-suave);">Aún no hay pacientes registrados</td></tr>';
        return;
    }

    // Inyectamos HTML
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
            <td><button class="btn-detalle" data-id="${escaparHTML(p.id_paciente)}">Ver detalle</button></td>
        </tr>`;
    }).join('');

    // Eventos de los botones "Ver detalle"
    tbody.querySelectorAll('.btn-detalle').forEach(btn => {
        btn.addEventListener('click', () => {
            window.location.href = 'detallepaciente.html?id=' + encodeURIComponent(btn.dataset.id);
        });
    });
}