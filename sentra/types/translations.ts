export interface Translations {
  login: string;
  email: string;
  password: string;
  autoLogin: string;
  forgotPassword: string;
  loginBtn: string;
  loggingIn: string;
  agreement: string;
  noAccount: string;
  alreadyAccount: string;
  signUp: string;
  officialWebsite: string;
  title: string;
  simNews: string;
  simWeather: string;
  simWebCam: string;
  simSensors: string;
  simDisplay: string;
  terms: string,
  privacy: string,
}

export const startpageTranslations = {
 en: {
    title: "Welcome to Sentra",
    descriptionlg: "Your central info dashboard for local news, weather, live streams, video conferencing, and more – all in one place, accessible anytime. Click the screws 🔩 in the corners to open the modules.",
    descriptionsm: "Your central info dashboard for local news, weather, live streams, video conferencing, and more – all in one place, accessible anytime. Select the modules from the hamburger menu ☰.",
    userinfo: "User Information and Technical Data",
    news: "📰 News: Your local cultural calendar for the coming days",
    weather: "🌦️ Weather: Forecast for the next few days",
    liveview: "📷 LiveView: Webcam streaming and integrated live TV channels",
    livetalk: "👥 LiveTalk: Video conferencing powered by MediaSoup (WebRTC)"

 },
  de: {
    title: "Willkommen bei Sentra",
    descriptionlg: "Dein zentrales Info-Dashboard für regionale Nachrichten, Wetter, Live-Streams, Videokonferenzen und mehr – alles an einem Ort, jederzeit erreichbar. Klicke auf die Schrauben 🔩 in den Ecken, um die Module zu öffnen.",
    descriptionsm: "Dein zentrales Info-Dashboard für regionale Nachrichten, Wetter, Live-Streams, Videokonferenzen und mehr – alles an einem Ort, jederzeit erreichbar. Wähle die Module im Burger-Menü ☰ aus.",
    userinfo: "Benutzerinformationen und technische Daten",
    news: "📰 Aktuelles: Dein regionaler Kulturkalender für die nächsten Tage",
    weather: "🌦️ Wetter: Aussichten für die nächsten Tage",
    liveview: "📷 LiveView: Webcam-Streaming und integrierte Live-TV-Kanäle",
    livetalk: "👥 LiveTalk: Videokonferenzen auf Basis von MediaSoup (WebRTC)"
},
};

export interface LoginTranslation {
  login: string;
  email: string;
  password: string;
  loginBtn: string;
  loggingIn: string;
  agreement: string;
  noAccount: string;
  signUp: string;
  officialWebsite: string;
  title: string;
  simNews: string;
  simWeather: string;
  simWebCam: string;
  simSensors: string;
  simDisplay: string;
  terms: string;
  privacy: string;
}

export const loginTranslations: { [key: string]: LoginTranslation } = {
  en: {
    login: "LOGIN",
    email: "Email",
    password: "Password",
    loginBtn: "Login",
    loggingIn: "Logging in...",
    agreement: "I have read and agree to ",
    noAccount: "Don’t have an account?",
    signUp: "Sign up",
    officialWebsite: "Official Website",
    title: "SENTRA",
    simNews: "News",
    simWeather: "Weather",
    simWebCam: "WebCam",
    simSensors: "Sensors",
    simDisplay: "Display",
    terms: "Terms of Use",
    privacy: "Privacy Policy"
  },
  de: {
    login: "ANMELDUNG",
    email: "E-Mail",
    password: "Passwort",
    loginBtn: "Anmelden",
    loggingIn: "Anmeldung läuft...",
    agreement: "Ich habe die Nutzungsbedingungen und Datenschutzrichtlinien gelesen und akzeptiere sie",
    noAccount: "Noch kein Konto?",
    signUp: "Registrieren",
    officialWebsite: "Offizielle Webseite",
    title: "SENTRA",
    simNews: "News",
    simWeather: "Wetter",
    simWebCam: "WebCam",
    simSensors: "Sensoren",
    simDisplay: "Anzeige",
    terms: "Nutzungsbedingungen",
    privacy: "Datenschutzrichtlinien"
  },
};

export const registerTranslations = {
  en: {
    registerTitle: "REGISTER",
	  username: "User Name",
    email: "Email",
    password: "Password",
    repeatPassword: "Repeat Password",
    registerBtn: "Register",
    registerIn: "Register...",
    alreadyAccount: "Already have an account?  ",
    loggingIn: "Login",
    officialWebsite: "Official Website",
    title: "SENTRA",
    latitude: "Latitude:",
    longitude: "Longitude:",
  },
  de: {
    registerTitle: "REGISTRIERUNG",
    username: "Name",
    email: "Email",
    password: "Passwort",
    repeatPassword: "Wiederhole Passwort",
    registerBtn: "Registrierung",
    registerIn: "Registrierung...",
    alreadyAccount: "Bereits registriert?  ",
    loggingIn: "Anmeldung",
    officialWebsite: "Offizielle Webseite",
    title: "SENTRA",
    latitude: "Breitengrad:",
    longitude: "Längengrad:",
  },
};