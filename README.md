## Sentra

Sentra is a personalized information platform for everyday life, leisure, and travel planning. After logging in, the application combines weather, regional events, live images, sensor data, and, in the future, real-time communication into a single web interface.

This README serves as a concise, basic project information for users. It explains Sentra's purpose, its main areas of focus, and the technical services used in the background. Further information is available within the project after registration.

## What Sentra is intended for


Sentra brings together several everyday information sources in one dashboard:

- Regional events and dates
- Weather forecasts for the saved location
- Live images, webcams, and streams
- Sensor data, for example, for indoor and outdoor climate
- Personal settings for customizing content

The goal is for users to be able to work directly with the information relevant to them after logging in, without having to access multiple external services separately.

## Module overview

### News
The `News` module collects regional event data and presents it clearly for the next few days.

### Weather
The `Weather` module provides current weather data, multi-day forecasts and combines these with sensor data from the user's own environment if required.

### LiveView
The `LiveView` module provides live streams, webcams and custom stream sources in a freely configurable view.

### LiveTalk
The `LiveTalk` module is designed for direct exchange between Sentra members and maps audio, video and chat communication in real time.

### Settings
Im Bereich `Settings` werden Standort, Sprache, API-Zugaenge, Modulfreigaben und persoenliche Voreinstellungen gepflegt. Diese Daten steuern die personalisierte Darstellung in Sentra.

## Services used in Sentra

Sentra uses the following services and technologies in the project:

- `NEXT.js`: Basis of the web application with user interface, routing and server-side API endpoints.
- `Tailwind`: Styling framework for the user interface and modular design of Sentra views.
- `Open-Meteo`: Provides weather forecasts and context for the Weather module and for weather-related homepage content.
- `SERPAPI`: Retrieves location-based event and activity data for the News module.
- `GPT Image 1.5`: Generates custom background images in Sentra based on location and current weather conditions.
- `Cloudinary`: Stores and efficiently delivers the generated background images to the homepage.
- `Mosquitto`: Serves as an MQTT broker for sensor data, which is displayed and analyzed in Sentra.
- `MediaMTX`: Manages RTSP sources and provides browser-compatible streams for the LiveView module.
- `MediaSoup`: handles the WebRTC media logic for LiveTalk and the distribution of audio and video streams.
- `Coturn`: adds TURN/STUN connectivity to LiveTalk, enabling stable audio and video connections even behind NAT or firewalls.

Note regarding server setup: In the microservice stack, `Coturn` is planned for the web server and defined as a separate service in `microservice/docker-compose.yml`.

## Projektaufbau

The repository consists of several parts:

- `sentra/`: Main application based on NEXT.js
- `authServer/`: Separate service for authentication, login, and session management
- `microservice/`: Infrastructure for PostgreSQL, streaming, messaging, LiveTalk, and Coturn
- `documents/`: Project-related documentation and supplementary materials

## Technical Framework

Sentra combines a modern web interface with accompanying services for authentication, data storage, weather, event search, image generation, messaging, streaming, and real-time communication. This creates a central platform that integrates personal information, live visual impressions, and technical background services into a single application.

## Current Benefits for Users

Sentra is designed for users who want to access local information, weather, sensor data, and live content in a personally configurable system. The platform aims not only to collect information but also to provide it in a user-friendly, fast, and personalized format.

** **

## Database structure

### AuthServer

**users:** Central user table containing ID, public_id, username, email address, verification status, account status, and timestamps. Basis for login, registration, and user management.

**user_credentials:** Stores the password hash for each user. Separates sensitive login credentials from general profile data.

**verification_tokens:** Stores token hashes for email verification and password reset, including expiration time. Used for verification and recovery.

**user_sessions:** Stores session token hashes, previous tokens, expiration, and lockout status. Basis for login sessions and token rotation.

**api_clients:** Registers authorized clients with client_id, API key hash, and target paths for email verification and password reset. Used to connect external applications to the authentication server.

### SENTRA

**user_settings:** stores language, location, channel and event sources, API keys, module permissions, and sensor calibration values ​​for each user. This is Sentra's central personalization base.

**user_event_refresh_state:** manages the refresh state of event sources for each user and source, including last runtime, next update date, status, and error message. It serves for scheduling, caching, and error control.

**events:** stores found events for each user with date, address, link, description, image, domain, and origin. This is the data basis for the News/Events module.

**day_meanings:** contains special days and holiday logic with fixed or rule-based calculation. It is used for calendar and date meanings.

**channels:** catalogs available LiveView channels with name, group, location, and stream URL. This forms the basis for selectable live streams.

**liveview_sources:** stores the specific LiveView source for each user and slot, such as a catalog channel, custom HLS, or MediaMTX RTSP path. This is used for individual LiveView configuration.

**livetalk_rooms:** manages LiveTalk rooms with their code, owner, status, and expiration time. This forms the basis for sessions and conversation rooms.

**livetalk_participants:** stores participants in a LiveTalk room with their role, display name, connection ID, and join/leave times. This is used for attendance and role management.

**livetalk_messages:** stores chat messages for each LiveTalk room. This is the basis for the room's message history.

**set_updated_at():** is a trigger function that automatically sets updated_at to NOW() upon updates. It is used for multiple tables to ensure consistent change times.

**get_days_for_date(check_date DATE):** returns all matching entries from day_meanings for a specific date. Supports both fixed calendar dates and rules such as "last Monday of the month".


