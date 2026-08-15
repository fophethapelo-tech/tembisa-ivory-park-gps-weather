from pathlib import Path
p=Path('index.html')
s=p.read_text(encoding='utf-8')
# Add navigator name field once.
old='<select id="travelMode"><option value="car">🚗 Driving</option><option value="foot">🚶 Walking</option></select><input id="destination"'
new='<input id="navigatorName" autocomplete="name" placeholder="Driver / pedestrian name (optional)"><select id="travelMode"><option value="car">🚗 Driving</option><option value="foot">🚶 Walking</option></select><input id="destination"'
if 'id="navigatorName"' not in s:
    s=s.replace(old,new,1)
needle="async function searchPlaces(q){"
if 'function formatAddress(' not in s:
    insert="""function formatAddress(x){const a=x.address||{};const parts=[];if(a.house_number)parts.push(a.house_number);if(a.road)parts.push(a.road);const area=a.suburb||a.neighbourhood||a.quarter;if(area)parts.push(area);const city=a.city||a.town||a.municipality||a.village;if(city)parts.push(city);if(a.state)parts.push(a.state);return parts.length>=2?parts.join(', '):(x.display_name||'Address');}\n"""
    s=s.replace(needle,insert+needle,1)
s=s.replace("format:'jsonv2',limit:'8',countrycodes:'za',addressdetails:'1',dedupe:'1',q:q", "format:'jsonv2',limit:'8',countrycodes:'za',addressdetails:'1',dedupe:'1',q:q,layer:'address,poi,highway'")
s=s.replace("${x.display_name}<small>${x.type||'address'}", "${formatAddress(x)}<small>${x.type||'address'}")
s=s.replace("destination={lat:+x.lat,lon:+x.lon,name:x.display_name}", "destination={lat:+x.lat,lon:+x.lon,name:formatAddress(x)}")
if 'function navSpeak(' not in s:
    marker="function speak(text,force=false){"
    start=s.find(marker);end=s.find('\n',start)
    wrapper="function navSpeak(text,force=false){const n=($('navigatorName')?.value||'').trim();speak(n?(n+', '+text):text,force)}"
    s=s[:end+1]+wrapper+s[end+1:]
    s=s.replace("speak(s.maneuver?.instruction||s.name||'Continue')", "navSpeak(s.maneuver?.instruction||s.name||'Continue')")
    s=s.replace("speak('You have arrived at your destination.')", "navSpeak('You have arrived at your destination.')")
    s=s.replace("speak($('travelMode').value==='foot'?'Walking navigation started.':'Navigation started.')", "navSpeak($('travelMode').value==='foot'?'Walking navigation started.':'Navigation started.')")
if 'navigatorName' not in s[s.find("$('saveSettings')"):]:
    s=s.replace("localStorage.setItem('voice',$('voiceSetting').value);", "localStorage.setItem('voice',$('voiceSetting').value);localStorage.setItem('navigatorName',$('navigatorName').value.trim());")
    s=s.replace("const u=localStorage.getItem('unit'),v=localStorage.getItem('voice');", "const u=localStorage.getItem('unit'),v=localStorage.getItem('voice'),n=localStorage.getItem('navigatorName');")
    s=s.replace("if(v)$('voiceSetting').value=v;", "if(v)$('voiceSetting').value=v;if(n)$('navigatorName').value=n;")
p.write_text(s,encoding='utf-8')
