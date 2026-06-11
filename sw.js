var C='copa2026-v2';
var FILES=['./','./index.html','./copa2026.html','./bola_t.png','./mascote1_t.png','./mascote2_t.png','./mascote3_t.png','./logo_globo.png','./logo_sportv.png','./logo_cazetv.png','./logo_sbt.png','./logo_nsports.png'];
self.addEventListener('install',function(e){e.waitUntil(caches.open(C).then(function(c){return c.addAll(FILES)}).then(function(){return self.skipWaiting()}))});
self.addEventListener('activate',function(e){e.waitUntil(caches.keys().then(function(ks){return Promise.all(ks.filter(function(k){return k!==C}).map(function(k){return caches.delete(k)}))}).then(function(){return self.clients.claim()}))});
self.addEventListener('fetch',function(e){e.respondWith(caches.match(e.request).then(function(r){return r||fetch(e.request)}).catch(function(){return caches.match('./index.html')}))});
