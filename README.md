# Sentra

Sentra ist eine zentrale Informationsplattform fuer Freizeit-, Reise- und Alltagsplanung. Die Anwendung buendelt persoenlich relevante Inhalte an einem Ort und richtet sich an Mitglieder, die lokale Informationen, Wetterdaten und Live-Bilder schnell und uebersichtlich abrufen moechten.

Diese README dient als erste Orientierung vor bzw. beim Einstieg in das Projekt. Detaillierte Informationen zu den einzelnen Modulen stehen spaeter innerhalb der Anwendung nach dem Login zur Verfuegung.


## Wofuer Sentra gedacht ist

Sentra fuehrt mehrere Informationsquellen in einem gemeinsamen Dashboard zusammen:

- lokale und regionale Veranstaltungen
- Wetterprognosen fuer den eigenen Standort
- Live-Bilder und Streams
- persoenliche Einstellungen zur Individualisierung der Inhalte

Die Plattform ist so aufgebaut, dass Nutzer nach dem Login direkt mit ihren personalisierten Daten arbeiten koennen.

## Module im Ueberblick

### News
Das Modul `News` zeigt einen regionalen Kultur- und Veranstaltungsueberblick fuer die naechsten Tage. Die Inhalte werden standortbezogen zusammengestellt und koennen durch hinterlegte Quellen individuell erweitert werden.

### Weather
Das Modul `Weather` liefert Wetterdaten und Vorhersagen fuer den gespeicherten Standort. Neben der allgemeinen Prognose koennen auch standort- und sensorbezogene Werte in die Darstellung einfliessen.

### LiveView
Das Modul `LiveView` stellt Live-Streams, Webcams und ausgewaehlte Kanaele bereit. Ziel ist ein schneller visueller Zugriff auf aktuelle Eindruecke aus relevanten Orten oder Quellen.

### LiveTalk
Das Modul `LiveTalk` fehlt derzeit noch in der eigentlichen Funktion. Es ist fuer die Live-Kommunikation ueber Videocalls mit anderen Mitgliedern von Sentra vorgesehen und soll kuenftig den direkten Austausch in Echtzeit ermoeglichen.

### Settings
Im Bereich `Settings` werden persoenliche Angaben, Sprache, Standort, Kanal-Auswahl und weitere individuelle Voreinstellungen gepflegt. Diese Einstellungen bilden die Grundlage fuer die personalisierte Darstellung der Inhalte.

## Einstieg fuer Nutzer

1. Konto registrieren oder anmelden.
2. Persoenliche Daten und Standort hinterlegen.
3. Relevante Module und Quellen in den Einstellungen anpassen.
4. Inhalte im Dashboard und in den einzelnen Modulen nutzen.

## Projektaufbau

Das Repository besteht aus mehreren Teilen:

- `sentra/`: Next.js-Webanwendung mit Benutzeroberflaeche und geschuetzten Modulen
- `authServer/`: separater Authentifizierungsdienst fuer Login, Logout und Session-Verwaltung
- `microservice/`: Infrastruktur fuer Streaming, Messaging und Datenhaltung
- `documents/`: projektbezogene Unterlagen und Zusatzmaterial

## Technischer Rahmen

Sentra kombiniert eine moderne Weboberflaeche mit begleitenden Diensten fuer Authentifizierung, Datenbank, Streaming und Messaging. Im Hintergrund kommen unter anderem Next.js, PostgreSQL, MediaMTX und MQTT-basierte Komponenten zum Einsatz.

## Aktueller Stand

Die Kernmodule `News`, `Weather`, `LiveView`, Login, Registrierung und Einstellungen sind im Projekt bereits angelegt. `LiveTalk` ist als vorgesehenes Kommunikationsmodul eingeplant, befindet sich aber noch nicht in der eigentlichen Umsetzung.
