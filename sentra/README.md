# Projekt-Dokumentation



## Wetter


## Webcam

### Datenerfassung via MQTT
Für die Datenerfassung dient eine IoT-Endeinheit auf Basis des ESP32, die zur Übertragung von atmosphärischen Telemetriedaten (Temperatur, barometrischer Luftdruck und Luftfeuchtigkeit) optimiert ist. Das System nutzt den Bosch BME280 Sensor und das MQTT-Protokoll (Message Queuing Telemetry Transport), welches für instabile Netzwerkumgebungen und geringen Energieverbrauch optimiert ist, um Daten in Echtzeit an einen zentralen Broker zu übermitteln. Ein ESP32 Mikrocontroller liest die Sensordaten via I2C-Schnittstelle ein.

Hardware-Komponenten

- Mikrocontroller: ESP32 SoC (System-on-a-Chip) mit integriertem Wi-Fi.
- Sensorik: Bosch BME280 (Kombinationssensor für drei Messgrößen).
- Kommunikation: WLAN 802.11 b/g/n, MQTT v3.1.1.
- optional Display

Sensor-Leistungsdaten

| Parameter        | Messbereich         | Genauigkeit   |
|------------------|--------------------|---------------|
| Temperatur       | -40 bis +85 °C     | ±0.5 °C       |
| Luftfeuchtigkeit | 0 bis 100 % RH     | ±3 %          |
| Luftdruck        | 300 bis 1100 hPa   | ±1.0 hPa      |


![BME280 OLED ESP32](./BME280-OLED-ESP32.png)

## Display

### Mosquitto Broker
Der Mosquitto Broker ist ein MQTT-Broker, der das MQTT-Protokoll implementiert. MQTT (Message Queuing Telemetry Transport) ist ein leichtgewichtiges Publish/Subscribe-Protokoll, das speziell für IoT-Anwendungen und die Übertragung von Sensordaten entwickelt wurde. Der Mosquitto Broker empfängt Sensordaten (z.B. von einem Klimasensor) über das MQTT-Protokoll. Clients (wie Sensoren oder andere Geräte) können Daten an bestimmte Topics (z.B. indoor/sensor/climate) senden ("publishen"). Andere Clients (wie das Backend oder das Frontend) können diese Topics abonnieren ("subscriben") und erhalten dann die aktuellen Sensordaten.
Verwendung im Projekt

### mediaMTX Server
Der mediaMTX Server (früher bekannt als rtsp-simple-server) ist ein Streaming-Server, der verschiedene Medienprotokolle wie RTSP, RTMP, HLS und WebRTC unterstützt. Der mediaMTX Server empfängt einen Video-Stream (z.B. von einer Kamera oder einem anderen Encoder) über RTSP oder RTMP. In deinem Projekt wird mediaMTX genutzt, um einen Live-Video-Stream bereitzustellen, der z.B. im Frontend angezeigt werden kann. Die Konfiguration des mediaMTX Servers findest du in stream-server/mediamtx/config.yml. Der Server wird über Docker in docker-compose.yml gestartet.
Das Frontend kann dann den bereitgestellten Stream (z.B. als HLS-URL) einbinden und anzeigen.
Zusammengefasst:
Der mediaMTX Server übernimmt das Empfangen, Umwandeln und Bereitstellen von Live-Video-Streams, sodass diese im Web-Frontend oder anderen Clients angezeigt werden können.

#### https://github.com/iptv-org/iptv
```npm run api:load```- Dateien laden
Dieser Befehl lädt die neuesten Kanaldaten aus dem iptv-org/database Repository in dein lokales Projekt. Danach hast du Zugriff auf Tausende von korrekten tvg-ids, Kategorien (group) und logo_urls in Form von lokalen JSON/CSV-Dateien im Ordner /data oder /api.
```npm run playlist:update```: Prüft die Stream-URLs in den Quelldateien auf Erreichbarkeit.
```npm run playlist:generate```: Erstellt aus den Rohdaten im /streams Ordner die finalen .m3u-Dateien, die du auf GitHub siehst.
Die Playlisten liegen im Ordner /streams 

