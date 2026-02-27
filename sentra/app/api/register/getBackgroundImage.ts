import { fetchWeatherApi } from "openmeteo"; // Stelle sicher, dass 'openmeteo-sdk' installiert ist
import fs from "fs/promises";
import path from "path";
import OpenAI from "openai";

const { OPENAI_API_KEY } = process.env;
const openai = new OpenAI({ apiKey: OPENAI_API_KEY! });

// Hilfsfunktion zur Interpretation der Codes für bessere Prompts
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
        daily: ["weather_code", "temperature_2m_max"], // "weather_code" ist der aktuelle Standard
        start_date: dateString,
        end_date: dateString,
        timezone: "auto",
    };

    const url = "https://api.open-meteo.com/v1/forecast";
    const responses = await fetchWeatherApi(url, params);
    const response = responses[0];

    if (!response) {
        throw new Error("No weather API response received.");
    }

    // Extraktion der täglichen Daten aus dem SDK-Format
    const daily = response.daily()!;
    
    // Die Werte liegen in Float32Arrays vor
    const weatherCode = daily.variables(0)!.valuesArray()![0];
    const maxTemp = daily.variables(1)!.valuesArray()![0];

    if (weatherCode === undefined || maxTemp === undefined) {
        throw new Error("Keine Wetterdaten für diesen Tag gefunden.");
    }

    const weatherDesc = getWeatherDescription(weatherCode);

    // Prompt mit echtem Text statt nur Zahlen verbessert das Ergebnis von DALL-E enorm
    const prompt = `Erstelle ein fotorealistisches Landschaftsbild für die Koordinaten (${lat}, ${lon}). 
    Das Wetter ist ${weatherDesc} (Wetter-Code ${weatherCode}) bei einer Temperatur von ${maxTemp.toFixed(1)}°C. 
    Stimmung: Atmosphärisch und hochwertig.`;
    
    console.log("GPTPROMPT:", prompt);

    /* 
    // OpenAI Bildgenerierung
    const imageRes = await openai.images.generate({
        prompt,
        n: 1,
        size: "1024x1024",
        response_format: "b64_json",
    });

    const imageBase64 = imageRes.data[0].b64_json!;
    const buffer = Buffer.from(imageBase64, "base64");

    const filePath = path.join(process.cwd(), "public", "backgrounds", `${userId}_${dateString}.png`);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, buffer); 
    */

    console.log(`/backgrounds/${userId}_${dateString}.png`);
    return `/backgrounds/${userId}_${dateString}.png`;
}
