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