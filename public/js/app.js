// public/js/app.js

// --- CONFIGURACIÓN CLOUDINARY ---
const CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/doqix96et/image/upload';
const CLOUDINARY_PRESET = 'inventario_preset'; 

let allInstruments = [];

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    loadInstruments();
    
    // Buscador
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

    // Formulario de Edición
    const editForm = document.getElementById('edit-form');
    if (editForm) {
        editForm.addEventListener('submit', handleEditSubmit);
    }

    // Vista previa inmediata de foto
    const fileInputEdit = document.getElementById('edit-foto');
    if (fileInputEdit) {
        fileInputEdit.addEventListener('change', function(event) {
            const file = event.target.files[0];
            if (file) {
                const localUrl = URL.createObjectURL(file);
                const previewImg = document.getElementById('edit-preview');
                if (previewImg) previewImg.src = localUrl;
            }
        });
    }
});

// --- SUBIDA IMAGEN ---
async function uploadImage(fileInput) {
    const file = fileInput.files[0];
    if (!file) return null;

    const options = { maxSizeMB: 0.5, maxWidthOrHeight: 1200, useWebWorker: true };

    try {
        let fileToUpload = file;
        if (window.imageCompression) {
            fileToUpload = await imageCompression(file, options);
        }

        const formData = new FormData();
        formData.append('file', fileToUpload);
        formData.append('upload_preset', CLOUDINARY_PRESET);

        const res = await fetch(CLOUDINARY_URL, { method: 'POST', body: formData });
        if (!res.ok) throw new Error('Error Cloudinary');
        
        const data = await res.json();
        return data.secure_url;

    } catch (error) {
        console.error('Error imagen:', error);
        alert('Error al subir imagen. Se guardará sin foto nueva.');
        return null;
    }
}

// --- CARGA DATOS ---
async function loadInstruments() {
    try {
        const res = await fetch('/api/get-instruments');
        if (!res.ok) throw new Error('Error API');
        allInstruments = await res.json();
        updateStats();
        renderList(allInstruments);
    } catch (error) {
        console.error(error);
        const c = document.getElementById('inventory-container');
        if(c) c.innerHTML = '<p style="text-align:center; padding:2rem; color:red">Error cargando datos.</p>';
    }
}

// --- ESTADÍSTICAS ---
function updateStats() {
    const currentYear = new Date().getFullYear();
    const total = allInstruments.length;
    const nuevos = allInstruments.filter(i => i.fecha_adquisicion && i.fecha_adquisicion.startsWith(String(currentYear))).length;
    const malos = allInstruments.filter(i => ['MALO', 'BAJA'].includes(i.estado)).length;

    const t = document.getElementById('total-count'); if(t) t.innerText = total;
    const n = document.getElementById('new-count'); if(n) n.innerText = nuevos;
    const r = document.getElementById('repair-count'); if(r) r.innerText = malos;
}

// --- FILTROS ---
window.filterData = (criteria) => {
    document.querySelectorAll('.btn-filter').forEach(b => b.classList.remove('active'));
    if(event && event.target) event.target.classList.add('active');
    
    const currentYear = new Date().getFullYear();
    let f = [];
    if (criteria === 'all') f = allInstruments;
    else if (criteria === '2025') f = allInstruments.filter(i => i.fecha_adquisicion && i.fecha_adquisicion.startsWith(String(currentYear)));
    else if (criteria === 'reparacion') f = allInstruments.filter(i => ['MALO', 'BAJA'].includes(i.estado));
    renderList(f);
};

// --- RENDER LISTA ---
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
        const codigo = inst.codigo_patrimonial ? `<span style="background:#e2e8f0; padding:2px 6px; border-radius:4px; font-size:0.8rem; font-family:monospace;">${inst.codigo_patrimonial}</span>` : '';

        // Color estado
        let bc = '#2563eb';
        if(inst.estado === 'NUEVO') bc = '#10b981';
        if(['MALO','BAJA'].includes(inst.estado)) bc = '#ef4444';

        const card = `
            <div class="instrument-card" style="border-left: 5px solid ${bc};">
                ${badge}
                <div style="display: flex; gap: 1rem; align-items: center;">
                    <img src="${imgUrl}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 6px; border:1px solid #ddd;">
                    <div style="flex: 1;">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <h3 style="margin:0; font-size:1.1rem; color:#1e293b;">${inst.nombre}</h3>
                            ${codigo}
                        </div>
                        <p style="margin:4px 0; font-size:0.9rem; color:#64748b;">
                            <strong>Marca:</strong> ${inst.marca || '-'} ${inst.serie ? '| <strong>SN:</strong> '+inst.serie : ''}
                        </p>
                        <p style="margin:0; font-size:0.85rem;">
                            <strong>Est:</strong> ${inst.estado} | <strong>Ubic:</strong> ${inst.ubicacion || '-'}
                        </p>
                    </div>
                </div>
                <div style="margin-top: 10px; text-align: right; border-top:1px solid #eee; padding-top:8px;">
                    <button class="btn-edit" onclick="openEditModal(${inst.id})">📋 Detalles / Editar</button>
                </div>
            </div>
        `;
        container.innerHTML += card;
    });
}

