// testAuth.js
import axios from "axios";

const apiHost = process.env.NEXT_PUBLIC_AUTH_HOST || "http://localhost:3001";

const clientId = process.env.AUTH_CLIENT_ID || "webapp";
const apiKey = process.env.AUTH_API_KEY || "change-me";

const body = {
  user_name: "testuser4",
  email: "test@example.com",
  password: "sicherespasswort123",
};

async function main() {
  console.log("Body to send:", body);
  console.log("API Host:", apiHost, "/api/auth/register");

  try {
    const response = await axios.post(`${apiHost}/api/auth/register`, body, {
      headers: {
        "Content-Type": "application/json",
        "x-client-id": clientId,
        "x-api-key": apiKey,
      },
    });

    console.log("Status:", response.status);
    console.log("Response:", response.data);

    if (response.status < 200 || response.status >= 300) {
      throw new Error(`API returned error ${response.status}`);
    }

    console.log("Registrierung erfolgreich.");
  } catch (e) {
    if (axios.isAxiosError(e)) {
      console.error("Register test error:", e.message);
      if (e.response) {
        console.error("Status:", e.response.status);
        console.error("Response:", e.response.data);
      }
    } else {
      console.error("Register test error:", e);
    }
    process.exitCode = 1;
  }
}

main();