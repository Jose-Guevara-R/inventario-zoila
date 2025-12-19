const CACHE_NAME = "inventario-v1";
const urlsToCache = [
  "/",
  "/index.html",
  "/registro.html",
  "/login.html",
  "/styles.css",
  "/js/app.js",
  "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js",
  "https://cdn.jsdelivr.net/npm/browser-image-compression@2.0.2/dist/browser-image-compression.js",
  "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"
];

// 1. Instalación: Guardamos los archivos estáticos
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
});

// 2. Activación: Limpiamos cachés viejas
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// 3. Intercepción de peticiones (Network First)
// Intentamos ir a internet primero (para tener datos frescos), si falla, usamos caché.
self.addEventListener("fetch", (event) => {
  // Solo cacheamos peticiones GET (no las de guardar/editar)
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Si la respuesta es válida, la guardamos en caché para el futuro (opcional)
        // Pero para datos de inventario preferimos frescura.
        return response;
      })
      .catch(() => {
        // Si no hay internet, intentamos servir desde la caché
        return caches.match(event.request);
      })
  );
});