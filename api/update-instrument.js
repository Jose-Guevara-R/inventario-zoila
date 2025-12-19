const pool = require('./db');

module.exports = async (req, res) => {
  // Configuración de CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { 
      id, nombre, marca, modelo, serie, estado, fecha_adquisicion, ubicacion, imagen_url,
      codigo_patrimonial, tipo, color, dimensiones, otras_caracteristicas, situacion, observaciones, responsable,
      origen, procedencia, anio_ingreso, valor 
    } = req.body;

    // --- SANITIZACIÓN BLINDADA (AQUÍ ESTÁ LA SOLUCIÓN) ---
    
    // 1. Procedencia: Aceptamos cualquiera de los dos campos
    const procedenciaFinal = procedencia || origen || '';

    // 2. Año de Ingreso: Si es vacío, null, undefined O "NaN", lo volvemos NULL
    let anioSeguro = null;
    if (anio_ingreso && String(anio_ingreso).trim() !== '' && !isNaN(parseInt(anio_ingreso))) {
        anioSeguro = parseInt(anio_ingreso);
    }

    // 3. Valor: Si es vacío, null, undefined O "NaN", lo volvemos 0.00
    let valorSeguro = 0.00;
    if (valor && String(valor).trim() !== '' && !isNaN(parseFloat(valor))) {
        valorSeguro = parseFloat(valor);
    }

    const query = `
      UPDATE instrumentos 
      SET nombre=$1, marca=$2, modelo=$3, serie=$4, estado=$5, fecha_adquisicion=$6, procedencia=$7, ubicacion=$8, imagen_url=$9,
          codigo_patrimonial=$10, anio_ingreso=$11, valor=$12, tipo=$13, color=$14, dimensiones=$15, otras_caracteristicas=$16, 
          situacion=$17, observaciones=$18, responsable=$19
      WHERE id=$20 
      RETURNING *`;
    
    const values = [
      nombre, marca, modelo, serie, estado, fecha_adquisicion, procedenciaFinal, ubicacion, imagen_url,
      codigo_patrimonial, anioSeguro, valorSeguro, tipo, color, dimensiones, otras_caracteristicas, situacion, observaciones, responsable,
      id
    ];
    
    const result = await pool.query(query, values);
    
    if (result.rowCount === 0) return res.status(404).json({ error: 'Instrumento no encontrado' });
    res.status(200).json(result.rows[0]);

  } catch (error) {
    console.error('Error detallado actualizando:', error);
    res.status(500).json({ error: 'Error al actualizar: ' + error.message });
  }
};