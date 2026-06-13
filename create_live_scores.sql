-- Rodar no Supabase SQL Editor se a tabela não existir
CREATE TABLE IF NOT EXISTS live_scores (
  game_key   TEXT PRIMARY KEY,
  home_team  TEXT,
  away_team  TEXT,
  goals_home INTEGER,
  goals_away INTEGER,
  match_id   TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Permite upsert via on_conflict
ALTER TABLE live_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role full access" ON live_scores
  USING (true) WITH CHECK (true);
