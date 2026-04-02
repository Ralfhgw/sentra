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

type ReverseLocation = {
    displayName?: string;
    town?: string;
    county?: string;
    state?: string;
    country?: string;
};

type OsmElement = {
    tags?: Record<string, string>;
};

type OsmResponse = {
    elements?: OsmElement[];
};

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/reverse";
const OVERPASS_ENDPOINTS = [
    "https://overpass-api.de/api/interpreter",
    "https://lz4.overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
] as const;
const GEO_USER_AGENT = "SentraApp/1.0 (startpage background generator)";
const DEFAULT_LANDSCAPE_DESCRIPTION =
    "gemischte Landschaft mit offenen Flaechen und natuerlicher Vegetation";

const getWeatherDescription = (code: number): string => {
    switch (code) {
        case 0:
            return "Klarer Himmel";
        case 1:
            return "Hauptsaechlich klar";
        case 2:
            return "Teilweise bewoelkt";
        case 3:
            return "Bedeckt";
        case 45:
            return "Normaler Nebel ohne Rauhreifbildung";
        case 48:
            return "Nebel oder Reifnebel";
        case 51:
            return "Leichter Nieselregen";
        case 53:
            return "Maessiger Nieselregen";
        case 55:
            return "Dichter Nieselregen";
        case 61:
            return "Leichter Regen";
        case 63:
            return "Maessiger Regen";
        case 65:
            return "Starker Regen";
        case 71:
            return "Leichter Schneefall";
        case 73:
            return "Maessiger Schneefall";
        case 75:
            return "Starker Schneefall";
        case 77:
            return "Schneegriesel";
        case 80:
            return "Leichte Regenschauer";
        case 81:
            return "Maessige Regenschauer";
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

async function getLocationFromCoords(
    lat: number,
    lon: number
): Promise<ReverseLocation | null> {
    try {
        const url = new URL(NOMINATIM_URL);
        url.searchParams.set("accept-language", "de");
        url.searchParams.set("format", "json");
        url.searchParams.set("lat", lat.toString());
        url.searchParams.set("lon", lon.toString());
        url.searchParams.set("zoom", "10");
        url.searchParams.set("addressdetails", "1");

        const response = await fetch(url.toString(), {
            headers: {
                "User-Agent": GEO_USER_AGENT,
            },
        });

        if (!response.ok) {
            console.warn("[startpage/generate] reverse geocoding failed", {
                lat,
                lon,
                status: response.status,
            });
            return null;
        }

        const data = (await response.json()) as {
            address?: Record<string, string>;
            display_name?: string;
        };
        const address = data.address ?? {};

        return {
            displayName: data.display_name,
            town:
                address.town ??
                address.village ??
                address.hamlet ??
                address.city ??
                address.suburb ??
                address.neighbourhood ??
                address.locality,
            county: address.county,
            state: address.state,
            country: address.country,
        };
    } catch (error) {
        console.warn("[startpage/generate] reverse geocoding error", {
            lat,
            lon,
            error,
        });
        return null;
    }
}

async function fetchOsmFeatures(
    lat: number,
    lon: number
): Promise<OsmResponse | null> {
    const query = `
[out:json][timeout:25];
(
  way(around:3000, ${lat}, ${lon})["natural"];
  way(around:3000, ${lat}, ${lon})["landuse"];
  relation(around:3000, ${lat}, ${lon})["natural"];
  relation(around:3000, ${lat}, ${lon})["landuse"];
);
out tags;
`.trim();

    for (const endpoint of OVERPASS_ENDPOINTS) {
        try {
            const response = await fetch(endpoint, {
                method: "POST",
                headers: {
                    "User-Agent": GEO_USER_AGENT,
                },
                body: query,
            });

            if (!response.ok) {
                console.warn("[startpage/generate] overpass request failed", {
                    endpoint,
                    lat,
                    lon,
                    status: response.status,
                });
                continue;
            }

            const data = (await response.json()) as OsmResponse;
            if (Array.isArray(data.elements)) {
                return data;
            }
        } catch (error) {
            console.warn("[startpage/generate] overpass request error", {
                endpoint,
                lat,
                lon,
                error,
            });
        }
    }

    return null;
}

function interpretLandscape(osmData: OsmResponse | null, state?: string): string {
    const elements = osmData?.elements ?? [];
    const tags = elements
        .map((element) => element.tags ?? {})
        .filter((tag) => Object.keys(tag).length > 0);
    const has = (key: string, value: string) =>
        tags.some((tag) => tag[key] === value);

    const result: string[] = [];

    if (state && ["Mecklenburg-Vorpommern", "Niedersachsen"].includes(state)) {
        result.push("flache Landschaft");
    }

    if (has("natural", "coastline")) {
        result.push("Kuestenlandschaft mit maritimem Einfluss");
    } else if (has("natural", "water")) {
        result.push("Naehe zu groesseren Gewaessern");
    }

    if (has("landuse", "farmland")) {
        result.push("weite landwirtschaftliche Felder");
    }

    if (has("landuse", "meadow")) {
        result.push("Wiesenlandschaft");
    }

    if (has("landuse", "forest") || has("natural", "wood")) {
        result.push("teilweise bewaldet");
    }

    if (has("natural", "wetland")) {
        result.push("feuchte Niederungsgebiete");
    }

    if (has("landuse", "residential")) {
        result.push("laendliche Siedlungen");
    }

    if (result.length === 0) {
        return DEFAULT_LANDSCAPE_DESCRIPTION;
    }

    return result.join(", ");
}

function buildLandscapeContext(
    location: ReverseLocation | null,
    landscape: string
): string {
    const locationLabel = [
        location?.town ?? location?.county,
        location?.state,
        location?.country,
    ]
        .filter(Boolean)
        .join(", ");

    if (!locationLabel) {
        return landscape;
    }

    return `${locationLabel}. ${landscape}.`;
}

async function getLandscapeContext(lat: number, lon: number): Promise<string> {
    const [location, osmData] = await Promise.all([
        getLocationFromCoords(lat, lon),
        fetchOsmFeatures(lat, lon),
    ]);

    const landscape = interpretLandscape(osmData, location?.state);
    return buildLandscapeContext(location, landscape);
}

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
        throw new Error("Keine Wetterdaten verfuegbar.");
    }

    const weatherCode = daily.variables(0)?.valuesArray()?.[0];
    const maxTemp = daily.variables(1)?.valuesArray()?.[0];

    console.log("[startpage/generate] weather data", {
        userId,
        weatherCode,
        maxTemp,
    });

    if (weatherCode === undefined || maxTemp === undefined) {
        throw new Error("Keine Wetterdaten fuer diesen Tag gefunden.");
    }

    const weatherDesc = getWeatherDescription(weatherCode);
    const landscapeContext = await getLandscapeContext(lat, lon);

    console.log("[startpage/generate] landscape context", {
        userId,
        landscapeContext,
    });

    const prompt = `
Erstelle ein extrem fotorealistisches Landschaftsfoto fuer diese reale Umgebung:
${landscapeContext}

Beruecksichtige:
- reale Topografie dieser Region
- typische Vegetation in der Region
- typische Vegetation am ${dateString}
- korrekten regionalen Baustil der Gebaeude
- geografisch plausible Landschaftsmerkmale

Wetter:
${weatherDesc}, maximale Temperatur ${maxTemp.toFixed(1)}°C.
Stelle die Wetterlage visuell realistisch dar:
- physikalisch korrekte Lichtverhaeltnisse
- passende Wolkenstruktur
- atmosphaerische Tiefe
- realistische Schattenintensitaet
- Oberflaechen entsprechend trocken, nass oder verschneit

Temperatur visuell beruecksichtigen:
- Farbtemperatur der Szene passend zur Lufttemperatur
- ggf. Hitzeflimmern bei hoher Temperatur
- kaltes, blaeuliches Licht bei niedrigen Temperaturen

Fotografie:
Professionelle DSLR-Aufnahme.
35mm Objektiv, Blende f/8.
Natuerliches Licht.
Hoher Dynamikumfang.
Keine HDR-Uebertreibung.
Kein CGI-Look.
Keine kuenstliche Uebersaettigung.
Realistische Tiefenschaerfe.
Augenhoehe ca. 1,6m.

Wichtige Einschraenkungen:
Keine Menschen.
Keine Tiere.
Keine Fahrzeuge.
Keine Fantasy-Elemente.
Keine futuristische Architektur.
Keine Illustration.
Keine stilisierte oder kuenstlerische Interpretation.

Stimmung:
Natuerlich, hochwertig, wie ein echtes Landschaftsfoto eines professionellen Fotografen.
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
