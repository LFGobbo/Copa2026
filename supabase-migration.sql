-- Copa2026 Bolão — Migração de Segurança
-- Executar no SQL Editor do Supabase Dashboard

-- 1. Tabela de histórico de alterações
CREATE TABLE IF NOT EXISTS pick_history (
  id BIGSERIAL PRIMARY KEY,
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  game_n INTEGER NOT NULL,
  goals_a INTEGER,
  goals_b INTEGER,
  ko_pick TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pick_history_participant ON pick_history(participant_id);
CREATE INDEX IF NOT EXISTS idx_pick_history_game ON pick_history(game_n);

-- 2. Remover RLS padrão (que permite tudo com anon key)
ALTER TABLE participants DISABLE ROW LEVEL SECURITY;
ALTER TABLE picks DISABLE ROW LEVEL SECURITY;
ALTER TABLE special_picks DISABLE ROW LEVEL SECURITY;
ALTER TABLE pick_history DISABLE ROW LEVEL SECURITY;

-- Nota: RLS está desabilitado porque:
-- - O Worker usa service_role key (bypass RLS)
-- - Anon key não tem mais acesso direto às tabelas
-- - Toda autenticação é feita no Worker via JWT
-- - Se quiser RLS mesmo assim, habilitar e criar policies:
--
-- ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "anon_select_name" ON participants FOR SELECT USING (true);
--   -- só expõe id, name (não password)
