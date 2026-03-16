-- psql -U ralf -h localhost -d sentra -a -f sentra.sql
-- sentra=> \copy day_meanings (id, name, description, is_fixed, rule, country, created_at) FROM '~/dci_training/websites/project_Abschlussprojekt_final/day_meanings_export.csv' WITH (FORMAT CSV, HEADER);
DROP TABLE IF EXISTS "users" CASCADE;

DROP TABLE IF EXISTS "data" CASCADE;

DROP TABLE IF EXISTS "user_settings" CASCADE;

DROP TABLE IF EXISTS "events" CASCADE;

DROP TABLE IF EXISTS "event_urls" CASCADE;

DROP TABLE IF EXISTS "day_meanings" CASCADE;

DROP TABLE IF EXISTS "weather_daily" CASCADE;

DROP TABLE IF EXISTS "weather_hourly" CASCADE;

DROP TABLE IF EXISTS "channels" CASCADE;

DROP TABLE IF EXISTS "weather_descriptions" CASCADE;

DROP FUNCTION IF EXISTS get_days_for_date (date);

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
    "lang" text,
    "lat" numeric(10, 6),
    "lon" numeric(10, 6),
    "display_name" text,
    "town" text,
    "county" text,
    "state" text,
    "country" text,
    "country_code" text,
    "channels" jsonb NOT NULL DEFAULT '[]'::jsonb,
    "event_urls" jsonb NOT NULL DEFAULT '[]'::jsonb,
    "evt" boolean,
    "wea" boolean,
    "mtx" boolean,
    "rtc" boolean,
    "s_indoor" boolean,
    "s_outdoor" boolean,
    "s_cal_temp" numeric(10,4),
    "s_cal_humidity" numeric(10,4),
    "s_cal_pressure" numeric(10,4),
    "created_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz
);

ALTER TABLE "user_settings"
ADD CONSTRAINT fk_user_settings_user FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE;

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

\copy day_meanings (id, name, description, is_fixed, rule, country, created_at) FROM '/docker-entrypoint-initdb.d/day_meanings_export.csv' WITH (FORMAT CSV, HEADER);