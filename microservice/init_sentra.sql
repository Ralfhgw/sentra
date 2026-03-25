-- psql -U ralf -h localhost -d sentra -a -f sentra.sql
-- sentra=> \copy day_meanings (id, name, description, is_fixed, rule, country, created_at) FROM '~/dci_training/websites/project_Abschlussprojekt_final/day_meanings_export.csv' WITH (FORMAT CSV, HEADER);
DROP TABLE IF EXISTS "users" CASCADE;

DROP TABLE IF EXISTS "user_settings" CASCADE;

DROP TABLE IF EXISTS "events" CASCADE;

DROP TABLE IF EXISTS "day_meanings" CASCADE;

DROP TABLE IF EXISTS "channels" CASCADE;

DROP TABLE IF EXISTS "user_event_refresh_state"CASCADE;

DROP TABLE IF EXISTS "user_settings" CASCADE;

DROP TABLE IF EXISTS "liveview_sources" CASCADE;

DROP FUNCTION IF EXISTS get_days_for_date (date);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE "users" (
    "id" uuid PRIMARY KEY NOT NULL DEFAULT gen_random_uuid (),
    "user_name" varchar(255) UNIQUE NOT NULL,
    "hashed_password" varchar(255) NOT NULL,
    "email" varchar(254) NOT NULL,
    "is_active" boolean NOT NULL DEFAULT true,
    "email_verified" boolean NOT NULL DEFAULT false,
    "created_at" timestamptz NOT NULL DEFAULT now(),
    "updated_at" timestamptz
);

CREATE TABLE "user_settings" (
    "id" uuid PRIMARY KEY NOT NULL DEFAULT gen_random_uuid (),
    "user_id" uuid NOT NULL UNIQUE,
    "lang" text NOT NULL DEFAULT 'en' CHECK (lang IN ('en', 'de')),
    "lat" numeric(10, 6),
    "lon" numeric(10, 6),
    "display_name" text,
    "town" text,
    "county" text,
    "state" text,
    "country" text,
    "country_code" text,
    "channels" jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(channels) = 'array'),
    "event_urls" jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(event_urls) = 'array'),
    "event_refresh_interval" text NOT NULL DEFAULT 'daily' CHECK (event_refresh_interval IN ('daily', 'weekly', 'monthly')),
    "key1" text,
    "key2" text,
    "key3" text,
    "key4" text,
    "key5" text,
    "evt" boolean NOT NULL DEFAULT false,
    "wea" boolean NOT NULL DEFAULT false,
    "mtx" boolean NOT NULL DEFAULT false,
    "rtc" boolean NOT NULL DEFAULT false,
    "s_indoor" boolean NOT NULL DEFAULT false,
    "s_outdoor" boolean NOT NULL DEFAULT false,
    "s_cal_temp" double precision NOT NULL DEFAULT 0,
    "s_cal_humidity" double precision NOT NULL DEFAULT 0,
    "s_cal_pressure" double precision NOT NULL DEFAULT 0,
    "created_at" timestamptz NOT NULL DEFAULT NOW(),
    "updated_at" timestamptz NOT NULL DEFAULT NOW()
);

ALTER TABLE "user_settings"
ADD CONSTRAINT "fk_user_settings_user" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE;

CREATE TRIGGER "trg_user_settings_updated_at"
BEFORE UPDATE ON user_settings
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE "user_event_refresh_state" (
  user_id uuid NOT NULL,
  source_key text NOT NULL,
  source_kind text NOT NULL CHECK (source_kind IN ('serpapi', 'url')),
  cache_key text,
  last_refreshed_at timestamptz,
  next_refresh_at timestamptz,
  refresh_started_at timestamptz,
  last_status text NOT NULL DEFAULT 'idle' CHECK (last_status IN ('idle', 'running', 'success', 'error')),
  last_error text,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, source_key),
  CONSTRAINT fk_user_event_refresh_state_user
  FOREIGN KEY (user_id)
  REFERENCES user_settings(user_id)
  ON DELETE CASCADE
);

CREATE INDEX "idx_user_event_refresh_state_next_refresh"
  ON user_event_refresh_state (next_refresh_at);

CREATE INDEX "idx_user_event_refresh_state_status"
  ON user_event_refresh_state (last_status);

CREATE INDEX "idx_user_event_refresh_state_user_kind"
  ON user_event_refresh_state (user_id, source_kind);

