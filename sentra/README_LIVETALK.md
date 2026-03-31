##### Deutsche Sprache

## LIVETALK Modul

### Überblick
Die LiveTalk-Seite ist das Echtzeitmodul für Audio, Video und Chat.

Sie arbeitet mit einem Session-Key, über den mehrere Benutzer denselben Raum betreten können.

Das Modul ist in zwei Teile aufgeteilt:

- die SENTRA-App verwaltet Login, Session-Erzeugung und Token-Ausgabe
- ein separater LiveTalk-Dienst übernimmt die Echtzeitverbindung für Audio, Video und Chat

Dadurch bleibt die eigentliche Web-App schlank, während die Echtzeitkommunikation separat verarbeitet wird.


![MediaSoup](./webrtc-coturn-mediasoup.png)

### Was die LiveTalk-Seite macht
Die Seite dient als persönlicher Gesprächs- und Besprechungsbereich.

Sie ermöglicht:

- Erzeugen eines neuen Session-Keys
- Beitritt zu einem vorhandenen Raum
- Start mit oder ohne Mikrofon und Kamera
- Anzeige des eigenen Videobilds
- Empfang fremder Video-Streams
- Chat innerhalb des Raums
- Kopieren des Session-Keys
- Audio und Video während der Sitzung ein- und ausschalten
- Verlassen der Sitzung

### Voraussetzungen
Damit die Seite vollständig funktioniert, sollten folgende Voraussetzungen erfüllt sein:

- aktiviertes Modul `RTC`
- gültiger Login
- laufender LiveTalk-Echtzeitdienst
- gültige Server-Konfiguration für die Token-Erzeugung
- Browserzugriff auf Mikrofon und Kamera, wenn nicht im Viewer-Modus gestartet wird

Ohne aktiviertes `RTC` wird statt der LiveTalk-Seite nur ein Hinweis angezeigt.

### Konfiguration in den Einstellungen
Die zugehörige Grundkonfiguration erfolgt auf der Settings-Seite.

#### 1. Modul aktivieren
Damit die LiveTalk-Seite nutzbar ist, muss das Modul `RTC` aktiviert sein.

Weitere Raum- oder Teilnehmerdaten werden nicht in den Settings gepflegt, sondern direkt in der LiveTalk-Seite erzeugt.

### Verwendung der LiveTalk-Seite
Die LiveTalk-Seite arbeitet mit einem Session-Key.

#### Start ohne aktive Sitzung
Vor dem Verbindungsaufbau gibt es drei Eingaben beziehungsweise Aktionen:

- `Username` eingeben
- vorhandenen `Session-Key` eintragen oder
- neuen `Session-Key` erzeugen

Zusätzlich gibt es die Option:

- `Start Session ohne Mikrofon und Kamera`

Damit kann der Raum bewusst im reinen Empfangsmodus betreten werden.

#### Neuen Session-Key erzeugen
Über `Neuen Session-Key erzeugen` wird ein neuer Raum erstellt.

Der erzeugte Session-Key wird direkt in das Formular übernommen und kann anschließend verwendet oder kopiert werden.

Ein neu erzeugter Raum ist zeitlich begrenzt und läuft nach einer gewissen Zeit ab.

#### Mit Session-Key verbinden
Über `Mit Session-Key verbinden` wird ein vorhandener Raum geladen und die Echtzeitverbindung aufgebaut.

Dabei gilt:

- mit aktivierter Empfangsoption startet der Benutzer als Viewer
- ohne Empfangsoption startet der Benutzer als Teilnehmer mit Mikrofon und Kamera
- der Besitzer eines neu erzeugten Raums ist der Host
- andere Benutzer treten als normale Teilnehmer bei

### Ansicht während einer aktiven Sitzung
Sobald die Verbindung steht, zeigt die Seite mehrere Bereiche.

#### Aktive Session
Im Session-Bereich werden angezeigt:

- Session-Key
- Benutzername
- Verbindungsstatus
- Socket-ID
- aktueller Modus

Zusätzlich gibt es dort die Schaltfläche:

- `Session verlassen`

#### Session-Key-Bereich
Der aktive Session-Key wird zusätzlich separat angezeigt.

Dort kann er über `Session-Key kopieren` in die Zwischenablage übernommen werden.

