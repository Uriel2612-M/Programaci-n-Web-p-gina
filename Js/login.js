const formLogin = document.getElementById('login-form'); 

if (formLogin) {
    formLogin.addEventListener('submit', async (e) => {
        e.preventDefault();

        const correo = document.getElementById('login-usuario').value.trim();
        const password = document.getElementById('login-password').value;
        
        // 1. Tomamos el selector completo
        const selectRol = document.getElementById('login-rol');
        // Leemos exactamente lo que el usuario está viendo en la pantalla (Ej. "Médico" o "Paciente")
        const textoRolPantalla = selectRol.options[selectRol.selectedIndex].text;

        const btnSubmit = formLogin.querySelector('button[type="submit"]');
        const textoOriginal = btnSubmit.textContent;
        btnSubmit.textContent = 'Verificando... ⏳';
        btnSubmit.disabled = true;

        try {
            // 2. Autenticamos credenciales en Supabase
            const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
                email: correo,
                password: password
            });

            if (authError) throw new Error('Credenciales incorrectas.');

            // 3. Buscamos el perfil real en la base de datos
            const { data: perfilBD, error: errorPerfil } = await supabaseClient
                .from('perfil_usuario')
                .select('rol, nombre_completo')
                .ilike('correo', correo)
                .maybeSingle();

            if (errorPerfil || !perfilBD) {
                throw new Error('No se encontró tu perfil en la base de datos.');
            }

            // 4. LIMPIEZA DE TEXTOS: Quitamos acentos y mayúsculas de ambos lados para compararlos
            const rolRealLimpio = perfilBD.rol.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            const rolPantallaLimpio = textoRolPantalla.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

            // 5. EL CANDADO: Si lo que eligió en pantalla no coincide con la base de datos, pa' fuera
            if (!rolPantallaLimpio.includes(rolRealLimpio) && !rolRealLimpio.includes(rolPantallaLimpio)) {
                await supabaseClient.auth.signOut(); // Cerramos la sesión por equivocarse
                mostrarAviso(`Acceso denegado. Seleccionaste un rol incorrecto.`, 'error');
                btnSubmit.textContent = textoOriginal;
                btnSubmit.disabled = false;
                return; 
            }

            // 6. Si le atinó a su rol, guardamos sesión y entra
            localStorage.setItem('rolUsuario', rolRealLimpio); 
            
            const sesionData = {
                nombre: perfilBD.nombre_completo || correo.split('@')[0],
                correo: correo
            };
            localStorage.setItem('medagenda_sesion', JSON.stringify(sesionData));

            window.location.replace('dashboard.html');

        } catch (error) {
            console.error(error);
            await supabaseClient.auth.signOut();
            mostrarAviso(error.message || 'Error al iniciar sesión', 'error');
            btnSubmit.textContent = textoOriginal;
            btnSubmit.disabled = false;
        }
    });
}