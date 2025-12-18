// api/add-instrument.js
const pool = require('./db');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Manejar la pre-verificación (OPTIONS) del navegador
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { nombre, marca, modelo, serie, estado, fecha_adquisicion, origen, ubicacion, imagen_url } = req.body;

  try {
    const query = `
      INSERT INTO instrumentos 
      (nombre, marca, modelo, serie, estado, fecha_adquisicion, origen, ubicacion, imagen_url) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
      RETURNING *`;
    
    const values = [nombre, marca, modelo, serie, estado, fecha_adquisicion, origen, ubicacion, imagen_url];
    
    const result = await pool.query(query, values);
    res.status(201).json(result.rows[0]);

  } catch (error) {
    console.error('Error guardando instrumento:', error);
    res.status(500).json({ error: 'No se pudo guardar el instrumento' });
  }
};