#### Audio und Video
Teilnehmer mit Feed können während der Sitzung Audio und Video steuern.

Dazu gibt es Schaltflächen für:

- Mikrofon
- Kamera

Im Viewer-Modus werden keine lokalen Medien gestartet.

#### Video-Bereich
Im Videobereich erscheinen:

- das eigene Kamerabild
- die Videobilder anderer Teilnehmer

Wenn noch keine weiteren Teilnehmer mit aktivem Kamerabild im Raum sind, erscheint ein Wartehinweis.

#### Chat
Im unteren Bereich befindet sich der Raum-Chat.

Dort werden:

- bereits vorhandene Nachrichten
- neu eingehende Nachrichten in Echtzeit

angezeigt.

### Wie die Verbindung aufgebaut wird
Der Verbindungsaufbau läuft mehrstufig.

1. Benutzer gibt Namen und Session-Key an oder erzeugt einen neuen Raum
2. die App lädt Raumdaten
3. die App erzeugt ein Zugriffstoken für LiveTalk
4. der Browser verbindet sich mit dem Echtzeitdienst
5. Audio, Video und Chat werden innerhalb dieses Raums gestartet

Die eigentliche Medienübertragung läuft nicht über klassische Seitenaufrufe, sondern über eine separate Echtzeitverbindung.

### Rollen im Raum
Innerhalb von LiveTalk gibt es drei typische Rollen:

- `host`
- `member`
- `viewer`

Bedeutung:

- `host`: Besitzer des Raums
- `member`: normaler Teilnehmer mit aktiver Medienverbindung
- `viewer`: reiner Empfang ohne eigenes Mikrofon und Kamerabild

### Typische Nutzung
#### Eigene Sitzung starten
1. `RTC` in den Einstellungen aktivieren
2. LiveTalk-Seite öffnen
3. Username eingeben
4. `Neuen Session-Key erzeugen` klicken
5. Session-Key kopieren und an andere Teilnehmer weitergeben
6. mit dem Session-Key verbinden

#### Einer Sitzung beitreten
1. LiveTalk-Seite öffnen
2. Username eingeben
3. Session-Key eintragen
4. optional `ohne Mikrofon und Kamera` aktivieren
5. `Mit Session-Key verbinden` klicken

### Wenn keine Verbindung zustande kommt
Mögliche Ursachen:

- `RTC` ist nicht aktiviert
- der Benutzer ist nicht eingeloggt
- der Session-Key ist ungültig
- der Raum ist abgelaufen
- der LiveTalk-Dienst ist nicht erreichbar
- Mikrofon- oder Kamerazugriff wurde blockiert
- die Token-Erzeugung auf dem Server ist nicht korrekt konfiguriert

### Empfehlung für den Betrieb
Für eine stabile Nutzung empfiehlt sich:

- `RTC` nur aktivieren, wenn der Echtzeitdienst läuft
- Session-Keys nur gezielt weitergeben
- Viewer-Modus nutzen, wenn kein eigenes Audio oder Video nötig ist
- Browserrechte für Kamera und Mikrofon sauber prüfen
- Sitzungen nach der Nutzung wieder verlassen

### Kurzfassung
Die LiveTalk-Seite ist der zentrale Bereich für:

- Audio
- Video
- Chat
- Session-Keys
- gemeinsame Echtzeiträume

Konfiguriert wird sie über:

- `RTC`
- Username
- Session-Key
- optionalen Viewer-Modus



## Ziel

`LiveTalk` ist das Video-/Audio-/Chat-Modul von SENTRA. Die Architektur ist bewusst zweigeteilt:

- `sentra` liefert UI, Authentifizierung, Session-Erzeugung und Token-Ausgabe.
- `microservice/livetalk` übernimmt Socket.IO, MediaSoup, Room-State, Chat-Persistenz und die WebRTC-Transporte.

Damit bleibt die Next.js-App schlank, während der Echtzeitteil als eigener Dienst läuft.

## Gesamtfluss

