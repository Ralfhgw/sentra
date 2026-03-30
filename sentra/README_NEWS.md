##### Deutsche Sprache

## NEWS Modul

### Überblick
Die News-Seite zeigt lokale Veranstaltungen und den kulturellen Kontext eines Tages an. Sie kombiniert zwei Quellen:

- Standard-Events über SERPAPI auf Basis des gespeicherten Standorts
- zusätzliche Event-Quellen über frei hinterlegte Event-URLs

Ergänzend kann für einen Tag die Funktion **Bedeutung des Tages** angezeigt werden. Damit lassen sich Feiertage, Gedenktage oder besondere Kalendereinträge direkt in der News-Seite einsehen.

### Was die News-Seite macht
Die Seite dient als persönlicher Event- und Tagesinformationsbereich.

Sie zeigt:

- Veranstaltungen für den gespeicherten Standort
- Veranstaltungen aus zusätzlich hinterlegten Event-Webseiten
- Filter nach Datum oder Zeitraum
- Filter nach Standort
- die Bedeutung eines einzelnen Tages

Die News-Seite arbeitet mit bereits gespeicherten Eventdaten aus der Datenbank. Dadurch muss nicht bei jedem Aufruf sofort eine neue externe Anfrage gestartet werden. Die Abfragen erfolgen in den zuvor in den Settings eingestellten Intervallen.

### Voraussetzungen
Damit die Seite vollständig funktioniert, sollten in den Einstellungen folgende Daten gepflegt sein:

- Standortdaten, insbesondere Ort und Geokoordinaten
- `SERPAPI_KEY` für die Standard-Eventabfrage
- `OPENAI_API_KEY`, wenn zusätzliche Event-URLs ausgewertet werden sollen

Ohne `SERPAPI_KEY` können keine Standard-Events geladen werden.
Ohne `OPENAI_API_KEY` werden hinterlegte Event-URLs zwar gespeichert, aber nicht mit KI ausgewertet und angezeigt.

### Konfiguration in den Einstellungen
Die zugehörige Konfiguration erfolgt auf der Settings-Seite.

Damit die Weather-Seite angezeigt wird, muss das Modul `EVT` aktiviert sein.
Ist `EVT` deaktiviert, erscheint statt der Wetteransicht nur ein Hinweis, dass das Modul nicht aktiv ist.

#### 1. Standard-Events
Für die Standard-Events gibt es ein globales Refresh-Intervall.

Bedeutung:

- `Täglich`: die Standard-Events werden täglich aktualisiert
- `Wöchentlich`: die Standard-Events werden wöchentlich aktualisiert
- `Monatlich`: die Standard-Events werden monatlich aktualisiert

Dieses Intervall gilt nur für die Standard-Events über SERPAPI.

#### 2. Event-URLs
Zusätzliche Event-Webseiten können als eigene Quellen hinterlegt werden.

Vorgehen:

1. URL in das Eingabefeld eintragen
2. Intervall für diese URL auswählen
3. `Hinzufügen` klicken
4. anschließend die Einstellungen speichern

Jede Event-URL besitzt ein eigenes Intervall:

- `Täglich`
- `Wöchentlich`
- `Monatlich`

Bedeutung der Intervalle für Event-URLs:

- `Täglich`: nur Events im nahen Zeitraum werden täglich geprüft
- `Wöchentlich`: Events für die nächsten 7 Tage werden berücksichtigt
- `Monatlich`: Events für die nächsten 30 Tage werden berücksichtigt

Bedienung der URL-Liste:

- einfacher Klick auf einen Eintrag: Intervall wechseln
- Doppelklick auf einen Eintrag: URL entfernen

#### 3. API-Keys
Auf der Settings-Seite sind folgende Schlüssel einzutragen:

- `SERPAPI_KEY`: notwendig für die Standard-Events
- `OPENAI_API_KEY`: notwendig für die Auswertung der Event-URLs

### Verwendung der News-Seite
Die News-Seite bietet zwei Hauptmodi:

- `Alle`
- `Filter`

