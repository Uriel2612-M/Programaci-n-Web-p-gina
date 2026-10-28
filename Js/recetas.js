/* =========================================================
   recetas.js — recetas.html
   - El selector "Consulta asociada" se actualiza al elegir paciente
   - Botón "+ Agregar" duplica los campos de medicamento
   - Guardar la receta en la base de datos
   - Recetas recientes del lado derecho
   Requiere: db.js, global.js
   ========================================================= */

const formReceta = document.querySelector('.formulario-consulta form');
const selPaciente = document.getElementById('paciente');
const selConsulta = document.getElementById('consulta');
const listaMedicamentos = document.getElementById('lista-medicamentos');

let pacientesReceta = [];
let consultasReceta = [];

function nombreDePaciente(id) {
    const p = pacientesReceta.find(function (x) { return String(x.id) === String(id); });
    return p ? p.nombre : 'Paciente eliminado';
}

/* ---------------- Selectores ---------------- */
function llenarPacientes() {
    selPaciente.innerHTML = '<option value="">Seleccionar paciente...</option>' +
        pacientesReceta.map(function (p) {
            return '<option value="' + escaparHTML(p.id) + '">' + escaparHTML(p.nombre) + '</option>';
        }).join('');
}

function actualizarConsultas() {
    const idPaciente = selPaciente.value;

    if (!idPaciente) {
        selConsulta.innerHTML = '<option value="">Primero selecciona un paciente</option>';
        selConsulta.disabled = true;
        return;
    }

    const suyas = ordenarPorFechaDesc(consultasReceta.filter(function (c) {
        return String(c.paciente_id) === String(idPaciente);
    }));

    if (suyas.length === 0) {
        selConsulta.innerHTML = '<option value="">Este paciente no tiene consultas</option>';
        selConsulta.disabled = true;
        return;
    }

    selConsulta.innerHTML = '<option value="">Seleccionar consulta...</option>' +
        suyas.map(function (c) {
            const texto = formatoFecha(c.fecha) + ' ' + (c.hora || '') + ' — ' + (c.diagnostico || c.motivo || 'Sin diagnóstico');
            return '<option value="' + escaparHTML(c.id) + '">' + escaparHTML(texto) + '</option>';
        }).join('');
    selConsulta.disabled = false;
    if (suyas.length === 1) selConsulta.value = suyas[0].id; // si solo hay una, se elige sola
}

selPaciente.addEventListener('change', actualizarConsultas);

/* ---------------- Medicamentos dinámicos ---------------- */
function renumerarMedicamentos() {
    const bloques = listaMedicamentos.querySelectorAll('.bloque-medicamento');
    bloques.forEach(function (bloque, i) {
        bloque.querySelector('.titulo-bloque').firstChild.textContent = 'Medicamento ' + (i + 1);
        const btnQuitar = bloque.querySelector('.btn-quitar-med');
        if (btnQuitar) btnQuitar.style.display = bloques.length > 1 ? 'inline' : 'none';
    });
}

function prepararBloque(bloque) {
    const titulo = bloque.querySelector('.titulo-bloque');
    if (titulo.querySelector('.btn-quitar-med')) return;

    titulo.style.display = 'flex';
    titulo.style.justifyContent = 'space-between';
    const btnQuitar = document.createElement('button');
    btnQuitar.type = 'button';
    btnQuitar.className = 'btn-quitar-med';
    btnQuitar.textContent = 'Quitar';
    btnQuitar.style.cssText = 'background:none;border:none;color:#d6455d;font-size:12px;cursor:pointer;padding:0;';
    btnQuitar.addEventListener('click', function () {
        bloque.remove();
        renumerarMedicamentos();
    });
    titulo.appendChild(btnQuitar);
}

function agregarMedicamento() {
    const plantilla = listaMedicamentos.querySelector('.bloque-medicamento');
    const nuevo = plantilla.cloneNode(true);
    nuevo.querySelectorAll('input').forEach(function (input) { input.value = ''; });
    nuevo.querySelector('.btn-quitar-med') && nuevo.querySelector('.btn-quitar-med').remove();
    listaMedicamentos.appendChild(nuevo);
    prepararBloque(nuevo);
    renumerarMedicamentos();
    nuevo.querySelector('input').focus();
}

