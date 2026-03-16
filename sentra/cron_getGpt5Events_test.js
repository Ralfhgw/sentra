import postgres from 'postgres';
import OpenAI from 'openai';
import 'dotenv/config';

const { POSTGRES_URL, OPENAI_API_KEY } = process.env;

if (!POSTGRES_URL) {
  throw new Error('Fehlende POSTGRES_URL-Variable – prüfe deine .env');
}

if (!OPENAI_API_KEY) {
  throw new Error('Fehlende OPENAI_API_KEY-Variable – prüfe deine .env');
}

const sql = postgres(POSTGRES_URL, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
  ssl: 'require',
});

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

function formatDate(date) {
  if (!date) return '';

  try {
    const obj = JSON.parse(date);
    if (obj.when) return obj.when;
    if (obj.start_date) return obj.start_date;
  } catch {
    const d = new Date(date);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString('de-DE', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }

    return date;
  }

  return date;
}

function normalizeDate(dateValue, fallbackDay) {
  if (!dateValue) return fallbackDay;

  const trimmed = String(dateValue).trim();
  const isoMatch = trimmed.match(/\d{4}-\d{2}-\d{2}/);
  if (isoMatch) return isoMatch[0];

  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return fallbackDay;
}

function parseCsvLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ';' && !inQuotes) {
      values.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
}

function parseCsvEvents(csv, sourceUrl, fallbackDay) {
  const lines = csv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const events = [];

  for (const line of lines) {
    const [title = '', date = '', address = '', link = '', description = ''] = parseCsvLine(line);

    if (!title) continue;
    if (title.toLowerCase() === 'kein event gefunden') continue;

    events.push({
      title,
      date: normalizeDate(date, fallbackDay),
      address: address || null,
      link: link || sourceUrl || null,
      description: description || null,
      image: null,
    });
  }

  return events;
}

function filterEventData(event) {
  return {
    title: event.title || '',
    date: typeof event.date === 'object' ? JSON.stringify(event.date) : (event.date || ''),
    address: event.address ? JSON.stringify(event.address) : null,
    link: event.link || null,
    description: event.description || null,
    image: event.thumbnail || event.image || null,
  };
}

async function fetchOpenAiEvents(eventUrls, days) {
  try {
    let allEvents = [];
    console.log('fetchOpenAiEvents gestartet:', { eventUrls, days });

    for (const day of days) {
      console.log(`Verarbeite Tag: ${day}`);
      for (const url of eventUrls) {
        console.log(`Starte OpenAI-Request für URL: ${url}, Tag: ${day}`);


      const today = new Date();
const endDate = new Date();
endDate.setDate(today.getDate() + 60);

const todayStr = today.toISOString().slice(0,10);
const endStr = endDate.toISOString().slice(0,10);

const response = await openai.responses.create({
  model: "gpt-5-mini",
  tools: [
    {
      type: "web_search",
      search_context_size: "medium"
    }
  ],
  input: [
    {
      role: "system",
      content: `
Du bist ein Assistent zum Extrahieren von Eventdaten aus Webseiten.

Regeln:
- Stelle keine Rückfragen.
- Beginne sofort mit der Extraktion.
- Extrahiere nur Events im Zeitraum ${todayStr} bis ${endStr}.
- Wenn mehr Monate auf der Seite existieren, ignoriere sie.
- Navigiere nicht unnötig zu sehr alten oder weit zukünftigen Terminen.
- Arbeite effizient und vermeide unnötige Seitenabfragen.
`
    },
    {
      role: "user",
      content: `
Besuche die Webseite ${url} und extrahiere Events.

Filter:
- Nur Events zwischen ${todayStr} und ${endStr}

Gib die Daten als CSV ohne Header aus mit exakt diesen Spalten:
title;date;address;link;description

Vorgaben:
- Trennzeichen: Semikolon (;)
- link: immer ${url}
- date: Format yyyy-mm-dd
- description: nur Klartext aus der Eventbeschreibung
- keine HTML-Tags
- keine Referenzen oder Quellen
- keine zusätzlichen Erklärungen
- keine Rückfragen
- nur reine CSV

Wenn keine Events im Zeitraum vorhanden sind, erstelle genau diese Zeile:
Kein Event gefunden;-;-;${url};Keine Termine zwischen ${todayStr} und ${endStr}
`
    }
  ]
});




        console.log('OpenAI-Response:', response);
        const csv = response.output_text || '';
        console.log('CSV-Antwort:', csv);
        const events = parseCsvEvents(csv, url, day);
        console.log(`Events für URL ${url}, Tag ${day}:`, events);
        allEvents = allEvents.concat(events);
      }
    }

    console.log('Alle Events aus OpenAI:', allEvents);
    return allEvents;
  } catch (error) {
    console.error('OpenAI-Fehler:', error);
    return [];
  }
}

