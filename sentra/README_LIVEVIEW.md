##### Deutsche Sprache

## LIVEVIEW Modul

### Überblick
Die LiveView-Seite zeigt mehrere Live-Streams gleichzeitig in einem frei belegbaren Raster an.

Dabei können drei Quellarten verwendet werden:

- vorhandene Kanäle aus der Datenbank
- eigene HLS-/HTTP-Stream-URLs
- eigene RTSP-/RTSPS-Quellen, die über mediaMTX in einen abspielbaren Stream überführt werden

Die Seite ist dafür gedacht, persönliche Stream-Layouts dauerhaft zu speichern und später direkt wieder zu laden.

### Was die LiveView-Seite macht
Die Seite dient als persönlicher Multi-Stream-Monitor.

Sie zeigt:

- mehrere Streams gleichzeitig
- verschiedene Grid-Layouts
- frei belegbare Slots
- gespeicherte Benutzerbelegungen
- Filter nach Ort
- Suche nach Kanälen
- eigene Stream-URLs
- Drag-and-Drop zum Tauschen von Slots

Leere Slots bleiben sichtbar und können später neu belegt werden.

### Voraussetzungen
Damit die Seite vollständig funktioniert, sollten folgende Voraussetzungen erfüllt sein:

- aktiviertes Modul `MTX`
- gültiger Login
- vorhandene Kanaldaten in der Tabelle `channels`, wenn Katalogquellen genutzt werden sollen
- laufender mediaMTX-Dienst, wenn RTSP-Quellen verwendet werden sollen
- gültige Stream-URLs für eigene Quellen

Ohne aktiviertes `MTX` wird statt der LiveView-Seite nur ein Hinweis angezeigt.

### Konfiguration in den Einstellungen
Die zugehörige Grundkonfiguration erfolgt auf der Settings-Seite.

### Verwendung der LiveView-Seite
Die LiveView-Seite besteht aus Raster, Slot-Verwaltung und Stream-Anzeige.

#### Grid-Auswahl
Über die Schaltfläche `Grid` kann das Layout gewechselt werden.

Aktuell stehen mehrere Rastergrößen zur Verfügung, zum Beispiel:

- `1`
- `4`
- `6`
- `7`
- `9`
- `10`
- `13`
- `16`

Je nach Auswahl entstehen unterschiedlich große Kacheln. Auf kleineren Displays wird das Raster automatisch kompakter dargestellt.

#### Slot belegen
Ein Doppelklick auf einen Slot öffnet das Konfigurationsfenster `Kanal zuweisen`.

Dort gibt es zwei Wege:

- Auswahl eines vorhandenen Kanals aus der Kanal-Liste
- Eintragen einer eigenen Stream-URL

Zusätzlich kann ein eigener Name vergeben werden.

#### Vorhandene Kanäle auswählen
Im Konfigurationsfenster kann die Liste eingeschränkt werden durch:

- Ortsfilter
- Suchbegriff

Die Suche berücksichtigt unter anderem Kanalname, Ort und Stream-URL.

#### Eigene Streams eintragen
Statt eines Katalogkanals kann auch eine eigene URL gespeichert werden.

Dabei gelten folgende Fälle:

- `http` oder `https`: direkter benutzerdefinierter Stream
- `rtsp` oder `rtsps`: Quelle wird über mediaMTX eingebunden

#### Slot entfernen
Wenn ein Slot bereits belegt ist, kann er im selben Fenster über `Entfernen` wieder gelöscht werden.

#### Slots tauschen
Belegte Slots können per Drag-and-Drop umsortiert werden.

Dazu wird der obere Bereich einer Kachel gezogen und auf eine andere Kachel abgelegt.

### Stream-Anzeige
Jede belegte Kachel zeigt den jeweiligen Stream direkt im Raster an.

Zusätzliche Funktionen pro Kachel:

- Play/Pause
- Mute/Unmute
- Lautstärke-Regler
- Hover-Informationen zu Slot, Kanal, Ort und URL

Leere Felder zeigen den Hinweis `No Signal`.

### Wie die Daten gespeichert und geladen werden
Die Slot-Belegung wird benutzerbezogen gespeichert.

Beim Öffnen der Seite passiert Folgendes:

- gespeicherte Slots werden geladen
- Kanalquellen werden aus der Datenbank gelesen
- RTSP-Quellen werden mit mediaMTX abgeglichen
- das persönliche Raster kann direkt weiterverwendet werden

Wenn ein Slot geändert wird, wird die Benutzerbelegung aktualisiert und erneut gespeichert.

### Verhalten bei RTSP-Quellen
RTSP- oder RTSPS-Quellen werden nicht direkt im Browser abgespielt.

Stattdessen wird für solche Quellen ein mediaMTX-Pfad angelegt und anschließend als HLS-Stream bereitgestellt.

Dadurch können auch RTSP-Quellen in der LiveView-Seite angezeigt werden.

### Typische Nutzung
#### Nutzung mit vorhandenen Kanälen
1. LiveView-Seite öffnen
2. gewünschtes Grid auswählen
3. per Doppelklick einen Slot öffnen
4. Kanal filtern oder suchen
5. Kanal auswählen
6. `Speichern` klicken

#### Nutzung mit eigenen Streams
1. LiveView-Seite öffnen
2. freien Slot doppelklicken
3. Namen und Stream-URL eintragen
4. `Speichern` klicken
5. bei Bedarf Slots per Drag-and-Drop neu sortieren

### Wenn keine Streams erscheinen
Mögliche Ursachen:

- es ist kein gültiger Stream im Slot gespeichert
- die Quelle ist nicht erreichbar
- mediaMTX läuft nicht (bei RTSP Streams)
- der Kanal in der Datenbank ist ungültig
- der Slot ist leer
- die Quelle liefert zwar Daten, aber kein abspielbares Format

### Empfehlung für den Betrieb
Für eine stabile Nutzung empfiehlt sich:

- nur erreichbare Streams speichern
- RTSP-Quellen über einen stabilen mediaMTX-Dienst einbinden
- das Grid passend zur Anzahl der tatsächlich genutzten Quellen wählen
- ungenutzte Slots regelmäßig bereinigen

### Kurzfassung
Die LiveView-Seite ist der zentrale Bereich für:

- mehrere gleichzeitige Live-Streams
- frei belegbare Slots
- Katalogkanäle und eigene Stream-URLs
- RTSP-Einbindung über mediaMTX
- flexible Grid-Layouts

Konfiguriert wird sie über:

- `MTX`
- Slot-Zuweisung direkt in der LiveView-Seite
- Kanalwahl oder eigene Stream-URL



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

##### English language