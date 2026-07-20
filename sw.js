var C='copa2026-v24';
var STATIC=['bola_t.png','mascote1_t.png','mascote2_t.png','mascote3_t.png','logo_globo.png','logo_sportv.png','logo_cazetv.png','logo_sbt.png','logo_nsports.png','logo_globoplay.png','logo_getv.png'];
var DATA=['players.json','photos.json'];

// Install: prÃ©-cachear assets estÃ¡ticos
self.addEventListener('install',function(e){
  e.waitUntil(
    // Fix 2026-07-08: 'index.html' nunca era precacheado, entao o fallback offline em
    // caches.match('index.html') (na estrategia de navegacao abaixo) nunca encontrava nada --
    // ficando sem efeito nenhum se o usuario abrisse o app sem internet. Adicionado ao
    // precache junto com os demais assets estaticos (so serve de fallback; a navegacao normal
    // sempre tenta rede primeiro via {cache:'reload'}).
    caches.open(C).then(function(c){return c.addAll(STATIC.concat(['index.html']));}).then(function(){return self.skipWaiting();})
  );
});

// Activate: limpar caches antigos
self.addEventListener('activate',function(e){
  e.waitUntil(
    caches.keys().then(function(ks){
      return Promise.all(ks.filter(function(k){return k!==C;}).map(function(k){return caches.delete(k);}));
    }).then(function(){return self.clients.claim();}).then(function(){return self.clients.matchAll().then(function(clients){clients.forEach(function(c){c.postMessage({type:'SW_UPDATED'})})})})
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

  // Demais requests (FIFA API, imagens externas, Worker do bolao): Network First.
  // O fallback para index.html SO se aplica a navegacoes de pagina (e.request.mode==='navigate'),
  // nunca a chamadas de API/fetch programatico -- antes, qualquer falha de rede numa chamada
  // cross-origin (ex: Worker do bolao ou API da FIFA) era silenciosamente substituida pelo HTML
  // da pagina, fazendo o codigo que espera JSON falhar de forma confusa ao tentar fazer parse.
  // Agora, chamadas de API que falham simplesmente propagam o erro de rede normalmente.
  if(e.request.mode==='navigate'){
    // Fix 2026-07-07: GitHub Pages serve index.html com Cache-Control: max-age=600.
    // fetch(e.request) puro respeitava esse cache HTTP do navegador, entao "network-first"
    // podia devolver uma copia local de ate 10 min atras sem nem tentar a rede -- o usuario
    // via a versao antiga mesmo apos um F5 dentro dessa janela. {cache:'reload'} forca o
    // fetch a ignorar o cache HTTP e sempre buscar a versao atual do servidor.
    e.respondWith(
      fetch(e.request,{cache:'reload'}).catch(function(){return caches.match('index.html');})
    );
    return;
  }
  e.respondWith(fetch(e.request));
});

