// public/js/app.js

// --- CONFIGURACIÓN CLOUDINARY ---
const CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/doqix96et/image/upload';
const CLOUDINARY_PRESET = 'inventario_preset'; 

let allInstruments = [];

document.addEventListener('DOMContentLoaded', () => {
    loadInstruments();
    const searchInput = document.getElementById('search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            const filtered = allInstruments.filter(inst => 
                inst.nombre.toLowerCase().includes(term) || 
                (inst.codigo_patrimonial && inst.codigo_patrimonial.toLowerCase().includes(term)) ||
                (inst.serie && inst.serie.toLowerCase().includes(term))
            );
            renderList(filtered);
        });
    }
    const editForm = document.getElementById('edit-form');
    if (editForm) editForm.addEventListener('submit', handleEditSubmit);
});

// --- FUNCIÓN DE SUBIDA CON COMPRESIÓN ---
async function uploadImage(fileInput) {
    const file = fileInput.files[0];
    if (!file) return null;

    // Opciones: Máximo 500KB y ancho max 1200px
    const options = {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 1200,
        useWebWorker: true
    };

    try {
        // 1. Comprimir en el navegador
        // Usamos la librería window.imageCompression cargada en el HTML
        const compressedFile = await imageCompression(file, options);
        console.log(`Original: ${file.size / 1024} KB, Comprimido: ${compressedFile.size / 1024} KB`);

        // 2. Subir a Cloudinary
        const formData = new FormData();
        formData.append('file', compressedFile);
        formData.append('upload_preset', CLOUDINARY_PRESET);

        const res = await fetch(CLOUDINARY_URL, { method: 'POST', body: formData });
        if (!res.ok) throw new Error('Fallo subida a Cloudinary');
        
        const data = await res.json();
        return data.secure_url;

    } catch (error) {
        console.error('Error imagen:', error);
        alert('Error al subir imagen. Verifique conexión.');
        return null;
    }
}

async function loadInstruments() {
    try {
        const res = await fetch('/api/get-instruments');
        if (!res.ok) throw new Error('Error API');
        allInstruments = await res.json();
        updateStats();
        renderList(allInstruments);
    } catch (error) {
        console.error(error);
    }
}

function updateStats() {
    const currentYear = new Date().getFullYear();
    const total = allInstruments.length;
    const nuevos = allInstruments.filter(i => i.fecha_adquisicion && i.fecha_adquisicion.startsWith(String(currentYear))).length;
    const malos = allInstruments.filter(i => ['MALO', 'BAJA'].includes(i.estado)).length;

    const t = document.getElementById('total-count');
    if(t) t.innerText = total;
    const n = document.getElementById('new-count');
    if(n) n.innerText = nuevos;
    const r = document.getElementById('repair-count');
    if(r) r.innerText = malos;
}

window.filterData = (criteria) => {
    document.querySelectorAll('.btn-filter').forEach(btn => btn.classList.remove('active'));
    if(event) event.target.classList.add('active');
    const currentYear = new Date().getFullYear();
    let filtered = [];
    if (criteria === 'all') filtered = allInstruments;
    else if (criteria === '2025') filtered = allInstruments.filter(i => i.fecha_adquisicion && i.fecha_adquisicion.startsWith(String(currentYear)));
    else if (criteria === 'reparacion') filtered = allInstruments.filter(i => ['MALO', 'BAJA'].includes(i.estado));
    renderList(filtered);
};

function renderList(list) {
    const container = document.getElementById('inventory-container');
    container.innerHTML = '';
    if (!list || list.length === 0) {
        container.innerHTML = '<p style="text-align:center; padding:2rem;">Sin resultados.</p>';
        return;
    }
    const currentYear = new Date().getFullYear();

    list.forEach(inst => {
        const isNew = inst.fecha_adquisicion && inst.fecha_adquisicion.startsWith(String(currentYear));
        const badge = isNew ? `<span class="badge-new">NUEVO ${currentYear}</span>` : '';
        const noImage = "data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='150' height='150' viewBox='0 0 150 150'%3E%3Crect width='150' height='150' fill='%23f1f5f9'/%3E%3Ctext x='50%25' y='50%25' font-family='sans-serif' font-size='14' fill='%2394a3b8' dy='.3em' text-anchor='middle'%3ESin Foto%3C/text%3E%3C/svg%3E";
        const imgUrl = (inst.imagen_url && inst.imagen_url.length > 10) ? inst.imagen_url : noImage;

        // VISTA LIMPIA (SOLO LO IMPORTANTE)
        const codigo = inst.codigo_patrimonial ? `<span style="background:#e2e8f0; padding:2px 6px; border-radius:4px; font-size:0.8rem; font-family:monospace;">${inst.codigo_patrimonial}</span>` : '';

        const card = `
            <div class="instrument-card" style="border-left: 5px solid ${inst.estado === 'NUEVO' ? '#10b981' : (inst.estado === 'MALO' ? '#ef4444' : '#2563eb')}">
                ${badge}
                <div style="display: flex; gap: 1rem; align-items: center;">
                    <img src="${imgUrl}" style="width: 70px; height: 70px; object-fit: cover; border-radius: 6px; background: #eee;">
                    <div style="flex: 1;">
                        <div style="display:flex; justify-content:space-between;">
                            <h3 style="margin:0; font-size:1.1rem; color:#1e293b;">${inst.nombre}</h3>
                            ${codigo}
                        </div>
                        <p style="margin:4px 0; font-size:0.9rem; color:#64748b;">
                            ${inst.marca || 'S/M'} ${inst.serie ? '| SN:'+inst.serie : ''}
                        </p>
                        <p style="margin:0; font-size:0.85rem;">
                            <strong>Estado:</strong> ${inst.estado} | <strong>Ubic:</strong> ${inst.ubicacion || '-'}
                        </p>
                    </div>
                </div>
                <div style="margin-top: 10px; text-align: right;">
                    <button class="btn-edit" onclick="openEditModal(${inst.id})">📋 Ver Detalles / Editar</button>
                </div>
            </div>
        `;
        container.innerHTML += card;
    });
}

