import { getJson } from "serpapi";


// Beispiel-Parameter – hier kannst du experimentieren
const params = {
  engine: "google_events",
  q: "Events in Greifswald",
  htichips: "date:2026-03-02", // z.B. heutiges Datum
  google_domain: "google.de",
  hl: "de",
  gl: "de",
  location: "Greifswald",
  api_key: "d9ab470b751b2765f3a4bf091104f03239654439fa2b04b20d4f5715215c2e31",
};

async function testSerpApi() {
  try {
    const data = await getJson(params);
    console.log("Ergebnis:", JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Fehler bei der SERPAPI-Abfrage:", error);
  }
}

testSerpApi();