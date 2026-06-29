// Service worker mínimo de ClipOps.
// Su propósito principal es habilitar la instalación de la PWA (el navegador
// exige un SW con manejador de fetch). Estrategia: network-first con fallback
// a caché para que, si te quedas sin señal, al menos cargue lo ya visitado.
const CACHE = "clipops-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  // Solo cacheamos GET del mismo origen; nunca API ni vídeo (van siempre a red).
  if (
    request.method !== "GET" ||
    new URL(request.url).origin !== self.location.origin ||
    request.url.includes("/api/")
  ) {
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(request, copy));
        return response;
      })
      .catch(() => caches.match(request))
  );
});