#### Alle
Im Modus `Alle` werden alle aktuell gespeicherten Events angezeigt.

Zusätzlich kann in diesem Modus die **Bedeutung des heutigen Tages** geöffnet werden.

#### Filter
Im Modus `Filter` erscheint ein Kalender.

Dort kann gefiltert werden nach:

- einem einzelnen Tag
- einem Zeitraum
- einem Standort

##### Tagesfilter
Ein Klick auf einen Tag filtert die Eventliste auf genau diesen Tag.

##### Zeitraum
Wenn zuerst ein Tag gewählt wurde und anschließend mit gedrückter `Shift`-Taste ein weiterer Tag angeklickt wird, wird ein Zeitraum markiert.

##### Standortfilter
Über die Standortauswahl können Events auf einen bestimmten gespeicherten Standort eingeschränkt werden.

Das ist besonders dann hilfreich, wenn bereits Events aus mehreren Orten in der Datenbank vorhanden sind.

### Kalenderverhalten
Der Kalender dient nur der Filterung und optional dem manuellen Anstoßen einer Event-Abfrage.

Wichtige Regeln:

- vergangene Tage sind nicht auswählbar
- hervorgehobene Tage zeigen an, dass für diese Tage bereits Events vorhanden sind
- ein ausgewählter Tag oder Zeitraum wird im Kalender markiert

### Force-Funktion
Im Filterbereich gibt es eine Checkbox `force`.

Bedeutung:

- `force` aus: der Kalender filtert nur bereits gespeicherte Events
- `force` an: ein Klick auf einen zukünftigen Tag startet zusätzlich eine neue Event-Abfrage für den gewählten Tag und dem aktuell gespeicherten Standort.

Diese Funktion ist für manuelle Aktualisierung gedacht und sollte nur verwendet werden, wenn gezielt neue Eventdaten benötigt werden.

### Bedeutung des Tages
Die Schaltfläche **Bedeutung des Tages** öffnet ein separates Informationsfenster.

Verhalten:

- im Modus `Alle` wird die Bedeutung des heutigen Tages angezeigt
- bei Auswahl eines einzelnen Tages wird die Bedeutung genau dieses Tages angezeigt

Im geöffneten Fenster lassen sich die Einträge einzeln aufklappen. Falls vorhanden, kann über `Mehr erfahren` zur weiterführenden Quelle gewechselt werden.

### Event-Anzeige
Jedes Event zeigt wichtige Informationen an, zum Beispiel:

- Titel
- Datum
- Adresse
- Standort
- Bild, falls vorhanden
- Beschreibung
- Link zur Originalquelle

Zusätzliche Bedienung:

- Klick auf das Bild: Vorschau vergrößern bzw. öffnen
- Klick auf den Informationsteil: Ansicht "Löschen" Button an/aus
- Event-Link: Öffnet die Originalquelle in einem neuen Tab

### Wie die Daten aktualisiert werden
Die Aktualisierung erfolgt nicht blind bei jedem Seitenaufruf, sondern gesteuert, um die Anzahl der externen Abfragen zu reduzieren.

#### Standard-Events über SERPAPI
Standard-Events werden anhand des globalen Intervalls und des gespeicherten Standorts verwaltet.

Eine neue Standard-Abfrage erfolgt typischerweise:

- wenn das globale Event-Intervall geändert wurde
- wenn der gespeicherte Standort oder relevante Event-Einstellungen geändert wurden
- wenn der gespeicherte Refresh-Zeitpunkt abgelaufen ist
- wenn im News-Filter mit aktivem `force` gezielt ein Tag neu abgefragt wird

#### Event-URLs über OpenAI
Event-URLs werden separat behandelt.

Dabei gilt:

- jede URL besitzt ihr eigenes Refresh-Intervall
- die Auswertung läuft getrennt von SERPAPI
- für die Verarbeitung ist ein `OPENAI_API_KEY` erforderlich
- pro URL wird die entsprechende Webseite analysiert und in die Tabelle hinzugefügt.
- Alle durch diese URLs gefundenen Events werden farblich (rötlich) hervorgehoben.

