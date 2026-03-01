# Projekt-Dokumentation

## News und Events

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

```
#include <ESP8266WiFi.h>
#include <PubSubClient.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_BME280.h>

// --- KONFIGURATION ---
const char* ssid = "<ssid>";
const char* password = "<password>";
const char* mqtt_server = "<MQTT-Server>"; 

WiFiClient espClient;
PubSubClient client(espClient);
Adafruit_BME280 bme;

void setup() {
  Serial.begin(115200);
  Wire.begin(D2, D1); // I2C Pins

  if (!bme.begin(0x77)) {
    Serial.println("BME280 nicht gefunden!");
    while (1);
  }

  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  
  client.setServer(mqtt_server, 1883);
}

void reconnect() {
  while (!client.connected()) {
    Serial.print("Versuche MQTT Verbindung...");
    if (client.connect("ESP8266_Environment")) {
      Serial.println("verbunden");
    } else {
      Serial.print("Fehlgeschlagen, rc=");
      Serial.print(client.state());
      delay(5000);
    }
  }
}

void loop() {
  if (!client.connected()) reconnect();
  client.loop();

  // 1. Daten auslesen
  float t = bme.readTemperature();
  float h = bme.readHumidity();
  float p = bme.readPressure() / 100.0F; // Umrechnung in hPa

  // 2. JSON-String bauen (einfach für Next.js zu parsen)
  String payload = "{";
  payload += "\"temp\":" + String(t) + ",";
  payload += "\"hum\":" + String(h) + ",";
  payload += "\"pres\":" + String(p);
  payload += "}";

  // 3. An Mosquitto senden
  Serial.print("Publish payload: ");
  Serial.println(payload);
  client.publish("indoor/sensor/climate", payload.c_str(), true);

  delay(20000); // 20 Sekunden Pause
}
```

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
https://github.com/jnk22/kodinerds-iptv?tab=readme-ov-file
https://github.com/iptv-org/iptv/tree/master/streams