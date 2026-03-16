const express = require("express");
const postgres = require("postgres");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const cookieParser = require("cookie-parser");
const cors = require("cors");

const requiredEnv = ["DATABASE_URL", "JWT_SECRET", "REFRESH_SECRET"];
for (const key of requiredEnv) {
  if (!process.env[key]) {
    throw new Error(`Missing env var: ${key}`);
  }
}

const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;

const getTimestamp = () => `[${new Date().toISOString()}]`;

console.log = (...args) => originalLog(getTimestamp(), ...args);
console.error = (...args) => originalError(getTimestamp(), ...args);
console.warn = (...args) => originalWarn(getTimestamp(), ...args);

const app = express();
app.set("trust proxy", 1);

const sql = postgres(process.env.DATABASE_URL);
const PORT = Number(process.env.PORT || 3000);
const isProd = process.env.NODE_ENV === "production";

const allowedOrigins = (process.env.CORS_ORIGINS ||
  "http://localhost:3000,http://127.0.0.1:3000")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

const corsOptions = {
  origin(origin, cb) {
    // Allow non-browser clients (curl/postman)
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));

app.use(express.json());
app.use(cookieParser());

function signAccessToken(userId) {
  return jwt.sign({}, process.env.JWT_SECRET, { expiresIn: "1m", subject: userId });
  //return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "15m" });
}

function signRefreshToken(userId) {
  return jwt.sign({ id: userId }, process.env.REFRESH_SECRET, { expiresIn: "7d" });
}

function cookieBase() {
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    path: "/",
  };
}

function setAuthCookies(res, userId) {
  const accessToken = signAccessToken(userId);
  const refreshToken = signRefreshToken(userId);
  const base = cookieBase();

  res.cookie("accessToken", accessToken, {
    ...base,
    maxAge: 1 * 60 * 1000,
  });

  res.cookie("refreshToken", refreshToken, {
    ...base,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return { accessToken, refreshToken };
}

app.get("/health", (_req, res) => {
  try {
    res.json({ ok: true });
    console.log(`[${new Date().toISOString()}] Health-Check: OK - Server ist erreichbar.`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Health-Check: ERROR -`, error);
    res.status(500).json({ ok: false, error: "Internal Server Error" });
  }
});

// POST /api/auth/register
app.post("/api/auth/register", async (req, res) => {
  const user_name = String(req.body.user_name ?? req.body.username ?? "").trim();
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");

  if (!user_name || !email || !password) {
    console.warn(`[AUTH] Registrierung fehlgeschlagen: Fehlende Felder für Email: ${email || "unbekannt"}`);
    return res.status(400).json({
      error: "user_name, email und password sind Pflicht",
    });
  }

  try {
    const hashed_password = await bcrypt.hash(password, 10);

    const [user] = await sql`
  INSERT INTO users (user_name, hashed_password, email, is_active)
  VALUES (${user_name}, ${hashed_password}, ${email}, true)
  RETURNING id, user_name, email, is_active
`;
    console.log(`[AUTH] User erfolgreich registriert: ID ${user.id}, Name: ${user.user_name}`);
    return res.status(201).json(user);

  } catch (err) {
    if (err && err.code === "23505") {
      console.warn(`[AUTH] Konflikt: Nutzername oder Email bereits vorhanden (${email})`);
      return res.status(409).json({ error: "Nutzername oder Email bereits vergeben" });
    }
    console.error(`[AUTH] Schwerwiegender Fehler bei Registrierung von ${email}:`, err);
    return res.status(500).json({ error: "Interner Serverfehler" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const email = req.body.email ? String(req.body.email).trim().toLowerCase() : null;
  const password = String(req.body.password || "");

  if (!password || !email) {
    console.warn(`[LOGIN] Versuch ohne Email oder Passwort von: ${email || "unbekannt"}`);
    return res.status(400).json({
      error: "email sowie password sind Pflicht",
    });
  }

  try {
    let user;
    [user] = await sql`
        SELECT id, user_name, email, hashed_password, is_active
        FROM users
        WHERE email = ${email}
        LIMIT 1
      `;

    if (!user || user.is_active === false) {
      console.warn(`[LOGIN] Fehlgeschlagen: Account nicht gefunden oder inaktiv (${email})`);
      return res.status(401).json({ error: "Ungültige Anmeldedaten" });
    }

    const ok = await bcrypt.compare(password, user.hashed_password);
    if (!ok) {
      console.warn(`[LOGIN] Fehlgeschlagen: Falsches Passwort für ${email}`);
      return res.status(401).json({ error: "Ungültige Anmeldedaten" });
    }

    const { accessToken } = setAuthCookies(res, user.id);
    console.log(`[LOGIN] Erfolgreich: User ${user.user_name} (ID: ${user.id}) eingeloggt.`);

    return res.json({
      accessToken,
      user: {
        id: user.id,
        user_name: user.user_name,
        email: user.email,
      },
    });
  } catch (err) {
    console.error(`[LOGIN] Kritischer Fehler bei ${email}:`, err);
    return res.status(500).json({ error: "Interner Serverfehler" });
  }
});

// POST /api/auth/refresh
app.post("/api/auth/refresh", async (req, res) => {
  const token = req.cookies.refreshToken;

  if (!token) {
    console.warn("[REFRESH] Fehlgeschlagen: Kein Refresh-Token in Cookies gefunden.");
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const decoded = jwt.verify(token, process.env.REFRESH_SECRET);
    if (!decoded || typeof decoded !== "object" || !decoded.id) {
      console.warn("[REFRESH] Fehlgeschlagen: Token-Inhalt ungültig.");
      return res.status(403).json({ error: "Invalid refresh token" });
    }

    const [user] = await sql`
      SELECT id, user_name, email, is_active
      FROM users
      WHERE id = ${decoded.id}
      LIMIT 1
    `;

    if (!user || user.is_active === false) {
      console.warn(`[REFRESH] Fehlgeschlagen: User ID ${decoded.id} nicht gefunden oder inaktiv.`);
      return res.status(401).json({ error: "Unauthorized" });
    }

    const accessToken = signAccessToken(user.id);
    res.cookie("accessToken", accessToken, {
      ...cookieBase(),
      maxAge: 1 * 60 * 1000,
    });

    console.log(`[REFRESH] Erfolgreich: Neues AccessToken für User ID ${user.id} ausgestellt.`);
    return res.json({
      accessToken,
      user: {
        id: user.id,
        user_name: user.user_name,
        email: user.email,
      },
    });
  } catch (err) {
    console.error("[REFRESH] Fehler bei Token-Verifizierung:", err.message);
    return res.status(403).json({ error: "Invalid refresh token" });
  }
});

// POST /api/auth/logout
app.post("/api/auth/logout", (req, res) => {
  const base = cookieBase();
  res.clearCookie("accessToken", base);
  res.clearCookie("refreshToken", base);
  
  console.log("[LOGOUT] Cookies gelöscht, User ausgeloggt.");
  return res.json({ message: "Logout erfolgreich" });
});

app.use((err, _req, res, _next) => {
  if (err && String(err.message || "").startsWith("CORS blocked")) {
    console.warn(`[CORS] Zugriff verweigert: ${err.message}`);
    return res.status(403).json({ error: err.message });
  }
  
  console.error("[SERVER] Unbehandelter Fehler:", err);
  return res.status(500).json({ error: "Interner Serverfehler" });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log("-----------------------------------------");
  console.log(`[START] Auth server listening on 0.0.0.0:${PORT}`);
  console.log(`[START] Allowed origins: ${allowedOrigins.join(", ")}`);
  console.log("-----------------------------------------");
});
