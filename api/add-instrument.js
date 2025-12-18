const pool = require('./db');

module.exports = async (req, res) => {
  // Headers CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { 
      nombre, marca, modelo, serie, estado, fecha_adquisicion, ubicacion, imagen_url,
      codigo_patrimonial, tipo, color, dimensiones, otras_caracteristicas, situacion, observaciones, responsable,
      // Campos que pueden cambiar de nombre o venir vacíos
      origen, procedencia, anio_ingreso, valor 
    } = req.body;

    // 1. SANITIZACIÓN DE DATOS (Evita el Error 500)
    // Si viene vacío "", lo convertimos a NULL o 0
    const anioSeguro = (anio_ingreso === '' || anio_ingreso === undefined) ? null : parseInt(anio_ingreso);
    const valorSeguro = (valor === '' || valor === undefined) ? 0.00 : parseFloat(valor);
    
    // Usamos 'procedencia' o 'origen' indistintamente (mapeo seguro)
    const procedenciaFinal = procedencia || origen || '';

    const query = `
      INSERT INTO instrumentos 
      (nombre, marca, modelo, serie, estado, fecha_adquisicion, procedencia, ubicacion, imagen_url,
       codigo_patrimonial, anio_ingreso, valor, tipo, color, dimensiones, otras_caracteristicas, situacion, observaciones, responsable) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19) 
      RETURNING *`;
    
    const values = [
      nombre, marca, modelo, serie, estado, fecha_adquisicion, procedenciaFinal, ubicacion, imagen_url,
      codigo_patrimonial, anioSeguro, valorSeguro, tipo, color, dimensiones, otras_caracteristicas, situacion, observaciones, responsable
    ];
    
    const result = await pool.query(query, values);
    res.status(201).json(result.rows[0]);

  } catch (error) {
    console.error('Error detallado guardando:', error); // Verás el error real en la terminal
    res.status(500).json({ error: 'Error al guardar: ' + error.message });
  }
};