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
$ npm install recharts
$ npm install --save-dev @types/recharts
$ npm install react-swipeable-list
$ npm install crypto
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

## API-Key-Authentifizierung für den Auth-Service

Für Requests an `authServer` kann jetzt optional eine Header-basierte Client-Authentifizierung aktiviert werden.

- Header-Format:
  - `x-client-id: <client_id>`
  - `x-api-key: <raw_api_key>`
- `clientId` wird **nicht** im JSON-Body übertragen.
- Wenn `AUTH_CLIENT_ID` und `AUTH_API_KEY` (oder alternativ `AUTH_API_CLIENTS_JSON`) gesetzt sind, erzwingt der Auth-Service diese Header für alle `/api/auth/*`-Routen.
- Die Next.js-App (`sentra`) reicht die Header serverseitig an den Auth-Service weiter, sodass im Browser keine zusätzlichen API-Key-Formulare nötig sind.

Beispiel für mehrere Clients:

```json
AUTH_API_CLIENTS_JSON=[
  {"clientId":"webapp","apiKey":"super-secret"},
  {"clientId":"mobile-app","apiKey":"another-secret"}
]
```

