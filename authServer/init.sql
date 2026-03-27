CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
  public_id varchar(32) UNIQUE NOT NULL DEFAULT replace(gen_random_uuid()::text, '-', ''),
  username varchar(255) UNIQUE NOT NULL,
  email varchar(254) UNIQUE NOT NULL,
  email_verified_at timestamptz,
  status varchar(16) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_credentials (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  password_hash varchar(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS verification_tokens (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash varchar(255) NOT NULL,
  type varchar(32) NOT NULL CHECK (type IN ('email_verification', 'password_reset')),
  expires_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS user_sessions (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_token_hash varchar(255) NOT NULL UNIQUE,
  previous_session_token_hash varchar(255),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz
);

CREATE TABLE IF NOT EXISTS api_clients (
  client_id varchar(255) PRIMARY KEY,
  api_key_hash varchar(255) NOT NULL,
  domain_name varchar(255) NOT NULL,
  verify_email_path varchar(255) NOT NULL,
  reset_password_path varchar(255) NOT NULL
);
