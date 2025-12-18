// api/db.js
const { Pool } = require('pg');

// Crea la conexión usando la variable de entorno
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Necesario para que Neon acepte la conexión
  }
});

module.exports = pool;