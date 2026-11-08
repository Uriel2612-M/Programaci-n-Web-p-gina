/* =========================================================
   recetas.js — ADAPTADO PARA SUPABASE (3 Tablas Normalizadas)
   ========================================================= */

const formReceta = document.querySelector('.formulario-consulta form');
const selPaciente = document.getElementById('paciente');
const selConsulta = document.getElementById('consulta');
const listaMedicamentos = document.getElementById('lista-medicamentos');

let pacientesReceta = [];
let consultasReceta = []; 

function nombreDePaciente(id) {
    const p = pacientesReceta.find(x => String(x.id_paciente) === String(id));
    return p ? p.nombre : 'Paciente eliminado';
}

/* ---------------- Selectores ---------------- */
function llenarPacientes() {
    selPaciente.innerHTML = '<option value="">Seleccionar paciente...</option>' +
        pacientesReceta.map(p => `<option value="${escaparHTML(p.id_paciente)}">${escaparHTML(p.nombre)}</option>`).join('');
}

function actualizarConsultas() {
    const idPaciente = selPaciente.value;

    if (!idPaciente) {
        selConsulta.innerHTML = '<option value="">Primero selecciona un paciente</option>';
        selConsulta.disabled = true;
        return;
    }

    const suyas = ordenarPorFechaDesc(consultasReceta.filter(c => String(c.id_paciente) === String(idPaciente)));

    const citasConConsulta = suyas.filter(c => {
        const cons = Array.isArray(c.consulta) ? c.consulta[0] : c.consulta;
        return cons && cons.id_consulta; 
    });

    if (citasConConsulta.length === 0) {
        selConsulta.innerHTML = '<option value="">Este paciente no tiene consultas registradas</option>';
        selConsulta.disabled = true;
        return;
    }

    selConsulta.innerHTML = '<option value="">Seleccionar consulta...</option>' +
        citasConConsulta.map(c => {
            const cons = Array.isArray(c.consulta) ? c.consulta[0] : c.consulta;
            const dx = cons.diagnostico || 'Sin diagnóstico';
            const texto = formatoFecha(c.fecha) + ' ' + (c.hora || '') + ' — ' + dx;
            
            return `<option value="${escaparHTML(cons.id_consulta)}">${escaparHTML(texto)}</option>`;
        }).join('');

    selConsulta.disabled = false;
    
    if (citasConConsulta.length === 1) selConsulta.selectedIndex = 1;
}

selPaciente.addEventListener('change', actualizarConsultas);

