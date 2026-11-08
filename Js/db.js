/* =========================================================
   db.js — PUENTE HACIA SUPABASE
   Conecta las funciones del frontend de tu compañero 
   directamente con la base de datos real en la nube.
   ========================================================= */

const DB = (function () {

    // Corrige los nombres en plural del frontend a los singulares de tu base de datos
    function nombreTablaReal(tablaMapeo) {
        if (tablaMapeo === 'pacientes') return 'paciente';
        if (tablaMapeo === 'consultas') return 'consulta';
        if (tablaMapeo === 'recetas') return 'receta';
        return tablaMapeo;
    }

    async function listar(tabla) {
        const tablaReal = nombreTablaReal(tabla);
        const { data, error } = await supabaseClient.from(tablaReal).select('*');
        if (error) throw error;
        return data || [];
    }

    async function obtener(tabla, id) {
        const tablaReal = nombreTablaReal(tabla);
        const columnaId = `id_${tablaReal}`; 
        const { data, error } = await supabaseClient.from(tablaReal).select('*').eq(columnaId, id).single();
        if (error && error.code !== 'PGRST116') throw error; // Ignoramos si no lo encuentra para devolver null
        return data || null;
    }

    async function crear(tabla, registro) {
        const tablaReal = nombreTablaReal(tabla);
        const { data, error } = await supabaseClient.from(tablaReal).insert([registro]).select().single();
        if (error) throw error;
        return data;
    }

    async function actualizar(tabla, id, cambios) {
        const tablaReal = nombreTablaReal(tabla);
        const columnaId = `id_${tablaReal}`; 
        const { data, error } = await supabaseClient.from(tablaReal).update(cambios).eq(columnaId, id).select().single();
        if (error) throw error;
        return data;
    }

    // --- CONFIGURACIÓN DE LA CLÍNICA ---
    // Guardamos la configuración en la memoria del navegador para no crear una tabla extra
    async function obtenerConfig() {
        try {
            const crudo = localStorage.getItem('medagenda_configuracion');
            return crudo ? JSON.parse(crudo) : {};
        } catch (e) { return {}; }
    }

    async function guardarConfig(config) {
        localStorage.setItem('medagenda_configuracion', JSON.stringify(config));
        return config;
    }

    return { listar, obtener, crear, actualizar, obtenerConfig, guardarConfig };
})();