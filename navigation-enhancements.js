(function(){
  const $=id=>document.getElementById(id);
  const wait=ms=>new Promise(r=>setTimeout(r,ms));
  function speak(text,force){if(!force&&$('voiceSetting')&&$('voiceSetting').value==='off')return;if(!('speechSynthesis'in window))return;speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang='en-ZA';u.rate=.9;u.volume=1;speechSynthesis.speak(u)}
  function navSpeak(text,force){const n=(localStorage.getItem('navigatorName')||$('navigatorName')?.value||'').trim();speak(n?n+', '+text:text,force)}

  // Save the driver/pedestrian name and reuse it for future navigation sessions.
  const nav=$('navigatorName');
  if(nav){
    const wrap=nav.parentElement;
    if(!document.getElementById('saveNavigatorName')){
      const b=document.createElement('button');b.id='saveNavigatorName';b.type='button';b.textContent='💾 Save Driver / Pedestrian Name';b.style.gridColumn='1 / -1';
      b.onclick=()=>{const n=nav.value.trim();if(n){localStorage.setItem('navigatorName',n);speak(n+', your name has been saved for navigation')}else{localStorage.removeItem('navigatorName');speak('Saved navigation name cleared.')}};
      wrap.appendChild(b);
    }
    const saved=localStorage.getItem('navigatorName');if(saved&&!nav.value)nav.value=saved;
  }

  // Improve address search for house-number + street searches without removing the existing landmark search.
  try{
    const oldSearchPlaces=searchPlaces;
    searchPlaces=async function(q){
      const base=await oldSearchPlaces(q);
      const m=q.trim().match(/^(\d+[A-Za-z]?)[,\s]+(.+)$/);
      if(!m)return base;
      const number=m[1],rest=m[2];
      const queries=[];
      const low=rest.toLowerCase();
      if(low.includes('ivory park'))queries.push({street:number+' '+rest.replace(/\s*,?\s*ivory\s+park.*$/i,'').trim(),city:'Midrand',state:'Gauteng',country:'South Africa'});
      queries.push({street:number+' '+rest.replace(/\s*,?\s*(ivory\s+park|tembisa).*$/i,'').trim(),city:low.includes('tembisa')?'Tembisa':'Midrand',state:'Gauteng',country:'South Africa'});
      const extra=[];
      for(const p of queries){
        if(!p.street||p.street.length<3)continue;
        try{
          const u=new URL('https://nominatim.openstreetmap.org/search');
          u.searchParams.set('format','jsonv2');u.searchParams.set('limit','5');u.searchParams.set('countrycodes','za');u.searchParams.set('addressdetails','1');u.searchParams.set('layer','address');
          Object.entries(p).forEach(([k,v])=>u.searchParams.set(k,v));
          const r=await fetch(u);if(r.ok)extra.push(...await r.json());
        }catch(e){}
      }
      const seen=new Set(),merged=[];for(const x of [...extra,...base]){const k=(x.lat+','+x.lon);if(!seen.has(k)){seen.add(k);merged.push(x)}}
      return merged.slice(0,8);
    };
  }catch(e){}

  // Live road-following: keep a short GPS trace and use OSRM map matching to reduce GPS jumps.
  const gpsTrace=[];let lastMatch=0,matching=false;
  const oldUpdateMarker=updateMarker;
  async function mapMatch(){
    if(matching||gpsTrace.length<2)return;
    const now=Date.now();if(now-lastMatch<3000)return;lastMatch=now;matching=true;
    try{
      const pts=gpsTrace.slice(-6),profile=$('travelMode')?.value==='foot'?'foot':'driving';
      const coords=pts.map(p=>p.lon+','+p.lat).join(';');
      const radiuses=pts.map(p=>Math.max(5,Math.min(60,p.acc||15))).join(';');
      let url=`https://router.project-osrm.org/match/v1/${profile}/${coords}?overview=full&geometries=geojson&steps=false&tidy=true&radiuses=${radiuses}`;
      let r=await fetch(url);
      if(!r.ok&&profile==='foot')r=await fetch(`https://router.project-osrm.org/match/v1/driving/${coords}?overview=full&geometries=geojson&steps=false&tidy=true&radiuses=${radiuses}`);
      if(r.ok){const d=await r.json();const tp=d.tracepoints||[];const last=tp[tp.length-1];if(d.code==='Ok'&&last&&last.location){const [lon,lat]=last.location;oldUpdateMarker(lat,lon,pts[pts.length-1].acc);if(typeof map!=='undefined'&&navigating)map.setView([lat,lon],Math.max(map.getZoom(),17),{animate:true,duration:.25});}}
    }catch(e){}finally{matching=false}
  }

  updateMarker=function(lat,lon,acc){
    gpsTrace.push({lat,lon,acc:acc||15,t:Date.now()});if(gpsTrace.length>10)gpsTrace.shift();
    oldUpdateMarker(lat,lon,acc);
    if(typeof map!=='undefined'&&navigating)map.setView([lat,lon],Math.max(map.getZoom(),17),{animate:true,duration:.25});
    mapMatch();
  };

  // More responsive live following and off-route recovery.
  let lastFollow=0,lastReroute=0;
  setInterval(()=>{try{
    if(typeof navigating==='undefined'||!navigating||typeof userPos==='undefined'||!userPos)return;
    const now=Date.now();
    if(typeof map!=='undefined'&&now-lastFollow>700){lastFollow=now;map.panTo([userPos.lat,userPos.lon],{animate:true,duration:.25});}
    if(typeof routeLine!=='undefined'&&routeLine&&now-lastReroute>8000){
      const ll=routeLine.getLatLngs().flat(Infinity).filter(x=>x&&typeof x.lat==='number');let min=Infinity;
      for(let i=1;i<ll.length;i++){
        const a=ll[i-1],b=ll[i];const dx=(b.lng-a.lng)*111320*Math.cos(userPos.lat*Math.PI/180),dy=(b.lat-a.lat)*110540;
        const px=(userPos.lon-a.lng)*111320*Math.cos(userPos.lat*Math.PI/180),py=(userPos.lat-a.lat)*110540;const t=Math.max(0,Math.min(1,(px*dx+py*dy)/(dx*dx+dy*dy||1)));const qx=a.lng+(b.lng-a.lng)*t,qy=a.lat+(b.lat-a.lat)*t;const dd=Math.hypot((userPos.lon-qx)*111320*Math.cos(userPos.lat*Math.PI/180),(userPos.lat-qy)*110540);if(dd<min)min=dd;
      }
      if(min>70&&typeof refreshRoute==='function'&&typeof chosenRoute!=='undefined'){lastReroute=now;chosenRoute=null;navSpeak('You are off the route. Recalculating.');refreshRoute();}
    }
  }catch(e){}},700);

  // Repeat important road warnings by voice while the relevant maneuver is approaching.
  let lastWarn=0,lastWarnText='';
  setInterval(()=>{try{
    if(typeof navigating==='undefined'||!navigating||!routeSteps?.length)return;if(Date.now()-lastWarn<7000)return;
    const s=routeSteps[Math.min(stepIndex||0,routeSteps.length-1)];const x=(((s&&s.name)||'')+' '+((s&&s.ref)||'')+' '+((s&&s.dest)||'')).toLowerCase();let w='';
    if(/motorway|freeway|expressway/.test(x))w='Warning. Freeway or motorway ahead.';else if(/trunk|highway/.test(x))w='Warning. Major highway ahead.';else if(/toll/.test(x))w='Warning. Toll road or toll gate ahead.';else if(/traffic signal|traffic light/.test(x))w='Warning. Traffic signal ahead.';else if(/construction|roadworks|works/.test(x))w='Warning. Road works ahead.';else if(s?.maneuver?.type==='roundabout')w='Warning. Roundabout ahead.';
    if(w&&w!==lastWarnText){lastWarn=Date.now();lastWarnText=w;navSpeak(w)}
  }catch(e){}},1500);
})();
