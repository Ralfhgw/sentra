Table users {
  id uuid [pk]
  public_id varchar(32) [unique]
  username varchar(255) [unique, not null]
  email varchar(254) [unique, not null]
  email_verified_at timestamptz
  status varchar(16) [not null, note: "pending | active | suspended"]
  created_at timestamptz
  updated_at timestamptz
}

Table user_credentials {
  user_id uuid [pk, ref: > users.id]
  password_hash varchar(255) [not null]
}

Table verification_tokens {
  user_id uuid [ref: > users.id]
  token_hash varchar(255) [not null]
  type varchar(32) [not null, note: "email_verification | password_reset"]
  expires_at timestamptz
}

Table user_sessions {
  user_id uuid [ref: > users.id]
  session_token_hash varchar(255) [unique, not null]
  previous_session_token_hash varchar(255)
  expires_at timestamptz
  revoked_at timestamptz
}

Table api_clients {
  client_id varchar(255) [pk]
  api_key_hash varchar(255) [not null]
  domain_name varchar(255) [not null]
  verify_email_path varchar(255) [not null]
  reset_password_path varchar(255) [not null]
}

Table user_settings {
  id uuid [pk]
  user_id uuid [unique, not null, ref: > users.id]
  lang text [not null, note: "en | de"]
  lat numeric
  lon numeric
  display_name text
  town text
  county text
  state text
  country text
  country_code text
  channels json
  event_urls json
  event_refresh_interval text [note: "daily | weekly | monthly"]
  key1 text
  key2 text
  key3 text
  key4 text
  key5 text
  evt boolean
  wea boolean
  mtx boolean
  rtc boolean
  s_indoor boolean
  s_outdoor boolean
  s_cal_temp double
  s_cal_humidity double
  s_cal_pressure double
  created_at timestamptz
  updated_at timestamptz
}

Table user_event_refresh_state {
  user_id uuid [ref: > user_settings.user_id]
  source_key text
  source_kind text [note: "serpapi | url"]
  cache_key text
  last_refreshed_at timestamptz
  next_refresh_at timestamptz
  refresh_started_at timestamptz
  last_status text [note: "idle | running | success | error"]
  last_error text
  created_at timestamptz
  updated_at timestamptz

  Indexes {
    (user_id, source_key) [pk]
  }
}

Table events {
  id uuid [pk]
  user_id uuid [ref: > users.id]
  title varchar(255)
  date text
  address json
  link text
  description text
  image text
  domain text
  source_town text
  created_at timestamptz
}

Table day_meanings {
  id uuid [pk]
  name varchar(255)
  description text
  url text
  is_fixed boolean
  rule json
  country text
  created_at timestamptz
}

Table channels {
  id uuid [pk]
  tvg_name varchar(255)
  tvg_id text
  group text
  location text
  channel text
  stream_url text
  created_at timestamptz
}

Table liveview_sources {
  id uuid [pk]
  user_id uuid [ref: > users.id]
  slot_id int
  source_kind text [note: "catalog | custom_hls | mediamtx_rtsp"]
  display_name text
  source_url text
  channel_id uuid [ref: > channels.id]
  mediamtx_path text
  transport text [note: "tcp | udp | automatic"]
  enabled boolean
  created_at timestamptz
  updated_at timestamptz

  Indexes {
    (user_id, slot_id) [unique]
  }
}

Table livetalk_rooms {
  id uuid [pk]
  code text [unique]
  owner_user_id uuid [ref: > users.id]
  title text
  status text [note: "active | closed | expired"]
  created_at timestamptz
  updated_at timestamptz
  expires_at timestamptz
}

Table livetalk_participants {
  id uuid [pk]
  room_id uuid [ref: > livetalk_rooms.id]
  user_id uuid [ref: > users.id]
  display_name text
  role text [note: "host | member | viewer"]
  connection_id text [unique]
  joined_at timestamptz
  left_at timestamptz
}

Table livetalk_messages {
  id uuid [pk]
  room_id uuid [ref: > livetalk_rooms.id]
  user_id uuid [ref: > users.id]
  display_name text
  message text
  created_at timestamptz
}