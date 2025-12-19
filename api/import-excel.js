// api/import-excel.js
const pool = require('./db');

module.exports = async (req, res) => {
    // Configuración CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const items = req.body; // Array de instrumentos
    
    if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'No se enviaron datos válidos.' });
    }

    const client = await pool.connect();

    try {
        // INICIAR TRANSACCIÓN (Todo o nada)
        await client.query('BEGIN');

        const query = `
            INSERT INTO instrumentos 
            (codigo_patrimonial, nombre, marca, modelo, serie, color, estado, situacion, ubicacion, anio_ingreso, valor, procedencia, observaciones, fecha_adquisicion, responsable, tipo, dimensiones, otras_caracteristicas, imagen_url) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, '')
        `;

        // Iterar e insertar cada fila
        for (const item of items) {
            // Sanitizar datos para evitar errores
            const anio = (item.anio_ingreso && !isNaN(parseInt(item.anio_ingreso))) ? parseInt(item.anio_ingreso) : null;
            const val = (item.valor && !isNaN(parseFloat(item.valor))) ? parseFloat(item.valor) : 0;
            const fecha = new Date().toISOString().split('T')[0]; // Fecha actual como registro

            const values = [
                item.codigo_patrimonial || '',
                item.nombre || 'SIN NOMBRE',
                item.marca || '',
                item.modelo || '',
                item.serie || '',
                item.color || '',
                item.estado || 'REGULAR',      // Por defecto
                item.situacion || 'Uso',       // Por defecto
                item.ubicacion || 'ALMACEN',
                anio,
                val,
                item.procedencia || '',
                item.observaciones || '',
                fecha,
                item.responsable || 'DEP. MÚSICA',
                item.tipo || '',
                item.dimensiones || '',
                item.otras_caracteristicas || ''
            ];

            await client.query(query, values);
        }

        // CONFIRMAR TRANSACCIÓN
        await client.query('COMMIT');
        res.status(200).json({ message: `Se importaron ${items.length} instrumentos correctamente.` });

    } catch (error) {
        // SI ALGO FALLA, DESHACER TODO
        await client.query('ROLLBACK');
        console.error('Error importación masiva:', error);
        res.status(500).json({ error: 'Error al importar: ' + error.message });
    } finally {
        client.release();
    }
};