### Typische Nutzung
#### Standardnutzung
1. Standort und SERPAPI-Key in den Einstellungen speichern
2. News-Seite öffnen
3. im Modus `Alle` alle gespeicherten Events ansehen
4. bei Bedarf mit `Filter` auf Datum oder Standort einschränken
5. die Bedeutung des Tages über die Schaltfläche öffnen

#### Erweiterte Nutzung mit Event-URLs
1. `OPENAI_API_KEY` in den Einstellungen hinterlegen
2. eine oder mehrere Event-URLs eintragen
3. pro URL das gewünschte Intervall setzen
4. speichern
5. das Einsammeln der Events erfolgt im Hintergrund, so dass es einige Sekunden dauern kann, bis alle Events sichtbar werden.
6. die News-Seite öffnen und die importierten Events prüfen

### Wenn keine Events erscheinen
Mögliche Ursachen:

- kein `SERPAPI_KEY` hinterlegt
- kein `OPENAI_API_KEY` hinterlegt
- keine gültige Event-URL gespeichert
- für den gewählten Tag existieren keine Events
- die externe Quelle liefert keine verwertbaren Daten
- der Refresh ist noch nicht fällig oder wurde noch nicht manuell angestoßen

### Empfehlung für den Betrieb
Für eine stabile Nutzung empfiehlt sich:

- Standortdaten nur bei Bedarf setzen
- `SERPAPI_KEY` für lokale Standard-Events hinterlegen
- zusätzliche Event-URLs nur für Quellen verwenden, die regelmäßig Veranstaltungen veröffentlichen
- `force` nur gezielt einsetzen
- Event-Intervalle passend zur Quelle wählen

### Kurzfassung
Die News-Seite ist der zentrale Bereich für:

- lokale Veranstaltungen
- zusätzliche Eventquellen
- Datums- und Standortfilter
- Tagesbedeutungen

Konfiguriert wird sie über:

- Standort
- `SERPAPI_KEY`
- `OPENAI_API_KEY`
- globales Standard-Intervall
- individuelle Event-URLs mit eigenem Intervall

##### English language

## NEWS Module

### Overview

The News page displays local events and the cultural context of a day. It combines two sources:

- Standard events via SERPAPI based on the saved location

- Additional event sources via user-defined event URLs

Additionally, the **Significance of the Day** function can be displayed for a given day. This allows you to view holidays, commemorative days, or special calendar entries directly on the News page.

### What the News Page Does

The page serves as a personal event and day information hub.

It displays:

- Events for the saved location
- Events from additionally saved event websites
- Filters by date or time period
- Filters by location
- The significance of a single day

The News page uses previously stored event data from the database. This means that a new external request does not need to be initiated every time the page is accessed. Queries are performed at intervals previously configured in the settings.


### Prerequisites
For the page to function fully, the following data should be entered in the settings:

- Location data, specifically location and geocoordinates

- `SERPAPI_KEY` for the standard event query

- `OPENAI_API_KEY` if additional event URLs are to be evaluated

Without `SERPAPI_KEY`, standard events cannot be loaded.

Without `OPENAI_API_KEY`, stored event URLs will be saved, but will not be evaluated and displayed using AI.

### Configuration in the Settings
The corresponding configuration is done on the Settings page.

The weather page must be enabled for the `EVT` module to be displayed.
If `EVT` is disabled, only a message indicating that the module is inactive will appear instead of the weather view.

#### 1. Standard Events
There is a global refresh interval for the standard events.

Meaning:

- `Daily`: The standard events are updated daily.

- `Weekly`: The standard events are updated weekly.

- `Monthly`: The standard events are updated monthly.

This interval applies only to the standard events via SERPAPI.

#### 2. Event URLs
Additional event websites can be added as separate sources.


Procedure:

1. Enter the URL in the input field

2. Select the interval for this URL

3. Click "Add"

4. Save the settings

Each event URL has its own interval:

- "Daily"
- "Weekly"
- "Monthly"

Meaning of the intervals for event URLs:

- "Daily": only events in the near future are checked daily
- "Weekly": events for the next 7 days are considered
- "Monthly": events for the next 30 days are considered

