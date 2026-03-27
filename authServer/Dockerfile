# Basis-Image
FROM node:22-alpine

# Arbeitsverzeichnis im Container
WORKDIR /usr/src/app

# Abhängigkeiten kopieren und installieren
COPY package*.json ./
RUN npm install --production

# Quellcode kopieren
COPY . .

# Port freigeben
EXPOSE 3000

# Server starten
CMD ["node", "src/index.js"]