// --- PDF ---
window.exportPDF = () => {
    if(!window.jspdf) return alert("Cargando librerías...");
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('l', 'mm', 'a4');

    doc.setFontSize(14); doc.text("INVENTARIO FÍSICO DE BIENES PATRIMONIALES - 2025", 14, 15);
    doc.setFontSize(10); doc.text("I.E. ZOILA HORA DE ROBLES", 14, 22); doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 250, 22);

    const headers = [['N°', 'CÓDIGO', 'DENOMINACIÓN', 'MARCA', 'MODELO', 'SERIE', 'COLOR', 'ESTADO', 'SITUACIÓN', 'OBS.']];
    const body = allInstruments.map((i, idx) => [
        idx + 1, i.codigo_patrimonial||'-', i.nombre, i.marca||'-', i.modelo||'-', i.serie||'-', i.color||'-', i.estado, i.situacion||'Uso', i.observaciones||''
    ]);

    doc.autoTable({
        startY: 28, head: headers, body: body, theme: 'grid', styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [22, 163, 74], halign: 'center' }, columnStyles: { 0: {halign:'center'}, 2: {cellWidth:45} }
    });
    doc.save('Inventario_ZoilaHora.pdf');
};

// --- MODAL ---
window.openEditModal = (id) => {
    const inst = allInstruments.find(i => i.id === id);
    if (!inst) return;
    
    const setVal = (did, val) => { 
        const el = document.getElementById(did); 
        if(el) el.value = (val === null || val === undefined) ? '' : val; 
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
    setVal('edit-anio', inst.anio_ingreso); // Puede venir null
    setVal('edit-valor', inst.valor);
    setVal('edit-origen', inst.procedencia); 
    setVal('edit-situacion', inst.situacion);
    setVal('edit-estado', inst.estado);
    setVal('edit-ubicacion', inst.ubicacion);
    setVal('edit-responsable', inst.responsable);
    setVal('edit-obs', inst.observaciones);
    setVal('current-image-url', inst.imagen_url);

    const preview = document.getElementById('edit-preview');
    if(preview) {
        const noImage = "data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='150' height='150' viewBox='0 0 150 150'%3E%3Crect width='150' height='150' fill='%23f1f5f9'/%3E%3Ctext x='50%25' y='50%25' font-family='sans-serif' font-size='10' fill='%2394a3b8' dy='.3em' text-anchor='middle'%3ESin Foto%3C/text%3E%3C/svg%3E";
        preview.src = (inst.imagen_url && inst.imagen_url.length > 10) ? inst.imagen_url : noImage;
    }
    const fi = document.getElementById('edit-foto'); if(fi) fi.value = "";
    document.getElementById('editModal').style.display = 'block';
};

window.closeModal = () => document.getElementById('editModal').style.display = 'none';
window.onclick = (e) => { if(e.target == document.getElementById('editModal')) closeModal(); };

// --- UPDATE (AQUÍ ESTÁ LA CORRECCIÓN DEL ERROR NaN) ---
async function handleEditSubmit(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const txt = btn.innerText;
    btn.disabled = true;
    btn.innerText = "Procesando...";

    try {
        const fileInput = document.getElementById('edit-foto');
        let finalImageUrl = document.getElementById('current-image-url').value;

        if (fileInput.files.length > 0) {
            btn.innerText = "Subiendo foto...";
            const uploadedUrl = await uploadImage(fileInput);
            if (uploadedUrl) finalImageUrl = uploadedUrl;
            else throw new Error("Fallo foto");
        }

        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        data.imagen_url = finalImageUrl;
        
        // Corrección Procedencia
        const origEl = document.getElementById('edit-origen');
        if(origEl) data.procedencia = origEl.value;

        // --- CORRECCIÓN CRÍTICA PARA EL ERROR 'NaN' ---
        // Si el campo está vacío, enviamos null (para año) o 0 (para valor).
        // NUNCA dejamos que pase undefined o texto vacío a parseInt.
        
        if (!data.anio_ingreso || data.anio_ingreso.trim() === "") {
            data.anio_ingreso = null; 
        } else {
            data.anio_ingreso = parseInt(data.anio_ingreso);
        }

        if (!data.valor || data.valor.trim() === "") {
            data.valor = 0;
        } else {
            data.valor = parseFloat(data.valor);
        }
        // ----------------------------------------------

        btn.innerText = "Guardando...";
        const res = await fetch('/api/update-instrument', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (res.ok) {
            alert('¡Actualizado con éxito!');
            closeModal();
            loadInstruments();
        } else {
            const err = await res.json();
            alert('Error BD: ' + (err.error || 'Desconocido'));
        }

    } catch (err) {
        console.error(err);
        if(err.message !== "Fallo foto") alert('Error de conexión.');
    } finally {
        btn.disabled = false;
        btn.innerText = txt;
    }
}

window.logout = () => {
    if(confirm('¿Salir?')) {
        sessionStorage.removeItem('usuario_autorizado');
        window.location.href = 'login.html';
    }
};

// --- FUNCIONES DE IMPORTACIÓN EXCEL ---

// 1. Descargar Plantilla Vacía
window.downloadTemplate = () => {
    const headers = [
        {
            "CÓDIGO PATRIMONIAL": "392205190001",
            "DENOMINACIÓN (NOMBRE)": "BOMBO",
            "MARCA": "HOFFER",
            "MODELO": "H-200",
            "SERIE": "SN12345",
            "COLOR": "NEGRO",
            "ESTADO (NUEVO/BUENO/REGULAR/MALO)": "REGULAR",
            "SITUACIÓN (Uso/Desuso)": "Uso",
            "AÑO INGRESO": 2018,
            "VALOR S/": 350.00,
            "PROCEDENCIA": "Donac. APAFA",
            "UBICACIÓN": "DEP. MÚSICA",
            "RESPONSABLE": "Profesor",
            "OBSERVACIONES": "Parche roto"
        }
    ];

    const ws = XLSX.utils.json_to_sheet(headers);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Plantilla");
    XLSX.writeFile(wb, "Plantilla_Inventario_ZoilaHora.xlsx");
};

// 2. Procesar Excel Subido
window.handleExcelUpload = async (input) => {
    const file = input.files[0];
    if (!file) return;

    if (!confirm('¿Seguro que deseas importar este archivo? Se agregarán los instrumentos a la base de datos.')) {
        input.value = "";
        return;
    }

    const reader = new FileReader();
    
    reader.onload = async (e) => {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Leer la primera hoja
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convertir a JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        if (jsonData.length === 0) {
            alert("El archivo está vacío.");
            return;
        }

        // MAPEO DE COLUMNAS (Excel -> Base de Datos)
        // Esto es importante porque en el Excel las columnas tienen nombres bonitos con tildes
        const mappedData = jsonData.map(row => ({
            codigo_patrimonial: row["CÓDIGO PATRIMONIAL"] || '',
            nombre: row["DENOMINACIÓN (NOMBRE)"] || 'SIN NOMBRE',
            marca: row["MARCA"] || '',
            modelo: row["MODELO"] || '',
            serie: row["SERIE"] || '',
            color: row["COLOR"] || '',
            estado: (row["ESTADO (NUEVO/BUENO/REGULAR/MALO)"] || 'REGULAR').toUpperCase(),
            situacion: row["SITUACIÓN (Uso/Desuso)"] || 'Uso',
            anio_ingreso: row["AÑO INGRESO"],
            valor: row["VALOR S/"],
            procedencia: row["PROCEDENCIA"] || '',
            ubicacion: row["UBICACIÓN"] || 'ALMACEN',
            responsable: row["RESPONSABLE"] || '',
            observaciones: row["OBSERVACIONES"] || ''
        }));

        // Enviar al Backend
        try {
            // Mostrar indicador de carga visual
            const prevText = document.querySelector('label[for="excel-input"]').innerText;
            document.querySelector('label[for="excel-input"]').innerText = "⏳ Subiendo...";

            const response = await fetch('/api/import-excel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(mappedData)
            });

            const result = await response.json();

            if (response.ok) {
                alert(`✅ Éxito: ${result.message}`);
                loadInstruments(); // Recargar la tabla
            } else {
                alert(`❌ Error: ${result.error}`);
            }

        } catch (error) {
            console.error(error);
            alert("Error de conexión al importar.");
        } finally {
            input.value = ""; // Limpiar input para permitir subir el mismo archivo si se corrige
            document.querySelector('label[for="excel-input"]').innerText = "📤 Subir Excel con Datos";
        }
    };

    reader.readAsArrayBuffer(file);
};