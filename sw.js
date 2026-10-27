// Service worker gerado por _publicacao-web (pacote_web.ps1) para Ficha D&D v0.17.1.
// Não editar: muda pelo modelo em _publicacao-web\codigo\modelos\sw.js e pelo build.
// Estratégia: rede primeiro, com prazo de 4000 ms; sem rede (ou rede lenta), a cópia guardada.
// Assim, com internet o app abre sempre na versão publicada; sem internet, abre a última que foi aberta.
var CACHE = 'ficha-dnd@0.17.1';   // '@' separa: a limpeza abaixo não alcança o cache de outra página do site
var ARQUIVOS = ['./', 'index.html', 'manifest.webmanifest',
  'icones/icone-192.png', 'icones/icone-512.png', 'icones/icone-512-mascara.png', 'icones/icone-180.png'];
var IGNORAR = [];   // subpastas que têm service worker próprio (outras páginas do mesmo site)
var PRAZO_MS = 4000;

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE)
    .then(function (c) { return c.addAll(ARQUIVOS); })
    .then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys()
    .then(function (nomes) {
      return Promise.all(nomes.filter(function (n) { return n.indexOf('ficha-dnd@') === 0 && n !== CACHE; })
        .map(function (n) { return caches.delete(n); }));
    })
    .then(function () { return self.clients.claim(); }));
});

function ignorado(url) {
  var base = new URL(self.registration.scope).pathname;
  if (url.pathname.indexOf(base) !== 0) return true;
  var resto = url.pathname.substring(base.length);
  return IGNORAR.some(function (p) { return resto === p || resto.indexOf(p + '/') === 0; });
}

function comPrazo(promessa, ms) {
  return new Promise(function (ok, falha) {
    var t = setTimeout(function () { falha(new Error('prazo')); }, ms);
    promessa.then(function (r) { clearTimeout(t); ok(r); }, function (erro) { clearTimeout(t); falha(erro); });
  });
}

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin || ignorado(url)) return;
  var rede = fetch(req).then(function (r) {
    if (r && r.ok) {
      var copia = r.clone();
      caches.open(CACHE).then(function (c) { return c.put(req, copia); });
    }
    return r;
  });
  rede.catch(function () { });   // a falha é tratada abaixo
  e.respondWith(comPrazo(rede, PRAZO_MS).catch(function () {
    return caches.match(req, { ignoreSearch: true }).then(function (r) {
      if (r) return r;
      if (req.mode === 'navigate') {
        return caches.match('index.html').then(function (i) { return i || rede; });
      }
      return rede;
    });
  }));
});
