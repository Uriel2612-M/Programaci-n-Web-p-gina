/* =========================================================
   registro.js — REGISTRO CON SUPABASE Y SEGURIDAD
   ========================================================= */

// Esperamos a que la pantalla dibuje todos los elementos
document.addEventListener('DOMContentLoaded', () => {
    
    const selectRol = document.getElementById('login-rol');
    const campoAutorizacion = document.getElementById('campo-autorizacion-medico');
    const inputCodigo = document.getElementById('reg-codigo');
    const formRegistro = document.getElementById('registro-form');

    // 1. Mostrar/Ocultar el campo del código dependiendo del rol
    function alternarCampoCodigo() {
        if (selectRol.value === 'medico') {
            campoAutorizacion.style.display = 'block'; 
            inputCodigo.required = true; // Lo hacemos obligatorio
        } else {
            // Si es paciente, lo escondemos y le quitamos lo obligatorio
            campoAutorizacion.style.display = 'none';
            inputCodigo.required = false;
            inputCodigo.value = ''; // Limpiamos el texto por si escribió algo
        }
    }

    // Escuchamos cuando el usuario cambie el menú desplegable
    selectRol.addEventListener('change', alternarCampoCodigo);
    
    // Ejecutamos la función una vez al inicio para que oculte el campo por defecto (arranca en Paciente)
    alternarCampoCodigo();


    // 2. Lógica para crear la cuenta al enviar el formulario
    formRegistro.addEventListener('submit', async function(evento) {
        evento.preventDefault(); 
        
        const rol = selectRol.value; 
        const nombre = document.getElementById('reg-nombre').value.trim();
        const correo = document.getElementById('reg-correo').value.trim();
        const password = document.getElementById('reg-password').value;
        const codigo_medico = inputCodigo.value.trim();

        // Candado de seguridad maestro: Solo si es médico le exigimos el código
        if (rol === 'medico' && codigo_medico !== 'ADMIN123') { 
            alert("Código de autorización de clínica inválido. Acceso denegado.");
            return;
        }
        
        try {
            // A. Creamos el usuario en Supabase Auth
            const { data: authData, error: authError } = await supabaseClient.auth.signUp({
                email: correo,
                password: password,
            });

            if (authError) throw authError;

            // B. Guardamos el perfil en tu tabla pública (perfil_usuario)
            const { error: dbError } = await supabaseClient
                .from('perfil_usuario')
                .insert([
                    { 
                        id: authData.user.id, 
                        correo: correo,
                        rol: rol === 'medico' ? 'Doctor' : 'Paciente' // Texto estandarizado para la app
                    }
                ]);

            if (dbError) throw dbError;

            // C. Mostramos mensaje de éxito y lo mandamos al login
            const modal = document.getElementById('modal-exito');
            if (modal) {
                modal.style.display = 'flex';
                document.getElementById('btn-cerrar-modal').addEventListener('click', () => {
                    window.location.href = 'index.html'; 
                });
            } else {
                alert("¡Cuenta creada exitosamente!");
                window.location.href = 'index.html'; 
            }

        } catch (error) {
            console.error("Error de conexión:", error);
            alert("Error al registrarte: " + error.message);
        }
    });
});