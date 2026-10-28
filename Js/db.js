/* =========================================================
   db.js — Capa de acceso a datos de MedAgenda
   ---------------------------------------------------------
   Todas las páginas usan estas funciones para leer y guardar.

   MODO LOCAL (por defecto): API_URL vacío -> los datos se
   guardan en el navegador (localStorage). Sirve para probar
   la página sin servidor.

   MODO SERVIDOR: escribe la URL de tu API en API_URL
   (ej. 'http://localhost/medagenda/api') y las mismas
   funciones harán peticiones fetch:
       GET    {API_URL}/{tabla}          -> lista
       POST   {API_URL}/{tabla}          -> crear (devuelve el registro con id)
       PUT    {API_URL}/{tabla}/{id}     -> actualizar
       GET    {API_URL}/configuracion    -> objeto de configuración
       PUT    {API_URL}/configuracion    -> guardar configuración
   Tablas: pacientes, consultas, recetas
   ========================================================= */

const DB_CONFIG = {
    API_URL: '',              // <-- pon aquí la URL de tu API cuando la tengas
    PREFIJO: 'medagenda_',    // prefijo de las llaves en localStorage
    DATOS_DEMO: true          // carga datos de ejemplo la primera vez (modo local)
};

const DB = (function () {

    /* ---------- utilidades internas ---------- */
    function leerLocal(llave, porDefecto) {
        try {
            const crudo = localStorage.getItem(DB_CONFIG.PREFIJO + llave);
            return crudo ? JSON.parse(crudo) : porDefecto;
        } catch (e) {
            return porDefecto;
        }
    }

    function guardarLocal(llave, valor) {
        try {
            localStorage.setItem(DB_CONFIG.PREFIJO + llave, JSON.stringify(valor));
        } catch (e) {
            console.error('No se pudo guardar en localStorage', e);
        }
    }

    function nuevoId() {
        return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    }

    async function peticion(ruta, metodo, cuerpo) {
        const opciones = { method: metodo || 'GET', headers: { 'Content-Type': 'application/json' } };
        if (cuerpo) opciones.body = JSON.stringify(cuerpo);
        const resp = await fetch(DB_CONFIG.API_URL.replace(/\/$/, '') + '/' + ruta, opciones);
        if (!resp.ok) throw new Error('Error ' + resp.status + ' en ' + ruta);
        return resp.json();
    }

    function usaServidor() {
        return DB_CONFIG.API_URL.trim() !== '';
    }

    /* ---------- datos de ejemplo (solo modo local) ---------- */
    function fechaRelativa(dias) {
        const d = new Date();
        d.setDate(d.getDate() + dias);
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }

    function sembrarDatos() {
        if (!DB_CONFIG.DATOS_DEMO || leerLocal('sembrado', false)) return;

        const pacientes = [
            { id: 'p1', nombre: 'María García López', fecha_nacimiento: '1988-04-12', genero: 'F', telefono: '+52 81 1234 5678', correo: 'maria.garcia@email.com', aseguradora: 'IMSS', poliza: 'IMSS-784521', direccion: 'Av. Universidad 120, San Nicolás', alergias: 'Penicilina', contacto_emergencia: 'José García 81 2222 3333', creado: fechaRelativa(-40) },
            { id: 'p2', nombre: 'Carlos Hernández Ruiz', fecha_nacimiento: '1975-09-30', genero: 'M', telefono: '+52 81 9876 5432', correo: 'carlos.hdz@email.com', aseguradora: 'GNP', poliza: 'GNP-551203', direccion: 'Calle Morelos 45, Monterrey', alergias: '', contacto_emergencia: '', creado: fechaRelativa(-20) },
            { id: 'p3', nombre: 'Ana Sofía Martínez', fecha_nacimiento: '1999-01-05', genero: 'F', telefono: '+52 81 5555 0101', correo: '', aseguradora: 'ISSSTE', poliza: 'ISS-102938', direccion: '', alergias: 'Aspirina', contacto_emergencia: '', creado: fechaRelativa(-3) }
        ];

        const consultas = [
            { id: 'c1', paciente_id: 'p1', fecha: fechaRelativa(-15), hora: '10:00', motivo: 'Dolor de garganta', diagnostico: 'Faringitis aguda', notas: 'Reposo e hidratación', creado: fechaRelativa(-15) },
            { id: 'c2', paciente_id: 'p2', fecha: fechaRelativa(-2), hora: '12:30', motivo: 'Control de presión', diagnostico: 'Hipertensión controlada', notas: 'Seguir con tratamiento', creado: fechaRelativa(-2) },
            { id: 'c3', paciente_id: 'p3', fecha: fechaRelativa(0), hora: '09:15', motivo: 'Dolor de cabeza', diagnostico: 'Migraña tensional', notas: '', creado: fechaRelativa(0) },
            { id: 'c4', paciente_id: 'p1', fecha: fechaRelativa(0), hora: '17:00', motivo: 'Revisión de seguimiento', diagnostico: '', notas: '', creado: fechaRelativa(0) }
        ];

        const recetas = [
            { id: 'r1', paciente_id: 'p1', consulta_id: 'c1', fecha: fechaRelativa(-15), hora: '10:30', medicamentos: [
                { nombre: 'Amoxicilina', dosis: '500 mg', duracion: '1 cada 8 hrs por 7 días' },
                { nombre: 'Paracetamol', dosis: '500 mg', duracion: '1 cada 6 hrs si hay dolor' }
            ], creado: fechaRelativa(-15) },
            { id: 'r2', paciente_id: 'p3', consulta_id: 'c3', fecha: fechaRelativa(0), hora: '09:45', medicamentos: [
                { nombre: 'Naproxeno', dosis: '250 mg', duracion: '1 cada 12 hrs por 3 días' }
            ], creado: fechaRelativa(0) }
        ];

        guardarLocal('pacientes', pacientes);
        guardarLocal('consultas', consultas);
        guardarLocal('recetas', recetas);
        guardarLocal('sembrado', true);
    }

    /* ---------- API pública ---------- */
    async function listar(tabla) {
        if (usaServidor()) return peticion(tabla);
        sembrarDatos();
        return leerLocal(tabla, []);
    }

    async function obtener(tabla, id) {
        const lista = await listar(tabla);
        return lista.find(function (r) { return String(r.id) === String(id); }) || null;
    }

    async function crear(tabla, registro) {
        if (usaServidor()) return peticion(tabla, 'POST', registro);
        const lista = leerLocal(tabla, []);
        const nuevo = Object.assign({ id: nuevoId(), creado: fechaRelativa(0) }, registro);
        lista.push(nuevo);
        guardarLocal(tabla, lista);
        return nuevo;
    }

    async function actualizar(tabla, id, cambios) {
        if (usaServidor()) return peticion(tabla + '/' + id, 'PUT', cambios);
        const lista = leerLocal(tabla, []);
        const i = lista.findIndex(function (r) { return String(r.id) === String(id); });
        if (i === -1) throw new Error('Registro no encontrado');
        lista[i] = Object.assign({}, lista[i], cambios);
        guardarLocal(tabla, lista);
        return lista[i];
    }

    const CONFIG_DEFECTO = {
        nombre: 'Clínica MedAgenda',
        medico: '',
        especialidad: 'Medicina General',
        cedula: '',
        telefono: '',
        direccion: '',
        notificaciones: { recordatorios: true, seguimiento: true, resumen: false, vencidas: false }
    };

    async function obtenerConfig() {
        if (usaServidor()) return peticion('configuracion');
        const guardada = leerLocal('configuracion', {});
        return Object.assign({}, CONFIG_DEFECTO, guardada, {
            notificaciones: Object.assign({}, CONFIG_DEFECTO.notificaciones, guardada.notificaciones || {})
        });
    }

    async function guardarConfig(config) {
        if (usaServidor()) return peticion('configuracion', 'PUT', config);
        guardarLocal('configuracion', config);
        return config;
    }

    return { listar, obtener, crear, actualizar, obtenerConfig, guardarConfig };
})();
