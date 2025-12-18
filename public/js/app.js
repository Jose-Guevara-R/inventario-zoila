// public/js/app.js

// --- CONFIGURACIÓN CLOUDINARY ---
const CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/doqix96et/image/upload';
const CLOUDINARY_PRESET = 'inventario_preset'; 

// Variable global para mantener los datos en memoria
let allInstruments = [];

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    // 1. Cargar datos al iniciar
    loadInstruments();
    
    // 2. Configurar buscador
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

    // 3. Configurar Formulario de Edición
    const editForm = document.getElementById('edit-form');
    if (editForm) {
        editForm.addEventListener('submit', handleEditSubmit);
    }

    // 4. NUEVO: Vista previa inmediata de la foto al seleccionar/tomar (Modal)
    const fileInputEdit = document.getElementById('edit-foto');
    if (fileInputEdit) {
        fileInputEdit.addEventListener('change', function(event) {
            const file = event.target.files[0];
            if (file) {
                // Crear una URL temporal para mostrar la foto al instante
                const localUrl = URL.createObjectURL(file);
                const previewImg = document.getElementById('edit-preview');
                if (previewImg) previewImg.src = localUrl;
            }
        });
    }
});

// --- FUNCIÓN DE SUBIDA CON COMPRESIÓN ---
async function uploadImage(fileInput) {
    const file = fileInput.files[0];
    if (!file) return null;

    // Opciones de compresión: Máximo 0.5MB y ancho max 1200px
    const options = {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 1200,
        useWebWorker: true
    };

    try {
        // 1. Comprimir (si la librería está cargada)
        let fileToUpload = file;
        if (window.imageCompression) {
            console.log("Comprimiendo imagen...");
            fileToUpload = await imageCompression(file, options);
        }

        // 2. Subir a Cloudinary
        const formData = new FormData();
        formData.append('file', fileToUpload);
        formData.append('upload_preset', CLOUDINARY_PRESET);

        const res = await fetch(CLOUDINARY_URL, { method: 'POST', body: formData });
        
        if (!res.ok) {
            throw new Error('Error de autenticación o red en Cloudinary');
        }
        
        const data = await res.json();
        return data.secure_url; // Retorna el link https://...

    } catch (error) {
        console.error('Error subiendo imagen:', error);
        alert('Error al subir la imagen. Verifique sus credenciales de Cloudinary.');
        return null;
    }
}

// --- CARGA DE DATOS ---
async function loadInstruments() {
    try {
        const res = await fetch('/api/get-instruments');
        if (!res.ok) throw new Error('Error al conectar con la API');
        
        allInstruments = await res.json();
        updateStats();
        renderList(allInstruments);
    } catch (error) {
        console.error('Error:', error);
        const container = document.getElementById('inventory-container');
        if(container) container.innerHTML = '<p style="text-align:center; color:red; padding:2rem;">No se pudo cargar el inventario.</p>';
    }
}

// --- ESTADÍSTICAS ---
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

// --- FILTROS ---
window.filterData = (criteria) => {
    document.querySelectorAll('.btn-filter').forEach(btn => btn.classList.remove('active'));
    if(event && event.target) event.target.classList.add('active');

    const currentYear = new Date().getFullYear();
    let filtered = [];

    if (criteria === 'all') filtered = allInstruments;
    else if (criteria === '2025') filtered = allInstruments.filter(i => i.fecha_adquisicion && i.fecha_adquisicion.startsWith(String(currentYear)));
    else if (criteria === 'reparacion') filtered = allInstruments.filter(i => ['MALO', 'BAJA'].includes(i.estado));
    
    renderList(filtered);
};

