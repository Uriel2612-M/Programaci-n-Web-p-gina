/* =========================================================
   pacientes.js — pacientes.html
   - Lista de pacientes en la tabla principal (+ buscador)
   - Abrir / cerrar el modal de registro
   - Capturar el formulario y guardarlo en la base de datos
   Requiere: db.js, global.js
   ========================================================= */

const modal = document.getElementById('modal-nuevo-paciente');
const formPaciente = document.getElementById('form-nuevo-paciente');
const tituloModal = modal.querySelector('.modal-encabezado h2');
const inputBusqueda = document.getElementById('input-busqueda');

let listaPacientes = [];
let listaConsultas = [];
let idEditando = null; // null = nuevo paciente; con id = editar

/* ---------------- Modal ---------------- */
function abrirModal(paciente) {
    formPaciente.reset();
    idEditando = paciente ? paciente.id : null;
    tituloModal.textContent = paciente ? 'Editar Paciente' : 'Nuevo Paciente';

    if (paciente) {
        document.getElementById('pac-nombre').value = paciente.nombre || '';
        document.getElementById('pac-nacimiento').value = paciente.fecha_nacimiento || '';
        document.getElementById('pac-genero').value = paciente.genero || '';
        document.getElementById('pac-telefono').value = paciente.telefono || '';
        document.getElementById('pac-correo').value = paciente.correo || '';
        document.getElementById('pac-aseguradora').value = paciente.aseguradora || '';
        document.getElementById('pac-poliza').value = paciente.poliza || '';
        document.getElementById('pac-direccion').value = paciente.direccion || '';
        document.getElementById('pac-alergias').value = paciente.alergias || '';
        document.getElementById('pac-contacto').value = paciente.contacto_emergencia || '';
    }
    modal.style.display = 'flex';
    document.getElementById('pac-nombre').focus();
}

function cerrarModal() {
    modal.style.display = 'none';
    formPaciente.reset();
    idEditando = null;
}

document.getElementById('btn-agregar-paciente').addEventListener('click', function () { abrirModal(null); });
document.getElementById('btn-cerrar-modal-paciente').addEventListener('click', cerrarModal);
document.getElementById('btn-x-modal-paciente').addEventListener('click', cerrarModal);
// Cerrar al hacer clic fuera de la caja o con la tecla Esc
modal.addEventListener('click', function (e) { if (e.target === modal) cerrarModal(); });
document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && modal.style.display === 'flex') cerrarModal(); });

/* ---------------- Guardar formulario ---------------- */
formPaciente.addEventListener('submit', async function (e) {
    e.preventDefault();

    const datos = {
        nombre: document.getElementById('pac-nombre').value.trim(),
        fecha_nacimiento: document.getElementById('pac-nacimiento').value,
        genero: document.getElementById('pac-genero').value,
        telefono: document.getElementById('pac-telefono').value.trim(),
        correo: document.getElementById('pac-correo').value.trim(),
        aseguradora: document.getElementById('pac-aseguradora').value.trim(),
        poliza: document.getElementById('pac-poliza').value.trim(),
        direccion: document.getElementById('pac-direccion').value.trim(),
        alergias: document.getElementById('pac-alergias').value.trim(),
        contacto_emergencia: document.getElementById('pac-contacto').value.trim()
    };

    if (aFecha(datos.fecha_nacimiento) > new Date()) {
        mostrarAviso('La fecha de nacimiento no puede ser futura', 'error');
        return;
    }

    try {
        if (idEditando) {
            await DB.actualizar('pacientes', idEditando, datos);
            mostrarAviso('Paciente actualizado');
        } else {
            await DB.crear('pacientes', datos);
            mostrarAviso('Paciente registrado');
        }
        cerrarModal();
        await cargarPacientes();
    } catch (err) {
        console.error(err);
        mostrarAviso('No se pudo guardar el paciente', 'error');
    }
});

/* ---------------- Tabla ---------------- */
function ultimaVisita(idPaciente) {
    const suyas = listaConsultas.filter(function (c) { return String(c.paciente_id) === String(idPaciente); });
    if (suyas.length === 0) return '—';
    return formatoFecha(ordenarPorFechaDesc(suyas)[0].fecha);
}

function pintarTabla() {
    const tbody = document.getElementById('table-paciente');
    const texto = inputBusqueda.value.trim().toLowerCase();

    const filtrados = listaPacientes.filter(function (p) {
        return !texto ||
            (p.nombre || '').toLowerCase().includes(texto) ||
            (p.aseguradora || '').toLowerCase().includes(texto);
    }).sort(function (a, b) { return a.nombre.localeCompare(b.nombre); });

    if (filtrados.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--texto-suave);">' +
            (texto ? 'Sin resultados para "' + escaparHTML(texto) + '"' : 'Aún no hay pacientes registrados') + '</td></tr>';
        return;
    }

    tbody.innerHTML = filtrados.map(function (p) {
        return '<tr>' +
            '<td class="celda-paciente"><span class="avatar">' + escaparHTML(iniciales(p.nombre)) + '</span>' +
                '<span class="nombre">' + escaparHTML(p.nombre) + '</span></td>' +
            '<td>' + calcularEdad(p.fecha_nacimiento) + '</td>' +
            '<td>' + escaparHTML(p.telefono || '—') + '</td>' +
            '<td>' + escaparHTML(p.aseguradora || '—') + '</td>' +
            '<td>' + escaparHTML(p.poliza || '—') + '</td>' +
            '<td>' + ultimaVisita(p.id) + '</td>' +
            '<td>' +
                '<button class="btn-ver" data-id="' + escaparHTML(p.id) + '">Ver</button>' +
                '<button class="btn-editar" data-id="' + escaparHTML(p.id) + '">Editar</button>' +
            '</td>' +
        '</tr>';
    }).join('');
}

// Delegación de eventos para los botones de cada fila
document.getElementById('table-paciente').addEventListener('click', function (e) {
    const btn = e.target.closest('button');
    if (!btn) return;
    const id = btn.dataset.id;
    if (btn.classList.contains('btn-ver')) {
        window.location.href = 'detallepaciente.html?id=' + encodeURIComponent(id);
    } else if (btn.classList.contains('btn-editar')) {
        const paciente = listaPacientes.find(function (p) { return String(p.id) === String(id); });
        if (paciente) abrirModal(paciente);
    }
});

inputBusqueda.addEventListener('input', pintarTabla);

async function cargarPacientes() {
    try {
        [listaPacientes, listaConsultas] = await Promise.all([DB.listar('pacientes'), DB.listar('consultas')]);
        const total = listaPacientes.length;
        document.getElementById('header-pacientes').textContent =
            total + (total === 1 ? ' paciente registrado' : ' pacientes registrados');
        pintarTabla();
    } catch (err) {
        console.error(err);
        mostrarAviso('No se pudieron cargar los pacientes', 'error');
    }
}

cargarPacientes();
