// api/update-instrument.js
const pool = require('./db');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { id, nombre, marca, modelo, serie, estado, fecha_adquisicion, origen, ubicacion, imagen_url } = req.body;

  try {
    const query = `
      UPDATE instrumentos 
      SET nombre=$1, marca=$2, modelo=$3, serie=$4, estado=$5, fecha_adquisicion=$6, origen=$7, ubicacion=$8, imagen_url=$9
      WHERE id=$10 
      RETURNING *`;
    
    const values = [nombre, marca, modelo, serie, estado, fecha_adquisicion, origen, ubicacion, imagen_url, id];
    
    const result = await pool.query(query, values);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Instrumento no encontrado' });
    }

    res.status(200).json(result.rows[0]);

  } catch (error) {
    console.error('Error actualizando:', error);
    res.status(500).json({ error: 'Error al actualizar el instrumento' });
  }
};