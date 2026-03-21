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

### Mosquitto Broker
Der Mosquitto Broker ist ein MQTT-Broker, der das MQTT-Protokoll implementiert. MQTT (Message Queuing Telemetry Transport) ist ein leichtgewichtiges Publish/Subscribe-Protokoll, das speziell für IoT-Anwendungen und die Übertragung von Sensordaten entwickelt wurde. Der Mosquitto Broker empfängt Sensordaten (z.B. von einem Klimasensor) über das MQTT-Protokoll. Clients (wie Sensoren oder andere Geräte) können Daten an bestimmte Topics (z.B. indoor/sensor/climate) senden ("publishen"). Andere Clients (wie das Backend oder das Frontend) können diese Topics abonnieren ("subscriben") und erhalten dann die aktuellen Sensordaten.
Verwendung im Projekt