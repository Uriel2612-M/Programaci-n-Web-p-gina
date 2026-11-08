/* =========================================================
   index.js — LOGIN CON SUPABASE
   ========================================================= */
const formLogin = document.getElementById('login-form');

formLogin.addEventListener('submit', async function(evento) {
    evento.preventDefault(); 

    const rolValor = document.getElementById('login-rol').value;
    const correo = document.getElementById('login-usuario').value;
    const password = document.getElementById('login-password').value;

    try {    
        // Validamos directo con Supabase Auth
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: correo,
            password: password,
        });

        if (error) {
            alert("Error al iniciar sesión: Credenciales incorrectas o usuario no registrado.");
            console.error("Detalle del error:", error.message);
            return;
        }
                
        // 1. Convertimos el valor numérico al texto que usa el código de la interfaz
        const nombreRol = (rolValor === "1") ? "Doctor" : "Paciente";
        
        // 2. Armamos la "cápsula" de datos exactamente como la pide el global.js
        const datosSesion = {
            nombre: correo.split('@')[0], // Truco: usamos la primera parte del correo como nombre
            rol: nombreRol
        };

        // 3. Guardamos la variable que exige la barra lateral
        localStorage.setItem('medagenda_sesion', JSON.stringify(datosSesion));
        
        // 4. Guardamos nuestra variable para ocultar los menús según el rol
        localStorage.setItem('rolUsuario', nombreRol.toLowerCase());

        alert("¡Acceso concedido!");
        window.location.href = 'dashboard.html';

    } catch (err) {
        console.error("Error de conexión:", err);
    }
});