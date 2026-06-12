var C='copa2026-v19';
var STATIC=['bola_t.png','mascote1_t.png','mascote2_t.png','mascote3_t.png','logo_globo.png','logo_sportv.png','logo_cazetv.png','logo_sbt.png','logo_nsports.png','logo_globoplay.png','logo_getv.png','index.html'];
var DATA=['players.json','photos.json'];

// Install: pré-cachear assets estáticos
self.addEventListener('install',function(e){
  e.waitUntil(
    caches.open(C).then(function(c){return c.addAll(STATIC);}).then(function(){return self.skipWaiting();})
  );
});

// Activate: limpar caches antigos
self.addEventListener('activate',function(e){
  e.waitUntil(
    caches.keys().then(function(ks){
      return Promise.all(ks.filter(function(k){return k!==C;}).map(function(k){return caches.delete(k);}));
    }).then(function(){return self.clients.claim();})
  );
});

self.addEventListener('fetch',function(e){
  var url=e.request.url;
  if(url.endsWith('/sw.js'))return;

  // Assets estaticos: Cache First (exceto index.html, que usa network-first)
  if(STATIC.some(function(a){return url.endsWith(a);}) && !url.endsWith('index.html')){
    e.respondWith(caches.match(e.request).then(function(r){return r||fetch(e.request);}));
    return;
  }

  // Dados JSON (players.json, photos.json): Stale-While-Revalidate
  // Serve do cache imediatamente enquanto atualiza em background
  if(DATA.some(function(d){return url.endsWith(d);})){
    e.respondWith(
      caches.open(C).then(function(cache){
        return cache.match(e.request).then(function(cached){
          var fetchPromise=fetch(e.request).then(function(res){
            if(res.ok)cache.put(e.request,res.clone());
            return res;
          }).catch(function(){return null;});
          return cached||fetchPromise;
        });
      })
    );
    return;
  }

  // Demais requests (FIFA API, imagens externas): Network First com fallback
  e.respondWith(
    fetch(e.request).catch(function(){return caches.match('index.html');})
  );
});
