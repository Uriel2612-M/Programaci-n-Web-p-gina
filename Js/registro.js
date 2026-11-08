/* =========================================================
   LÓGICA DE REGISTRO (Adaptado a registro.html)
   ========================================================= */

// Usamos los IDs exactos de tu HTML
const formRegistro = document.getElementById('registro-form'); 
const selectRegistroRol = document.getElementById('login-rol'); 
const contenedorCodigo = document.getElementById('campo-autorizacion-medico'); 
const inputCodigo = document.getElementById('reg-codigo'); 

// Elementos del modal
const modalExito = document.getElementById('modal-exito');
const btnCerrarModal = document.getElementById('btn-cerrar-modal');

// Código maestro para que los doctores puedan registrarse
const CODIGO_SECRETO_CLINICA = "MED2026"; 

// 1. Mostrar/Ocultar el campo de código inteligentemente
if (selectRegistroRol && contenedorCodigo) {
    
    // Creamos una función que checa el valor actual
    const ajustarVistaRol = () => {
        const rol = selectRegistroRol.value; // Lee 'Doctor' o 'Paciente'
        
        if (rol === 'Doctor') {
            contenedorCodigo.style.display = 'block'; // Lo mostramos
            if (inputCodigo) inputCodigo.required = true; // Es obligatorio
        } else {
            // Si es Paciente (o cualquier otra cosa)
            contenedorCodigo.style.display = 'none'; // Lo ocultamos
            if (inputCodigo) {
                inputCodigo.required = false; // Ya no es obligatorio
                inputCodigo.value = ''; // Lo limpiamos por si habían escrito algo
            }
        }
    };

    // Que escuche cada vez que el usuario cambie la opción
    selectRegistroRol.addEventListener('change', ajustarVistaRol);
    
    // Lo ejecutamos UNA VEZ al cargar la página para que aplique el ocultamiento inicial (Paciente)
    ajustarVistaRol(); 
}

// 2. Guardar en Supabase y asignar el rol correcto
if (formRegistro) {
    formRegistro.addEventListener('submit', async (e) => {
        e.preventDefault();

        const nombre = document.getElementById('reg-nombre').value.trim();
        const correo = document.getElementById('reg-correo').value.trim();
        const password = document.getElementById('reg-password').value;
        const rolSeleccionado = selectRegistroRol.value; // 'Paciente' o 'Doctor'

        // Validamos el código secreto SOLO si quiere ser Doctor
        if (rolSeleccionado === 'Doctor') {
            const codigoEscrito = inputCodigo.value.trim();
            if (codigoEscrito !== CODIGO_SECRETO_CLINICA) {
                mostrarAviso('Código de autorización de clínica inválido.', 'error');
                return;
            }
        }

        const btnSubmit = document.getElementById('btn-registrar');
        const textoOriginal = btnSubmit.textContent;
        btnSubmit.textContent = 'Creando cuenta... ⏳';
        btnSubmit.disabled = true;

        try {
            // A. Creamos el usuario en Supabase Auth
            const { data: authData, error: authError } = await supabaseClient.auth.signUp({
                email: correo,
                password: password
            });

            if (authError) throw authError;

            // B. Insertamos su perfil con la palabra exacta ('Doctor' o 'Paciente')
            const { error: perfilError } = await supabaseClient
                .from('perfil_usuario')
                .insert([{
                    id: authData.user.id,
                    correo: correo,
                    nombre_completo: nombre,
                    rol: rolSeleccionado 
                }]);

            if (perfilError) throw perfilError;

            // C. Guardamos sesión local limpiando el texto a minúsculas
            const rolLimpio = rolSeleccionado.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
            localStorage.setItem('rolUsuario', rolLimpio); 
            localStorage.setItem('medagenda_sesion', JSON.stringify({ nombre: nombre, correo: correo }));
            
            // D. Mostramos el Modal elegante en lugar de una alerta aburrida
            if (modalExito) {
                modalExito.style.display = 'flex';
                // Al darle "Entendido", lo mandamos al dashboard
                btnCerrarModal.onclick = () => window.location.replace('dashboard.html');
            } else {
                mostrarAviso('Cuenta creada exitosamente.');
                setTimeout(() => window.location.replace('dashboard.html'), 1500);
            }

        } catch (error) {
            console.error(error);
            mostrarAviso(error.message || 'Error al crear la cuenta', 'error');
            btnSubmit.textContent = textoOriginal;
            btnSubmit.disabled = false;
        }
    });
}