1. Ein Benutzer öffnet das Modul `LiveTalk` in SENTRA.
2. Der Client erzeugt einen neuen Session-Key oder lädt eine bestehende Session über `GET /api/livetalk/rooms?code=...`.
3. Der Client fordert über `POST /api/livetalk/token` ein signiertes LiveTalk-Token an.
4. Mit diesem Token verbindet sich der Browser per Socket.IO zum LiveTalk-Microservice.
5. Der Microservice validiert das Token, lädt oder erstellt den Room und gibt die `routerRtpCapabilities` zurück.
6. Der Browser lädt `mediasoup-client`, erstellt Send- und Receive-Transporte und startet Audio/Video-Produktion oder reinen Empfang.
7. Neue Producer werden im Room per Socket-Event bekannt gemacht und von anderen Peers konsumiert.
8. Chat-Nachrichten laufen ebenfalls über den Microservice und werden in Postgres gespeichert.

## Wichtige Dateien

### SENTRA

- `/home/ralf/dci_training/websites/sentra/sentra/components/LiveTalkClient.tsx`
- `/home/ralf/dci_training/websites/sentra/sentra/app/api/livetalk/rooms/route.ts`
- `/home/ralf/dci_training/websites/sentra/sentra/app/api/livetalk/token/route.ts`

### LiveTalk-Microservice

- `/home/ralf/dci_training/websites/sentra/microservice/livetalk/src/index.ts`
- `/home/ralf/dci_training/websites/sentra/microservice/livetalk/src/config.ts`
- `/home/ralf/dci_training/websites/sentra/microservice/livetalk/src/auth/verifySentraToken.ts`
- `/home/ralf/dci_training/websites/sentra/microservice/livetalk/src/types/protocol.ts`
- `/home/ralf/dci_training/websites/sentra/microservice/livetalk/src/socket/registerHandlers.ts`
- `/home/ralf/dci_training/websites/sentra/microservice/livetalk/src/domain/roomsStore.ts`
- `/home/ralf/dci_training/websites/sentra/microservice/livetalk/src/domain/peerState.ts`
- `/home/ralf/dci_training/websites/sentra/microservice/livetalk/src/mediasoup/createWorkers.ts`
- `/home/ralf/dci_training/websites/sentra/microservice/livetalk/src/mediasoup/transports.ts`
- `/home/ralf/dci_training/websites/sentra/microservice/livetalk/src/persistence/db.ts`
- `/home/ralf/dci_training/websites/sentra/microservice/livetalk/src/persistence/roomsRepo.ts`
- `/home/ralf/dci_training/websites/sentra/microservice/livetalk/src/persistence/messagesRepo.ts`

## Datei: `LiveTalkClient.tsx`

Diese Datei ist der gesamte Browser-Client fuer LiveTalk. Sie kapselt UI, Socket-Flow, MediaSoup-Client, lokale Streams, Remote-Streams und Chat.

### Wichtigste Typen und Definitionen

- `ActiveSession`
  - haelt den aktuellen Zustand der laufenden Session im UI.
  - speichert `userName`, `sessionCode` und `receiveOnly`.

- `JoinRoomAck`
  - typisiert die Antwort auf `room:join`.
  - enthaelt `routerRtpCapabilities`, vorhandene Producer und Chat-Nachrichten.

- `TransportCreateAck`
  - typisiert die Antwort auf `transport:create`.
  - liefert alle Daten, die `mediasoup-client` zum Aufbau eines WebRTC-Transports braucht.

- `ConsumerCreateAck`
  - typisiert die Antwort auf `consumer:create`.
  - enthaelt die Infos zum Erzeugen eines lokalen Consumers.

- `ProducerStartAck`
  - typisiert die Antwort auf `producer:start`.
  - liefert die Producer-ID fuer Audio oder Video.

- `GenericAck`
  - einfacher Erfolg-/Fehler-Typ fuer viele Socket-Events.

### Wichtigste Hilfsfunktionen

- `emitAck<T>(socket, event, payload?)`
  - vereinheitlicht Socket.IO-Events mit Callback-Antworten.
  - macht daraus ein Promise, damit der restliche Code sauber mit `await` arbeiten kann.

- `formatDateTime(value)`
  - formatiert Ablaufzeiten und Metadaten fuer die Anzeige im UI.

- `VideoTile(...)`
  - rendert eine einzelne Video-Kachel.
  - benutzt ein `video`-Element fuer das Bild und ein verstecktes `audio`-Element fuer den Ton.
  - sorgt dafuer, dass Audio und Video getrennt behandelt werden, damit Browser-Autoplay nicht das Bild blockiert.
  - reagiert auf `addtrack`, falls ein Feed erst Audio und spaeter Video erhaelt.