// --- RENDERIZADO (TARJETAS) ---
function renderList(list) {
    const container = document.getElementById('inventory-container');
    container.innerHTML = '';
    
    if (!list || list.length === 0) {
        container.innerHTML = '<p style="text-align:center; padding:2rem; color:#666">No se encontraron resultados.</p>';
        return;
    }

    const currentYear = new Date().getFullYear();

    list.forEach(inst => {
        const isNew = inst.fecha_adquisicion && inst.fecha_adquisicion.startsWith(String(currentYear));
        const badge = isNew ? `<span class="badge-new">NUEVO ${currentYear}</span>` : '';
        
        // Imagen por defecto (SVG Base64)
        const noImage = "data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='150' height='150' viewBox='0 0 150 150'%3E%3Crect width='150' height='150' fill='%23f1f5f9'/%3E%3Ctext x='50%25' y='50%25' font-family='sans-serif' font-size='14' fill='%2394a3b8' dy='.3em' text-anchor='middle'%3ESin Foto%3C/text%3E%3C/svg%3E";
        const imgUrl = (inst.imagen_url && inst.imagen_url.length > 10) ? inst.imagen_url : noImage;

        // Código Patrimonial
        const codigo = inst.codigo_patrimonial ? `<span style="background:#e2e8f0; padding:2px 6px; border-radius:4px; font-size:0.8rem; font-family:monospace; margin-left: auto;">${inst.codigo_patrimonial}</span>` : '';

        // Borde de color según estado
        let borderColor = '#2563eb'; // Azul por defecto
        if (inst.estado === 'NUEVO') borderColor = '#10b981'; // Verde
        if (inst.estado === 'MALO' || inst.estado === 'BAJA') borderColor = '#ef4444'; // Rojo

        const card = `
            <div class="instrument-card" style="border-left: 5px solid ${borderColor};">
                ${badge}
                <div style="display: flex; gap: 1rem; align-items: center;">
                    <img src="${imgUrl}" alt="${inst.nombre}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 6px; background: #f8fafc; border: 1px solid #e2e8f0;">
                    
                    <div style="flex: 1;">
                        <div style="display:flex; align-items: center;">
                            <h3 style="margin:0; font-size:1.1rem; color:#1e293b;">${inst.nombre}</h3>
                            ${codigo}
                        </div>
                        <p style="margin:4px 0; font-size:0.9rem; color:#64748b;">
                            <strong>Marca:</strong> ${inst.marca || '-'} ${inst.serie ? '| <strong>SN:</strong> '+inst.serie : ''}
                        </p>
                        <p style="margin:0; font-size:0.85rem; color:#334155;">
                            <strong>Estado:</strong> ${inst.estado} | <strong>Ubic:</strong> ${inst.ubicacion || 'Almacén'}
                        </p>
                    </div>
                </div>
                
                <div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid #f1f5f9; text-align: right;">
                    <button class="btn-edit" onclick="openEditModal(${inst.id})">📋 Ver Detalles / Editar</button>
                </div>
            </div>
        `;
        container.innerHTML += card;
    });
}

// --- GENERADOR PDF (HORIZONTAL / LANDSCAPE) ---
window.exportPDF = () => {
    if(!window.jspdf) {
        alert("Cargando librería PDF, espere unos segundos e intente de nuevo.");
        return;
    }
    const { jsPDF } = window.jspdf;
    
    // 'l' = Landscape (Horizontal), 'mm' = milímetros, 'a4' = tamaño hoja
    const doc = new jsPDF('l', 'mm', 'a4');

    // Títulos
    doc.setFontSize(14);
    doc.text("INVENTARIO FÍSICO DE BIENES PATRIMONIALES - 2025", 14, 15);
    doc.setFontSize(10);
    doc.text("I.E. ZOILA HORA DE ROBLES - CHEPÉN", 14, 22);
    doc.text(`Fecha de Reporte: ${new Date().toLocaleDateString()}`, 250, 22);

    // Definir columnas (Coincide con Excel MINEDU)
    const headers = [['N°', 'CÓD. PATRIMONIAL', 'DENOMINACIÓN', 'MARCA', 'MODELO', 'SERIE', 'COLOR', 'ESTADO', 'SITUACIÓN', 'OBSERVACIONES']];
    
    // Mapear datos
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

    // Generar tabla
    doc.autoTable({
        startY: 28,
        head: headers,
        body: body,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2, valign: 'middle' },
        headStyles: { fillColor: [22, 163, 74], textColor: 255, halign: 'center' }, // Verde Cabecera
        columnStyles: {
            0: { cellWidth: 10, halign: 'center' }, // N°
            1: { cellWidth: 35 }, // Codigo
            2: { cellWidth: 45 }, // Denominación
            7: { cellWidth: 20, halign: 'center' }, // Estado
            8: { cellWidth: 20, halign: 'center' }  // Situación
        }
    });

    doc.save('Inventario_Patrimonial_ZoilaHora_2025.pdf');
};

