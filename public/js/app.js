let allInstruments = [];

document.addEventListener('DOMContentLoaded', () => {
    loadInstruments();
    
    // Configurar buscador
    document.getElementById('search').addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = allInstruments.filter(inst => 
            inst.nombre.toLowerCase().includes(term) || 
            (inst.serie && inst.serie.toLowerCase().includes(term))
        );
        renderList(filtered);
    });

    // Configurar Formulario de Edición
    document.getElementById('edit-form').addEventListener('submit', handleEditSubmit);
});

async function loadInstruments() {
    try {
        const res = await fetch('/api/get-instruments');
        allInstruments = await res.json();
        updateStats();
        renderList(allInstruments);
    } catch (error) {
        console.error('Error:', error);
    }
}

function updateStats() {
    const currentYear = new Date().getFullYear();
    const total = allInstruments.length;
    const nuevos = allInstruments.filter(i => i.fecha_adquisicion.startsWith(String(currentYear))).length;
    const malos = allInstruments.filter(i => ['MALO', 'BAJA', 'REPARACION'].includes(i.estado)).length;

    document.getElementById('total-count').innerText = total;
    document.getElementById('new-count').innerText = nuevos;
    document.getElementById('repair-count').innerText = malos;
}

window.filterData = (criteria) => {
    document.querySelectorAll('.btn-filter').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

    const currentYear = new Date().getFullYear();
    let filtered = [];

    if (criteria === 'all') filtered = allInstruments;
    else if (criteria === '2025') filtered = allInstruments.filter(i => i.fecha_adquisicion.startsWith(String(currentYear)));
    else if (criteria === 'reparacion') filtered = allInstruments.filter(i => ['MALO', 'BAJA'].includes(i.estado));
    
    renderList(filtered);
};

function renderList(list) {
    const container = document.getElementById('inventory-container');
    container.innerHTML = '';
    
    if (list.length === 0) {
        container.innerHTML = '<p style="text-align:center">No hay instrumentos.</p>';
        return;
    }

    const currentYear = new Date().getFullYear();

    list.forEach(inst => {
        const isNew = inst.fecha_adquisicion.startsWith(String(currentYear));
        const badge = isNew ? `<span class="badge-new">NUEVO ${currentYear}</span>` : '';
        
        let borderClass = '';
        if (inst.estado === 'NUEVO') borderClass = 'estado-nuevo';
        if (inst.estado === 'MALO' || inst.estado === 'BAJA') borderClass = 'estado-malo';

        // Botón de editar llama a la función openEditModal pasando el ID
        const card = `
            <div class="instrument-card ${borderClass}">
                ${badge}
                <h3>${inst.nombre}</h3>
                <p><strong>Marca:</strong> ${inst.marca || '-'} | <strong>Serie:</strong> ${inst.serie || 'S/N'}</p>
                <p><strong>Estado:</strong> ${inst.estado} | <strong>Ubicación:</strong> ${inst.ubicacion || 'Almacén'}</p>
                
                <div class="actions">
                    <button class="btn-edit" onclick="openEditModal(${inst.id})">✏️ Editar / Dar de Baja</button>
                </div>
            </div>
        `;
        container.innerHTML += card;
    });
}

// --- LÓGICA DE LA MODAL ---

// 1. Abrir Modal y rellenar datos
window.openEditModal = (id) => {
    const inst = allInstruments.find(i => i.id === id);
    if (!inst) return;

    // Rellenar campos del formulario
    document.getElementById('edit-id').value = inst.id;
    document.getElementById('edit-nombre').value = inst.nombre;
    document.getElementById('edit-estado').value = inst.estado;
    document.getElementById('edit-ubicacion').value = inst.ubicacion || 'ALMACEN';
    
    // Guardamos los datos que no cambian en hiddens para reenviarlos
    document.getElementById('edit-marca').value = inst.marca;
    document.getElementById('edit-modelo').value = inst.modelo;
    document.getElementById('edit-serie').value = inst.serie;
    
    // Formatear fecha para que no de error (YYYY-MM-DD)
    const fecha = inst.fecha_adquisicion ? inst.fecha_adquisicion.split('T')[0] : '';
    document.getElementById('edit-fecha').value = fecha;
    document.getElementById('edit-origen').value = inst.origen;

    // Mostrar modal
    document.getElementById('editModal').style.display = 'block';
};

// 2. Cerrar Modal
window.closeModal = () => {
    document.getElementById('editModal').style.display = 'none';
};

// Cerrar si clic fuera
window.onclick = (event) => {
    const modal = document.getElementById('editModal');
    if (event.target == modal) {
        modal.style.display = 'none';
    }
};

// 3. Guardar cambios (Update)
async function handleEditSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());

    try {
        const response = await fetch('/api/update-instrument', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            alert('¡Instrumento actualizado!');
            closeModal();
            loadInstruments(); // Recargar lista
        } else {
            alert('Error al actualizar');
        }
    } catch (error) {
        console.error(error);
        alert('Error de conexión');
    }
}