import { fetchWeatherApi } from "openmeteo";
import OpenAI from "openai";
import { v2 as cloudinary } from "cloudinary";

type GetBackgroundImageParams = {
    userId: string;
    lat: number;
    lon: number;
    openAiApiKey: string;
    cloudinaryConfig: {
        cloudName: string;
        apiKey: string;
        apiSecret: string;
    };
};

const getWeatherDescription = (code: number): string => {
    switch (code) {
        case 0:
            return "Klarer Himmel";
        case 1:
            return "Hauptsächlich klar";
        case 2:
            return "Teilweise bewölkt";
        case 3:
            return "Bedeckt";
        case 45:
            return "Normaler Nebel ohne Rauhreifbildung";
        case 48:
            return "Nebel oder Reifnebel";
        case 51:
            return "Leichter Nieselregen";
        case 53:
            return "Mäßiger Nieselregen";
        case 55:
            return "Dichter Nieselregen";
        case 61:
            return "Leichter Regen";
        case 63:
            return "Mäßiger Regen";
        case 65:
            return "Starker Regen";
        case 71:
            return "Leichter Schneefall";
        case 73:
            return "Mäßiger Schneefall";
        case 75:
            return "Starker Schneefall";
        case 77:
            return "Schneegriesel";
        case 80:
            return "Leichte Regenschauer";
        case 81:
            return "Mäßige Regenschauer";
        case 82:
            return "Starke Regenschauer";
        case 85:
            return "Leichte Schneeschauer";
        case 86:
            return "Starke Schneeschauer";
        case 95:
            return "Gewitter";
        case 96:
            return "Gewitter mit Hagel oder Graupel";
        case 99:
            return "Starkes Gewitter mit Hagel";
        default:
            return "Unbekanntes Wetter";
    }
};

export async function getBackgroundImage({
    userId,
    lat,
    lon,
    openAiApiKey,
    cloudinaryConfig,
}: GetBackgroundImageParams): Promise<string> {
    console.log("[startpage/generate] begin", {
        userId,
        lat,
        lon,
        hasOpenAiKey: Boolean(openAiApiKey),
        hasCloudName: Boolean(cloudinaryConfig.cloudName),
        hasApiKey: Boolean(cloudinaryConfig.apiKey),
        hasApiSecret: Boolean(cloudinaryConfig.apiSecret),
    });
    if (!openAiApiKey) {
        throw new Error("OpenAI-Key fehlt in user_settings.key2.");
    }

    const openai = new OpenAI({ apiKey: openAiApiKey });

    cloudinary.config({
        cloud_name: cloudinaryConfig.cloudName,
        api_key: cloudinaryConfig.apiKey,
        api_secret: cloudinaryConfig.apiSecret,
        secure: true,
    });

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

    console.log("getBackgroundImage params:", params);

    const url = "https://api.open-meteo.com/v1/forecast";
    const responses = await fetchWeatherApi(url, params);
    const response = responses[0];

    if (!response) {
        throw new Error("No weather API response received.");
    }

    const daily = response.daily();
    if (!daily) {
        throw new Error("Keine Wetterdaten verfügbar.");
    }

    const weatherCode = daily.variables(0)?.valuesArray()?.[0];
    const maxTemp = daily.variables(1)?.valuesArray()?.[0];

    console.log("[startpage/generate] weather data", {
       userId,
       weatherCode,
       maxTemp,
    });

    if (weatherCode === undefined || maxTemp === undefined) {
        throw new Error("Keine Wetterdaten für diesen Tag gefunden.");
    }

    const weatherDesc = getWeatherDescription(weatherCode);

    const prompt = `
Erstelle ein extrem fotorealistisches Landschaftsfoto für die Koordinaten (${lat}, ${lon}).

Berücksichtige:
- reale Topografie dieser Region
- typische Vegetation in der Region
- typische Vegetation am ${dateString}
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
`.trim();

    console.log("GPT prompt:", prompt);
    console.log("[startpage/generate] requesting image from OpenAI", {
        userId,
        model: "gpt-image-1",
        size: "1536x1024",
    });

    const imageRes = await openai.images.generate({
        model: "gpt-image-1",
        prompt,
        n: 1,
        size: "1536x1024",
    });

    const base64Image = imageRes.data?.[0]?.b64_json;
    if (!base64Image) {
        throw new Error("Kein Bild von OpenAI erhalten.");
    }

    console.log("[startpage/generate] received image payload from OpenAI", {
        userId,
        base64Length: base64Image.length,
    });

    const result = await cloudinary.uploader.upload(
        `data:image/png;base64,${base64Image}`,
        {
            public_id: userId,
            folder: "user_profiles",
            overwrite: true,
            invalidate: true,
        }
    );

    console.log("Cloudinary Upload Result:", result.secure_url);
    console.log("[startpage/generate] upload finished", {
        userId,
        urlPreview: result.secure_url?.slice(0, 80) ?? null,
        version: result.version ?? null,
    });

    return result.secure_url;
}
