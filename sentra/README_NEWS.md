# NEWS Modul

## Überblick
Die News-Seite zeigt lokale Veranstaltungen und den kulturellen Kontext eines Tages an. Sie kombiniert zwei Quellen:

- Standard-Events über SERPAPI auf Basis des gespeicherten Standorts
- zusätzliche Event-Quellen über frei hinterlegte Event-URLs

Ergänzend kann für einen Tag die Funktion **Bedeutung des Tages** angezeigt werden. Damit lassen sich Feiertage, Gedenktage oder besondere Kalendereinträge direkt in der News-Seite einsehen.

## Was die News-Seite macht
Die Seite dient als persönlicher Event- und Tagesinformationsbereich.

Sie zeigt:

- Veranstaltungen für den gespeicherten Standort
- Veranstaltungen aus zusätzlich hinterlegten Event-Webseiten
- Filter nach Datum oder Zeitraum
- Filter nach Standort
- die Bedeutung eines einzelnen Tages

Die News-Seite arbeitet mit bereits gespeicherten Eventdaten aus der Datenbank. Dadurch muss nicht bei jedem Aufruf sofort eine neue externe Anfrage gestartet werden.

## Voraussetzungen
Damit die Seite vollständig funktioniert, sollten in den Einstellungen folgende Daten gepflegt sein:

- Standortdaten, insbesondere Ort und Geokoordinaten
- `SERPAPI_KEY` für die Standard-Eventabfrage
- optional `OPENAI_API_KEY`, wenn zusätzliche Event-URLs ausgewertet werden sollen

Ohne `SERPAPI_KEY` können keine Standard-Events geladen werden.
Ohne `OPENAI_API_KEY` werden hinterlegte Event-URLs zwar gespeichert, aber nicht mit KI ausgewertet.

## Konfiguration in den Einstellungen
Die zugehörige Konfiguration erfolgt auf der Settings-Seite.

### 1. Standard-Events
Für die Standard-Events gibt es ein globales Refresh-Intervall.

Bedeutung:

- `Täglich`: die Standard-Events dürfen täglich aktualisiert werden
- `Wöchentlich`: die Standard-Events dürfen wöchentlich aktualisiert werden
- `Monatlich`: die Standard-Events dürfen monatlich aktualisiert werden

Dieses Intervall gilt nur für die Standard-Events über SERPAPI.

### 2. Event-URLs
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

### 3. API-Keys
Auf der Settings-Seite sind folgende Schlüssel relevant:

- `SERPAPI_KEY`: notwendig für die Standard-Events
- `OPENAI_API_KEY`: notwendig für die Auswertung der Event-URLs

## Verwendung der News-Seite
Die News-Seite bietet zwei Hauptmodi:

- `Alle`
- `Filter`

### Alle
Im Modus `Alle` werden alle aktuell gespeicherten Events angezeigt.

Zusätzlich kann in diesem Modus die **Bedeutung des heutigen Tages** geöffnet werden.

### Filter
Im Modus `Filter` erscheint ein Kalender.

Dort kann gefiltert werden nach:

- einem einzelnen Tag
- einem Zeitraum
- einem Standort

#### Tagesfilter
Ein Klick auf einen Tag filtert die Eventliste auf genau diesen Tag.

#### Zeitraum
Wenn zuerst ein Tag gewählt wurde und anschließend mit gedrückter `Shift`-Taste ein weiterer Tag angeklickt wird, wird ein Zeitraum markiert.

#### Standortfilter
Über die Standortauswahl können Events auf einen bestimmten gespeicherten Standort eingeschränkt werden.

Das ist besonders dann hilfreich, wenn bereits Events aus mehreren Orten in der Datenbank vorhanden sind.

## Kalenderverhalten
Der Kalender dient nur der Filterung und optional dem manuellen Anstoßen einer Event-Abfrage.

Wichtige Regeln:

- vergangene Tage sind nicht auswählbar
- hervorgehobene Tage zeigen an, dass für diese Tage bereits Events vorhanden sind
- ein ausgewählter Tag oder Zeitraum wird im Kalender markiert

