let allInstruments = []; // Guardamos copia local para filtrar rápido

// Al cargar la página
document.addEventListener('DOMContentLoaded', () => {
    loadInstruments();
    
    // Escuchar el buscador
    document.getElementById('search').addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = allInstruments.filter(inst => 
            inst.nombre.toLowerCase().includes(term) || 
            inst.serie?.toLowerCase().includes(term)
        );
        renderList(filtered);
    });
});

async function loadInstruments() {
    try {
        const res = await fetch('/api/get-instruments');
        allInstruments = await res.json();
        
        updateStats();
        renderList(allInstruments);
    } catch (error) {
        console.error('Error cargando datos:', error);
        document.getElementById('inventory-container').innerHTML = '<p>Error cargando datos.</p>';
    }
}

function updateStats() {
    // Calculamos el año actual automáticamente
    const currentYear = new Date().getFullYear(); // 2025

    const total = allInstruments.length;
    const nuevos = allInstruments.filter(i => i.fecha_adquisicion.startsWith(String(currentYear))).length;
    const malos = allInstruments.filter(i => ['MALO', 'BAJA', 'REPARACION'].includes(i.estado)).length;

    document.getElementById('total-count').innerText = total;
    document.getElementById('new-count').innerText = nuevos;
    document.getElementById('repair-count').innerText = malos;
}

// Función global para los botones de filtro
window.filterData = (criteria) => {
    // Cambiar estilo de botones
    document.querySelectorAll('.btn-filter').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

    const currentYear = new Date().getFullYear();
    let filtered = [];

    if (criteria === 'all') {
        filtered = allInstruments;
    } else if (criteria === '2025') {
        filtered = allInstruments.filter(i => i.fecha_adquisicion.startsWith(String(currentYear)));
    } else if (criteria === 'reparacion') {
        filtered = allInstruments.filter(i => ['MALO', 'BAJA'].includes(i.estado));
    }
    
    renderList(filtered);
};

function renderList(list) {
    const container = document.getElementById('inventory-container');
    container.innerHTML = '';
    
    if (list.length === 0) {
        container.innerHTML = '<p style="text-align:center; padding: 2rem;">No se encontraron instrumentos.</p>';
        return;
    }

    const currentYear = new Date().getFullYear();

    // Generar HTML para cada tarjeta
    list.forEach(inst => {
        const isNew = inst.fecha_adquisicion.startsWith(String(currentYear));
        const badge = isNew ? `<span class="badge-new">NUEVO ${currentYear}</span>` : '';
        
        // Estilo según estado
        let borderClass = '';
        if (inst.estado === 'NUEVO') borderClass = 'estado-nuevo';
        if (inst.estado === 'MALO' || inst.estado === 'BAJA') borderClass = 'estado-malo';

        const card = `
            <div class="instrument-card ${borderClass}">
                ${badge}
                <h3 style="margin-bottom:0.5rem">${inst.nombre}</h3>
                <p><strong>Marca:</strong> ${inst.marca || '-'} | <strong>Serie:</strong> ${inst.serie || 'S/N'}</p>
                <p><strong>Estado:</strong> ${inst.estado}</p>
                <p><strong>Adquirido:</strong> ${new Date(inst.fecha_adquisicion).toLocaleDateString()}</p>
                <p style="font-size: 0.8rem; color: #666; margin-top:0.5rem">Ubicación: ${inst.ubicacion || 'Almacén'}</p>
            </div>
        `;
        container.innerHTML += card;
    });
}