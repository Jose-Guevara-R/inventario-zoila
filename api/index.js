require('dotenv').config();

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

// Importar funciones de API
const getInstruments = require('./get-instruments');
const addInstrument = require('./add-instrument');
const updateInstrument = require('./update-instrument');

const server = http.createServer((req, res) => {
    // Helpers para respuesta tipo Express
    res.status = function (code) {
        this.statusCode = code;
        return this;
    };
    res.json = function (data) {
        this.setHeader('Content-Type', 'application/json');
        this.end(JSON.stringify(data));
    };

    const parsedUrl = url.parse(req.url, true);

    // CORS (Permisos)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    // --- RUTAS DE API ---

    // 1. GET: Obtener lista
    if (parsedUrl.pathname === '/api/get-instruments' && req.method === 'GET') {
        return getInstruments(req, res);
    }
    
    // 2. POST y PUT: Crear y Actualizar
    if ((parsedUrl.pathname === '/api/add-instrument' && req.method === 'POST') ||
        (parsedUrl.pathname === '/api/update-instrument' && req.method === 'PUT')) {
        
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            try {
                req.body = JSON.parse(body);
            } catch (e) {
                req.body = {};
            }

            if (parsedUrl.pathname === '/api/add-instrument') {
                return addInstrument(req, res);
            }
            if (parsedUrl.pathname === '/api/update-instrument') {
                return updateInstrument(req, res);
            }
        });
        return;
    }

    // --- SERVIR ARCHIVOS ESTÁTICOS (FRONTEND) ---
    // Busca los archivos en la carpeta public
    let filePath = path.join(__dirname, '../public', parsedUrl.pathname === '/' ? 'index.html' : parsedUrl.pathname);
    
    const extname = path.extname(filePath);
    let contentType = 'text/html';
    if (extname === '.css') contentType = 'text/css';
    if (extname === '.js') contentType = 'text/javascript';
    if (extname === '.png') contentType = 'image/png';
    if (extname === '.jpg') contentType = 'image/jpeg';
    if (extname === '.ico') contentType = 'image/x-icon';
    if (extname === '.svg') contentType = 'image/svg+xml';

    fs.readFile(filePath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
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
    console.log(`Base de datos conectada: ${process.env.DATABASE_URL ? 'OK' : 'FALTA .ENV'}`);
});