## Force-Funktion
Im Filterbereich gibt es eine Checkbox `force`.

Bedeutung:

- `force` aus: der Kalender filtert nur bereits gespeicherte Events
- `force` an: ein Klick auf einen zukünftigen Tag startet zusätzlich eine neue Event-Abfrage für den gewählten Standort

Diese Funktion ist für manuelle Aktualisierung gedacht und sollte nur verwendet werden, wenn gezielt neue Eventdaten benötigt werden.

## Bedeutung des Tages
Die Schaltfläche **Bedeutung des Tages** öffnet ein separates Informationsfenster.

Verhalten:

- im Modus `Alle` wird die Bedeutung des heutigen Tages angezeigt
- bei Auswahl eines einzelnen Tages wird die Bedeutung genau dieses Tages angezeigt
- bei einem Zeitraum ist die Funktion nicht für den gesamten Bereich gedacht, sondern nur für einen einzelnen Tag

Im geöffneten Fenster lassen sich die Einträge einzeln aufklappen. Falls vorhanden, kann über `Mehr erfahren` zur weiterführenden Quelle gewechselt werden.

## Event-Anzeige
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
- Klick auf den Informationsteil: Detailansicht umschalten
- Event-Link: Öffnet die Originalquelle in einem neuen Tab

## Wie die Daten aktualisiert werden
Die Aktualisierung erfolgt nicht blind bei jedem Seitenaufruf, sondern gesteuert, um die Anzahl der externen Abfragen zu reduzieren.

### Standard-Events über SERPAPI
Standard-Events werden anhand des globalen Intervalls und des gespeicherten Standorts verwaltet.

Eine neue Standard-Abfrage erfolgt typischerweise:

- wenn das globale Event-Intervall geändert wurde
- wenn der gespeicherte Standort oder relevante Event-Einstellungen geändert wurden
- wenn der gespeicherte Refresh-Zeitpunkt abgelaufen ist
- wenn im News-Filter mit aktivem `force` gezielt ein Tag neu abgefragt wird

### Event-URLs über OpenAI
Event-URLs werden separat behandelt.

Dabei gilt:

- jede URL besitzt ihr eigenes Refresh-Intervall
- die Auswertung läuft getrennt von SERPAPI
- für die Verarbeitung ist ein `OPENAI_API_KEY` erforderlich
- pro URL wird die Seite analysiert und in strukturierte Events umgewandelt

## Typische Nutzung
### Standardnutzung
1. Standort und API-Keys in den Einstellungen speichern
2. News-Seite öffnen
3. im Modus `Alle` alle gespeicherten Events ansehen
4. bei Bedarf mit `Filter` auf Datum oder Standort einschr�nken
5. die Bedeutung des Tages über die Schaltfläche öffnen

### Erweiterte Nutzung mit Event-URLs
1. `OPENAI_API_KEY` in den Einstellungen hinterlegen
2. eine oder mehrere Event-URLs eintragen
3. pro URL das gewünschte Intervall setzen
4. speichern
5. die News-Seite später erneut öffnen und die importierten Events prüfen

## Wenn keine Events erscheinen
Mögliche Ursachen:

- kein `SERPAPI_KEY` hinterlegt
- kein `OPENAI_API_KEY` hinterlegt
- keine gültige Event-URL gespeichert
- für den gewählten Tag existieren keine Events
- die externe Quelle liefert keine verwertbaren Daten
- der Refresh ist noch nicht fällig oder wurde noch nicht manuell angestoßen

## Empfehlung für den Betrieb
Für eine stabile Nutzung empfiehlt sich:

- Standortdaten sauber pflegen
- `SERPAPI_KEY` für lokale Standard-Events hinterlegen
- zusätzliche Event-URLs nur für Quellen verwenden, die regelmäßig Veranstaltungen veröffentlichen
- `force` nur gezielt einsetzen
- Event-Intervalle passend zur Quelle wählen

## Kurzfassung
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
