const btnAbrir = document.getElementById('btn-agregar-paciente');
const btnCerrar = document.getElementById('btn-cerrar-modal-paciente');
const modal = document.getElementById('modal-nuevo-paciente');

btnAbrir.onclick = function() {
    modal.style.display = 'flex';
};

btnCerrar.onclick = function() {
    modal.style.display = 'none';
};
