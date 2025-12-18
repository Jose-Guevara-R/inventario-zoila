// api/index.js

// 1. IMPORTANTE: Cargar dotenv ANTES de importar cualquier archivo de base de datos
require('dotenv').config();

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

// Importar funciones de API (ahora sí leerán el .env correctamente)
const getInstruments = require('./get-instruments');
const addInstrument = require('./add-instrument');
// const updateInstrument = require('./update-instrument'); 

const server = http.createServer((req, res) => {
    // 2. HELPER: "Enseñar" a Node.js nativo a usar .status() y .json()
    // Esto hace que el código sea compatible con Vercel y Express sin instalar nada extra.
    res.status = function (code) {
        this.statusCode = code;
        return this; // Permite encadenar .json()
    };

    res.json = function (data) {
        this.setHeader('Content-Type', 'application/json');
        this.end(JSON.stringify(data));
    };

    const parsedUrl = url.parse(req.url, true);

    // Configuración CORS manual para desarrollo local
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Manejar pre-vuelo de CORS (necesario para navegadores modernos)
    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    // 3. Rutas de la API (Backend)
    if (parsedUrl.pathname === '/api/get-instruments' && req.method === 'GET') {
        return getInstruments(req, res);
    }
    
    if (parsedUrl.pathname === '/api/add-instrument' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            try {
                req.body = JSON.parse(body);
            } catch (e) {
                req.body = {};
            }
            return addInstrument(req, res);
        });
        return;
    }

    // 4. Servir Archivos Estáticos (Frontend)
    // Ajustamos la ruta para asegurar que busque en la carpeta 'public' correctamente
    let filePath = path.join(__dirname, '../public', parsedUrl.pathname === '/' ? 'index.html' : parsedUrl.pathname);
    
    const extname = path.extname(filePath);
    let contentType = 'text/html';
    if (extname === '.css') contentType = 'text/css';
    if (extname === '.js') contentType = 'text/javascript';
    if (extname === '.png') contentType = 'image/png';
    if (extname === '.jpg') contentType = 'image/jpeg';

    fs.readFile(filePath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                // Si no encuentra el archivo, devuelve 404
                res.writeHead(404);
                res.end(`Página no encontrada: ${parsedUrl.pathname}`);
            } else {
                res.writeHead(500);
                res.end(`Error servidor: ${err.code}`);
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
    console.log(`Base de datos configurada: ${process.env.DATABASE_URL ? 'SÍ' : 'NO (Revisa tu .env)'}`);
});