const CACHE = 'barbershifts-v1'
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/pwa-192x192.svg',
  '/pwa-512x512.svg',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(STATIC_ASSETS))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // Supabase API → NetworkFirst (red con fallback a cache)
  if (url.hostname.includes('supabase.co')) {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          const clone = res.clone()
          caches.open(CACHE).then((cache) => cache.put(event.request, clone))
          return res
        })
        .catch(() => caches.match(event.request))
    )
    return
  }

  // Assets estáticos → CacheFirst
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  )
})
