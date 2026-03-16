import OpenAI from 'openai';
import 'dotenv/config';

const { OPENAI_API_KEY } = process.env;

if (!OPENAI_API_KEY) {
    throw new Error('Fehlende OPENAI_API_KEY-Variable – prüfe deine .env');
}

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

async function testPrompt() {
    try {
        console.log('Starte OpenAI-Request...');
const response = await openai.responses.create({
  model: "gpt-5-mini",
  max_output_tokens: 2000,
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
Du bist ein deutscher Datenextraktions-Assistent.

WICHTIGE REGELN:
- Antworte ausschließlich auf Deutsch.
- Gib nur strukturierte Daten aus.
- Keine Einleitungen oder Erklärungen.
- Wenn CSV verlangt wird, gib ausschließlich CSV aus.
`
    },
    {
      role: "user",
      content: `
Rufe die Webseite ${url} auf.

Extrahiere alle Veranstaltungen am Datum ${day}.

Ausgabeformat:
CSV ohne Header mit exakt diesen Spalten:

title;date;address;link;description

Regeln:
- Sprache der Ausgabe: Deutsch
- Trennzeichen: Semikolon (;)
- Jede Veranstaltung = eine Zeile
- link ist immer exakt: ${url}
- description enthält nur Klartext aus der Eventbeschreibung
- Keine HTML-Tags
- Keine Referenzen
- Keine Quellenangaben
- Keine zusätzlichen Texte außerhalb der CSV

Wenn keine Veranstaltungen vorhanden sind, gib exakt diese Zeile aus:

Kein Event gefunden; ; ; ;Für diesen Tag wurden keine Termine gefunden.
`
    }
  ]
});

console.log(response.output_text);
        console.log('OpenAI-Request beendet.');
        if (response.choices && response.choices.length > 0) {
            console.log('OpenAI-Antwort:', response.choices[0].message.content);
        } else {
            console.log('Keine Antwort erhalten:', response);
        }
    } catch (error) {
        console.error('OpenAI-Fehler:', error);
    }
}

testPrompt();