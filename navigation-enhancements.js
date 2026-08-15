(function(){
  const $=id=>document.getElementById(id);
  function speak(text,force){if(!force&&$('voiceSetting')&&$('voiceSetting').value==='off')return;if(!('speechSynthesis'in window))return;speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang='en-ZA';u.rate=.9;u.volume=1;speechSynthesis.speak(u)}
  function navSpeak(text,force){const n=(localStorage.getItem('navigatorName')||'').trim();speak(n?n+', '+text:text,force)}
  const nav=$('navigatorName');
  let names=[];
  try{names=JSON.parse(localStorage.getItem('navigatorNames')||'[]');if(!Array.isArray(names))names=[]}catch(e){names=[]}
  function saveNames(){localStorage.setItem('navigatorNames',JSON.stringify(names));}
  function renderNames(){
    let box=$('savedNavigatorNames');if(!box||!nav)return;
    box.innerHTML='';
    if(!names.length){box.innerHTML='<div class="small">No saved names yet.</div>';return}
    const title=document.createElement('div');title.className='small';title.textContent='Saved names — tap a name to use it';box.appendChild(title);
    names.forEach((name,i)=>{const row=document.createElement('div');row.style.display='flex';row.style.gap='8px';row.style.marginTop='6px';const use=document.createElement('button');use.type='button';use.textContent=name;use.style.marginTop='0';use.style.flex='1';use.onclick=()=>{nav.value=name;localStorage.setItem('navigatorName',name);renderNames()};const del=document.createElement('button');del.type='button';del.textContent='✕';del.style.marginTop='0';del.style.width='52px';del.onclick=()=>{names.splice(i,1);saveNames();if(localStorage.getItem('navigatorName')===name)localStorage.removeItem('navigatorName');renderNames()};row.append(use,del);box.appendChild(row)})
  }
  if(nav){
    const wrap=nav.parentElement;
    if(!document.getElementById('saveNavigatorName')){
      const b=document.createElement('button');b.id='saveNavigatorName';b.type='button';b.textContent='💾 Save Name';b.style.gridColumn='1 / -1';
      b.onclick=()=>{const n=nav.value.trim();if(!n){speak('Please enter a driver or pedestrian name.');return}if(!names.some(x=>x.toLowerCase()===n.toLowerCase()))names.push(n);localStorage.setItem('navigatorName',n);saveNames();renderNames();speak(n+' has been saved.');};wrap.appendChild(b)
    }
    if(!document.getElementById('savedNavigatorNames')){const box=document.createElement('div');box.id='savedNavigatorNames';box.style.gridColumn='1 / -1';wrap.appendChild(box)}
    const saved=localStorage.getItem('navigatorName');if(saved&&!nav.value)nav.value=saved;renderNames();
  }

  /* Live navigation: use a separate road-snapped marker so the visible vehicle/person follows the road. */
  let liveActive=false,liveWatch=null,liveMarker=null,lastSnap=0,lastLiveFollow=0;
  const style=document.createElement('style');style.textContent='.moving{display:none!important}.live-moving{font-size:30px;line-height:30px;text-align:center;filter:drop-shadow(0 2px 2px #0006)}';document.head.appendChild(style);
  function liveIcon(){return L.divIcon({className:'live-moving',html:$('travelMode')?.value==='foot'?'🚶':'🚗',iconSize:[40,40],iconAnchor:[20,20]})}
  async function snap(lat,lon){
    try{
      const r=await fetch(`https://router.project-osrm.org/nearest/v1/driving/${lon},${lat}?number=1`);if(!r.ok)throw Error();const d=await r.json();return d.waypoints?.[0]?.location?[d.waypoints[0].location[1],d.waypoints[0].location[0]]:[lat,lon]
    }catch(e){return [lat,lon]}
  }
  function ensureLiveMarker(lat,lon){if(!window.map||!window.L)return;const pos=L.latLng(lat,lon);if(!liveMarker)liveMarker=L.marker(pos,{icon:liveIcon(),zIndexOffset:1000,title:'Live navigation position'}).addTo(window.map);else{liveMarker.setLatLng(pos);liveMarker.setIcon(liveIcon())}}
  async function livePosition(p){if(!liveActive)return;let lat=p.coords.latitude,lon=p.coords.longitude;if($('travelMode')?.value==='car'&&Date.now()-lastSnap>1200){lastSnap=Date.now();const s=await snap(lat,lon);lat=s[0];lon=s[1]}ensureLiveMarker(lat,lon);if(window.map&&Date.now()-lastLiveFollow>700){lastLiveFollow=Date.now();window.map.setView([lat,lon],Math.max(window.map.getZoom(),17),{animate:true,duration:.35})}}
  function startLive(){
    liveActive=true;if(liveWatch!==null)navigator.geolocation.clearWatch(liveWatch);if(navigator.geolocation)liveWatch=navigator.geolocation.watchPosition(livePosition,()=>{}, {enableHighAccuracy:true,maximumAge:500,timeout:10000});
  }
  function stopLive(){liveActive=false;if(liveWatch!==null){navigator.geolocation.clearWatch(liveWatch);liveWatch=null}if(liveMarker&&window.map){window.map.removeLayer(liveMarker);liveMarker=null}}
  $('startRoute')?.addEventListener('click',()=>setTimeout(()=>{startLive()},300));
  $('stopRoute')?.addEventListener('click',()=>stopLive());
  $('travelMode')?.addEventListener('change',()=>{if(liveMarker)liveMarker.setIcon(liveIcon())});

  /* Voice discipline: do not add a second stream of turn-by-turn speech. The main navigator speaks turns; this layer only gives a single safety/hazard reminder when the visible route warning changes. */
  let lastHazard='',lastHazardAt=0;
  setInterval(()=>{
    try{
      if(!liveActive||!window.map)return;
      const text=($('routeStatus')?.textContent||'').toLowerCase();
      if(/route calculation failed|navigation stopped|arrived/.test(text)){lastHazard='';return}
      const alerts=[...document.querySelectorAll('#alerts .alert')].map(x=>x.textContent.replace(/^⚠️\s*/,'').trim());
      const hazard=alerts[0]||'';if(!hazard)return;
      if(hazard!==lastHazard&&Date.now()-lastHazardAt>12000){lastHazard=hazard;lastHazardAt=Date.now();navSpeak(hazard)}
    }catch(e){}
  },1500);
})();