Erstellen der csv Dateien in WSL Ubuntu:
$ python3 -m venv .venv
$ source .venv/bin/activate
(.venv)$ python3 convert_m3u-to-csv.py de_rakuten.m3u
Erfolg: 'de_rakuten.csv' mit 35 Zeilen erstellt

https://github.com/jnk22/kodinerds-iptv?tab=readme-ov-file
https://github.com/iptv-org/iptv/tree/master/streams

Webcam Link http://localhost:8888/cam/index.m3u8

Github mit TV Kanälen
https://github.com/jnk22/kodinerds-iptv.git

https://zdf-hls-18.akamaized.net/hls/live/2016501/dach/high/master.m3u8
https://sdn-global-live-streaming-packager-cache-aka.3qsdn.com/26658/26658_264_live.m3u8
https://0d26a00dfbb1.airspace-cdn.cbsivideo.com/mtvg18ef/master/mtvg18ef.m3u8
https://1000338copo-app2749759488.r53.cdn.tv1.eu/1000518lf/1000338copo/live/app2749759488/w2928771075/live247.smil/playlist.m3u8
https://zdf-hls-15.akamaized.net/hls/live/2016498/de/high/master.m3u8
https://mcdn.daserste.de/daserste/de/master.m3u8
https://ntv1.akamaized.net/hls/live/2014075/NASA-NTV1-HLS/master.m3u8
https://berlin.alex.cam/stream.m3u8
https://sydneybeach.cam/stream.m3u8
http://194.203.232.201/mjpg/tc2.mjpg

rtsp://admin:L2202183@192.168.2.92:554/cam/realmonitor?channel=1&subtype=0

rtsp://admin:L2202183@192.168.2.92:554/cam/realmonitor?channel=1&subtype=0#backchannel=0

https://visdeurbel.videostreams.nl/hls/visdeurbel/index.m3u8
http://content.jwplatform.com/manifests/vM7nH0Kl.m3u8
https://devimages.apple.com.edgekey.net/streaming/examples/bipbop_16x9/bipbop_16x9_variant.m3u8
https://cdn.livespotting.com/vpu/2g1v2qai/x0etac6e.m3u8
4K-Webcam in Villars-sur-Glâne (Kanton Freiburg) in der Schweiz.
https://live.143b.ch/cam/flux/ts:abr.m3u8



https://www.wirelesshack.org/best-free-m3u-playlist-urls.html

Best Free M3U Playlist URLs 2026
Öffne die Playlist in VLC und exportiere diese in eine Datei.

IPTV Org M3U Playlist URL:
https://iptv-org.github.io/iptv/index.m3u
Samsung TV Plus M3U Playlist URL:
https://apsattv.com/ssungusa.m3u
EPGHub M3U Playlist URL:
https://epghub.xyz/
XUMO M3U Playlist URL:
https://www.apsattv.com/xumo.m3u
Local Now M3U Playlist URL:
https://www.apsattv.com/localnow.m3u
LG Channels M3U Playlist URL:
https://www.apsattv.com/lg.m3u
Pluto TV M3U Playlist URL:
https://i.mjh.nz/PlutoTV/all.m3u8
The Roku Channel M3U Playlist URL:
https://www.apsattv.com/rok.m3u
Redbox TV M3U Playlist URL:
https://www.apsattv.com/redbox.m3u
DistroTV M3U Playlist URL:
https://www.apsattv.com/distro.m3u
Xiaomi M3U Playlist URL:
https://www.apsattv.com/xiaomi.m3u
Free2ViewTV M3U Playlist URL:
https://od.lk/s/MzJfMTY2NzU4NDVf/Free2ViewTV-2021-Master.m3u
Free-TV: M3U Playlist URL
https://raw.githubusercontent.com/Free-TV/IPTV/master/playlist.m3u8
TheTVApp M3U Playlist URL
https://tvpass.org/playlist/m3u
Genre-Specific Playlists URLs (IPTV-org)
IPTV-org also has specific categories that can be added directly

