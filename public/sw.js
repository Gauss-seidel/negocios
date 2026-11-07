const CACHE = 'barbershifts-v2'
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

  // Supabase API y auth: NUNCA cachear (datos privados / multi-tenant)
  const isSupabase = url.hostname.includes('supabase') || url.pathname.includes('/rest/v1/') || url.pathname.includes('/auth/v1/') || url.pathname.includes('/functions/v1/')
  if (isSupabase || event.request.method !== 'GET') {
    event.respondWith(fetch(event.request))
    return
  }

  // Navegacion (HTML): network-first con fallback a cache
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          const clone = res.clone()
          caches.open(CACHE).then((cache) => cache.put(event.request, clone))
          return res
        })
        .catch(() => caches.match('/index.html'))
    )
    return
  }

  // Assets estaticos: cache-first con actualizacion en background
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request).then((res) => {
        if (res && res.status === 200 && res.type === 'basic') {
          const clone = res.clone()
          caches.open(CACHE).then((cache) => cache.put(event.request, clone))
        }
        return res
      }).catch(() => cached)
      return cached || networkFetch
    })
  )
})