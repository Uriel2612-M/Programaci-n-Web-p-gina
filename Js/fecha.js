function fechaHoy() {
    const fecha = new Date().toLocaleDateString('es-MX', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });

    return fecha.charAt(0).toUpperCase() + fecha.slice(1);
}

function saludo() {
    const hora = new Date().getHours();
    if (hora < 12) {
        return 'Buen día';
    } else if (hora < 19) {
        return 'Buenas tardes';
    } else {
        return 'Buenas noches';
    }
}

document.getElementById('header-fecha').textContent = fechaHoy();
document.getElementById('saludo').textContent = saludo();