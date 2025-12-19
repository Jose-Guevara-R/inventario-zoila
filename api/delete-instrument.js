// api/delete-instrument.js
const pool = require('./db');

module.exports = async (req, res) => {
    // 1. Configurar CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'DELETE, OPTIONS'); // Permitir DELETE
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // 2. Obtener el ID de la URL (ej: ?id=15)
    const { id } = req.query;

    if (!id) {
        return res.status(400).json({ error: 'Falta el ID del instrumento' });
    }

    try {
        // 3. Ejecutar borrado
        const query = 'DELETE FROM instrumentos WHERE id = $1 RETURNING *';
        const result = await pool.query(query, [id]);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Instrumento no encontrado' });
        }

        res.status(200).json({ message: 'Instrumento eliminado correctamente', deleted: result.rows[0] });

    } catch (error) {
        console.error('Error eliminando:', error);
        res.status(500).json({ error: 'Error al eliminar: ' + error.message });
    }
};