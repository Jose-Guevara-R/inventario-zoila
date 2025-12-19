// public/js/app.js

// --- CONFIGURACIÓN CLOUDINARY ---
const CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/doqix96et/image/upload';
const CLOUDINARY_PRESET = 'inventario_preset'; 

let allInstruments = [];

document.addEventListener('DOMContentLoaded', () => {
    loadInstruments();
    const s = document.getElementById('search');
    if (s) {
        s.addEventListener('input', (e) => {
            const t = e.target.value.toLowerCase();
            const f = allInstruments.filter(i => 
                i.nombre.toLowerCase().includes(t) || 
                (i.codigo_patrimonial && i.codigo_patrimonial.toLowerCase().includes(t)) ||
                (i.serie && i.serie.toLowerCase().includes(t))
            );
            renderList(f);
        });
    }
    const ef = document.getElementById('edit-form'); if (ef) ef.addEventListener('submit', handleEditSubmit);
    const fi = document.getElementById('edit-foto');
    if (fi) {
        fi.addEventListener('change', function(e) {
            const f = e.target.files[0];
            if (f) document.getElementById('edit-preview').src = URL.createObjectURL(f);
        });
    }
});

async function uploadImage(inp) {
    const f = inp.files[0]; if (!f) return null;
    const opt = { maxSizeMB: 0.5, maxWidthOrHeight: 1200, useWebWorker: true };
    try {
        let fu = f;
        if (window.imageCompression) fu = await imageCompression(f, opt);
        const fd = new FormData(); fd.append('file', fu); fd.append('upload_preset', CLOUDINARY_PRESET);
        const res = await fetch(CLOUDINARY_URL, { method: 'POST', body: fd });
        if (!res.ok) throw new Error('Cloudinary Error');
        const d = await res.json(); return d.secure_url;
    } catch (e) { console.error(e); alert('Error subiendo foto.'); return null; }
}

async function loadInstruments() {
    try {
        const res = await fetch('/api/get-instruments');
        if (!res.ok) throw new Error('API Error');
        allInstruments = await res.json();
        updateStats(); renderList(allInstruments);
    } catch (e) { document.getElementById('inventory-container').innerHTML = '<p style="text-align:center;color:red;padding:2rem">Error cargando datos.</p>'; }
}

function updateStats() {
    const y = new Date().getFullYear();
    const t = allInstruments.length;
    const n = allInstruments.filter(i => {
        let cy = y;
        if(i.anio_ingreso) cy = parseInt(i.anio_ingreso);
        else if(i.fecha_adquisicion) cy = parseInt(i.fecha_adquisicion.split('-')[0]);
        return cy === y;
    }).length;
    const m = allInstruments.filter(i => ['MALO','BAJA'].includes(i.estado)).length;
    
    const te = document.getElementById('total-count'); if(te) te.innerText = t;
    const ne = document.getElementById('new-count'); if(ne) ne.innerText = n;
    const re = document.getElementById('repair-count'); if(re) re.innerText = m;
}

window.filterData = (c) => {
    document.querySelectorAll('.btn-filter').forEach(b => b.classList.remove('active'));
    if(event && event.target) event.target.classList.add('active');
    const y = new Date().getFullYear();
    let f = [];
    if(c==='all') f=allInstruments;
    else if(c==='2025') f=allInstruments.filter(i=>{
        let cy = y;
        if(i.anio_ingreso) cy = parseInt(i.anio_ingreso);
        else if(i.fecha_adquisicion) cy = parseInt(i.fecha_adquisicion.split('-')[0]);
        return cy === y;
    });
    else if(c==='reparacion') f=allInstruments.filter(i=>['MALO','BAJA'].includes(i.estado));
    renderList(f);
};

