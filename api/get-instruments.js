// api/get-instruments.js
const pool = require('./db');

module.exports = async (req, res) => {
  // Configuración de CORS para permitir peticiones desde cualquier lado
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  try {
    // Consulta SQL: Traer todo ordenado por ID descendente
    const result = await pool.query('SELECT * FROM instrumentos ORDER BY id DESC');
    
    // Responder con los datos en formato JSON
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error obteniendo instrumentos:', error);
    res.status(500).json({ error: 'Error al conectar con la base de datos' });
  }
};