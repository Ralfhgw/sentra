const express = require("express");
const postgres = require("postgres");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const crypto = require("crypto");

const requiredEnv = ["DATABASE_URL", "JWT_SECRET"];
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

const defaultRegistrationStatus =
  String(process.env.AUTH_DEFAULT_USER_STATUS ?? "pending").trim().toLowerCase() === "pending"
    ? "pending"
    : "active";

const ACCESS_TOKEN_TTL_MS = 15 * 60 * 1000;
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const allowedOrigins = (process.env.CORS_ORIGINS ||
  "http://localhost:3000,http://127.0.0.1:3000")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

const corsOptions = {
  origin(origin, cb) {
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-client-id", "x-api-key"],
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

function signAccessToken(userId) {
  return jwt.sign({}, process.env.JWT_SECRET, { expiresIn: "15m", subject: userId });
}

function createSessionToken() {
  return crypto.randomBytes(32).toString("base64url");
}

function hashSecret(value) {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function cookieBase() {
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    path: "/",
  };
}

function setAuthCookies(res, accessToken, refreshToken) {
  const base = cookieBase();

  res.cookie("accessToken", accessToken, {
    ...base,
    maxAge: ACCESS_TOKEN_TTL_MS,
  });

  res.cookie("refreshToken", refreshToken, {
    ...base,
    maxAge: REFRESH_TOKEN_TTL_MS,
  });
}

function mapUserToExternalShape(user) {
  return {
    id: user.id,
    publicId: user.public_id ?? null,
    username: user.username,
    email: user.email,
    emailVerifiedAt: user.email_verified_at
      ? new Date(user.email_verified_at).toISOString()
      : null,
    status: user.status,
    createdAt: user.created_at
      ? new Date(user.created_at).toISOString()
      : null,
    updatedAt: user.updated_at
      ? new Date(user.updated_at).toISOString()
      : null,
    lastSignInAt: user.last_sign_in_at
      ? new Date(user.last_sign_in_at).toISOString()
      : null,
  };
}

function buildRegisterSuccessResponse(message, user) {
  return {
    success: true,
    message,
    data: mapUserToExternalShape(user),
  };
}

function buildLoginSuccessResponse(message, user, tokens) {
  return {
    success: true,
    message,
    data: {
      user: mapUserToExternalShape(user),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt.toISOString(),
    },
  };
}

function buildRefreshSuccessResponse(message, user, tokens) {
  return {
    success: true,
    message,
    data: {
      user: mapUserToExternalShape(user),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt.toISOString(),
    },
  };
}

function safeEqual(a, b) {
  const aBuffer = Buffer.from(a, "utf8");
  const bBuffer = Buffer.from(b, "utf8");
  if (aBuffer.length !== bBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(aBuffer, bBuffer);
}

async function hasConfiguredApiClients() {
  const [row] = await sql`
    SELECT EXISTS(SELECT 1 FROM api_clients) AS exists
  `;

  return Boolean(row?.exists);
}

async function issueAuthTokens(res, userId, currentSessionHash = null) {
  const accessToken = signAccessToken(userId);
  const refreshToken = createSessionToken();
  const sessionTokenHash = hashSecret(refreshToken);
  const accessTokenExpiresAt = new Date(Date.now() + ACCESS_TOKEN_TTL_MS);
  const sessionExpiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

  if (currentSessionHash) {
    const updatedSessions = await sql`
      UPDATE user_sessions
      SET
        previous_session_token_hash = ${currentSessionHash},
        session_token_hash = ${sessionTokenHash},
        expires_at = ${sessionExpiresAt.toISOString()},
        revoked_at = NULL
      WHERE session_token_hash = ${currentSessionHash}
      OR previous_session_token_hash = ${currentSessionHash}
      RETURNING user_id
    `;

    if (updatedSessions.length === 0) {
      await sql`
        INSERT INTO user_sessions (
          user_id,
          session_token_hash,
          previous_session_token_hash,
          expires_at,
          revoked_at
        ) VALUES (
          ${userId}::uuid,
          ${sessionTokenHash},
          ${currentSessionHash},
          ${sessionExpiresAt.toISOString()},
          NULL
        )
      `;
    }
  } else {
    await sql`
      INSERT INTO user_sessions (
        user_id,
        session_token_hash,
        previous_session_token_hash,
        expires_at,
        revoked_at
      ) VALUES (
        ${userId}::uuid,
        ${sessionTokenHash},
        NULL,
        ${sessionExpiresAt.toISOString()},
        NULL
      )
    `;
  }

  setAuthCookies(res, accessToken, refreshToken);

  return {
    accessToken,
    refreshToken,
    expiresAt: accessTokenExpiresAt,
  };
}

async function requireApiKey(req, res, next) {
  try {
    const apiClientsConfigured = await hasConfiguredApiClients();
    if (!apiClientsConfigured) {
      return next();
    }

    const clientId = String(req.get("x-client-id") || "").trim();
    const apiKey = String(req.get("x-api-key") || "").trim();

    if (!clientId || !apiKey) {
      console.warn(`[AUTH-KEY] Missing credentials for ${req.method} ${req.originalUrl}`);
      return res.status(401).json({ error: "Missing x-client-id or x-api-key header" });
    }

    const [client] = await sql`
      SELECT client_id, api_key_hash, domain_name, verify_email_path, reset_password_path
      FROM api_clients
      WHERE client_id = ${clientId}
      LIMIT 1
    `;

    if (!client) {
      console.warn(`[AUTH-KEY] Unknown client ${clientId}`);
      return res.status(403).json({ error: "Invalid API credentials" });
    }

    const incomingApiKeyHash = hashSecret(apiKey);
    if (!safeEqual(incomingApiKeyHash, client.api_key_hash)) {
      console.warn(`[AUTH-KEY] Invalid credentials for client ${clientId}`);
      return res.status(403).json({ error: "Invalid API credentials" });
    }

    req.apiClientId = client.client_id;
    req.apiClientDomainName = client.domain_name;
    return next();
  } catch (error) {
    console.error("[AUTH-KEY] Fehler bei API-Key-Pr?fung:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

app.get("/health", async (_req, res) => {
  try {
    const apiKeyAuthEnabled = await hasConfiguredApiClients();
    res.json({ ok: true, apiKeyAuthEnabled });
    console.log(`[${new Date().toISOString()}] Health-Check: OK - Server ist erreichbar.`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Health-Check: ERROR -`, error);
    res.status(500).json({ ok: false, error: "Internal Server Error" });
  }
});

app.use("/api/auth", requireApiKey);

app.post("/api/auth/register", async (req, res) => {
  const username = String(req.body.username ?? "").trim();
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");

  if (!username || !email || !password) {
    console.warn(`[AUTH] Registrierung fehlgeschlagen: Fehlende Felder f?r Email: ${email || "unbekannt"}`);
    return res.status(400).json({
      error: "username, email und password sind Pflicht",
    });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);

    const user = await sql.begin(async (tx) => {
      const [createdUser] = await tx`
        INSERT INTO users (username, email, status, updated_at)
        VALUES (${username}, ${email}, ${defaultRegistrationStatus}, now())
        RETURNING id, public_id, username, email, email_verified_at, last_sign_in_at, status, created_at, updated_at
      `;

      await tx`
        INSERT INTO user_credentials (user_id, password_hash)
        VALUES (${createdUser.id}::uuid, ${passwordHash})
      `;

      return createdUser;
    });

    console.log(
      user.status === "active"
        ? `[AUTH] User registriert und aktiviert: ID ${user.id}, Name: ${user.username}`
        : `[AUTH] User registriert und wartet auf Freischaltung: ID ${user.id}, Name: ${user.username}`
    );
    return res.status(201).json(
      buildRegisterSuccessResponse(
        "User registered successfully.",
        user
      )
    );
  } catch (err) {
    if (err && err.code === "23505") {
      console.warn(`[AUTH] Konflikt: Username oder Email bereits vorhanden (${email})`);
      return res.status(409).json({ error: "Username oder Email bereits vergeben" });
    }
    console.error(`[AUTH] Schwerwiegender Fehler bei Registrierung von ${email}:`, err);
    return res.status(500).json({ error: "Interner Serverfehler" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const rawIdentifier = String(req.body.identifier ?? req.body.email ?? "").trim();
  const identifier = rawIdentifier.toLowerCase();
  const password = String(req.body.password || "");

  if (!password || !identifier) {
    console.warn(`[LOGIN] Versuch ohne Identifier oder Passwort von: ${identifier || "unbekannt"}`);
    return res.status(400).json({
      error: "identifier beziehungsweise email sowie password sind Pflicht",
    });
  }

  try {
    const [user] = await sql`
      SELECT
        u.id,
        u.public_id,
        u.username,
        u.email,
        u.email_verified_at,
        u.last_sign_in_at,
        u.status,
        u.created_at,
        u.updated_at,
        c.password_hash
      FROM users u
      JOIN user_credentials c ON c.user_id = u.id
      WHERE lower(u.email) = ${identifier}
         OR lower(u.username) = ${identifier}
      LIMIT 1
    `;

    if (!user) {
      console.warn(`[LOGIN] Fehlgeschlagen: Account nicht gefunden (${identifier})`);
      return res.status(401).json({ error: "Ungültige Anmeldedaten" });
    }

    if (user.status === "pending") {
      console.warn(`[LOGIN] Fehlgeschlagen: Account noch nicht aktiviert (${identifier})`);
      return res.status(403).json({
        error: "Account noch nicht aktiviert. Bitte warte auf die Freischaltung durch einen Administrator.",
      });
    }

    if (user.status === "suspended") {
      console.warn(`[LOGIN] Fehlgeschlagen: Account gesperrt (${identifier})`);
      return res.status(403).json({
        error: "Account ist gesperrt. Bitte kontaktiere einen Administrator.",
      });
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      console.warn(`[LOGIN] Fehlgeschlagen: Falsches Passwort f?r ${identifier}`);
      return res.status(401).json({ error: "Ungültige Anmeldedaten" });
    }

    const [updatedUser] = await sql`
      UPDATE users
      SET last_sign_in_at = now(), updated_at = now()
      WHERE id = ${user.id}
      RETURNING id, public_id, username, email, email_verified_at, last_sign_in_at, status, created_at, updated_at
    `;

    const tokens = await issueAuthTokens(res, updatedUser.id);
    console.log(`[LOGIN] Erfolgreich: User ${updatedUser.username} (ID: ${updatedUser.id}) eingeloggt.`);

    return res.json(
      buildLoginSuccessResponse("Login successful.", updatedUser, tokens)
    );
  } catch (err) {
    console.error(`[LOGIN] Kritischer Fehler bei ${identifier}:`, err);
    return res.status(500).json({ error: "Interner Serverfehler" });
  }
});

app.post("/api/auth/refresh", async (req, res) => {
  const sessionToken = String(
    req.body?.refreshToken || req.cookies.refreshToken || ""
  ).trim();

  if (!sessionToken) {
    console.warn("[REFRESH] Fehlgeschlagen: Kein Refresh-Token in Cookies gefunden.");
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const sessionTokenHash = hashSecret(sessionToken);
    const [session] = await sql`
      SELECT user_id, session_token_hash, previous_session_token_hash, expires_at, revoked_at
      FROM user_sessions
      WHERE session_token_hash = ${sessionTokenHash}
         OR previous_session_token_hash = ${sessionTokenHash}
      ORDER BY expires_at DESC
      LIMIT 1
    `;

    if (!session || session.revoked_at) {
      console.warn("[REFRESH] Fehlgeschlagen: Session nicht gefunden oder widerrufen.");
      return res.status(403).json({ error: "Invalid refresh token" });
    }

    if (Date.parse(session.expires_at) <= Date.now()) {
      console.warn(`[REFRESH] Fehlgeschlagen: Session f?r User ID ${session.user_id} ist abgelaufen.`);
      return res.status(403).json({ error: "Invalid refresh token" });
    }

    const [user] = await sql`
      SELECT
        id,
        public_id,
        username,
        email,
        email_verified_at,
        last_sign_in_at,
        status,
        created_at,
        updated_at
      FROM users
      WHERE id = ${session.user_id}
      LIMIT 1
    `;

    if (!user) {
      console.warn(`[REFRESH] Fehlgeschlagen: User ID ${session.user_id} nicht gefunden.`);
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (user.status === "pending") {
      console.warn(`[REFRESH] Fehlgeschlagen: User ID ${session.user_id} ist noch pending.`);
      return res.status(403).json({ error: "Account not activated" });
    }

    if (user.status === "suspended") {
      console.warn(`[REFRESH] Fehlgeschlagen: User ID ${session.user_id} ist gesperrt.`);
      return res.status(403).json({ error: "Account suspended" });
    }

    const [updatedUser] = await sql`
      UPDATE users
      SET last_sign_in_at = now(), updated_at = now()
      WHERE id = ${user.id}
      RETURNING id, public_id, username, email, email_verified_at, last_sign_in_at, status, created_at, updated_at
    `;

    const tokens = await issueAuthTokens(res, updatedUser.id, sessionTokenHash);

    console.log(`[REFRESH] Erfolgreich: Neues AccessToken f?r User ID ${updatedUser.id} ausgestellt.`);
      return res.json(
      buildRefreshSuccessResponse("Token refreshed successfully.", updatedUser, tokens)
    );
  } catch (err) {
    console.error("[REFRESH] Fehler bei Session-Verarbeitung:", err);
    return res.status(403).json({ error: "Invalid refresh token" });
  }
});

app.post("/api/auth/logout", async (req, res) => {
  const refreshToken = String(req.cookies.refreshToken || "").trim();

  try {
    if (refreshToken) {
      const refreshTokenHash = hashSecret(refreshToken);
      await sql`
        UPDATE user_sessions
        SET revoked_at = now()
        WHERE revoked_at IS NULL
          AND (
            session_token_hash = ${refreshTokenHash}
            OR previous_session_token_hash = ${refreshTokenHash}
          )
      `;
    }
  } catch (err) {
    console.error("[LOGOUT] Fehler beim Widerruf der Session:", err);
  }

  const base = cookieBase();
  res.clearCookie("accessToken", base);
  res.clearCookie("refreshToken", base);

  console.log("[LOGOUT] Cookies gel?scht, User ausgeloggt.");
  return res.json({
    success: true,
    message: "Logout successful.",
    data: null,
  });
});

app.use((err, _req, res, _next) => {
  if (err && String(err.message || "").startsWith("CORS blocked")) {
    console.warn(`[CORS] Zugriff verweigert: ${err.message}`);
    return res.status(403).json({ error: err.message });
  }

  console.error("[SERVER] Unbehandelter Fehler:", err);
  return res.status(500).json({ error: "Interner Serverfehler" });
});

app.get("/api/auth/users", async (_req, res) => {
  try {
    const users = await sql`
      SELECT id, public_id, username, email, email_verified_at, last_sign_in_at, status, created_at, updated_at
      FROM users
      ORDER BY created_at DESC
    `;
    res.json(users.map(mapUserToExternalShape));
  } catch (err) {
    console.error("[USERS] Fehler beim Laden der User:", err);
    res.status(500).json({ error: "Interner Serverfehler" });
  }
});

app.listen(PORT, "0.0.0.0", async () => {
  const apiKeyAuthEnabled = await hasConfiguredApiClients().catch(() => false);

  console.log("-----------------------------------------");
  console.log(`[START] Auth server listening on 0.0.0.0:${PORT}`);
  console.log(`[START] Allowed origins: ${allowedOrigins.join(", ")}`);
  console.log(`[START] API key auth enabled: ${apiKeyAuthEnabled}`);
  console.log("-----------------------------------------");
});
