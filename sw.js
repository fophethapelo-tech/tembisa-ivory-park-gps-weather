const VERSION='tembisa-live-v13';
self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET') return;
  const url=new URL(event.request.url);
  if(url.origin!==location.origin) return;
  if(url.pathname.endsWith('/')||url.pathname.endsWith('/index.html')){
    event.respondWith(fetch(new Request(event.request,{cache:'no-store'})).then(async response=>{
      if(!response.ok)return response;
      const html=await response.text();
      const injection='\n<script src="./nationwide-address-search.js?v=13"></script>\n<script src="./navigation-final-fix.js?v=13"></script>\n<script src="./navigation-enhancements.js?v=13"></script>\n<script src="./free-navigation-engine.js?v=13"></script>\n';
      const body=html.includes('</body>')?html.replace('</body>',injection+'</body>'):html+injection;
      return new Response(body,{status:response.status,statusText:response.statusText,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}});
    }).catch(()=>caches.match(event.request)));
  }
});
