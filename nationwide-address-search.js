/* Nationwide South Africa destination search overlay.
   It intentionally does not hard-code Tembisa or any single mall.
   It searches addresses, house numbers, streets, sections/suburbs, malls,
   shopping centres, recreation centres, parks and other mapped landmarks nationwide. */
(function(){
'use strict';
const $=id=>document.getElementById(id);let timer=null,seq=0,results=[];
const cache=new Map();
function text(x){const a=x.address||{},p=[];if(a.house_number)p.push(a.house_number);if(a.road)p.push(a.road);if(a.suburb||a.neighbourhood||a.quarter)p.push(a.suburb||a.neighbourhood||a.quarter);if(a.city||a.town||a.municipality||a.village)p.push(a.city||a.town||a.municipality||a.village);if(a.state)p.push(a.state);return p.length>1?p.join(', '):(x.display_name||x.name||'South Africa place')}
function photon(f){const p=f.properties||{},a=[];if(p.housenumber)a.push(p.housenumber);if(p.street)a.push(p.street);if(p.locality||p.district)a.push(p.locality||p.district);if(p.city)a.push(p.city);if(p.state)a.push(p.state);return{lat:f.geometry.coordinates[1],lon:f.geometry.coordinates[0],display_name:a.length>1?a.join(', '):(p.name||'South Africa place'),address:{house_number:p.housenumber,road:p.street,suburb:p.locality||p.district,city:p.city,state:p.state},type:p.type||p.osm_value||'place',name:p.name}}
async function search(q){
 const key=q.toLowerCase().trim();if(cache.has(key))return cache.get(key);
 const queries=[q];
 /* Improve common South African address formats without restricting the country to one city. */
 if(/\d+\s+[^,]+/.test(q)&&!/south africa/i.test(q))queries.push(q+', South Africa');
 const nom=queries.map(v=>{const p=new URLSearchParams({format:'jsonv2',q:v,countrycodes:'za',addressdetails:'1',namedetails:'1',dedupe:'1',limit:'10',layer:'address,poi,natural,manmade'});return fetch('https://nominatim.openstreetmap.org/search?'+p).then(r=>r.ok?r.json():[]).catch(()=>[])});
 const ph=queries.map(v=>{const p=new URLSearchParams({q:v,limit:'10',lang:'en'});return fetch('https://photon.komoot.io/api/?'+p).then(r=>r.ok?r.json():{features:[]}).then(d=>(d.features||[]).map(photon)).catch(()=>[])});
 const groups=await Promise.all([...nom,...ph]);const all=groups.flat().filter(x=>x&&x.lat!=null&&x.lon!=null);const seen=new Set();
 const out=all.filter(x=>{const k=(Number(x.lat).toFixed(5)+','+Number(x.lon).toFixed(5));if(seen.has(k))return false;seen.add(k);return true}).sort((a,b)=>{const aa=(a.address?.house_number?10:0)+(a.address?.road?4:0)+(a.name?2:0);const bb=(b.address?.house_number?10:0)+(b.address?.road?4:0)+(b.name?2:0);return bb-aa}).slice(0,15);
 cache.set(key,out);return out;
}
function render(data){results=data;const box=$('suggestions');if(!box)return;box.innerHTML='';if(!data.length){box.innerHTML='<div class="suggestion">No South African match yet. Try: house number + street + section/suburb + town/city.</div>';return}data.forEach((x,i)=>{const d=document.createElement('div');d.className='suggestion';d.dataset.i=i;d.innerHTML='<b>'+text(x)+'</b><small>'+((x.name||x.type||'address')+' • South Africa')+'</small>';box.appendChild(d)})}
function choose(x){const name=text(x);const lat=Number(x.lat),lon=Number(x.lon);window.__nationwideDestination={lat,lon,name};const dest=$('destination');if(dest)dest.value=name;const end=$('endPoint');if(end)end.textContent=name;const box=$('suggestions');if(box)box.innerHTML='';
 try{if(window.destMarker&&window.map){window.map.removeLayer(window.destMarker)}if(window.L&&window.map){window.destMarker=L.marker([lat,lon],{title:'Destination'}).addTo(window.map).bindPopup('Ending point<br>'+name).openPopup();window.map.setView([lat,lon],16,{animate:true})}}catch(e){}
 const rs=$('routeStatus');if(rs){rs.className='status ok';rs.textContent='Destination selected: '+name+'. Start navigation when ready.'}
}
function install(){const dest=$('destination'),box=$('suggestions');if(!dest)return;
 dest.addEventListener('input',function(e){e.stopImmediatePropagation();clearTimeout(timer);const q=dest.value.trim(),s=++seq;if(q.length<2){if(box)box.innerHTML='';return}timer=setTimeout(async()=>{try{const data=await search(q);if(s===seq)render(data)}catch(err){if(box)box.innerHTML='<div class="suggestion">Address search is temporarily unavailable. Check your internet connection.</div>'}},250)},true);
 if(box)box.addEventListener('click',function(e){const el=e.target.closest('.suggestion');if(!el)return;e.preventDefault();e.stopImmediatePropagation();const i=Number(el.dataset.i);if(results[i])choose(results[i])},true);
}
setTimeout(install,0);
})();