// --- LOGICA DEL MODAL DE EDICIÓN ---

// 1. Abrir y Rellenar
window.openEditModal = (id) => {
    const inst = allInstruments.find(i => i.id === id);
    if (!inst) return;
    
    // Helper para asignar valor si el elemento existe
    const setVal = (domId, value) => { 
        const el = document.getElementById(domId); 
        if(el) el.value = (value === null || value === undefined) ? '' : value; 
    };

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
    
    // AQUÍ ESTÁ LA CORRECCIÓN DE PROCEDENCIA
    setVal('edit-origen', inst.procedencia); 

    setVal('edit-situacion', inst.situacion);
    setVal('edit-estado', inst.estado);
    setVal('edit-ubicacion', inst.ubicacion);
    setVal('edit-responsable', inst.responsable);
    setVal('edit-obs', inst.observaciones);
    setVal('current-image-url', inst.imagen_url);

    // Mostrar foto actual o placeholder
    const preview = document.getElementById('edit-preview');
    if(preview) {
        const noImage = "data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='150' height='150' viewBox='0 0 150 150'%3E%3Crect width='150' height='150' fill='%23f1f5f9'/%3E%3Ctext x='50%25' y='50%25' font-family='sans-serif' font-size='10' fill='%2394a3b8' dy='.3em' text-anchor='middle'%3ESin Foto%3C/text%3E%3C/svg%3E";
        preview.src = (inst.imagen_url && inst.imagen_url.length > 10) ? inst.imagen_url : noImage;
    }
    
    // Limpiar input de archivo
    const fileInput = document.getElementById('edit-foto');
    if(fileInput) fileInput.value = "";

    document.getElementById('editModal').style.display = 'block';
};

// 2. Cerrar
window.closeModal = () => {
    document.getElementById('editModal').style.display = 'none';
};

// Cerrar al hacer clic fuera
window.onclick = (event) => {
    const modal = document.getElementById('editModal');
    if (event.target == modal) modal.style.display = 'none';
};

// --- ENVÍO DE DATOS EDITADOS (UPDATE) ---
async function handleEditSubmit(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.innerText;
    
    btn.disabled = true;
    btn.innerText = "Procesando...";

    try {
        const fileInput = document.getElementById('edit-foto');
        let finalImageUrl = document.getElementById('current-image-url').value;

        // 1. Si hay foto nueva, subirla primero
        if (fileInput.files.length > 0) {
            btn.innerText = "Subiendo foto...";
            const uploadedUrl = await uploadImage(fileInput);
            
            if (uploadedUrl) {
                finalImageUrl = uploadedUrl;
            } else {
                // Si falla la subida, lanzamos error para NO guardar datos corruptos
                throw new Error("Fallo subida imagen");
            }
        }

        // 2. Preparar datos
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        
        // Agregar la URL de la imagen y sanitizar datos
        data.imagen_url = finalImageUrl;
        
        // Corrección: Asegurar que procedencia se envíe bien
        data.procedencia = document.getElementById('edit-origen').value;

        // Corrección: Evitar enviar strings vacíos a campos numéricos
        if(data.anio_ingreso === "") data.anio_ingreso = null;
        if(data.valor === "") data.valor = 0;

        btn.innerText = "Guardando en base de datos...";

        // 3. Enviar al Backend
        const res = await fetch('/api/update-instrument', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (res.ok) {
            alert('¡Registro actualizado correctamente!');
            closeModal();
            loadInstruments(); // Recargar para ver los cambios
        } else {
            const errData = await res.json();
            alert('Error al guardar: ' + (errData.error || 'Desconocido'));
        }

    } catch (err) {
        console.error("Error en proceso:", err);
        if (err.message !== "Fallo subida imagen") {
            alert('Ocurrió un error inesperado al conectar con el servidor.');
        }
    } finally {
        btn.disabled = false;
        btn.innerText = originalText;
    }
}

// Función logout
window.logout = () => {
    if(confirm('¿Seguro que desea cerrar sesión?')) {
        sessionStorage.removeItem('usuario_autorizado');
        window.location.href = 'login.html';
    }
};