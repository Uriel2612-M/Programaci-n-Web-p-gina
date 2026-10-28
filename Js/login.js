/* =========================================================
   login.js — index.html
   Guarda la sesión (nombre + rol) para que la barra lateral
   pueda mostrarla. En modo servidor valida contra la API.
   Requiere: db.js, global.js
   ========================================================= */

const ROLES = { '1': 'Doctor', '2': 'Paciente' };

document.getElementById('login-form').addEventListener('submit', async function (e) {
    e.preventDefault();

    const rol = document.getElementById('login-rol').value;
    const usuario = document.getElementById('login-usuario').value.trim();
    const password = document.getElementById('login-password').value;

    if (!rol || !usuario || !password) {
        mostrarAviso('Completa todos los campos', 'error');
        return;
    }

    try {
        let datosUsuario = { nombre: usuario, rol: ROLES[rol] || 'Usuario', rol_id: rol };

        // Si hay servidor, se valida el usuario contra la API (POST {API_URL}/login)
        if (DB_CONFIG.API_URL) {
            const resp = await fetch(DB_CONFIG.API_URL.replace(/\/$/, '') + '/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ usuario: usuario, password: password, rol: rol })
            });
            if (!resp.ok) throw new Error('Usuario o contraseña incorrectos');
            datosUsuario = await resp.json(); // se espera { nombre, rol }
        }

        guardarSesion(datosUsuario);
        window.location.href = 'dashboard.html';
    } catch (err) {
        mostrarAviso(err.message, 'error');
    }
});
