# Deployment Cleanup (was kann gelöscht werden?)

Dieses Repo enthält Entwicklungsmaterial und Laufzeit-Komponenten. Für den **Produktiv-Server** brauchst du nur das, was zur Laufzeit wirklich genutzt wird.

## 1) Was auf dem Server für Runtime nötig ist

### `sentra` (Next.js Webserver)
Benötigt nach `npm run build`:
- `.next/`
- `public/`
- `package.json`
- `package-lock.json`
- `next.config.ts` (falls zur Runtime benötigt)
- Laufzeit-Quellcode, auf den Next bei `next start` zugreift (z. B. `app/`, `components/`, `utils/`)
- `.env` (nur auf Server, nicht im Git)

Nicht nötig auf Runtime-Host:
- lokale Doku/Notizen
- Test-/Einmal-Skripte
- Editor-/OS-Artefakte
- `node_modules` aus dem Repo (werden auf dem Server per `npm ci --omit=dev` erzeugt)

### `authServer`
Benötigt:
- `src/`
- `package.json`
- `package-lock.json`
- `Dockerfile` (wenn via Docker gebaut)
- `.env` (serverseitig)

Nicht nötig:
- `node_modules` im Git
- lokale Docker-Dev-Artefakte

### `microservice`
Benötigt (abhängig vom Setup):
- `docker-compose.yml`
- `mediamtx.yml`
- `init_sentra.sql` (falls Initialisierung genutzt)
- `.env` (serverseitig)

Optional/entfernbar, wenn nicht aktiv genutzt:
- Export-/Beispieldateien wie `day_meanings_export.csv`

## 2) Bereits bereinigt in diesem Commit
- Entfernt: `sentra/public/logo-mediamtx.svg:Zone.Identifier` (Windows ADS-Artefakt)
- Entfernt: `sentra/app/layout copy.tsx` (Backup/Altdatei)
- Ergänzt `.gitignore`, damit `node_modules`, `.env`-Dateien, Logs und `*.Zone.Identifier` nicht mehr versehentlich eingecheckt werden.

## 3) Empfohlener Deploy-Ansatz (nur notwendige Dateien)

Nutze pro Service ein **gezieltes Deployment** statt komplettes Repo zu kopieren.

Beispiel (rsync):

```bash
rsync -av --delete \
  --exclude '.git' \
  --exclude '**/node_modules' \
  --exclude '**/.env*' \
  --exclude '**/*.log' \
  --exclude '**/*Zone.Identifier*' \
  /path/to/repo/ user@server:/opt/sentra/
```

Danach auf dem Server:

```bash
cd /opt/sentra/sentra
npm ci --omit=dev
npm run build
npm run start
```

Für `authServer`/`microservice` analog nur die jeweiligen Verzeichnisse deployen.