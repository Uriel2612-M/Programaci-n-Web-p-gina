/* =========================================================
   perfil.js — Mi Perfil (Corregido)
   ========================================================= */

const formPerfil = document.getElementById('form-perfil');
const formPassword = document.getElementById('form-password');

let idUsuarioLogueado = null;

// 1. Cargar la información inicial
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // CORRECCIÓN: Usamos supabaseClient directamente
        const { data: authData, error: authError } = await supabaseClient.auth.getUser();

        if (authError || !authData.user) {
            mostrarAviso('No se pudo verificar la sesión. Por favor, inicia sesión de nuevo.', 'error');
            return;
        }

        idUsuarioLogueado = authData.user.id;
        const correoUsuario = authData.user.email;

        // Buscamos sus datos en la tabla perfil_usuario
        const { data: perfilData, error: dbError } = await supabaseClient
            .from('perfil_usuario')
            .select('*')
            .eq('id', idUsuarioLogueado)
            .single();

        if (dbError) throw dbError;

        const rol = perfilData.rol || 'Usuario';
        const nombreMostrado = perfilData.nombre_completo || correoUsuario.split('@')[0];

        // Llenar el formulario visual
        document.getElementById('perfil-nombre').value = perfilData.nombre_completo || '';
        document.getElementById('perfil-correo').value = correoUsuario;
        document.getElementById('perfil-rol').value = rol;

        document.getElementById('perfil-correo').disabled = true; 
        document.getElementById('perfil-rol').disabled = true; 

        // Actualizar la cabecera
        document.getElementById('perfil-avatar').textContent = iniciales(nombreMostrado);
        document.getElementById('perfil-titulo').textContent = `Hola, ${escaparHTML(nombreMostrado)}`;

    } catch (err) {
        console.error("Error al cargar perfil:", err);
    }
});

// 2. Actualizar los datos del perfil (nombre)
formPerfil.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!idUsuarioLogueado) {
        mostrarAviso('No hay sesión activa.', 'error');
        return;
    }

    const nuevoNombre = document.getElementById('perfil-nombre').value.trim();

    try {
        const { error } = await supabaseClient
            .from('perfil_usuario')
            .update({ nombre_completo: nuevoNombre })
            .eq('id', idUsuarioLogueado);

        if (error) throw error;

        document.getElementById('perfil-avatar').textContent = iniciales(nuevoNombre);
        document.getElementById('perfil-titulo').textContent = `Hola, ${escaparHTML(nuevoNombre)}`;
        
        const sesionActual = obtenerSesion() || {};
        sesionActual.nombre = nuevoNombre;
        localStorage.setItem('medagenda_sesion', JSON.stringify(sesionActual));

        mostrarAviso('Perfil actualizado correctamente.');
        setTimeout(() => location.reload(), 1500);
        
    } catch (err) {
        console.error("Error al actualizar:", err);
        mostrarAviso('Error al actualizar el perfil.', 'error');
    }
});

// 3. Cambiar Contraseña 
formPassword.addEventListener('submit', async (e) => {
    e.preventDefault();

    const passNueva = document.getElementById('pass-nueva').value;
    const passConfirmar = document.getElementById('pass-confirmar').value;

    if (passNueva !== passConfirmar) {
        mostrarAviso('Las contraseñas nuevas no coinciden.', 'error');
        return;
    }

    if (passNueva.length < 6) {
        mostrarAviso('La nueva contraseña debe tener al menos 6 caracteres.', 'error');
        return;
    }

    try {
        const { error } = await supabaseClient.auth.updateUser({
            password: passNueva
        });

        if (error) throw error;

        mostrarAviso('Contraseña actualizada con éxito.');
        formPassword.reset();

    } catch (err) {
        console.error("Error al cambiar contraseña:", err);
        mostrarAviso('Error al cambiar la contraseña.', 'error');
    }
});