/* ---------------- Medicamentos dinámicos ---------------- */
function renumerarMedicamentos() {
    const bloques = listaMedicamentos.querySelectorAll('.bloque-medicamento');
    bloques.forEach((bloque, i) => {
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
    btnQuitar.addEventListener('click', () => { bloque.remove(); renumerarMedicamentos(); });
    titulo.appendChild(btnQuitar);
}

function agregarMedicamento() {
    const plantilla = listaMedicamentos.querySelector('.bloque-medicamento');
    const nuevo = plantilla.cloneNode(true);
    nuevo.querySelectorAll('input').forEach(input => input.value = '');
    if (nuevo.querySelector('.btn-quitar-med')) nuevo.querySelector('.btn-quitar-med').remove();
    listaMedicamentos.appendChild(nuevo);
    prepararBloque(nuevo);
    renumerarMedicamentos();
    nuevo.querySelector('input').focus();
}

document.getElementById('btn-agregar-medicamento').addEventListener('click', agregarMedicamento);

function reiniciarMedicamentos() {
    const bloques = listaMedicamentos.querySelectorAll('.bloque-medicamento');
    bloques.forEach((b, i) => { if (i > 0) b.remove(); });
    renumerarMedicamentos();
}

/* ---------------- Guardar receta (Lógica de 3 tablas) ---------------- */
formReceta.addEventListener('submit', async function (e) {
    e.preventDefault();

    const id_consulta = selConsulta.value;
    const medicamentosCapturados = Array.from(listaMedicamentos.querySelectorAll('.bloque-medicamento')).map(b => ({
        nombre_comercial: b.querySelector('input[name="medicamento[]"]').value.trim(),
        dosis: b.querySelector('input[name="dosis[]"]').value.trim(),
        duracion: b.querySelector('input[name="duracion[]"]').value.trim() 
    })).filter(m => m.nombre_comercial);

    if (!selPaciente.value || !id_consulta) {
        mostrarAviso('Selecciona paciente y consulta válida', 'error');
        return;
    }
    if (medicamentosCapturados.length === 0) {
        mostrarAviso('Agrega al menos un medicamento', 'error');
        return;
    }

    try {
        // PASO 1: Crear la Receta
        const nuevaReceta = {
            id_consulta: id_consulta,
            fecha_emision: document.getElementById('fecha').value
        };
        const recetaGuardada = await DB.crear('receta', nuevaReceta);

        // PASO 2: Procesar medicamentos (Buscar o Crear) para armar los Detalles
        const detallesAInsertar = [];
        
        for (const med of medicamentosCapturados) {
            let idMed = null;
            
            // Verificamos si el medicamento ya existe (sin importar mayúsculas/minúsculas)
            const { data: medExistente, error: errBusqueda } = await supabaseClient
                .from('medicamento')
                .select('id_medicamento')
                .ilike('nombre_comercial', med.nombre_comercial)
                .maybeSingle();

            if (medExistente) {
                idMed = medExistente.id_medicamento;
            } else {
                // Si no existe, lo agregamos al catálogo
                const { data: medNuevo, error: errCreacion } = await supabaseClient
                    .from('medicamento')
                    .insert([{ 
                        nombre_comercial: med.nombre_comercial, 
                        dosis_recomendada: med.dosis // Guardamos la dosis como la recomendada inicial
                    }])
                    .select()
                    .single();
                
                if (errCreacion) throw errCreacion;
                idMed = medNuevo.id_medicamento;
            }

            // Preparamos el cruce para detalle_receta
            detallesAInsertar.push({
                id_receta: recetaGuardada.id_receta,
                id_medicamento: idMed,
                dosis: med.dosis,
                duracion: med.duracion
            });
        }

        // PASO 3: Insertar todos los medicamentos en la tabla detalle_receta
        const { error: errorDetalle } = await supabaseClient
            .from('detalle_receta')
            .insert(detallesAInsertar);
            
        if (errorDetalle) throw errorDetalle;

        mostrarAviso('Receta emitida exitosamente');
        formReceta.reset();
        reiniciarMedicamentos();
        actualizarConsultas();
        valoresPorDefectoReceta();
        await pintarRecetasRecientes();
    } catch (err) {
        console.error(err);
        mostrarAviso('No se pudo emitir la receta', 'error');
    }
});

function valoresPorDefectoReceta() {
    document.getElementById('fecha').value = hoyISO();
    document.getElementById('hora').value = horaActual();
}

/* ---------------- Recetas recientes (JOIN con 3 tablas) ---------------- */
async function pintarRecetasRecientes() {
    const contenedor = document.getElementById('lista-recetas');
    
    try {
        // Hacemos el JOIN pasando por detalle_receta hasta el catálogo de medicamento
        const { data: recetasBD, error } = await supabaseClient
            .from('receta')
            .select(`
                id_receta, fecha_emision,
                detalle_receta(
                    dosis, duracion,
                    medicamento(nombre_comercial)
                ),
                consulta!inner(
                    cita!inner(
                        paciente!inner(nombre)
                    )
                )
            `)
            .order('id_receta', { ascending: false })
            .limit(10);

        if (error) throw error;

        if (!recetasBD || recetasBD.length === 0) {
            contenedor.innerHTML = '<p style="padding:18px 24px;font-size:13px;color:var(--texto-suave);">Aún no se han emitido recetas.</p>';
            return;
        }

        contenedor.innerHTML = recetasBD.map(r => {
            const nombre = r.consulta.cita.paciente.nombre;
            const meds = (r.detalle_receta || []).map(m => {
                const nombreMed = m.medicamento ? m.medicamento.nombre_comercial : 'Med. Desconocido';
                const detalle = [m.dosis, m.duracion].filter(Boolean).join(' · ');
                return `<li>${escaparHTML(nombreMed)}<span class="med-dosis">${escaparHTML(detalle)}</span></li>`;
            }).join('');
            
            return `<div class="item-receta">
                <span class="avatar">${escaparHTML(iniciales(nombre))}</span>
                <div class="info-receta">
                    <h4>${escaparHTML(nombre)}</h4>
                    <ul class="lista-meds">${meds}</ul>
                </div>
                <span class="fecha">${formatoFecha(r.fecha_emision)}</span>
            </div>`;
        }).join('');
    } catch (err) {
        console.error("Error al cargar recetas recientes:", err);
    }
}

/* ---------------- Arranque ---------------- */
(async function iniciarRecetas() {
    try {
        prepararBloque(listaMedicamentos.querySelector('.bloque-medicamento'));
        renumerarMedicamentos();
        valoresPorDefectoReceta();

        const [reqPacientes, reqCitas] = await Promise.all([
            supabaseClient.from('paciente').select('id_paciente, nombre'),
            supabaseClient.from('cita').select('id_cita, id_paciente, fecha, hora, consulta(id_consulta, diagnostico)')
        ]);

        if (reqPacientes.error) throw reqPacientes.error;
        if (reqCitas.error) throw reqCitas.error;

        pacientesReceta = reqPacientes.data.sort((a, b) => a.nombre.localeCompare(b.nombre));
        consultasReceta = reqCitas.data;

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