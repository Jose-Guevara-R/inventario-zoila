// public/js/app.js

// --- ⚠️ CONFIGURACIÓN CLOUDINARY ---
const CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/TU_CLOUD_NAME/image/upload';
const CLOUDINARY_PRESET = 'TU_UPLOAD_PRESET'; 

// Variable global
let allInstruments = [];

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    loadInstruments();
    
    // Configurar buscador
    const searchInput = document.getElementById('search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            const filtered = allInstruments.filter(inst => 
                inst.nombre.toLowerCase().includes(term) || 
                (inst.serie && inst.serie.toLowerCase().includes(term))
            );
            renderList(filtered);
        });
    }

    // Configurar Formulario Modal
    const editForm = document.getElementById('edit-form');
    if (editForm) {
        editForm.addEventListener('submit', handleEditSubmit);
    }
});

// --- FUNCIÓN LOGOUT (SEGURIDAD) ---
window.logout = () => {
    if(confirm('¿Desea cerrar sesión?')) {
        sessionStorage.removeItem('usuario_autorizado');
        window.location.href = 'login.html';
    }
};

// --- SUBIDA DE IMAGEN ---
async function uploadImage(fileInput) {
    const file = fileInput.files[0];
    if (!file) return null;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_PRESET);

    try {
        const res = await fetch(CLOUDINARY_URL, { method: 'POST', body: formData });
        if (!res.ok) throw new Error('Fallo subida a Cloudinary');
        const data = await res.json();
        return data.secure_url;
    } catch (error) {
        console.error('Error imagen:', error);
        alert('Error al subir imagen. Se guardará sin foto nueva.');
        return null;
    }
}

// --- CARGA DE DATOS ---
async function loadInstruments() {
    try {
        const res = await fetch('/api/get-instruments');
        if (!res.ok) throw new Error('Error API');
        allInstruments = await res.json();
        updateStats();
        renderList(allInstruments);
    } catch (error) {
        console.error(error);
        const container = document.getElementById('inventory-container');
        if(container) container.innerHTML = '<p style="text-align:center; color:red;">Error de conexión con el servidor.</p>';
    }
}

// --- ACTUALIZAR ESTADÍSTICAS ---
function updateStats() {
    const currentYear = new Date().getFullYear();
    const total = allInstruments.length;
    const nuevos = allInstruments.filter(i => i.fecha_adquisicion && i.fecha_adquisicion.startsWith(String(currentYear))).length;
    const malos = allInstruments.filter(i => ['MALO', 'BAJA', 'REPARACION'].includes(i.estado)).length;

    const tEl = document.getElementById('total-count');
    const nEl = document.getElementById('new-count');
    const rEl = document.getElementById('repair-count');

    if(tEl) tEl.innerText = total;
    if(nEl) nEl.innerText = nuevos;
    if(rEl) rEl.innerText = malos;
}

// --- FILTROS ---
window.filterData = (criteria) => {
    document.querySelectorAll('.btn-filter').forEach(btn => btn.classList.remove('active'));
    if (event && event.target) event.target.classList.add('active');

    const currentYear = new Date().getFullYear();
    let filtered = [];

    if (criteria === 'all') filtered = allInstruments;
    else if (criteria === '2025') filtered = allInstruments.filter(i => i.fecha_adquisicion && i.fecha_adquisicion.startsWith(String(currentYear)));
    else if (criteria === 'reparacion') filtered = allInstruments.filter(i => ['MALO', 'BAJA', 'REPARACION'].includes(i.estado));
    
    renderList(filtered);
};

// --- RENDERIZADO ---
function renderList(list) {
    const container = document.getElementById('inventory-container');
    container.innerHTML = '';
    
    if (!list || list.length === 0) {
        container.innerHTML = '<p style="text-align:center; padding:2rem; color:#666">No se encontraron instrumentos.</p>';
        return;
    }

    const currentYear = new Date().getFullYear();

    list.forEach(inst => {
        const isNew = inst.fecha_adquisicion && inst.fecha_adquisicion.startsWith(String(currentYear));
        const badge = isNew ? `<span class="badge-new">NUEVO ${currentYear}</span>` : '';
        
        // Imagen por defecto (SVG Base64)
        const noImage = "data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='150' height='150' viewBox='0 0 150 150'%3E%3Crect width='150' height='150' fill='%23f1f5f9'/%3E%3Ctext x='50%25' y='50%25' font-family='sans-serif' font-size='14' fill='%2394a3b8' dy='.3em' text-anchor='middle'%3ESin Foto%3C/text%3E%3C/svg%3E";
        const imgUrl = (inst.imagen_url && inst.imagen_url.length > 10) ? inst.imagen_url : noImage;
        
        // Fecha bonita
        let fechaDisplay = '-';
        if (inst.fecha_registro) {
            fechaDisplay = new Date(inst.fecha_registro).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
        }

        // Estado color
        let borderClass = '';
        if (inst.estado === 'NUEVO') borderClass = 'estado-nuevo';
        if (inst.estado === 'MALO' || inst.estado === 'BAJA') borderClass = 'estado-malo';

        const card = `
            <div class="instrument-card ${borderClass}">
                ${badge}
                <div style="display: flex; gap: 1rem; align-items: flex-start;">
                    <img src="${imgUrl}" alt="${inst.nombre}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 6px; border: 1px solid #e2e8f0; background: #f8fafc;">
                    <div style="flex: 1;">
                        <h3 style="margin-bottom:0.2rem; font-size: 1.1rem; color: var(--secondary);">${inst.nombre}</h3>
                        <p style="font-size: 0.9rem; color: #475569;">
                            <strong>Marca:</strong> ${inst.marca || '-'} | <strong>Serie:</strong> ${inst.serie || 'S/N'}
                        </p>
                        <p style="font-size: 0.9rem; margin-top: 0.2rem;">
                            <strong>Estado:</strong> <span style="font-weight:bold">${inst.estado}</span>
                        </p>
                        <p style="font-size: 0.8rem; color: #94a3b8; margin-top: 0.5rem;">
                            📍 ${inst.ubicacion || 'Almacén'} | 📅 Reg: ${fechaDisplay}
                        </p>
                    </div>
                </div>
                <div class="actions" style="margin-top: 1rem; padding-top: 0.5rem; border-top: 1px solid #f1f5f9; display: flex; justify-content: flex-end;">
                    <button class="btn-edit" onclick="openEditModal(${inst.id})">✏️ Editar / Detalles</button>
                </div>
            </div>
        `;
        container.innerHTML += card;
    });
}