CREATE TRIGGER "trg_user_event_refresh_state_updated_at"
BEFORE UPDATE ON user_event_refresh_state
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE "events" (
    "id" uuid PRIMARY KEY NOT NULL DEFAULT (gen_random_uuid ()),
    "user_id" uuid NOT NULL,
    "title" varchar(255) NOT NULL,
    "date" text NOT NULL,
    "address" jsonb,
    "link" text,
    "description" text,
    "image" text,
    "domain" text,
    "source_town" text,
    "created_at" timestamptz DEFAULT (now())
);

ALTER TABLE "events"
ADD CONSTRAINT fk_events_user FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE;

CREATE TABLE "day_meanings" (
    "id" uuid PRIMARY KEY NOT NULL DEFAULT (gen_random_uuid ()),
    "name" varchar(255) NOT NULL,
    "description" text,
    "url" text,
    "is_fixed" boolean NOT NULL DEFAULT true,
    "rule" jsonb NOT NULL,
    "country" text,
    "created_at" timestamptz DEFAULT (now())
);

CREATE TABLE "channels" (
    "id" uuid PRIMARY KEY NOT NULL DEFAULT (gen_random_uuid ()),
    "tvg_name" varchar(255) NOT NULL,
    "tvg_id" text,
    "group" text,
    "location" text,
    "channel" text,
    "stream_url" text,
    "created_at" timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS liveview_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  slot_id integer NOT NULL CHECK (slot_id >= 0),
  source_kind text NOT NULL CHECK (
    source_kind IN ('catalog', 'custom_hls', 'mediamtx_rtsp')
  ),
  display_name text,
  source_url text,
  channel_id uuid,
  mediamtx_path text,
  transport text CHECK (transport IN ('tcp', 'udp', 'automatic')),
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT fk_liveview_sources_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_liveview_sources_channel FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE SET NULL,
  CONSTRAINT uq_liveview_sources_user_slot UNIQUE (user_id, slot_id),

  CONSTRAINT chk_liveview_catalog 
    CHECK (
      source_kind <> 'catalog'
      OR channel_id IS NOT NULL
    ),

  CONSTRAINT chk_liveview_custom_hls
    CHECK (
      source_kind <> 'custom_hls'
      OR source_url IS NOT NULL
    ),

  CONSTRAINT chk_liveview_mediamtx_rtsp
    CHECK (
      source_kind <> 'mediamtx_rtsp'
      OR (source_url IS NOT NULL AND mediamtx_path IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_liveview_sources_user_id ON liveview_sources(user_id);

CREATE INDEX IF NOT EXISTS idx_liveview_sources_kind ON liveview_sources(source_kind);

CREATE TRIGGER trg_liveview_sources_updated_at  
BEFORE UPDATE ON liveview_sources
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE FUNCTION get_days_for_date(check_date DATE)
RETURNS SETOF day_meanings AS $$
DECLARE
curr_month INT := EXTRACT(MONTH FROM check_date);
curr_day INT := EXTRACT(DAY FROM check_date);
curr_dow TEXT := TRIM(TO_CHAR(check_date, 'Day'));
curr_occ INT := CEIL(curr_day / 7.0);
is_last_occ BOOLEAN := (EXTRACT(MONTH FROM check_date + INTERVAL '7 days') != curr_month);
BEGIN
RETURN QUERY
SELECT *
FROM day_meanings
WHERE
(rule->>'month')::int = curr_month
AND (
(is_fixed = true AND (rule->>'day')::int = curr_day)
OR
(is_fixed = false
AND rule->>'day_of_week' = curr_dow
AND (
rule->'occurrence' @> CAST(curr_occ AS text)::jsonb
OR
(is_last_occ = true AND rule->'occurrence' @> '[-1]'::jsonb)
))
);
END;
$$ LANGUAGE plpgsql;
--SELECT * FROM get_days_for_date('2026-01-13');

\copy day_meanings (id, name, description, is_fixed, rule, country, created_at) FROM '/docker-entrypoint-initdb.d/day_meanings_export.csv' WITH (FORMAT CSV, HEADER, ENCODING 'UTF8');
\copy channels (tvg_name, tvg_id, "group", location, channel, stream_url) FROM '/docker-entrypoint-initdb.d/liveview_channels.csv' WITH (FORMAT csv, HEADER true, DELIMITER ';', ENCODING 'UTF8');