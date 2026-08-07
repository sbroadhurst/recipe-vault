// Minimal app-shell cache so the app installs and opens offline.
// API calls to Supabase are never cached - they always hit the network.

const CACHE_NAME = 'recipe-vault-v2'
const APP_SHELL = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './config.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))),
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // Never intercept cross-origin requests (Supabase API, CDN scripts on first load, etc.)
  if (url.origin !== self.location.origin) return
  if (event.request.method !== 'GET') return

  // Network-first: always fetch the latest app shell when online, so
  // updates show up immediately after a redeploy instead of getting
  // stuck on whatever was cached the first time the app was opened.
  // Only fall back to the cached copy when there's no network.
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone()
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
        return response
      })
      .catch(() => caches.match(event.request)),
  )
})
