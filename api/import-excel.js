// api/import-excel.js
const pool = require('./db');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const items = req.body;
    
    if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Datos vacíos' });
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const query = `
            INSERT INTO instrumentos 
            (codigo_patrimonial, nombre, marca, modelo, serie, color, estado, situacion, ubicacion, anio_ingreso, valor, procedencia, observaciones, fecha_adquisicion, responsable, tipo, dimensiones, otras_caracteristicas, imagen_url) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, '')
        `;

        for (const item of items) {
            // Sanitizar año y valor
            const anio = (item.anio_ingreso && !isNaN(parseInt(item.anio_ingreso))) ? parseInt(item.anio_ingreso) : null;
            const val = (item.valor && !isNaN(parseFloat(item.valor))) ? parseFloat(item.valor) : 0;
            
            // --- CORRECCIÓN DE FECHA ---
            // Si el Excel tiene año, la fecha será "AÑO-01-01". Si no, será HOY.
            let fecha;
            if (anio) {
                fecha = `${anio}-01-01`; 
            } else {
                fecha = new Date().toISOString().split('T')[0];
            }
            // ---------------------------

            const values = [
                item.codigo_patrimonial || '',
                item.nombre || 'SIN NOMBRE',
                item.marca || '',
                item.modelo || '',
                item.serie || '',
                item.color || '',
                item.estado || 'REGULAR',
                item.situacion || 'Uso',
                item.ubicacion || 'ALMACEN',
                anio,
                val,
                item.procedencia || '',
                item.observaciones || '',
                fecha, // Usamos la fecha corregida
                item.responsable || 'DEP. MÚSICA',
                item.tipo || '',
                item.dimensiones || '',
                item.otras_caracteristicas || ''
            ];

            await client.query(query, values);
        }

        await client.query('COMMIT');
        res.status(200).json({ message: `Importados ${items.length} instrumentos.` });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error import:', error);
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
};