### State und Refs

- `userNameInput`, `sessionCodeInput`, `receiveOnly`
  - steuern das Beitrittsformular.

- `activeSession`
  - zeigt an, ob der Nutzer bereits in einer Session ist.

- `sessionKeyInfo`
  - speichert Metadaten des erzeugten oder geladenen Session-Keys.

- `statusText`, `errorMessage`
  - informieren den Benutzer ueber den aktuellen Schritt oder Fehler.

- `localStream`
  - enthaelt den lokalen Kamera-/Mikrofon-Stream.

- `remoteFeeds`
  - enthaelt die darzustellenden Remote-Streams fuer das UI.

- `socketRef`
  - haelt die laufende Socket.IO-Verbindung.

- `deviceRef`
  - enthaelt das `mediasoup-client`-Device.

- `sendTransportRef`
  - ist der Send-Transport fuer lokale Tracks.

- `recvTransportByProducerRef`
  - verwaltet Receive-Transporte je Remote-Producer.

- `consumerByProducerRef`
  - ordnet jedem Producer den lokalen Consumer zu.

- `producerMetaRef`
  - speichert Meta-Informationen zu Remote-Producern.

- `feedByPeerRef`
  - baut die sichtbaren Remote-Feeds pro Peer zusammen.

- `audioProducerRef`, `videoProducerRef`
  - trennen die lokalen Audio- und Video-Producer fuer spaetere Toggles.

### Wichtigste abgeleitete Werte

- `socketUrl`
  - liest die Socket-Adresse aus `NEXT_PUBLIC_LIVETALK_SOCKET_URL`.

- `orderProducersForConsume(producers)`
  - sortiert Producer so, dass Video zuerst konsumiert wird.
  - hilft dabei, dass die Video-Kachel zuerst aufgebaut wird und Audio nur ergaenzt wird.

- `canConnect`
  - schaltet den Button `Mit Session-Key verbinden` nur frei, wenn Username und Session-Key gesetzt sind.

- `remoteVideoFeeds`
  - filtert `remoteFeeds` auf Feeds mit vorhandenem Videotrack.

- `hasLocalVideo`
  - steuert, ob das lokale Tile wirklich ein Kamerabild zeigen kann.

### Wichtigste Funktionen im Client

- `syncRemoteFeeds()`
  - ueberfuehrt die interne `feedByPeerRef`-Map in React-State fuer das UI.

- `removeProducerTrack(producerId)`
  - entfernt einen einzelnen Remote-Track aus dem zugehoerigen Peer-Feed.
  - schliesst den dazugehoerigen Consumer und Receive-Transport.
  - aktualisiert danach die sichtbaren Remote-Feeds.

- `cleanupSession()`
  - fuehrt einen kompletten Reset einer Session aus.
  - trennt Socket-Verbindung, schliesst Producer/Consumer/Transporte und stoppt lokale Tracks.
  - setzt anschliessend alle relevanten UI-State-Werte zurueck.

- `waitForSocketConnection(socket)`
  - wartet explizit auf eine erfolgreiche Socket-Verbindung.
  - besitzt einen Timeout von 8 Sekunden und liefert bei Nichterfolg einen klaren Fehler.

- `addTrackToFeed(summary, track)`
  - fuegt Audio- oder Videotracks einem Peer-Feed hinzu.
  - baut den `MediaStream` fuer den Peer aus allen vorhandenen Tracks neu auf.

- `consumeProducer(summary)`
  - erstellt fuer einen fremden Producer einen Receive-Transport.
  - verbindet diesen Transport, erzeugt einen Consumer und setzt ihn mit `consumer:resume` fort.
  - haengt den Remote-Track erst dann ins UI, wenn er tatsaechlich bereit ist.
  - schreibt wichtige Diagnose-Logs fuer `recv transport state`, `consumer created`, `consumer resumed` und `remote track unmuted`.

- `startLocalMedia()`
  - holt Kamera und Mikrofon per `getUserMedia`.
  - erstellt den Send-Transport.
  - produziert Audio und Video als eigene Producer.
  - speichert die Producer getrennt, damit spaeter Audio und Video unabhaengig geschaltet werden koennen.

