-- ============================================================
-- Copa2026 Bolão — Reabertura do Mata-Mata
-- Executar no SQL Editor do Supabase Dashboard
-- ============================================================

-- 1. Palpites reabertos (separados dos originais, que ficam intocados em "picks")
CREATE TABLE IF NOT EXISTS picks_reopen (
  id             BIGSERIAL PRIMARY KEY,
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  game_n         INTEGER NOT NULL,
  goals_a        INTEGER,
  goals_b        INTEGER,
  ko_pick        TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(participant_id, game_n)
);
CREATE INDEX IF NOT EXISTS idx_picks_reopen_participant ON picks_reopen(participant_id);
CREATE INDEX IF NOT EXISTS idx_picks_reopen_game ON picks_reopen(game_n);

-- 2. Controle de quais fases estão abertas para reabertura
--    phase_name: 'r32', 'r16', 'qf', 'sf', 'final'
--    game_ns: array com os números dos jogos da fase
--    open: true = participantes podem enviar palpites reabertos
--    deadline: prazo limite para envio (UTC)
CREATE TABLE IF NOT EXISTS phase_reopen (
  id          BIGSERIAL PRIMARY KEY,
  phase_name  TEXT NOT NULL UNIQUE,
  game_ns     INTEGER[] NOT NULL,
  open        BOOLEAN NOT NULL DEFAULT FALSE,
  deadline    TIMESTAMPTZ,
  opened_at   TIMESTAMPTZ,
  closed_at   TIMESTAMPTZ
);

-- 3. Inserir as fases (desabilitadas por padrão — admin abre manualmente)
INSERT INTO phase_reopen (phase_name, game_ns) VALUES
  ('r32',   ARRAY[73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88]),
  ('r16',   ARRAY[89,90,91,92,93,94,95,96]),
  ('qf',    ARRAY[97,98,99,100]),
  ('sf',    ARRAY[101,102]),
  ('3rd',   ARRAY[103]),
  ('final', ARRAY[104])
ON CONFLICT (phase_name) DO NOTHING;

-- Nota: RLS desabilitado, acesso somente via Worker com service_role key
ALTER TABLE picks_reopen DISABLE ROW LEVEL SECURITY;
ALTER TABLE phase_reopen DISABLE ROW LEVEL SECURITY;
