import { fetchWeatherApi } from "openmeteo"; // Stelle sicher, dass 'openmeteo-sdk' installiert ist
import fs from "fs/promises";
import path from "path";
import OpenAI from "openai";
import { v2 as cloudinary } from "cloudinary";

const { OPENAI_API_KEY } = process.env;
const openai = new OpenAI({ apiKey: OPENAI_API_KEY! });

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
});

const getWeatherDescription = (code: number) => {
    if (code === 0) return "klarer Himmel";
    if (code < 4) return "leicht bewölkt";
    if (code < 70) return "regnerisch";
    if (code < 80) return "Schneefall";
    return "stürmisch";
};

export async function getBackgroundImage(userId: string, lat: number, lon: number) {
    const today = new Date();
    const dateString = today.toISOString().split("T")[0];

    const params = {
        latitude: lat,
        longitude: lon,
        daily: ["weather_code", "temperature_2m_max"],
        start_date: dateString,
        end_date: dateString,
        timezone: "auto",
    };
console.log("GetBackGroundImage params:", params);

    const url = "https://api.open-meteo.com/v1/forecast";
    const responses = await fetchWeatherApi(url, params);
    const response = responses[0];

    if (!response) {
        throw new Error("No weather API response received.");
    }


    const daily = response.daily()!;

    const weatherCode = daily.variables(0)!.valuesArray()![0];
    const maxTemp = daily.variables(1)!.valuesArray()![0];

    if (weatherCode === undefined || maxTemp === undefined) {
        throw new Error("Keine Wetterdaten für diesen Tag gefunden.");
    }

    const weatherDesc = getWeatherDescription(weatherCode);

    const prompt = `
Erstelle ein extrem fotorealistisches Landschaftsfoto für die Koordinaten (${lat}, ${lon}).

Berücksichtige:
- reale Topografie dieser Region
- typische Vegetation
- korrekten regionalen Baustil der Gebäude
- geografisch plausible Landschaftsmerkmale

Wetter:
${weatherDesc}, maximale Temperatur ${maxTemp.toFixed(1)}°C.
Stelle die Wetterlage visuell realistisch dar:
- physikalisch korrekte Lichtverhältnisse
- passende Wolkenstruktur
- atmosphärische Tiefe
- realistische Schattenintensität
- Oberflächen entsprechend trocken, nass oder verschneit

Temperatur visuell berücksichtigen:
- Farbtemperatur der Szene passend zur Lufttemperatur
- ggf. Hitzeflimmern bei hoher Temperatur
- kaltes, bläuliches Licht bei niedrigen Temperaturen

Fotografie:
Professionelle DSLR-Aufnahme.
35mm Objektiv, Blende f/8.
Natürliches Licht.
Hoher Dynamikumfang.
Keine HDR-Übertreibung.
Kein CGI-Look.
Keine künstliche Übersättigung.
Realistische Tiefenschärfe.
Augenhöhe ca. 1,6m.

Wichtige Einschränkungen:
Keine Menschen.
Keine Tiere.
Keine Fahrzeuge.
Keine Fantasy-Elemente.
Keine futuristische Architektur.
Keine Illustration.
Keine stilisierte oder künstlerische Interpretation.

Stimmung:
Natürlich, hochwertig, wie ein echtes Landschaftsfoto eines professionellen Fotografen.
`;

    console.log("GPTPROMPT:", prompt);

    const imageRes = await openai.images.generate({
        model: "gpt-image-1.5",
        prompt,
        n: 1,
        size: "1536x1024",
    });

    if (!imageRes.data || imageRes.data.length === 0 || !imageRes.data[0].b64_json) {
        throw new Error("Kein Bild von OpenAI erhalten.");
    }
    const imageBase64 = imageRes.data[0].b64_json!;
    const buffer = Buffer.from(imageBase64, "base64");

    const fileDir = path.join(process.cwd(), "public", "backgrounds");
    const tempFilePath = path.join(fileDir, `${userId}.png`);

    await fs.mkdir(fileDir, { recursive: true });
    await fs.writeFile(tempFilePath, buffer);

    const result = await cloudinary.uploader.upload(tempFilePath, {
        public_id: userId,
        folder: "user_profiles",
        overwrite: true,
        invalidate: true
    });
    console.log("Cloudinary Upload Result:", result.secure_url);

    let i = 1;
    let numberedPath;
    do {
        const suffix = String(i).padStart(3, "0");
        numberedPath = path.join(fileDir, `${userId}-${suffix}.png`);
        i++;
    } while (await fs.stat(numberedPath).then(() => true).catch(() => false));
    await fs.rename(tempFilePath, numberedPath);

    console.log(`/backgrounds/${path.basename(numberedPath)}`)
    return;
}
