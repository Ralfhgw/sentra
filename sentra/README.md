##### Deutsche Sprache
## Sentra

Sentra ist eine zentrale Informationsplattform fuer Freizeit-, Reise- und Alltagsplanung. Die Anwendung bündelt persönlich relevante Inhalte an einem Ort und richtet sich an Mitglieder, die lokale Informationen, Wetterdaten und Live-Bilder schnell und uebersichtlich abrufen möchten.

Diese README dient als erste Orientierung vor bzw. beim Einstieg in das Projekt. Detaillierte Informationen zu den einzelnen Modulen stehen spaeter innerhalb der Anwendung nach dem Login zur Verfuegung.

### Wofür Sentra gedacht ist

Sentra führt mehrere Informationsquellen in einem gemeinsamen Dashboard zusammen:

- lokale und regionale Veranstaltungen
- Wetterprognosen für den eigenen Standort
- Live-Bilder und Streams
- persönliche Einstellungen zur Individualisierung der Inhalte
- Live Kommunikation (Video / Chat)

Die Plattform ist so aufgebaut, dass dem Nutzer nach dem Login die standortbezogenen Informationen zur Verfügung stehen. Um den vollen Funktionsumfang nutzen zu können, sind Keys notwendig, die der Nutzer selbst registrieren muss. Je nach Modul sind Keys von SERPAPI, OpenAI oder Cloudinary erforderlich.

### Module im Ueberblick

#### News
Das Modul `News` zeigt einen regionalen Kultur- und Veranstaltungsüberblick für die nächsten Tage. Die Inhalte werden standortbezogen zusammengestellt und können durch hinterlegte Quellen individuell erweitert werden.

#### Weather
Das Modul `Weather` liefert Wetterdaten und Vorhersagen für den gespeicherten Standort. Neben der allgemeinen Prognose können auch standort- und sensorbezogene Werte in die Darstellung einfließen.

#### LiveView
Das Modul `LiveView` stellt Live-Streams, Webcams und ausgewählte Kanäle bereit. Ziel ist ein schneller visueller Zugriff auf aktuelle Eindrücke aus relevanten Orten oder Quellen.

#### LiveTalk
Das Modul `LiveTalk` ist fuer die Live-Kommunikation ueber Videocalls mit anderen Mitgliedern von Sentra vorgesehen und soll den direkten Austausch in Echtzeit ermöglichen.

#### Settings
Im Bereich `Settings` werden persönliche Angaben, Sprache, Standort, Kanal-Auswahl und weitere individuelle Voreinstellungen gepflegt. Diese Einstellungen bilden die Grundlage für die personalisierte Darstellung der Inhalte.

### Einstieg für Nutzer

1. Konto registrieren oder anmelden.
2. Persönliche Daten und Standort hinterlegen.
3. Relevante Module und Quellen in den Einstellungen anpassen.
4. Inhalte im Dashboard und in den einzelnen Modulen nutzen.

### Projektaufbau

Das Repository besteht aus mehreren Teilen. Detailierte Informationen stehen nach dem Login auf der Startseite zur Verfügung.

- `sentra/`: Next.js-Webanwendung mit Benutzeroberfläche und geschützten Modulen
- `authServer/`: separater Authentifizierungsdienst für Login, Logout und Session-Verwaltung
- `microservice/`: Infrastruktur fuer Streaming, Messaging und Datenhaltung
- `documents/`: projektbezogene Unterlagen und Zusatzmaterial

### Technischer Rahmen

Sentra kombiniert eine moderne Weboberflaeche mit begleitenden Diensten fuer Authentifizierung, Datenbank, Streaming und Messaging. Im Hintergrund kommen unter anderem Next.js, PostgreSQL, MediaMTX und MQTT-basierte Komponenten zum Einsatz.

### Aktueller Stand

Die Kernmodule `News`, `Weather`, `LiveView`, Login, Registrierung und Einstellungen sind im Projekt bereits angelegt. `LiveTalk` ist als vorgesehenes Kommunikationsmodul eingeplant, befindet sich aber noch nicht in der eigentlichen Umsetzung.

##### English language
## Sentra
Sentra is a central information platform for leisure, travel, and everyday planning. The application bundles personally relevant content in one place and is aimed at members who want to access local information, weather data, and live imagery quickly and clearly.

This README provides a first orientation before and during entry into the project. More detailed information about the individual modules is available later inside the application after login.

### What Sentra is for

Sentra combines several information sources in one shared dashboard:

- local and regional events
- weather forecasts for the saved location
- live images and streams
- personal settings for individual customization

The platform is designed so that location-based information is available to the user after login. To use the full feature set, API keys are required and must be registered by the user. Depending on the module, keys from SERPAPI, OpenAI, or Cloudinary may be needed.

### Module Overview

#### News
The `News` module shows a regional culture and event overview for the coming days. The content is assembled based on the user's location and can be expanded with custom sources.

#### Weather
The `Weather` module provides weather data and forecasts for the saved location. In addition to the general forecast, location-specific and sensor-related values can also be incorporated into the presentation.

#### LiveView
The `LiveView` module provides live streams, webcams, and selected channels. The goal is fast visual access to current impressions from relevant places or sources.

#### LiveTalk
The `LiveTalk` module is not yet available in its full function. It is intended for live communication via video calls with other Sentra members and is planned to enable direct real-time exchange in the future.

#### Settings
The `Settings` area stores personal details, language, location, channel selection, and further individual preferences. These settings form the basis for the personalized presentation of content.

### Getting Started

1. Register an account or log in.
2. Enter personal details and location.
3. Adjust relevant modules and sources in the settings.
4. Use the dashboard and the individual modules.

### Project Structure

The repository consists of several parts. Detailed information is available on the homepage after login.

- `sentra/`: Next.js web application with user interface and protected modules
- `authServer/`: separate authentication service for login, logout, and session management
- `microservice/`: infrastructure for streaming, messaging, and data storage
- `documents/`: project-related records and supplementary material

### Technical Framework

Sentra combines a modern web interface with supporting services for authentication, database access, streaming, and messaging. In the background, technologies such as Next.js, PostgreSQL, MediaMTX, and MQTT-based components are used.

### Current Status

The core modules `News`, `Weather`, `LiveView`, login, registration, and settings are already in place in the project. `LiveTalk` is planned as a future communication module but is not yet implemented in its actual functionality.