document.getElementById('btn-agregar-medicamento').addEventListener('click', agregarMedicamento);

function reiniciarMedicamentos() {
    const bloques = listaMedicamentos.querySelectorAll('.bloque-medicamento');
    bloques.forEach(function (b, i) { if (i > 0) b.remove(); });
    renumerarMedicamentos();
}

/* ---------------- Guardar receta ---------------- */
formReceta.addEventListener('submit', async function (e) {
    e.preventDefault();

    const medicamentos = Array.from(listaMedicamentos.querySelectorAll('.bloque-medicamento')).map(function (b) {
        return {
            nombre: b.querySelector('input[name="medicamento[]"]').value.trim(),
            dosis: b.querySelector('input[name="dosis[]"]').value.trim(),
            duracion: b.querySelector('input[name="duracion[]"]').value.trim()
        };
    }).filter(function (m) { return m.nombre; });

    const datos = {
        paciente_id: selPaciente.value,
        consulta_id: selConsulta.value,
        fecha: document.getElementById('fecha').value,
        hora: document.getElementById('hora').value,
        medicamentos: medicamentos
    };

    if (!datos.paciente_id || !datos.consulta_id) {
        mostrarAviso('Selecciona paciente y consulta', 'error');
        return;
    }
    if (medicamentos.length === 0) {
        mostrarAviso('Agrega al menos un medicamento', 'error');
        return;
    }

    try {
        await DB.crear('recetas', datos);
        mostrarAviso('Receta emitida');
        formReceta.reset();
        reiniciarMedicamentos();
        actualizarConsultas();
        valoresPorDefectoReceta();
        await pintarRecetasRecientes();
    } catch (err) {
        console.error(err);
        mostrarAviso('No se pudo guardar la receta', 'error');
    }
});

function valoresPorDefectoReceta() {
    document.getElementById('fecha').value = hoyISO();
    document.getElementById('hora').value = horaActual();
}

/* ---------------- Recetas recientes ---------------- */
async function pintarRecetasRecientes() {
    const contenedor = document.getElementById('lista-recetas');
    const recetas = ordenarPorFechaDesc(await DB.listar('recetas')).slice(0, 10);

    if (recetas.length === 0) {
        contenedor.innerHTML = '<p style="padding:18px 24px;font-size:13px;color:var(--texto-suave);">Aún no se han emitido recetas.</p>';
        return;
    }

    contenedor.innerHTML = recetas.map(function (r) {
        const nombre = nombreDePaciente(r.paciente_id);
        const meds = (r.medicamentos || []).map(function (m) {
            const detalle = [m.dosis, m.duracion].filter(Boolean).join(' · ');
            return '<li>' + escaparHTML(m.nombre) + '<span class="med-dosis">' + escaparHTML(detalle) + '</span></li>';
        }).join('');
        return '<div class="item-receta">' +
            '<span class="avatar">' + escaparHTML(iniciales(nombre)) + '</span>' +
            '<div class="info-receta">' +
                '<h4>' + escaparHTML(nombre) + '</h4>' +
                '<ul class="lista-meds">' + meds + '</ul>' +
            '</div>' +
            '<span class="fecha">' + formatoFecha(r.fecha) + '</span>' +
        '</div>';
    }).join('');
}

/* ---------------- Arranque ---------------- */
(async function iniciarRecetas() {
    try {
        prepararBloque(listaMedicamentos.querySelector('.bloque-medicamento'));
        renumerarMedicamentos();
        valoresPorDefectoReceta();

        [pacientesReceta, consultasReceta] = await Promise.all([DB.listar('pacientes'), DB.listar('consultas')]);
        pacientesReceta.sort(function (a, b) { return a.nombre.localeCompare(b.nombre); });
        llenarPacientes();

        const pre = parametroURL('paciente');
        if (pre) selPaciente.value = pre;
        actualizarConsultas();

        await pintarRecetasRecientes();
    } catch (err) {
        console.error(err);
        mostrarAviso('No se pudieron cargar los datos', 'error');
    }
})();
