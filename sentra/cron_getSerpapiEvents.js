import postgres from 'postgres';
import { getJson } from 'serpapi';
import 'dotenv/config';
const { POSTGRES_URL, SERPAPI_KEY } = process.env;

if (!POSTGRES_URL) {
  throw new Error('Fehlende POSTGRES_URL-Variable – prüfe deine .env');
}

if (!SERPAPI_KEY) {
  throw new Error('Fehlende SERPAPI_KEY-Variable – prüfe deine .env');
}

const sql = postgres(POSTGRES_URL, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
  ssl: 'require',
});

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

async function fetchGoogleEvents(town, dayString) {
  try {
    const data = await getJson({
      engine: 'google_events',
      q: `Events in ${town}`,
      htichips: `date:${dayString}`,
      google_domain: 'google.de',
      hl: 'de',
      gl: 'de',
      location: town,
      api_key: SERPAPI_KEY,
    });

    return data.events_results || [];
  } catch (error) {
    console.error(`SerpApi-Fehler für ${town} (${dayString}):`, error);
    return [];
  }
}

async function deleteOldEvents() {
  const todayString = new Date().toISOString().slice(0, 10);

  await sql`
    DELETE FROM events
    WHERE date < ${todayString}
  `;
}

async function insertEventsForUser(userId, town, dayString, events) {
  const domain = 'https://serpapi.com/';

  for (const event of events) {
    const filtered = filterEventData(event);

    let description = filtered.description || '';
    if (filtered.date) {
      description += `\n[Original date: ${formatDate(filtered.date)}]`;
    }

    await sql`
      INSERT INTO events (user_id, title, date, address, link, description, image, domain)
      SELECT
        ${userId},
        ${filtered.title},
        ${dayString},
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
          AND date = ${dayString}
      )
    `;
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
}

async function runCronEvents() {
  console.log('Starte nächtlichen Event-Import...');

  await deleteOldEvents();

  const users = await sql`
    SELECT user_id, lat, lon, town, key1
    FROM user_settings
    WHERE user_id IS NOT NULL
  `;

  for (const user of users) {
    const userId = user.user_id;
    const town = user.town;

    if (!town) {
      console.log(`Überspringe User ${userId}: Kein town in user_settings (lat=${user.lat}, lon=${user.lon}).`);
      continue;
    }

    for (let i = 1; i <= 2; i += 1) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      const dayString = date.toISOString().slice(0, 10);

      const apiKey = user.key1?.trim();

      if (!apiKey) {
        console.log(`Überspringe User ${userId}: Kein SERPAPI_KEY in user_settings.key1.`);
        continue;
      }

      const events = await fetchGoogleEvents(town, dayString, apiKey);
      await insertEventsForUser(userId, town, dayString, events);
    }

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