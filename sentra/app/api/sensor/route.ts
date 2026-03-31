import { NextResponse } from 'next/server';
import mqtt from 'mqtt';
import { getAuthenticatedUserFromCookies } from '@/utils/serverAuth'; 

export async function GET() {
    try {
        const { userId } = await getAuthenticatedUserFromCookies();
        const indoorClimateTopic = `${userId}/in/climate`;
        const outdoorClimateTopic = `${userId}/out/climate`;
        const indoorStatusTopic = `${userId}/in/stat`;
        const outdoorStatusTopic = `${userId}/out/stat`;

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
                resolve(results);
            }, 4000);

            client.on('connect', () => {
                console.log("Verbunden mit Broker!");
                client.subscribe([
                    indoorClimateTopic,
                    outdoorClimateTopic,
                    indoorStatusTopic,
                    outdoorStatusTopic
                ]);
            });

            client.on('message', (topic, message) => {
                console.log(`Nachricht erhalten von ${topic}:`, message.toString());
                const msgStr = message.toString();
                if (topic === indoorClimateTopic) results.indoor = msgStr;
                else if (topic === outdoorClimateTopic) results.outdoor = msgStr;
                else if (topic === indoorStatusTopic) results.indoorStatus = msgStr;
                else if (topic === outdoorStatusTopic) results.outdoorStatus = msgStr;

                if (results.indoor && results.outdoor && results.indoorStatus && results.outdoorStatus) {
                    clearTimeout(timeout);
                    client.end(true);
                    resolve(results);
                }
            });

            client.on('error', (err) => {
                console.error("MQTT Fehler:", err);
                clearTimeout(timeout);
                client.end(true);
                reject(err);
            });
        }); 

        return NextResponse.json({ wert: data });

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Ein unbekannter Fehler ist aufgetreten';
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}