Sports: https://iptv-org.github.io/iptv/categories/sports.m3u
Movies: https://iptv-org.github.io/iptv/categories/movies.m3u
News: https://iptv-org.github.io/iptv/categories/news.m3u
Documentary: https://iptv-org.github.io/iptv/categories/documentary.m3u
Music: https://iptv-org.github.io/iptv/categories/music.m3u

## Events
#### Geospatial Event Intelligence
Die Plattform nutzt eine kartenbasierte Standortvalidierung während der Registrierung, um präzise geografische Koordinaten in der Datenbank zu hinterlegen. Diese Daten bilden die Grundlage für automatisierte Abfragen der Google Events API, wodurch ein hochgradig lokalisierter Event-Feed generiert wird.

#### Kulturelle Kontext-Analyse
Das System aggregiert über die reine Terminplanung hinaus kontextuelle Informationen zur kulturellen und organisatorischen Relevanz des aktuellen Datums. Dies bietet Nutzern eine fundierte Entscheidungsgrundlage für die Tagesplanung unter Berücksichtigung von Feiertagen, Gedenktagen und regionalen Besonderheiten.

#### KI-gestütztes Event-Monitoring via "Sentra"
Für eine personalisierte Erweiterung des Informationsangebots sorgt die proprietäre Komponente von Sentra.
- LLM-basierte Extraktion: Nutzer können spezifische Web-Domains in den Einstellungen hinterlegen.
- Automatisierte Aktualisierung per Cron-Jobs: In einem nächtlichen Prozess analysiert Sentra diese Quellen mittels der OpenAI (ChatGPT).
- Intelligente Datenstrukturierung: Statt simplem Crawling führt die KI eine semantische Analyse der Webseiteninhalte durch, identifiziert relevante Event-Parameter und transformiert unstrukturierte Webdaten in präzise, verwertbare Datenbankeinträge.
 


Installation WebServer

#### Create SSH Keys for deployment
mkdir -p ~/.ssh
chmod 700 ~/.ssh
ssh-keygen -t rsa -b 4096 -C "github-actions@sentra" -f sentra_deploy_key
mkdir -p ~/.ssh
chmod 700 ~/.ssh
cat sentra_deploy_key.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
In die Deploy Keys eines Repositories kommt ausschließlich der Public Key
Der SSH_PRIVATE_KEY in den GitHub Secrets ist der „digitale Haustürschlüssel“, 
den der GitHub-Bot (GitHub Actions) benutzt, um sich auf deinem Ubuntu-Server einzuloggen.

#### Install node and npm
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt install -y nodejs
node -v
nmp -v
sudo apt install -y git build-essential

#### Create key pair (In die GitHub User Settings (SSH and GPG keys) kommt immer nur der Public Key, damit funktioniert der Clone
ssh-keygen -t ed25519 -C "deploy@v124" -f ~/.ssh/id_ed25519
cat id_ed25519.pub

#### Clone repository
git clone git@github.com:Ralfhgw/sentra.git

#### Enable Firewall
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
sudo ufw status

#### Create Environment
vi .env

#### Increase swap space
sudo swapoff /swapfile
sudo rm /swapfile
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
export NODE_OPTIONS="--max-old-space-size=4096"
echo 'export NODE_OPTIONS="--max-old-space-size=4096"' >> ~/.bashrc

#### Build Sentra
npm install
npm run build
npm run start

#### Enable Sentra Startup during system bootup
sudo npm install -g pm2
pm2 start npm --name sentra -- run start
pm2 status
pm2 delete 0 (Another failed process)
pm2 startup
pm2 save

#### Installing nginx
sudo apt update
sudo apt install nginx -y
sudo systemctl status nginx
sudo vi /etc/nginx/sites-available/sentra
sudo ln -s /etc/nginx/sites-available/sentra /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d webschere.de