- `openRoom(selectedRoom)`
  - ist der zentrale Join-Flow.
  - holt das LiveTalk-Token von der API.
  - baut die Socket-Verbindung auf.
  - sendet `room:join`.
  - initialisiert `mediasoup-client`.
  - registriert Listener fuer neue Producer, geschlossene Producer und neue Chat-Nachrichten.
  - startet bei Nicht-Viewern die lokale Medienproduktion.

- `generateSessionKey()`
  - erstellt ueber `POST /api/livetalk/rooms` eine neue Session.
  - schreibt den neuen Session-Key direkt in das Formular.

- `connectWithSessionKey()`
  - validiert Username und Session-Key.
  - laedt die Session ueber `GET /api/livetalk/rooms`.
  - ruft danach `openRoom(...)` auf.

- `leaveSession()`
  - verlaesst die Session ueber `cleanupSession()`.

- `copySessionKey()`
  - kopiert den Session-Key in die Zwischenablage.

- `toggleAudio()`
  - pausiert oder resuemiert den lokalen Audio-Producer.
  - schaltet zusaetzlich das lokale Track-Flag.

- `toggleVideo()`
  - pausiert oder resuemiert den lokalen Video-Producer.
  - schaltet zusaetzlich das lokale Track-Flag.

- `sendChatMessage()`
  - sendet die aktuelle Chat-Nachricht ueber `chat:send`.

### Wichtige UI-Bereiche

- Startformular
  - Username eingeben
  - Session-Key eingeben oder erzeugen
  - optional `receiveOnly` aktivieren

- Aktive Session
  - zeigt Session-Key, Usernamen und Socket-ID
  - bietet Buttons fuer Verlassen, Kamera und Mikrofon

- Video Area
  - lokales Tile bei Teilnehmern mit Kamera
  - Remote-Tiles fuer fremde Video-Feeds
  - Platzhalter, solange keine Remote-Kamera vorhanden ist

- Chat
  - zeigt persistierte und live eingehende Nachrichten

## Datei: `app/api/livetalk/rooms/route.ts`

Diese Route verwaltet Session-Raume auf App-Seite.

### Definitionen und Aufgaben

- `RoomRow`
  - beschreibt die Datenbankzeile aus `livetalk_rooms`.

- `normalizeRoomCode(code)`
  - trimmt und normalisiert Session-Codes auf Grossbuchstaben.

- `mapRoom(row)`
  - uebersetzt DB-Spalten in das API-Antwortformat fuer den Client.

- `generateUniqueRoomCode()`
  - erzeugt zufaellige Session-Codes.
  - prueft direkt gegen die Datenbank, damit keine Duplikate entstehen.

### HTTP-Handler

- `GET(req)`
  - laedt einen vorhandenen Raum ueber `?code=...`.
  - prueft, ob der Benutzer eingeloggt ist.
  - prueft, ob der Raum aktiv und nicht abgelaufen ist.
  - gibt `{ room }` zurueck.

- `POST(req)`
  - erzeugt einen neuen Raum.
  - setzt `owner_user_id` auf den angemeldeten Benutzer.
  - erstellt Ablaufdatum und optionalen Titel.
  - gibt den neuen Raum mit Status `201` zurueck.

## Datei: `app/api/livetalk/token/route.ts`

Diese Route erzeugt das signierte LiveTalk-Zugriffstoken fuer den Browser.

### Definitionen und Aufgaben

- `RoomRow`
  - beschreibt die Datenbankzeile aus `livetalk_rooms`.

- `mapRoom(row)`
  - formatiert die Raumdaten fuer die JSON-Antwort.

### HTTP-Handler

- `POST(req)`
  - validiert Login, `roomId` und `userName`.
  - laedt den Raum aus der Datenbank.
  - entscheidet ueber die Rolle:
    - `viewer`, wenn `receiveOnly` gesetzt ist
    - `host`, wenn der aktuelle Benutzer Besitzer des Raums ist
    - sonst `member`
  - signiert ein JWT mit:
    - `sub`
    - `roomId`
    - `roomCode`
    - `displayName`
    - `role`
  - gibt zurueck:
    - `token`
    - `socketUrl`
    - `room`
    - `role`
    - `displayName`

### Wichtiger Punkt

Die Rollenlogik ist hier entscheidend fuer den Session-Modus. Ein Benutzer kann denselben Raum in einem zweiten Tab bewusst als `viewer` oeffnen, wenn `receiveOnly` gesetzt ist.

