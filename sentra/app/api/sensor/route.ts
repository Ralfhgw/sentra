import { NextResponse } from 'next/server';
import mqtt from 'mqtt';

export async function GET() {
//const brokerUrl = 'mqtt://192.168.2.77:1883';

    try {
        const data = await new Promise((resolve, reject) => {
            // Verbindung ohne zusätzliche Optionen-Objekte (weniger fehleranfällig)
            //const client = mqtt.connect(brokerUrl, { connectTimeout: 5000 });
            const client = mqtt.connect({
                host: 'localhost',
                port: 1883,
                protocol: 'mqtt',
                connectTimeout: 5000
            });
            const timeout = setTimeout(() => {
                if (client.connected) client.end();
                resolve("Timeout: Keine Daten vom Sensor empfangen");
            }, 4000);

            client.on('connect', () => {
                console.log("Verbunden mit Broker!");
                client.subscribe('indoor/sensor/climate');
            });

            client.on('message', (topic, message) => {
                console.log("Nachricht erhalten:", message.toString());
                clearTimeout(timeout);
                const result = message.toString();
                client.end(true); // 'true' erzwingt das sofortige Schließen
                resolve(result);
            });

            client.on('error', (err) => {
                console.error("MQTT Fehler:", err);
                client.end();
                reject(err);
            });
        });

        return NextResponse.json({ wert: data });

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Ein unbekannter Fehler ist aufgetreten';
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