function renderList(l) {
    const c = document.getElementById('inventory-container'); c.innerHTML = '';
    if(!l||l.length===0) { c.innerHTML='<p style="text-align:center;padding:2rem">Sin resultados.</p>'; return; }
    const y = new Date().getFullYear();

    l.forEach(i => {
        let cy = y;
        if(i.anio_ingreso) cy = parseInt(i.anio_ingreso);
        else if(i.fecha_adquisicion) cy = parseInt(i.fecha_adquisicion.split('-')[0]);
        
        const isNew = cy === y;
        const badge = isNew ? `<span class="badge-new">NUEVO ${y}</span>` : '';
        const noImg = "data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='150' height='150' viewBox='0 0 150 150'%3E%3Crect width='150' height='150' fill='%23f1f5f9'/%3E%3Ctext x='50%25' y='50%25' font-family='sans-serif' font-size='14' fill='%2394a3b8' dy='.3em' text-anchor='middle'%3ESin Foto%3C/text%3E%3C/svg%3E";
        const url = (i.imagen_url && i.imagen_url.length>10)?i.imagen_url:noImg;
        const cod = i.codigo_patrimonial?`<span style="background:#e2e8f0;padding:2px 6px;border-radius:4px;font-size:0.8rem;font-family:monospace">${i.codigo_patrimonial}</span>`:'';
        
        let bc='#2563eb'; if(i.estado==='NUEVO') bc='#10b981'; if(['MALO','BAJA'].includes(i.estado)) bc='#ef4444';

        c.innerHTML += `
        <div class="instrument-card" style="border-left:5px solid ${bc}">
            ${badge}
            <div style="display:flex;gap:1rem;align-items:center">
                <img src="${url}" style="width:80px;height:80px;object-fit:cover;border-radius:6px;border:1px solid #ddd">
                <div style="flex:1">
                    <div style="display:flex;justify-content:space-between;align-items:center">
                        <h3 style="margin:0;font-size:1.1rem;color:#1e293b">${i.nombre}</h3>
                        ${cod}
                    </div>
                    <p style="margin:4px 0;font-size:0.9rem;color:#64748b">
                        <strong>Marca:</strong> ${i.marca||'-'} ${i.serie?'| <strong>SN:</strong> '+i.serie:''}
                    </p>
                    <p style="margin:0;font-size:0.85rem">
                        <strong>Est:</strong> ${i.estado} | <strong>Ubic:</strong> ${i.ubicacion||'-'}
                    </p>
                </div>
            </div>
            <div style="margin-top:10px;text-align:right;border-top:1px solid #eee;padding-top:8px">
                <button class="btn-edit" onclick="openEditModal(${i.id})">📋 Detalles / Editar</button>
            </div>
        </div>`;
    });
}

// --- PDF ---
window.exportPDF = () => {
    if(!window.jspdf) return alert('Cargando PDF lib...');
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('l','mm','a4');
    doc.setFontSize(14); doc.text("INVENTARIO FÍSICO DE BIENES PATRIMONIALES - 2025", 14, 15);
    doc.setFontSize(10); doc.text("I.E. ZOILA HORA DE ROBLES", 14, 22); doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 250, 22);
    const h = [['N°','CÓDIGO','DENOMINACIÓN','MARCA','MODELO','SERIE','COLOR','ESTADO','SITUACIÓN','PROCEDENCIA','OBS.']];
    const b = allInstruments.map((i,x)=>[x+1,i.codigo_patrimonial||'-',i.nombre,i.marca||'-',i.modelo||'-',i.serie||'-',i.color||'-',i.estado,i.situacion||'Uso',i.procedencia||i.origen||'-',i.observaciones||'']);
    doc.autoTable({startY:28,head:h,body:b,theme:'grid',styles:{fontSize:7,cellPadding:2},headStyles:{fillColor:[22,163,74],halign:'center'},columnStyles:{0:{cellWidth:8,halign:'center'},1:{cellWidth:30},2:{cellWidth:40},7:{cellWidth:15},8:{cellWidth:15},9:{cellWidth:25},10:{cellWidth:25}}});
    doc.save('Inventario_ZoilaHora.pdf');
};

