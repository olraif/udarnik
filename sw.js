const CACHE = 'udarnik-pwa-0.3.5-1';
const files = [
  './', './index.html', './style.css', './app.js', './journey.js', './research.js', './manifest.webmanifest',
  ...['words.json','before.json','after.json','icon-180.png','icon-192.png','icon-512.png','journey_map.webp',
      ...Array.from({length:8},(_,i)=>'journey_bear_'+i+'.webp'),
      ...Array.from({length:8},(_,i)=>'journey_place_'+i+'.webp')].map(name=>'./assets/'+name),
];
const scope = new URL(self.registration.scope);
const urls = new Set(files.map(file => new URL(file,scope).href));
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(files)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key=>key.startsWith('udarnik-pwa-')&&key!==CACHE)
    .map(key=>caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  if(event.request.method!=='GET')return;
  const address=new URL(event.request.url);
  if(address.origin!==scope.origin||!address.pathname.startsWith(scope.pathname))return;
  if(event.request.mode==='navigate') {
    event.respondWith(fetch(event.request).catch(()=>caches.match('./index.html',{cacheName:CACHE})));
  } else if(urls.has(address.href)) {
    event.respondWith(caches.match(event.request,{cacheName:CACHE}).then(hit=>hit||fetch(event.request)));
  }
});
