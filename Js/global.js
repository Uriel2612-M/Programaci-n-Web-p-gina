/* =========================================================
   global.js — Funciones compartidas por todas las páginas
   - Sesión del usuario (nombre y rol)
   - Bloque de usuario + botón "Cerrar sesión" en la barra lateral
   - Utilidades: iniciales, fechas, edad, estado de consulta, avisos
   Requiere: db.js (cargado antes)
   ========================================================= */

const SESION_LLAVE = 'medagenda_sesion';
const REQUIERE_SESION = true; // si es true, sin sesión se regresa al login

/* ---------------- Sesión ---------------- */
function obtenerSesion() {
    try {
        return JSON.parse(localStorage.getItem(SESION_LLAVE)) || null;
    } catch (e) {
        return null;
    }
}

function guardarSesion(usuario) {
    localStorage.setItem(SESION_LLAVE, JSON.stringify(usuario));
}

function cerrarSesion() {
    if (!confirm('¿Deseas cerrar sesión?')) return;
    localStorage.removeItem(SESION_LLAVE);
    window.location.href = 'index.html';
}

/* ---------------- Utilidades ---------------- */
function escaparHTML(texto) {
    return String(texto == null ? '' : texto)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function iniciales(nombre) {
    return String(nombre || '?').trim().split(/\s+/).slice(0, 2)
        .map(function (p) { return p.charAt(0).toUpperCase(); }).join('');
}

function hoyISO() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function horaActual() {
    const d = new Date();
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

// Convierte 'YYYY-MM-DD' en objeto Date local (sin desfase de zona horaria)
function aFecha(iso, hora) {
    if (!iso) return null;
    const p = iso.split('-').map(Number);
    const h = (hora || '00:00').split(':').map(Number);
    return new Date(p[0], p[1] - 1, p[2], h[0] || 0, h[1] || 0);
}

function formatoFecha(iso) {
    const d = aFecha(iso);
    if (!d) return '—';
    return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

function calcularEdad(fechaNacimiento) {
    const n = aFecha(fechaNacimiento);
    if (!n) return '—';
    const hoy = new Date();
    let edad = hoy.getFullYear() - n.getFullYear();
    const m = hoy.getMonth() - n.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < n.getDate())) edad--;
    return edad;
}

/* Estado de una consulta:
   - "Pendiente"  si aún no ocurre o no tiene diagnóstico
   - "Completada" si ya ocurrió y tiene diagnóstico            */
function estadoConsulta(consulta) {
    if (!consulta) return 'Pendiente';
    const momento = aFecha(consulta.fecha, consulta.hora);
    const yaPaso = momento && momento <= new Date();
    const tieneDiagnostico = consulta.diagnostico && consulta.diagnostico.trim() !== '';
    return (yaPaso && tieneDiagnostico) ? 'Completada' : 'Pendiente';
}

// Devuelve el HTML de la etiqueta pintada según el estado
function etiquetaEstado(estado) {
    const clase = estado === 'Completada' ? 'completada' : 'pendiente';
    return '<span class="etiqueta ' + clase + '">' + escaparHTML(estado) + '</span>';
}

function ordenarPorFechaDesc(lista) {
    return lista.slice().sort(function (a, b) {
        return aFecha(b.fecha, b.hora) - aFecha(a.fecha, a.hora);
    });
}

function parametroURL(nombre) {
    return new URLSearchParams(window.location.search).get(nombre);
}

// Aviso flotante (no bloquea la página)
function mostrarAviso(mensaje, tipo) {
    const aviso = document.createElement('div');
    aviso.textContent = mensaje;
    aviso.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:9999;padding:12px 18px;' +
        'border-radius:8px;font-size:13px;font-weight:600;color:white;box-shadow:0 6px 18px rgba(0,0,0,.12);' +
        'transition:opacity .3s;background:' + (tipo === 'error' ? '#d6455d' : '#25a99c');
    document.body.appendChild(aviso);
    setTimeout(function () { aviso.style.opacity = '0'; }, 2200);
    setTimeout(function () { aviso.remove(); }, 2600);
}

/* ---------------- Barra lateral ---------------- */
function pintarUsuarioBarraLateral(sesion) {
    const nav = document.querySelector('.slider-bar nav');
    if (!nav || document.getElementById('usuario-sidebar')) return;

    const bloque = document.createElement('div');
    bloque.id = 'usuario-sidebar';
    bloque.style.cssText = 'display:flex;align-items:center;gap:10px;padding:12px;margin-top:12px;' +
        'border-top:1px solid var(--borde);';
    bloque.innerHTML =
        '<span class="avatar" style="margin:0;flex-shrink:0;">' + escaparHTML(iniciales(sesion.nombre)) + '</span>' +
        '<div style="flex:1;min-width:0;">' +
            '<p id="sidebar-nombre" style="margin:0;font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' +
                escaparHTML(sesion.nombre) + '</p>' +
            '<p id="sidebar-rol" style="margin:2px 0 0;font-size:11px;color:var(--texto-suave);">' +
                escaparHTML(sesion.rol) + '</p>' +
        '</div>';

    const btnSalir = document.createElement('button');
    btnSalir.type = 'button';
    btnSalir.id = 'btn-cerrar-sesion';
    btnSalir.textContent = 'Cerrar sesión';
    btnSalir.style.cssText = 'width:100%;margin-top:8px;padding:9px 12px;font-size:12px;font-weight:600;' +
        'color:#d6455d;background:#fde8ec;border:none;border-radius:8px;cursor:pointer;';
    btnSalir.addEventListener('click', cerrarSesion);

    nav.appendChild(bloque);
    nav.appendChild(btnSalir);
}

/* ---------------- Arranque ---------------- */
(function iniciarGlobal() {
    const sesion = obtenerSesion();
    const enBarraLateral = document.querySelector('.slider-bar');

    if (enBarraLateral && !sesion && REQUIERE_SESION) {
        window.location.href = 'index.html';
        return;
    }
    if (sesion) pintarUsuarioBarraLateral(sesion);
})();
