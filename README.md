# sentra
Installation:
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

Open Port in WSL
PS C:\Windows\System32> netsh interface portproxy add v4tov4 listenport=3000 listenaddress=0.0.0.0 connectport=3000 connectaddress=172.30.234.252

PS C:\Windows\System32> New-NetFirewallRule -DisplayName "NextJS WSL2" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 3000

Entfernen der Einträge:
PS C:\Windows\System32> netsh interface portproxy delete v4tov4 listenport=3000 listenaddress=0.0.0.0
PS C:\Windows\System32> Remove-NetFirewallRule -DisplayName "NextJS WSL2"

Starten von next.js
Start nextjs mit "npm run dev -- -H 0.0.0.0"

