-- Critter Dash database schema
-- Run this once against your Render Postgres database (the server also
-- auto-runs it on boot, so manual setup is optional).

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT UNIQUE NOT NULL,       -- id generated in the browser & kept in localStorage
  name TEXT NOT NULL,
  animal TEXT NOT NULL,
  color TEXT NOT NULL,
  races_played INT NOT NULL DEFAULT 0,
  races_won INT NOT NULL DEFAULT 0,
  best_wpm NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS races (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  mode TEXT NOT NULL,                   -- 'quick' | 'friends' | 'bot'
  text_content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting', -- waiting | racing | finished
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS race_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  race_id UUID REFERENCES races(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  display_name TEXT NOT NULL,
  animal TEXT NOT NULL,
  color TEXT NOT NULL,
  is_bot BOOLEAN NOT NULL DEFAULT FALSE,
  wpm NUMERIC,
  accuracy NUMERIC,
  place INT,
  finished_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_race_results_race_id ON race_results(race_id);
CREATE INDEX IF NOT EXISTS idx_race_results_user_id ON race_results(user_id);
