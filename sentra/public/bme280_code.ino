#include <ESP8266WiFi.h>
#include <PubSubClient.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_BME280.h>
#include <cmath>

// --- KONFIGURATION ---
// The Sensor BME280 need a wireguard VPN connection to the MQTT
const char* ssid = "<your-SSID>";
const char* password = "<your-Password>";
const char* TOPIC_STATUS  = "<your-sensor-status-channel>";
const char* TOPIC_CLIMATE = "<your-sensor-climate-channel>";

// MQTT Server reachable via VPN
const char* mqtt_server = "<your-MQTT-proxy>"; 
WiFiClient espClient;
PubSubClient client(espClient);
Adafruit_BME280 bme;

void setup() {
  Serial.begin(115200);
  Wire.begin(D2, D1); 

  if (!bme.begin(0x77)) {
    Serial.println("BME280 not found!");
    while (1);
  }

  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  
  client.setServer(mqtt_server, 1883);
}

void reconnect() {
  while (!client.connected()) {
    String clientId = "ESP8266_" + String(WiFi.macAddress());
    
    const char* lwtMessage = "offline";
    
    // 👉 Verwendung des zentral definierten Topics
    if (client.connect(clientId.c_str(), TOPIC_STATUS, 1, true, lwtMessage)) {
      Serial.println("Connected");
      
      // "online" senden
      client.publish(TOPIC_STATUS, "online", true);
    } else {
      delay(5000);
    }
  }
}

void loop() {
  if (!client.connected()) reconnect();
  client.loop();

  // 1. Daten auslesen
  float t = bme.readTemperature();

  if (isnan(t) || t < -40 || t > 85) { 
    client.publish(TOPIC_STATUS, "sensor_error", true);
  } else {
    float h = bme.readHumidity();
    float p = bme.readPressure() / 100.0F;

    // 2. Taupunkt berechnen (Magnus-Formel)
    float a = 17.27;
    float b = 237.7;
    float alpha = ((a * t) / (b + t)) + log(h / 100.0);
    float dp = (b * alpha) / (a - alpha);

    // 3. JSON-String bauen
    String payload = "{";
    payload += "\"temp\":" + String(t) + ",";
    payload += "\"hum\":" + String(h) + ",";
    payload += "\"pres\":" + String(p) + ",";
    payload += "\"dew\":" + String(dp);
    payload += "}";

    // 4. Senden
    Serial.print("Payload: ");
    Serial.println(payload);

    client.publish(TOPIC_CLIMATE, payload.c_str(), true);
  } 

  delay(10000); 
}