## LiveTalk-Microservice

Der Microservice ist der eigentliche Echtzeitkern. Er laeuft separat von Next.js und verwaltet Socket.IO, MediaSoup und die persistente Ablage fuer Room- und Chat-Daten.

## Datei: `src/index.ts`

Diese Datei bootstrapped den gesamten Dienst.

### Aufgaben

- laedt `.env`
- startet `express`
- aktiviert `cors`
- stellt `/health` bereit
- erzeugt den HTTP-Server fuer Socket.IO
- startet den Worker-Pool fuer MediaSoup
- initialisiert `RoomsStore`
- registriert alle Socket-Handler ueber `registerHandlers(...)`
- behandelt geordnetes Shutdown fuer:
  - Socket.IO
  - HTTP-Server
  - MediaSoup-Worker
  - Datenbankverbindung

### Wichtigste Funktion

- `bootstrap()`
  - ist der zentrale Einstiegspunkt des Microservice.

## Datei: `src/config.ts`

Diese Datei liest und validiert die Konfiguration.

### Aufgaben

- `requireEnv(name)`
  - stellt sicher, dass Pflichtvariablen gesetzt sind.

- `toNumber(value, fallback)`
  - liest numerische Konfiguration robust aus Umgebungsvariablen.

- `config`
  - stellt die zentrale Laufzeitkonfiguration bereit, z. B.:
    - `PORT`
    - `DATABASE_URL`
    - `LIVETALK_JWT_SECRET`
    - `CORS_ORIGIN`
    - `MEDIASOUP_LISTEN_IP`
    - `MEDIASOUP_ANNOUNCED_IP`
    - `MEDIASOUP_RTC_MIN_PORT`
    - `MEDIASOUP_RTC_MAX_PORT`
    - `MEDIASOUP_WORKER_COUNT`
    - `CHAT_HISTORY_LIMIT`

## Datei: `src/auth/verifySentraToken.ts`

Diese Datei verifiziert das von SENTRA erzeugte LiveTalk-JWT.

### Aufgaben

- `LiveTalkTokenPayload`
  - typisiert den Inhalt des Tokens.

- `verifyLiveTalkToken(rawToken)`
  - verifiziert die Signatur.
  - prueft, ob alle Pflichtfelder vorhanden sind.
  - prueft die erlaubten Rollen.
  - liefert das validierte Payload zurueck.

## Datei: `src/types/protocol.ts`

Diese Datei definiert das Socket-Protokoll auf Typ-Ebene.

### Aufgaben

- `LiveTalkRole`
  - definiert `host`, `member`, `viewer`.

- `TransportDirection`
  - unterscheidet `send` und `recv`.

- `ProducerSummary`
  - beschreibt einen vorhandenen Producer fuer andere Peers.

- `ChatMessageDto`
  - typisiert eine Chat-Nachricht.

- `JoinRoomAck`, `TransportCreateAck`, `GenericAck`
  - typisieren die wichtigsten Antworten zwischen Client und Server.

## Datei: `src/socket/registerHandlers.ts`

Diese Datei ist das Herz des Echtzeitprotokolls.

### Hilfsfunktionen

- `Ack<T>`
  - Callback-Typ fuer Socket.IO-Antworten.

- `getErrorMessage(error)`
  - formatiert Fehler einheitlich fuer Acks.

- `getAuth(socket)`
  - liest das verifizierte Token-Payload aus `socket.data`.

### Hauptfunktion

- `registerHandlers(io, roomsStore)`
  - registriert alle Verbindungen und Event-Handler.

### Middleware innerhalb von `registerHandlers`

- `io.use(...)`
  - verifiziert das Token bei Verbindungsaufbau.
  - prueft, ob der Raum existiert, aktiv und nicht abgelaufen ist.
  - schreibt das Payload in `socket.data`.

### Socket-Events und Aufgaben

- `room:join`
  - laedt oder erzeugt den Room zur Laufzeit.
  - legt den Peer in `RoomsStore` an.
  - markiert den Teilnehmer in der Datenbank als beigetreten.
  - liefert `routerRtpCapabilities`, vorhandene Producer und Chat-Historie.

- `transport:create`
  - erstellt einen neuen WebRTC-Transport fuer Senden oder Empfangen.
  - speichert ihn im Room-State.