async function deleteOldEvents() {
  const todayString = new Date().toISOString().slice(0, 10);

  await sql`
    DELETE FROM events
    WHERE date < ${todayString}
  `;
  console.log('Alte Events gelöscht.');
}

async function insertEventsForUser(userId, events) {
  const domain = 'https://openai.com/';

  for (const event of events) {
    const filtered = filterEventData(event);
    const isoDate = normalizeDate(filtered.date, new Date().toISOString().slice(0, 10));

    let description = filtered.description || '';
    if (filtered.date) {
      description += `\n[Original date: ${formatDate(filtered.date)}]`;
    }

    await sql`
      INSERT INTO events (user_id, title, date, address, link, description, image, domain)
      SELECT
        ${userId},
        ${filtered.title},
        ${isoDate},
        ${filtered.address},
        ${filtered.link},
        ${description},
        ${filtered.image},
        ${domain}
      WHERE NOT EXISTS (
        SELECT 1
        FROM events
        WHERE user_id = ${userId}
          AND title = ${filtered.title}
          AND date = ${isoDate}
      )
    `;
    console.log(`Event eingefügt für User ${userId}:`, filtered.title, isoDate);
  }
}

async function cleanupDuplicatesForUser(userId) {
  await sql`
    DELETE FROM events e
    USING events e2
    WHERE e.user_id = ${userId}
      AND e.user_id = e2.user_id
      AND e.title = e2.title
      AND e.date = e2.date
      AND e.ctid > e2.ctid
  `;
  console.log(`Duplikate für User ${userId} bereinigt.`);
}

function parseEventUrls(value) {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item).trim()).filter(Boolean);
      }
    } catch {
      return [];
    }
  }

  return [];
}

async function runCronEvents() {
  console.log('Starte nächtlichen Event-Import...');

  await deleteOldEvents();

  const users = await sql`
    SELECT user_id, lat, lon, town, event_urls
    FROM user_settings
    WHERE user_id IS NOT NULL
  `;
  console.log(`User-Liste geladen: ${users.length} Nutzer gefunden.`);

  for (const user of users) {
    const userId = user.user_id;
    const eventUrls = parseEventUrls(user.event_urls);
    console.log(`Verarbeite User ${userId} (${user.town || 'n/a'})...`);
    console.log(`Event-URLs für User ${userId}:`, eventUrls);

    if (eventUrls.length === 0) {
      console.log(`Überspringe User ${userId}: Keine event_urls in user_settings (lat=${user.lat}, lon=${user.lon}, town=${user.town || 'n/a'}).`);
      continue;
    }

    const days = [];
    for (let i = 1; i <= 1; i += 1) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      const dayString = date.toISOString().slice(0, 10);
      days.push(dayString);
    }
    console.log(`Hole Events für User ${userId} von URLs:`, eventUrls, 'für Tage:', days);

    const events = await fetchOpenAiEvents(eventUrls, days);
    console.log(`Events erhalten für User ${userId}:`, events.length);
    await insertEventsForUser(userId, events);

    await cleanupDuplicatesForUser(userId);
    console.log(`Events für User ${userId} aktualisiert.`);
  }

  console.log('Event-Import abgeschlossen.');
}

runCronEvents()
  .catch((error) => {
    console.error('Cronjob fehlgeschlagen:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sql.end({ timeout: 5 });
  });