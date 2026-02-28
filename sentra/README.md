# Projekt-Dokumentation

## News und Events

## Wetter

## Webcam

## Sensoren

## Display

### Mosquitto Broker
Der Mosquitto Broker ist ein MQTT-Broker, der das MQTT-Protokoll implementiert. MQTT (Message Queuing Telemetry Transport) ist ein leichtgewichtiges Publish/Subscribe-Protokoll, das speziell für IoT-Anwendungen und die Übertragung von Sensordaten entwickelt wurde. Der Mosquitto Broker empfängt Sensordaten (z.B. von einem Klimasensor) über das MQTT-Protokoll. Clients (wie Sensoren oder andere Geräte) können Daten an bestimmte Topics (z.B. indoor/sensor/climate) senden ("publishen"). Andere Clients (wie das Backend oder das Frontend) können diese Topics abonnieren ("subscriben") und erhalten dann die aktuellen Sensordaten.
Verwendung im Projekt

### mediaMTX Server
Der mediaMTX Server (früher bekannt als rtsp-simple-server) ist ein Streaming-Server, der verschiedene Medienprotokolle wie RTSP, RTMP, HLS und WebRTC unterstützt. Der mediaMTX Server empfängt einen Video-Stream (z.B. von einer Kamera oder einem anderen Encoder) über RTSP oder RTMP. In deinem Projekt wird mediaMTX genutzt, um einen Live-Video-Stream bereitzustellen, der z.B. im Frontend angezeigt werden kann. Die Konfiguration des mediaMTX Servers findest du in stream-server/mediamtx/config.yml. Der Server wird über Docker in docker-compose.yml gestartet.
Das Frontend kann dann den bereitgestellten Stream (z.B. als HLS-URL) einbinden und anzeigen.
Zusammengefasst:
Der mediaMTX Server übernimmt das Empfangen, Umwandeln und Bereitstellen von Live-Video-Streams, sodass diese im Web-Frontend oder anderen Clients angezeigt werden können.
https://github.com/jnk22/kodinerds-iptv?tab=readme-ov-file
https://github.com/iptv-org/iptv/tree/master/streams