- `transport:connect`
  - verbindet einen vorhandenen Transport mit den DTLS-Parametern des Browsers.

- `producer:start`
  - startet einen Audio- oder Video-Producer auf dem Send-Transport.
  - speichert ihn im Room-State.
  - informiert alle anderen Teilnehmer per `producers:new`.

- `consumer:create`
  - erstellt fuer einen vorhandenen fremden Producer einen neuen Consumer.
  - prueft zuerst mit `router.canConsume(...)`, ob die RTP-Capabilities passen.

- `consumer:resume`
  - resuemiert einen zuvor pausiert angelegten Consumer.

- `chat:send`
  - speichert eine Nachricht und verteilt sie an alle Teilnehmer.

- `peer:audio`
  - pausiert oder resuemiert lokale Audio-Producer serverseitig.

- `disconnect`
  - raeumt Peer-State auf.
  - markiert den Teilnehmer als verlassen.
  - informiert andere Teilnehmer ueber geschlossene Producer.

## Datei: `src/domain/roomsStore.ts`

Diese Datei haelt den fluechtigen Room-State im Speicher.

### Aufgaben und wichtigste Methoden

- `RoomsStore`
  - verwaltet alle aktiven Rooms im Prozess.

- `getOrCreateRoom(roomId, roomCode)`
  - laedt einen vorhandenen Laufzeit-Room oder erzeugt einen neuen Router auf einem Worker.

- `getRoom(roomId)`
  - liest einen Room aus dem Speicher.

- `addPeer(...)`
  - legt einen Peer im Room an.

- `getPeer(roomId, socketId)`
  - liest einen Peer aus dem Room.

- `addTransport(...)`
  - speichert einen Transport und seine Richtung.

- `getTransport(...)`
  - liefert einen bestimmten Transport.

- `getTransportDirection(...)`
  - liefert `send` oder `recv` fuer einen Transport.

- `removeTransport(...)`
  - entfernt und schliesst einen Transport.

- `addProducer(...)`
  - speichert einen neuen Producer.

- `removeProducer(...)`
  - entfernt einen Producer aus dem Peer-State.

- `addConsumer(...)`
  - speichert einen Consumer.

- `getConsumer(...)`
  - liefert einen gespeicherten Consumer.

- `removeConsumer(...)`
  - entfernt und schliesst einen Consumer.

- `findProducer(...)`
  - sucht einen Producer roomweit.

- `listRemoteProducers(roomId, excludeSocketId)`
  - liefert beim Join alle Producer anderer Teilnehmer.

- `getPeerProducerSummaries(...)`
  - liefert die Producer eines bestimmten Peers, z. B. fuer Disconnect-Broadcasts.

- `removePeer(...)`
  - schliesst alle Ressourcen eines Peers.
  - schliesst den gesamten Router, wenn der Room leer wird.

- `requireRoom(...)` und `requirePeer(...)`
  - interne Guard-Methoden fuer konsistente Fehler.

## Datei: `src/domain/peerState.ts`

Diese Datei beschreibt den fluechtigen Zustand eines einzelnen Peers.

### Aufgaben

- `PeerRuntime`
  - enthaelt Identitaet, Rolle, Transporte, Producer und Consumer eines Peers.

- `closePeer(peer)`
  - schliesst alle Consumer, Producer und Transporte eines Peers.
  - wird beim Entfernen eines Peers verwendet.

## Datei: `src/mediasoup/createWorkers.ts`

Diese Datei startet den MediaSoup-Worker-Pool.

### Aufgaben

- `mediaCodecs`
  - definiert die unterstuetzten Audio-/Video-Codecs.
  - aktuell `opus` fuer Audio und `VP8` fuer Video.

- `WorkerPool`
  - beschreibt die API des Worker-Pools.

- `createWorkerPool()`
  - erstellt mehrere MediaSoup-Worker.
  - verteilt den konfigurierten Portbereich auf diese Worker.
  - implementiert `nextWorker()` als Round-Robin.
  - beendet den Prozess, wenn ein Worker unerwartet stirbt.

## Datei: `src/mediasoup/transports.ts`

Diese Datei erzeugt WebRTC-Transporte fuer Rooms.

### Aufgaben