// --- GENERAR PDF ---
window.exportPDF = () => {
    if(!window.jspdf) { alert("Librería PDF cargando, intente en un momento."); return; }
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Encabezado
    doc.setFontSize(18);
    doc.setTextColor(30, 41, 59);
    doc.text("Colegio Zoila Hora de Robles", 14, 20);
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text("Reporte de Inventario - Banda de Música", 14, 28);
    doc.setFontSize(10);
    doc.text(`Generado el: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 14, 34);

    // Tabla
    const data = allInstruments.map((inst, index) => [
        index + 1,
        inst.nombre,
        inst.marca || '',
        inst.serie || '',
        inst.estado,
        inst.ubicacion || 'Almacén',
        inst.fecha_adquisicion ? inst.fecha_adquisicion.split('T')[0] : ''
    ]);

    doc.autoTable({
        startY: 40,
        head: [['#', 'Instrumento', 'Marca', 'Serie', 'Estado', 'Ubicación', 'Adquisición']],
        body: data,
        theme: 'grid',
        headStyles: { fillColor: [30, 41, 59] },
        styles: { fontSize: 8 },
        alternateRowStyles: { fillColor: [241, 245, 249] }
    });

    doc.save('Inventario_Zoila_Hora.pdf');
};

// --- MODAL DE EDICIÓN ---
window.openEditModal = (id) => {
    const inst = allInstruments.find(i => i.id === id);
    if (!inst) return;

    document.getElementById('edit-id').value = inst.id;
    document.getElementById('edit-nombre').value = inst.nombre;
    document.getElementById('edit-estado').value = inst.estado;
    document.getElementById('edit-ubicacion').value = inst.ubicacion || 'ALMACEN';
    
    document.getElementById('edit-marca').value = inst.marca || '';
    document.getElementById('edit-modelo').value = inst.modelo || '';
    document.getElementById('edit-serie').value = inst.serie || '';
    if(inst.fecha_adquisicion) document.getElementById('edit-fecha').value = inst.fecha_adquisicion.split('T')[0];
    document.getElementById('edit-origen').value = inst.origen || '';
    
    document.getElementById('current-image-url').value = inst.imagen_url || '';
    
    const preview = document.getElementById('edit-preview');
    if (preview) {
        const noImage = "data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='150' height='150' viewBox='0 0 150 150'%3E%3Crect width='150' height='150' fill='%23f1f5f9'/%3E%3Ctext x='50%25' y='50%25' font-family='sans-serif' font-size='10' fill='%2394a3b8' dy='.3em' text-anchor='middle'%3ESin Foto%3C/text%3E%3C/svg%3E";
        preview.src = (inst.imagen_url && inst.imagen_url.length > 10) ? inst.imagen_url : noImage;
    }
    document.getElementById('edit-foto').value = "";
    document.getElementById('editModal').style.display = 'block';
};

window.closeModal = () => {
    document.getElementById('editModal').style.display = 'none';
};

window.onclick = (event) => {
    const modal = document.getElementById('editModal');
    if (event.target == modal) modal.style.display = 'none';
};

async function handleEditSubmit(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const txt = btn.innerText;
    btn.disabled = true;
    btn.innerText = "Guardando...";

    try {
        const fileInput = document.getElementById('edit-foto');
        let finalImageUrl = document.getElementById('current-image-url').value;

        if (fileInput.files.length > 0) {
            btn.innerText = "Subiendo imagen...";
            const uploadedUrl = await uploadImage(fileInput);
            if (uploadedUrl) finalImageUrl = uploadedUrl;
        }

        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        data.imagen_url = finalImageUrl;

        const res = await fetch('/api/update-instrument', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (res.ok) {
            alert('¡Actualizado!');
            closeModal();
            loadInstruments();
        } else {
            alert('Error al actualizar');
        }
    } catch (error) {
        console.error(error);
        alert('Error de conexión');
    } finally {
        btn.disabled = false;
        btn.innerText = txt;
    }
}