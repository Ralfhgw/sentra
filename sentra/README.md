# Sentra

Sentra ist eine zentrale Informationsplattform fuer Freizeit-, Reise- und Alltagsplanung. Die Anwendung bündelt persönlich relevante Inhalte an einem Ort und richtet sich an Mitglieder, die lokale Informationen, Wetterdaten und Live-Bilder schnell und uebersichtlich abrufen möchten.

Diese README dient als erste Orientierung vor bzw. beim Einstieg in das Projekt. Detaillierte Informationen zu den einzelnen Modulen stehen spaeter innerhalb der Anwendung nach dem Login zur Verfuegung.

## Wofür Sentra gedacht ist

Sentra führt mehrere Informationsquellen in einem gemeinsamen Dashboard zusammen:

- lokale und regionale Veranstaltungen
- Wetterprognosen fuer den eigenen Standort
- Live-Bilder und Streams
- persönliche Einstellungen zur Individualisierung der Inhalte

Die Plattform ist so aufgebaut, dass dem Nutzer nach dem Login die standortbezogenen Informationen zur Verfügung stehen. Um den vollen Funktionsumfang nutzen zu können, sind Keys notwendig, die der Nutzer selbst registrieren muss. Je nach Modul sind Keys von SERPAPI, OpenAI oder Cloudinary erforderlich.

## Module im Ueberblick

### News
Das Modul `News` zeigt einen regionalen Kultur- und Veranstaltungsueberblick für die nächsten Tage. Die Inhalte werden standortbezogen zusammengestellt und können durch hinterlegte Quellen individuell erweitert werden.

### Weather
Das Modul `Weather` liefert Wetterdaten und Vorhersagen für den gespeicherten Standort. Neben der allgemeinen Prognose können auch standort- und sensorbezogene Werte in die Darstellung einfließen.

### LiveView
Das Modul `LiveView` stellt Live-Streams, Webcams und ausgewählte Kanaele bereit. Ziel ist ein schneller visueller Zugriff auf aktuelle Eindruecke aus relevanten Orten oder Quellen.

### LiveTalk
Das Modul `LiveTalk` fehlt derzeit noch in der eigentlichen Funktion. Es ist fuer die Live-Kommunikation ueber Videocalls mit anderen Mitgliedern von Sentra vorgesehen und soll künftig den direkten Austausch in Echtzeit ermöglichen.

### Settings
Im Bereich `Settings` werden persönliche Angaben, Sprache, Standort, Kanal-Auswahl und weitere individuelle Voreinstellungen gepflegt. Diese Einstellungen bilden die Grundlage für die personalisierte Darstellung der Inhalte.

## Einstieg für Nutzer

1. Konto registrieren oder anmelden.
2. Persönliche Daten und Standort hinterlegen.
3. Relevante Module und Quellen in den Einstellungen anpassen.
4. Inhalte im Dashboard und in den einzelnen Modulen nutzen.

## Projektaufbau

Das Repository besteht aus mehreren Teilen. Detailierte Informationen stehen nach dem Login auf der Startseite zur Verfügung.

- `sentra/`: Next.js-Webanwendung mit Benutzeroberfläche und geschützten Modulen
- `authServer/`: separater Authentifizierungsdienst für Login, Logout und Session-Verwaltung
- `microservice/`: Infrastruktur fuer Streaming, Messaging und Datenhaltung
- `documents/`: projektbezogene Unterlagen und Zusatzmaterial

## Technischer Rahmen

Sentra kombiniert eine moderne Weboberflaeche mit begleitenden Diensten fuer Authentifizierung, Datenbank, Streaming und Messaging. Im Hintergrund kommen unter anderem Next.js, PostgreSQL, MediaMTX und MQTT-basierte Komponenten zum Einsatz.

## Aktueller Stand

Die Kernmodule `News`, `Weather`, `LiveView`, Login, Registrierung und Einstellungen sind im Projekt bereits angelegt. `LiveTalk` ist als vorgesehenes Kommunikationsmodul eingeplant, befindet sich aber noch nicht in der eigentlichen Umsetzung.
