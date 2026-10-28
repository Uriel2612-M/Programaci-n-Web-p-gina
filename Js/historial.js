/* =========================================================
   historial.js — historial.html
   - Lista cronológica completa uniendo paciente + consulta + medicamentos
   - Etiqueta "Pendiente" / "Completada" pintada dinámicamente
   Requiere: db.js, global.js
   ========================================================= */

(async function iniciarHistorial() {
    const contenedor = document.getElementById('lista-historial');

    try {
        const [pacientes, consultas, recetas] = await Promise.all([
            DB.listar('pacientes'), DB.listar('consultas'), DB.listar('recetas')
        ]);

        // Índices para unir rápido (equivalente a un JOIN)
        const pacientePorId = {};
        pacientes.forEach(function (p) { pacientePorId[p.id] = p; });

        const medsPorConsulta = {};
        recetas.forEach(function (r) {
            if (!medsPorConsulta[r.consulta_id]) medsPorConsulta[r.consulta_id] = [];
            medsPorConsulta[r.consulta_id] = medsPorConsulta[r.consulta_id].concat(r.medicamentos || []);
        });

        const historial = ordenarPorFechaDesc(consultas).map(function (c) {
            return {
                consulta: c,
                paciente: pacientePorId[c.paciente_id] || { nombre: 'Paciente eliminado' },
                medicamentos: medsPorConsulta[c.id] || [],
                estado: estadoConsulta(c)
            };
        });

        if (historial.length === 0) {
            contenedor.innerHTML = '<p style="padding:22px 24px;font-size:13px;color:var(--texto-suave);">No hay consultas en el historial.</p>';
            return;
        }

        contenedor.innerHTML = historial.map(pintarItem).join('');
    } catch (err) {
        console.error(err);
        mostrarAviso('No se pudo cargar el historial', 'error');
    }
})();

function pintarItem(item) {
    const c = item.consulta;
    const p = item.paciente;
    const completada = item.estado === 'Completada';

    const datosPaciente = [
        p.fecha_nacimiento ? calcularEdad(p.fecha_nacimiento) + ' años' : '',
        p.aseguradora || ''
    ].filter(Boolean).join(' · ');

    const descripcion = [c.diagnostico, c.notas].filter(Boolean).join(' — ') || 'Sin diagnóstico registrado';

    const recetaHTML = item.medicamentos.length
        ? '<div class="receta-tags"><span class="label-receta">Receta:</span>' +
            item.medicamentos.map(function (m) {
                return '<span class="pill-medicamento" title="' + escaparHTML([m.dosis, m.duracion].filter(Boolean).join(' · ')) + '">' +
                    escaparHTML(m.nombre) + '</span>';
            }).join('') + '</div>'
        : '<div class="receta-tags"><span class="label-receta">Sin receta</span></div>';

    return '<div class="item-historial">' +
        '<div class="col-fecha">' +
            '<span class="punto-timeline ' + (completada ? 'verde' : 'rojo') + '"></span>' +
            '<span class="fecha-texto">' + formatoFecha(c.fecha) + '</span>' +
            '<span class="fecha-texto">' + escaparHTML(c.hora || '') + '</span>' +
        '</div>' +
        '<div class="col-detalles">' +
            '<div class="paciente-header">' +
                '<span class="avatar">' + escaparHTML(iniciales(p.nombre)) + '</span>' +
                '<h4>' + escaparHTML(p.nombre) +
                    (datosPaciente ? ' <span class="texto-suave">' + escaparHTML(datosPaciente) + '</span>' : '') +
                '</h4>' +
            '</div>' +
            '<div class="consulta-info">' +
                '<h5>' + escaparHTML(c.motivo || 'Consulta general') + '</h5>' +
                '<p>' + escaparHTML(descripcion) + '</p>' +
            '</div>' +
            recetaHTML +
        '</div>' +
        '<div class="col-estado">' + etiquetaEstado(item.estado) + '</div>' +
    '</div>';
}