// --- NUEVA FUNCIÓN: EXPORTAR EXCEL ---
window.exportExcel = () => {
    if(!allInstruments || allInstruments.length === 0) return alert("No hay datos para exportar.");
    
    // Mapear los datos al formato "bonito" de Excel
    const data = allInstruments.map((item, index) => ({
        "N°": index + 1,
        "CÓDIGO PATRIMONIAL": item.codigo_patrimonial || '',
        "DENOMINACIÓN (NOMBRE)": item.nombre,
        "MARCA": item.marca || '',
        "MODELO": item.modelo || '',
        "SERIE": item.serie || '',
        "COLOR": item.color || '',
        "ESTADO": item.estado,
        "SITUACIÓN": item.situacion || 'Uso',
        "PROCEDENCIA": item.procedencia || item.origen || '',
        "UBICACIÓN": item.ubicacion || 'ALMACEN',
        "AÑO INGRESO": item.anio_ingreso || '',
        "VALOR S/": item.valor || 0,
        "RESPONSABLE": item.responsable || '',
        "OBSERVACIONES": item.observaciones || ''
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventario 2025");
    
    // Generar nombre de archivo con fecha
    const fecha = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `Inventario_Completo_${fecha}.xlsx`);
};

// --- MODAL & CRUD ---
window.openEditModal = (id) => {
    const i = allInstruments.find(x => x.id === id); if(!i) return;
    const s = (d,v) => { const e=document.getElementById(d); if(e) e.value=(v===null||v===undefined)?'':v; };
    s('edit-id',i.id); s('edit-codigo',i.codigo_patrimonial); s('edit-nombre',i.nombre); s('edit-marca',i.marca);
    s('edit-modelo',i.modelo); s('edit-serie',i.serie); s('edit-tipo',i.tipo); s('edit-color',i.color);
    s('edit-dimensiones',i.dimensiones); s('edit-otras',i.otras_caracteristicas); s('edit-anio',i.anio_ingreso);
    s('edit-valor',i.valor); s('edit-origen',i.procedencia||i.origen); s('edit-situacion',i.situacion);
    s('edit-estado',i.estado); s('edit-ubicacion',i.ubicacion); s('edit-responsable',i.responsable);
    s('edit-obs',i.observaciones); s('current-image-url',i.imagen_url);
    const p = document.getElementById('edit-preview'); if(p) p.src = (i.imagen_url && i.imagen_url.length>10)?i.imagen_url:"data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='150' height='150' viewBox='0 0 150 150'%3E%3Crect width='150' height='150' fill='%23f1f5f9'/%3E%3Ctext x='50%25' y='50%25' font-family='sans-serif' font-size='10' fill='%2394a3b8' dy='.3em' text-anchor='middle'%3ESin Foto%3C/text%3E%3C/svg%3E";
    const fi=document.getElementById('edit-foto'); if(fi) fi.value="";
    document.getElementById('editModal').style.display='block';
};
window.closeModal = () => document.getElementById('editModal').style.display='none';
window.onclick = (e) => { if(e.target==document.getElementById('editModal')) closeModal(); };

async function handleEditSubmit(e) {
    e.preventDefault();
    const b = e.target.querySelector('button[type="submit"]'); const t = b.innerText;
    b.disabled=true; b.innerText="Procesando...";
    try {
        const fi = document.getElementById('edit-foto'); let u = document.getElementById('current-image-url').value;
        if(fi.files.length>0) { b.innerText="Subiendo..."; u = await uploadImage(fi); if(!u) throw new Error("Fallo foto"); }
        const fd = new FormData(e.target); const d = Object.fromEntries(fd.entries());
        d.imagen_url = u;
        const o = document.getElementById('edit-origen'); if(o) d.procedencia = o.value;
        if(!d.anio_ingreso || d.anio_ingreso.trim()==="") d.anio_ingreso=null; else d.anio_ingreso=parseInt(d.anio_ingreso);
        if(!d.valor || d.valor.trim()==="") d.valor=0; else d.valor=parseFloat(d.valor);
        b.innerText="Guardando...";
        const r = await fetch('/api/update-instrument', { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(d) });
        if(r.ok) { alert('¡Guardado!'); closeModal(); loadInstruments(); } else { const err=await r.json(); alert('Error: '+err.error); }
    } catch(er) { console.error(er); if(er.message!=="Fallo foto") alert('Error conexión'); } finally { b.disabled=false; b.innerText=t; }
}

window.handleDelete = async () => {
    const id = document.getElementById('edit-id').value; const n = document.getElementById('edit-nombre').value;
    if(!confirm(`¿Eliminar "${n}" definitivamente?`)) return;
    try {
        const r = await fetch(`/api/delete-instrument?id=${id}`, {method:'DELETE'});
        if(r.ok) { alert('Eliminado.'); closeModal(); loadInstruments(); } else alert('Error al eliminar');
    } catch(e) { alert('Error conexión'); }
};

window.downloadTemplate = () => {
    const h = [{"CÓDIGO PATRIMONIAL":"3922...","DENOMINACIÓN (NOMBRE)":"BOMBO","MARCA":"YAMAHA","MODELO":"X","SERIE":"123","COLOR":"NEGRO","ESTADO (NUEVO/BUENO/REGULAR/MALO)":"REGULAR","SITUACIÓN (Uso/Desuso)":"Uso","AÑO INGRESO":2018,"VALOR S/":350,"PROCEDENCIA":"APAFA","UBICACIÓN":"ALMACEN","RESPONSABLE":"Profesor","OBSERVACIONES":"Ninguna"}];
    const ws = XLSX.utils.json_to_sheet(h); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Plantilla");
    XLSX.writeFile(wb, "Plantilla_Inventario.xlsx");
};

window.handleExcelUpload = async (inp) => {
    const f = inp.files[0]; if(!f) return; if(!confirm('¿Importar?')) { inp.value=""; return; }
    const r = new FileReader();
    r.onload = async (e) => {
        const d = new Uint8Array(e.target.result); const wb = XLSX.read(d, {type:'array'});
        const j = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
        const m = j.map(r=>({
            codigo_patrimonial:r["CÓDIGO PATRIMONIAL"]||'', nombre:r["DENOMINACIÓN (NOMBRE)"]||'SIN NOMBRE',
            marca:r["MARCA"]||'', modelo:r["MODELO"]||'', serie:r["SERIE"]||'', color:r["COLOR"]||'',
            estado:(r["ESTADO (NUEVO/BUENO/REGULAR/MALO)"]||'REGULAR').toUpperCase(),
            situacion:r["SITUACIÓN (Uso/Desuso)"]||'Uso', anio_ingreso:r["AÑO INGRESO"], valor:r["VALOR S/"],
            procedencia:r["PROCEDENCIA"]||'', ubicacion:r["UBICACIÓN"]||'ALMACEN', responsable:r["RESPONSABLE"]||'', observaciones:r["OBSERVACIONES"]||''
        }));
        try {
            document.querySelector('label[for="excel-input"]').innerText="⏳...";
            const res = await fetch('/api/import-excel', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(m) });
            const re = await res.json(); if(res.ok) { alert(re.message); loadInstruments(); } else alert(re.error);
        } catch(er) { alert("Error conexión"); } finally { inp.value=""; document.querySelector('label[for="excel-input"]').innerText="📤 Subir Excel"; }
    };
    r.readAsArrayBuffer(f);
};

window.logout = () => { if(confirm('¿Salir?')) { sessionStorage.removeItem('usuario_autorizado'); window.location.href = 'login.html'; } };