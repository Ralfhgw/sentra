##### Deutsche Sprache

## WEATHER Modul

### Überblick
Die Weather-Seite zeigt Wetterdaten für den gespeicherten Standort an und kombiniert dabei zwei Quellen:

- Wettervorhersage und aktuelle Wetterwerte über Open-Meteo
- optionale Innen- und Außensensorwerte über einen lokalen MQTT-Broker

Zusätzlich werden die Daten in mehreren Diagrammen und Tabellen aufbereitet, damit nicht nur die aktuelle Lage, sondern auch der Verlauf der nächsten Stunden und Tage sichtbar ist.

### Was die Weather-Seite macht
Die Seite dient als persönliches Wetter- und Klima-Informationsportal.

Sie zeigt:

- aktuelle Wetterdaten für den gespeicherten Standort
- eine tägliche Vorhersage für die nächsten 16 Tage
- eine stündliche Vorhersage für den ausgewählten Tag
- Diagramme zu Temperatur, Wind, Niederschlag, Verdunstung und Atmosphäre
- optionale Innen- und Außensensorwerte
- Online-/Offline-Status der Sensoren
- Kalibrierwerte aus den Einstellungen

Die Wetterdaten werden beim Laden der Seite vom gespeicherten Standort abgerufen. Die Sensordaten werden zusätzlich regelmäßig aktualisiert.

### Voraussetzungen
Damit die Seite vollständig funktioniert, sollten diese Einstellungen kontrolliert werden:

- Standortdaten, insbesondere `lat`, `lon` und Ort
- optional aktivierte Innen- und Außensensoren
- optional Kalibrierwerte für Temperatur, Feuchte und Druck

Für die Wetterabfrage selbst ist kein zusätzlicher API-Key erforderlich.

Für die Sensordaten ist jedoch ein MQTT-Broker erforderlich, der lokal erreichbar ist.

### Konfiguration in den Einstellungen
Die zugehörige Konfiguration erfolgt auf der Settings-Seite.

#### 1. Modul aktivieren
Damit die Weather-Seite angezeigt wird, muss das Modul `WEA` aktiviert sein.

Ist `WEA` deaktiviert, erscheint statt der Wetteransicht nur ein Hinweis, dass das Modul nicht aktiv ist.

#### 2. Standortdaten
Die Weather-Seite arbeitet mit den gespeicherten Standortdaten.

Wichtig sind:

- Breitengrad
- Längengrad
- Ort

Ohne Koordinaten können keine Wetterdaten geladen werden.

#### 3. Sensoren
Optional können zwei Sensoren verbunden werden:

- `Sensor Innen`
- `Sensor Außen`

Diese Sensoren lassen sich in den Einstellungen ein- oder ausschalten.

#### 4. Kalibrierung
Für die Sensoranzeige können Offsets hinterlegt werden für:

- Temperatur
- Luftfeuchtigkeit
- Luftdruck

Zusätzlich gibt es in den Einstellungen eine Funktion `Offset berechnen`, wenn Innen- und Außensensor gleichzeitig online sind.

### Verwendung der Weather-Seite
Die Weather-Seite besteht aus mehreren Bereichen.

#### Aktuelle Wetterdaten
Im oberen Bereich werden die aktuellen Wetterwerte für den gespeicherten Ort angezeigt.

Dazu gehören zum Beispiel:

- Temperatur
- Windgeschwindigkeit
- Windrichtung
- Böen
- Luftfeuchtigkeit
- Luftdruck
- Bewölkung
- Niederschlag
- Höhe über NN

Zusätzlich passt sich der Hintergrund der Seite an Tageszeit und Bewölkung an.

#### Sensoranzeige
Wenn Sensordaten verfügbar sind, werden separate Felder für Innen und Außen angezeigt.

Dort sieht man unter anderem:

- Temperatur
- Taupunkt
- Luftfeuchtigkeit
- Luftdruck
- Online-/Offline-Status

Wenn ein Sensor keine Daten liefert, erscheint ein Wartehinweis.
Wenn ein Sensor offline ist, wird dies deutlich markiert.

