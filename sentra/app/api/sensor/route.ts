import { NextResponse } from 'next/server';
import mqtt from 'mqtt';

export async function GET() {
    try {
        const data = await new Promise((resolve, reject) => {
            const client = mqtt.connect({
                host: 'localhost',
                port: 1883,
                protocol: 'mqtt',
                connectTimeout: 5000
            });

            const results: {
                indoor: string | null,
                outdoor: string | null,
                indoorStatus: string | null,
                outdoorStatus: string | null
            } = {
                indoor: null,
                outdoor: null,
                indoorStatus: null,
                outdoorStatus: null
            };

            const timeout = setTimeout(() => {
                if (client.connected) client.end();
                // Besser das Objekt zurückgeben, auch wenn noch nicht alle Daten da sind
                resolve(results);
            }, 4000);

            client.on('connect', () => {
                console.log("Verbunden mit Broker!");
                client.subscribe([
                    'indoor/sensor/climate',
                    'outdoor/sensor/climate',
                    'indoor/sensor/status',
                    'outdoor/sensor/status'
                ]);
            });

            client.on('message', (topic, message) => {
                console.log(`Nachricht erhalten von ${topic}:`, message.toString());
                const msgStr = message.toString();
                if (topic === 'indoor/sensor/climate') results.indoor = msgStr;
                else if (topic === 'outdoor/sensor/climate') results.outdoor = msgStr;
                else if (topic === 'indoor/sensor/status') results.indoorStatus = msgStr;
                else if (topic === 'outdoor/sensor/status') results.outdoorStatus = msgStr;

                // Optional: Warten, bis alles da ist, oder nach Timeout auflösen
                if (results.indoor && results.outdoor && results.indoorStatus && results.outdoorStatus) {
                    clearTimeout(timeout);
                    client.end(true);
                    resolve(results);
                }
            });

            // WICHTIG: Fehlerbehandlung für den MQTT-Client hinzufügen
            client.on('error', (err) => {
                console.error("MQTT Fehler:", err);
                clearTimeout(timeout);
                client.end(true);
                reject(err);
            });
        }); // <-- FEHLTE VORHER: Hier wird das Promise geschlossen

        return NextResponse.json({ wert: data });

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Ein unbekannter Fehler ist aufgetreten';
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}