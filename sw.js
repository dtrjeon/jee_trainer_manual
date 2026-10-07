// JEE 62기 매뉴얼 서비스워커 — 앱 파일은 캐시(오프라인), 구글시트(Q&A) 통신은 항상 네트워크
const CACHE = 'jee62-manual-v3';
const SHELL = ['./', './JEE_62_check.html', './manifest.json', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate', e=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch', e=>{
  const req = e.request, url = new URL(req.url);
  if(req.method !== 'GET' || url.origin !== location.origin) return;   // 구글 GAS·폰트 등 외부 요청은 건드리지 않음
  // 페이지: 네트워크 우선(최신 반영), 실패 시 캐시
  if(req.mode === 'navigate'){
    e.respondWith(fetch(req).then(r=>{ const copy=r.clone(); caches.open(CACHE).then(c=>c.put(req,copy)); return r; })
      .catch(()=>caches.match(req).then(m=>m||caches.match('./JEE_62_check.html'))));
    return;
  }
  // 그 외 정적 파일: 캐시 우선
  e.respondWith(caches.match(req).then(m=>m||fetch(req).then(r=>{ const copy=r.clone(); caches.open(CACHE).then(c=>c.put(req,copy)); return r; })));
});