#### Diagramme
Unterhalb der aktuellen Wetterdaten folgen mehrere Diagramme.

Angezeigt werden:

- Temperatur und gefühlte Temperatur
- Wind, Böen und Richtung
- Niederschlag und Luftfeuchtigkeit
- Evapotranspiration, ET0 und VPD
- Sichtweite und Luftdruck

Damit lassen sich sowohl klassische Wetterwerte als auch pflanzen- und klimabezogene Kenngrößen auswerten.

#### Tagesvorhersage
Im Bereich `Tägliche Wetterprognose` werden die kommenden Tage als Karten dargestellt.

Jede Tageskarte zeigt zum Beispiel:

- Wetterlage
- minimale und maximale Temperatur
- gefühlte Temperaturen
- Windwerte
- Niederschlag
- Strahlung
- ET0
- Sonnenaufgang
- Sonnenuntergang

#### Stündliche Vorhersage
Ein Klick auf einen Tag in der Tagesvorhersage filtert die stündlichen Daten auf genau diesen Tag.

Die Stundenansicht ist in zwei Blöcke aufgeteilt:

- `00:00 bis 12:00`
- `12:00 bis 23:00`

Dort werden pro Stunde unter anderem angezeigt:

- Temperatur
- gefühlte Temperatur
- Feuchte
- VPD
- Niederschlag
- Wind
- Sichtweite
- Luftdruck
- Verdunstung

### Wie die Daten aktualisiert werden
Die Wetterdaten und Sensordaten werden unterschiedlich geladen.

#### Wetterdaten
Die Wettervorhersage wird beim Laden der Seite direkt für den gespeicherten Standort abgerufen.

Dabei werden geliefert:

- aktuelle Werte
- stündliche Werte
- tägliche Werte

#### Sensordaten
Zusätzlich ruft die Seite regelmäßig einen userspezifischen Endpunkt auf.
Diese Endpunktadressen können in Settings ausgelsen werden. Dort befindet sich auch der Code für den Sensor BM280.
Dort werden diese Endpunkte eingetragen.

Die Sensordaten werden dabei ungefähr im Minutentakt aktualisiert.

Der aktuelle API-Endpunkt liest die Sensordaten über einen lokalen MQTT-Broker.

### Wenn keine Daten erscheinen
Mögliche Ursachen:

- `WEA` ist in den Einstellungen nicht aktiviert
- es sind keine Koordinaten gespeichert
- der Wetterabruf für den Standort schlägt fehl
- der MQTT-Broker ist nicht erreichbar und es werden keine Sensordaten angezeigt
- die Sensoren senden keine Daten
- die Sensoren sind offline
- es wurden keine Sensoren aktiviert

### Empfehlung für den Betrieb
Für eine stabile Nutzung empfiehlt sich:

- Standortdaten vollständig speichern
- `WEA` aktivieren
- Sensoren nur aktivieren, wenn sie auch wirklich Daten liefern
- Offsets nur nach einer sauberen Vergleichsmessung in gleicher Umgebung setzen
- MQTT-Broker lokal stabil betreiben

### Kurzfassung
Die Weather-Seite ist der zentrale Bereich für:

- aktuelle Wetterdaten
- tägliche und stündliche Vorhersagen
- Diagramme zur Wetterentwicklung
- optionale Innen- und Außensensoren

Konfiguriert wird sie über:

- `WEA`
- Standortdaten
- Sensoraktivierung
- Sensor-Offsets


### Detailierte Datenerfassung via MQTT
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

Für die Verbindung des lokalen MQTT Broker ist eine permanente VPN Verbindung notwendig. Die dafür notwendigen Keys können vom Administrator bezogen werden.

#### Wireguard Installation
```
[Sensornetz / Kamera]
        |
   (LAN/WLAN)
        |
   Raspberry Pi 3  ← WireGuard Client
        |
   ===== VPN Tunnel =====
        |
   Webserver (Ubuntu)  ← WireGuard Server
        |
   Docker (MQTT + MediaMTX)

```

##### English language