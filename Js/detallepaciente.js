const tabs = document.querySelectorAll('.tab');
const paneles = document.querySelectorAll('.panel-tab');

tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {


        tabs.forEach(function (t) {
            t.classList.remove('activa');
        });
        paneles.forEach(function (p) {
            p.classList.add('oculto');
        });


        tab.classList.add('activa');
        const idPanel = tab.getAttribute('data-panel');
        document.getElementById(idPanel).classList.remove('oculto');
    });
});