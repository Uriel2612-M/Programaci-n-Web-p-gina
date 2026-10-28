/* =========================================================
   dashboard.js — dashboard.html
   - Cálculos de las 4 tarjetas superiores
   - Tabla "Pacientes recientes" con los movimientos más recientes
   Requiere: db.js, global.js (y fecha.js para saludo/fecha)
   ========================================================= */

(async function iniciarDashboard() {
    const sesion = obtenerSesion();
    const nombreHeader = document.getElementById('header-name');
    if (sesion && nombreHeader) nombreHeader.textContent = ', ' + sesion.nombre;

    try {
        const [pacientes, consultas, recetas] = await Promise.all([
            DB.listar('pacientes'), DB.listar('consultas'), DB.listar('recetas')
        ]);
        pintarTarjetas(pacientes, consultas, recetas);
        pintarTablaResumen(pacientes, consultas);
    } catch (err) {
        console.error(err);
        mostrarAviso('No se pudieron cargar los datos', 'error');
    }
})();

function mismoMes(iso, anio, mes) {
    const d = aFecha(iso);
    return d && d.getFullYear() === anio && d.getMonth() === mes;
}

function pintarTarjetas(pacientes, consultas, recetas) {
    const hoy = hoyISO();
    const ahora = new Date();
    const anio = ahora.getFullYear();
    const mes = ahora.getMonth();
    const mesAnt = mes === 0 ? 11 : mes - 1;
    const anioAnt = mes === 0 ? anio - 1 : anio;

    // 1. Total de pacientes
    const nuevosMes = pacientes.filter(function (p) { return mismoMes(p.creado, anio, mes); }).length;
    document.getElementById('dash-paciente').textContent = pacientes.length;
    document.getElementById('dash-paciente-detalle').textContent = '+' + nuevosMes + ' nuevos este mes';

    // 2. Consultas de hoy
    const consultasHoy = consultas.filter(function (c) { return c.fecha === hoy; });
    const pendientesHoy = consultasHoy.filter(function (c) { return estadoConsulta(c) === 'Pendiente'; }).length;
    document.getElementById('dash-consultas').textContent = consultasHoy.length;
    document.getElementById('dash-consultas-detalle').textContent = pendientesHoy + ' por atender';

    // 3. Recetas este mes (comparado con el mes anterior)
    const recetasMes = recetas.filter(function (r) { return mismoMes(r.fecha, anio, mes); }).length;
    const recetasMesAnt = recetas.filter(function (r) { return mismoMes(r.fecha, anioAnt, mesAnt); }).length;
    const diferencia = recetasMes - recetasMesAnt;
    document.getElementById('dash-recetas').textContent = recetasMes;
    document.getElementById('dash-recetas-detalle').textContent =
        (diferencia >= 0 ? '+' : '') + diferencia + ' vs mes anterior';

    // 4. Casos pendientes (todas las consultas sin completar)
    const pendientes = consultas.filter(function (c) { return estadoConsulta(c) === 'Pendiente'; }).length;
    document.getElementById('dash-pendientes').textContent = pendientes;
    document.getElementById('dash-pendientes-detalle').textContent =
        pendientes === 1 ? 'Requiere seguimiento' : 'Requieren seguimiento';
}

function pintarTablaResumen(pacientes, consultas) {
    const tbody = document.getElementById('table-resumen');
    const ordenadas = ordenarPorFechaDesc(consultas);

    // Última consulta de cada paciente
    const ultimaPorPaciente = {};
    ordenadas.forEach(function (c) {
        if (!ultimaPorPaciente[c.paciente_id]) ultimaPorPaciente[c.paciente_id] = c;
    });

    // Pacientes ordenados por movimiento más reciente (consulta o alta)
    const recientes = pacientes.map(function (p) {
        const ultima = ultimaPorPaciente[p.id] || null;
        const fechaMov = ultima ? aFecha(ultima.fecha, ultima.hora) : aFecha(p.creado);
        return { paciente: p, ultima: ultima, fechaMov: fechaMov || new Date(0) };
    }).sort(function (a, b) { return b.fechaMov - a.fechaMov; }).slice(0, 5);

    if (recientes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--texto-suave);">Aún no hay pacientes registrados</td></tr>';
        return;
    }

    tbody.innerHTML = recientes.map(function (item) {
        const p = item.paciente;
        const estado = item.ultima ? estadoConsulta(item.ultima) : 'Sin consultas';
        const etiqueta = item.ultima ? etiquetaEstado(estado) : '<span class="etiqueta">Sin consultas</span>';
        return '<tr>' +
            '<td class="celda-paciente"><span class="avatar">' + escaparHTML(iniciales(p.nombre)) + '</span>' +
                '<span class="nombre">' + escaparHTML(p.nombre) + '</span></td>' +
            '<td>' + escaparHTML(p.aseguradora || '—') + '</td>' +
            '<td>' + (item.ultima ? formatoFecha(item.ultima.fecha) : '—') + '</td>' +
            '<td>' + etiqueta + '</td>' +
            '<td><button class="btn-detalle" data-id="' + escaparHTML(p.id) + '">Ver detalle</button></td>' +
        '</tr>';
    }).join('');

    tbody.querySelectorAll('.btn-detalle').forEach(function (btn) {
        btn.addEventListener('click', function () {
            window.location.href = 'detallepaciente.html?id=' + encodeURIComponent(btn.dataset.id);
        });
    });
}