// --- GENERADOR DE PDF OFICIAL MINEDU (HORIZONTAL) ---
window.exportPDF = () => {
    if(!window.jspdf) return alert("Cargando librerías...");
    const { jsPDF } = window.jspdf;
    
    // 'l' = Landscape (Horizontal)
    const doc = new jsPDF('l', 'mm', 'a4');

    doc.setFontSize(14);
    doc.text("INVENTARIO FÍSICO DE BIENES PATRIMONIALES - 2025", 14, 15);
    doc.setFontSize(10);
    doc.text("I.E. ZOILA HORA DE ROBLES - CHEPÉN", 14, 22);

    const headers = [['N°', 'CÓD. PATRIMONIAL', 'DENOMINACIÓN', 'MARCA', 'MODELO', 'SERIE', 'COLOR', 'ESTADO', 'SITUACIÓN', 'OBSERVACIONES']];
    
    const body = allInstruments.map((i, idx) => [
        idx + 1,
        i.codigo_patrimonial || '-',
        i.nombre,
        i.marca || '-',
        i.modelo || '-',
        i.serie || '-',
        i.color || '-',
        i.estado,
        i.situacion || 'Uso',
        i.observaciones || ''
    ]);

    doc.autoTable({
        startY: 28,
        head: headers,
        body: body,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [22, 163, 74], textColor: 255 }, // Verde institucional
        columnStyles: {
            0: { cellWidth: 10 }, // Num
            1: { cellWidth: 35 }, // Codigo
            2: { cellWidth: 40 }, // Nombre
            9: { cellWidth: 40 }  // Observaciones mas ancha
        }
    });

    doc.save('Inventario_Patrimonial_ZoilaHora_2025.pdf');
};

// --- MODAL DE DETALLES Y EDICIÓN ---
window.openEditModal = (id) => {
    const inst = allInstruments.find(i => i.id === id);
    if (!inst) return;
    
    // Rellenar TODOS los campos
    const setVal = (id, val) => { const el = document.getElementById(id); if(el) el.value = val || ''; };

    setVal('edit-id', inst.id);
    setVal('edit-codigo', inst.codigo_patrimonial);
    setVal('edit-nombre', inst.nombre);
    setVal('edit-marca', inst.marca);
    setVal('edit-modelo', inst.modelo);
    setVal('edit-serie', inst.serie);
    setVal('edit-tipo', inst.tipo);
    setVal('edit-color', inst.color);
    setVal('edit-dimensiones', inst.dimensiones);
    setVal('edit-otras', inst.otras_caracteristicas);
    setVal('edit-anio', inst.anio_ingreso);
    setVal('edit-valor', inst.valor);
    setVal('edit-origen', inst.procedencia);
    setVal('edit-situacion', inst.situacion);
    setVal('edit-estado', inst.estado);
    setVal('edit-ubicacion', inst.ubicacion);
    setVal('edit-responsable', inst.responsable);
    setVal('edit-obs', inst.observaciones);
    setVal('current-image-url', inst.imagen_url);

    // Preview Imagen
    const preview = document.getElementById('edit-preview');
    if(preview) preview.src = (inst.imagen_url && inst.imagen_url.length > 10) ? inst.imagen_url : '';
    
    document.getElementById('editModal').style.display = 'block';
};

window.closeModal = () => document.getElementById('editModal').style.display = 'none';

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
    } catch (err) { console.error(err); alert('Error'); }
    finally { btn.disabled = false; btn.innerText = txt; }
}