Using the URL list:

- Single click on an entry: change the interval
- Double click on an entry: remove the URL

#### 3. API Keys
The following keys must be entered on the settings page:

- "SERPAPI_KEY": required for standard events
- "OPENAI_API_KEY": required for evaluating event URLs

#### Using the News Page
The The news page offers two main modes:

- `All`
- `Filter`

#### All
In `All` mode, all currently saved events are displayed.

In addition, the **meaning of today** can be opened in this mode.

#### Filter
In `Filter` mode, a calendar appears.

Here, you can filter by:

- a single day
- a time period
- a location

##### Day Filter
Clicking on a day filters the event list to that specific day.

#### Time Period
If a day is selected first, and then another day is selected while holding down the `Shift` key, a time period is selected.

#### Location Filter
Events can be restricted to a specific saved location using the location selection.

This is particularly helpful if events from multiple locations are already in the database.

#### Calendar Behavior
The calendar is used only for filtering and optionally for manually triggering an event query.

Important Rules:

- Past days cannot be selected

- Highlighted days indicate that events already exist for those days

- A selected day or time period is marked in the calendar

### Force Function
There is a `force` checkbox in the filter area.

Meaning:

- `force` off: the calendar filters only previously saved events

- `force` on: clicking on a future day also starts a new event query for the selected day and the currently saved location.

This function is intended for manual updates and should only be used when new event data is specifically needed.

## Day's Meaning
The **Day's Meaning** button opens a separate information window.

Behavior:

- In "All" mode, the meaning of today's date is displayed

- When a single day is selected, the meaning of that specific day is displayed

In the opened window, the entries can be expanded individually. If available, you can click "Learn More" to access further information.

### Event Display
Each event displays important information,

For example:

- Title
- Date
- Address
- Location
- Image, if available
- Description
- Link to the original source

Additional controls:

- Click on the image: Enlarge or open the preview
- Click on the information section: Toggle the "Delete" button on/off
- Event link: Opens the original source in a new tab

### How the data is updated
Updates are not performed blindly on every page load, but rather in a controlled manner to reduce the number of external queries.

#### Standard events via SERPAPI
Standard events are managed based on the global interval and the stored location.


A new standard query typically occurs:

- when the global event interval has been changed
- when the saved location or relevant event settings have been changed
- when the saved refresh time has expired
- when a specific day is queried again in the news filter with `force` enabled

#### Event URLs via OpenAI
Event URLs are handled separately.

The following applies:

- each URL has its own refresh interval
- the evaluation runs separately from SERPAPI
- an `OPENAI_API_KEY` is required for processing
- for each URL, the corresponding web page is analyzed and added to the table.

- all events found via these URLs are highlighted in red.

### Typical Use Case
#### Standard Use Case

1. Save location and SERPAPI key in the settings

2. Open the news page

3. In "All" mode, view all saved events

4. If needed, use the "Filter" to refine the results by date or location

5. Open the day's significance using the button

#### Advanced Use Case with Event URLs

1. Enter `OPENAI_API_KEY` in the settings

2. Enter one or more event URLs

3. Set the desired interval for each URL

4. Save

5. Events are collected in the background, so it may take a few seconds for all events to become visible.

6. Open the news page and check the imported events

### If no events appear
Possible causes:

- No `SERPAPI_KEY` has been entered
- No `OPENAI_API_KEY` has been entered
- No valid event URL has been saved

- No events exist for the selected day

- The external source is not providing usable data
- The refresh is not yet due or has not yet been manually triggered

### Operational Recommendations
For stable operation, we recommend:

- Set location data only when needed
- Enter `SERPAPI_KEY` for local default events
- Use additional event URLs only for sources that regularly publish events
- Use `force` only selectively
- Choose event intervals appropriate for the source

### Summary
The news page is the central area for:

- Local events
- Additional event sources
- Date and location filters
- Day meanings

It is configured via:

- Location
- `SERPAPI_KEY`
- `OPENAI_API_KEY`

- global default interval

- individual event URLs with their own interval