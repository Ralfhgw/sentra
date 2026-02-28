Table users {
  id uuid [pk, not null, default: `gen_random_uuid()`] 
  user_name varchar(255) [unique, not null]
  hashed_password varchar(255) [not null]
  email varchar(254) [not null]
  is_active boolean [not null, default: true]
  email_verified boolean [not null, default: false]
  created_at timestamptz [not null, default: `now()`]
  updated_at timestamptz
}

Table data {
  id uuid [pk, not null, default: `gen_random_uuid()`]
  user_id uuid [unique, not null]
  weather_description text
  created_at timestamptz [not null, default: `now()`]
  updated_at timestamptz
}

Table user_settings {
  id uuid [pk, not null, default: `gen_random_uuid()`]
  user_id uuid [unique, not null]
  lang text
  meteosource_lat numeric(10,7)
  meteosource_lon numeric(10,7)
  display_name text
  town text
  county text
  state text
  country text
  country_code text
  channels jsonb
  evt boolean
  wea boolean
  mtx boolean
  rtc boolean
  created_at timestamptz [default: `now()`]
  updated_at timestamptz
}

Table events {
  id uuid [pk, not null, default: `gen_random_uuid()`]
  user_id uuid [not null]
  title varchar(255) [not null] 
  date text [not null]
  address jsonb
  link text
  description text
  image text
  domain text
  created_at timestamptz [default: `now()`]
}

Table event_urls {
  id uuid [pk, not null, default: `gen_random_uuid()`]
  user_id uuid [not null]
  urls text
  created_at timestamptz [default: `now()`]
}

Table weather_hourly {
  id uuid [pk, not null, default: `gen_random_uuid()`]
  user_id uuid [unique, not null]
  time timestamptz [not null]
  temperature real
  humidity real
  wind_speed real
  wind_direction real
  wind_gusts real
  precipitation real
  pressure real
  cloud_cover real
  weather_code integer
  created_at timestamptz [default: `now()`]
}

Table day_meanings {
  id uuid [pk, not null, default: `gen_random_uuid()`]
  name varchar(255) [not null]
  description text
  url text
  is_fixed boolean [not null, default: true]
  rule jsonb [not null, note: 'Wird über die Funktion get_days_for_date() abgefragt']
  country text
  created_at timestamptz [default: `now()`]
}

Table channels {
  id uuid [pk, not null, default: `gen_random_uuid()`]
  tvg_name  varchar(255) [not null]
  tvg_id text
  group text
  logo_url test
  sendername" text
  stream_url text
  created_at timestamptz [default: `now()`]
}

Table weather_descriptions {
  id uuid [pk, not null, default: `gen_random_uuid()`]
  user_id uuid [unique, not null]
  date date [pk, not null]
  description text [not null]
  created_at timestamptz [default: `now()`]
}

Ref: data.user_id > users.id [delete: cascade]
Ref: user_settings.user_id > users.id [delete: cascade]
Ref: events.user_id > users.id [delete: cascade]
Ref: event_urls.user_id > users.id [delete: cascade]
Ref: weather_hourly.user_id > users.id [delete: cascade]
Ref: weather_description.user_id > users.id [delete: cascade]