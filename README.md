# sentra
#### Node Modules:
```
$ npx create-next-app@latest
$ npm install axios
$ npm install --save-dev @types/axios
$ npm install react-leaflet 
$ npm install --save-dev @types/leaflet
$ npm install postgres
$ npm install @types/serpapi
$ npm install openai
$ npm install openmeteo
$ npm install cloudinary
$ npm install rehype-slug
$ npm install react-markdown
$ npm install remark-gfm
$ npm install jsonwebtoken
$ npm install --save-dev @types/jsonwebtoken
$ npm install weather-icons
$ npm install mqtt
$ npm install hls.js
```

##### Open Port in WSL
```
PS C:\Windows\System32> netsh interface portproxy add v4tov4 listenport=3000 listenaddress=0.0.0.0 connectport=3000 connectaddress=172.30.234.252

PS C:\Windows\System32> New-NetFirewallRule -DisplayName "NextJS WSL2" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 3000
```

##### Entfernen der Einträge:
```
PS C:\Windows\System32> netsh interface portproxy delete v4tov4 listenport=3000 listenaddress=0.0.0.0
PS C:\Windows\System32> Remove-NetFirewallRule -DisplayName "NextJS WSL2"
```

Export der Tabelle 
\copy day_meanings TO '~/dci_training/websites/project_Abschlussprojekt_final/day_meanings_export.csv' WITH (FORMAT CSV, HEADER);

Import der Tabelle
\copy day_meanings FROM '~/dci_training/websites/project_Abschlussprojekt_final/day_meanings_export.csv' WITH (FORMAT CSV, HEADER);

##### Starten von next.js
##### Start nextjs mit "npm run dev -- -H 0.0.0.0"