- `createWebRtcTransport(router)`
  - erstellt einen MediaSoup-WebRTC-Transport mit:
    - `listenIp`
    - `announcedIp`
    - UDP/TCP-Unterstuetzung
    - bevorzugtem UDP
    - Bitrate-Limits

- `toTransportOptions(transport)`
  - mappt einen MediaSoup-Transport in die serialisierbare Antwort fuer den Browser.

### Wichtiger Hinweis

`MEDIASOUP_ANNOUNCED_IP` muss zur real erreichbaren Umgebung passen:

- lokal auf demselben Rechner: meist `127.0.0.1`
- Test im LAN: die LAN-IP des Hosts
- produktiv: oeffentliche IP oder passende Domain-Topologie mit TURN/Proxy

## Datei: `src/persistence/db.ts`

Diese Datei baut die Postgres-Verbindung.

### Aufgaben

- `sql`
  - gemeinsame DB-Verbindung mit `postgres`.

- `closeDb()`
  - schliesst die Verbindung beim Shutdown.

## Datei: `src/persistence/roomsRepo.ts`

Diese Datei kapselt DB-Zugriffe fuer Raum- und Teilnehmerdaten.

### Aufgaben

- `getRoomById(roomId)`
  - laedt einen Raum per ID.

- `touchRoomActivity(roomId)`
  - aktualisiert `updated_at`, damit Aktivitaet sichtbar bleibt.

- `markParticipantJoined(...)`
  - schreibt oder aktualisiert einen Teilnehmer-Eintrag.
  - setzt `joined_at` und loescht ein vorheriges `left_at`.

- `markParticipantLeft(connectionId)`
  - markiert einen Teilnehmer beim Verlassen als beendet.

## Datei: `src/persistence/messagesRepo.ts`

Diese Datei kapselt die Chat-Persistenz.

### Aufgaben

- `mapMessage(row)`
  - wandelt eine DB-Zeile in das DTO fuer den Client um.

- `getRecentMessages(roomId, limit)`
  - laedt die letzten Nachrichten eines Raums.
  - kehrt die Reihenfolge fuer die Anzeige wieder auf alt nach neu um.

- `saveMessage(input)`
  - speichert eine neue Chat-Nachricht und liefert die persistierte Version zurueck.

## Lokales Testen

Fuer lokale Tests auf demselben Rechner sollten SENTRA und LiveTalk konsistent ueber `localhost` laufen.

### `sentra/.env`

```env
NEXT_PUBLIC_LIVETALK_SOCKET_URL=http://localhost:3011
```

### `microservice/.env`

```env
SENTRA_PUBLIC_URL=http://localhost:3000
MEDIASOUP_LISTEN_IP=0.0.0.0
MEDIASOUP_ANNOUNCED_IP=127.0.0.1
```

### Warum das wichtig ist

Wenn `socketUrl` oder `MEDIASOUP_ANNOUNCED_IP` nicht zur realen Testumgebung passen, funktioniert der Join oft noch, aber die Receive-Transporte wechseln auf `failed`, und Remote-Video bleibt schwarz.

## Typische Fehlerbilder

- `Socket-Verbindung Timeout nach 8 Sekunden`
  - Browser erreicht `socketUrl` nicht.
  - Ursache meist falsche URL, falscher Port oder falscher Host.

- `recv transport state: failed`
  - Socket-Verbindung steht, aber WebRTC-Medienpfad ist falsch.
  - Ursache meist `MEDIASOUP_ANNOUNCED_IP`, Firewall oder Portfreigaben.

- schwarzes Remote-Tile
  - Video-Transport oder Track kommt nicht korrekt an.
  - zuerst auf `recv transport state`, `consumer resumed` und `remote track unmuted` schauen.

- Button `Mit Session-Key verbinden` ist disabled
  - `Username` oder `Session-Key` ist leer.
  - alternativ haengt `isJoining` noch auf `true`.

## Empfehlte naechste Verbesserungen

- TURN-Server (`coturn`) fuer robustere externe Erreichbarkeit
- saubere Trennung von Audio-only-Teilnehmern und Video-Teilnehmern im UI
- Moderationsfunktionen fuer Host
- sichtbare Teilnehmerliste
- Session-Ende / Raum schliessen durch Host
- automatisches Reconnect-Verhalten bei Netzwechsel
.

##### English language