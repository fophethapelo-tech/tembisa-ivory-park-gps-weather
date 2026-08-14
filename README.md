# Tembisa & Ivory Park GPS Weather — Nationwide

A South Africa-wide installable PWA for GPS, weather, maps, destination search and browser voice navigation.

## Features
- Nationwide destination search for towns, suburbs, streets, street numbers, addresses and landmarks
- Type a destination or use voice destination selection
- Spoken route distance, ETA, road/street names and turn instructions
- GPS live route monitoring
- Street and satellite map modes
- Pedestrian and driver modes
- Mapped traffic-light, stop-sign, crossing and pothole warnings where OpenStreetMap data is available
- Community hazard reporting interface (local device storage until a shared backend is connected)
- Nearby schools, churches, clinics, police, petrol stations, shops, ATMs and transport stops
- Weather and local area search
- Driver safety reminder: seat belt, no drinking and driving, put the phone down, obey signs and speed limits
- Installable Chrome PWA support over HTTPS
- Search-engine metadata, robots.txt and sitemap.xml

## Important data note
Live traffic, accidents and crime/hijacking reports are not invented. Real shared live reports require a dedicated backend and trusted data sources. The current release uses mapped road features and a local community-report interface.

## Publishing
Upload all files in this folder to the root of the GitHub Pages repository and publish the `main` branch. The default GitHub Pages URL is:
https://fophethapelo-tech.github.io/tembisa-ivory-park-gps-weather/

Chrome installation requires HTTPS and a valid web app manifest/service worker. Search-engine discovery is not instantaneous and cannot be guaranteed simply by publishing; the sitemap and metadata help crawlers find the site.
