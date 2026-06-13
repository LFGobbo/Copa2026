-- ============================================================
-- Adições para: confirmed_at, stats, majority picks, ranking evolution
-- Executar no SQL Editor do Supabase
-- ============================================================

-- 1. confirmed_at na tabela participants
ALTER TABLE participants
  ADD COLUMN IF NOT EXISTS confirmed_at timestamptz;

-- 2. ranking_snapshots: posição de cada participante após cada rodada
CREATE TABLE IF NOT EXISTS ranking_snapshots (
  id            bigserial PRIMARY KEY,
  participant_id uuid REFERENCES participants(id) ON DELETE CASCADE,
  round         int  NOT NULL,  -- número do jogo que "fechou" a rodada
  position      int  NOT NULL,
  points        int  NOT NULL,
  exact_count   int  NOT NULL DEFAULT 0,
  result_count  int  NOT NULL DEFAULT 0,
  recorded_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ranking_snapshots_participant_idx
  ON ranking_snapshots(participant_id);
CREATE INDEX IF NOT EXISTS ranking_snapshots_round_idx
  ON ranking_snapshots(round);
-- Evitar duplicatas: cada participante só pode ter 1 snapshot por rodada
ALTER TABLE ranking_snapshots
  ADD CONSTRAINT IF NOT EXISTS ranking_snapshots_participant_round_key UNIQUE (participant_id, round);

-- 3. majority_cache: cache do palpite da maioria por jogo
--    (calculado pelo Worker, não no frontend)
CREATE TABLE IF NOT EXISTS majority_cache (
  game_n      int PRIMARY KEY,
  data        jsonb NOT NULL,  -- [{goals_a, goals_b, count, pct}]
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- 4. live_scores: cache centralizado de placares da FIFA (Worker Cron)
--    Permite que o frontend leia scores mesmo se FIFA estiver offline
--    e que snapshots sejam calculados server-side
CREATE TABLE IF NOT EXISTS live_scores (
  game_key    text PRIMARY KEY,  -- ex: "BRA_MAR" (home_away)
  home_team   text NOT NULL,
  away_team   text NOT NULL,
  goals_home  int NOT NULL,
  goals_away  int NOT NULL,
  match_id    text,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

