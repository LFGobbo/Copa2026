-- ============================================================
-- Copa2026 Bolão — RLS Fix #2
-- Tabelas novas sem RLS: ranking_snapshots, majority_cache,
--                        picks_reopen, phase_reopen
-- Também corrige Security Definer View: participants_public
-- ============================================================

-- 1. Habilitar RLS nas 4 tabelas pendentes
ALTER TABLE ranking_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE majority_cache    ENABLE ROW LEVEL SECURITY;
ALTER TABLE picks_reopen      ENABLE ROW LEVEL SECURITY;
ALTER TABLE phase_reopen      ENABLE ROW LEVEL SECURITY;

-- 2. ranking_snapshots — somente Worker (service_role) acessa
--    Bloqueia anon completamente
DROP POLICY IF EXISTS "no_anon_ranking_snapshots" ON ranking_snapshots;
CREATE POLICY "no_anon_ranking_snapshots" ON ranking_snapshots
  FOR ALL TO anon USING (false);

-- 3. majority_cache — frontend lê para exibir maioria dos palpites
--    Leitura pública OK, zero escrita via anon
DROP POLICY IF EXISTS "anon_select_majority_cache" ON majority_cache;
CREATE POLICY "anon_select_majority_cache" ON majority_cache
  FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "no_anon_write_majority_cache" ON majority_cache;
CREATE POLICY "no_anon_write_majority_cache" ON majority_cache
  FOR INSERT TO anon WITH CHECK (false);

DROP POLICY IF EXISTS "no_anon_update_majority_cache" ON majority_cache;
CREATE POLICY "no_anon_update_majority_cache" ON majority_cache
  FOR UPDATE TO anon USING (false);

DROP POLICY IF EXISTS "no_anon_delete_majority_cache" ON majority_cache;
CREATE POLICY "no_anon_delete_majority_cache" ON majority_cache
  FOR DELETE TO anon USING (false);

-- 4. picks_reopen — frontend lê palpites de reabertura para exibição
--    Leitura pública OK, zero escrita via anon
DROP POLICY IF EXISTS "anon_select_picks_reopen" ON picks_reopen;
CREATE POLICY "anon_select_picks_reopen" ON picks_reopen
  FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "no_anon_write_picks_reopen" ON picks_reopen;
CREATE POLICY "no_anon_write_picks_reopen" ON picks_reopen
  FOR INSERT TO anon WITH CHECK (false);

DROP POLICY IF EXISTS "no_anon_update_picks_reopen" ON picks_reopen;
CREATE POLICY "no_anon_update_picks_reopen" ON picks_reopen
  FOR UPDATE TO anon USING (false);

DROP POLICY IF EXISTS "no_anon_delete_picks_reopen" ON picks_reopen;
CREATE POLICY "no_anon_delete_picks_reopen" ON picks_reopen
  FOR DELETE TO anon USING (false);

-- 5. phase_reopen — frontend lê fases abertas para exibição
--    Leitura pública OK, zero escrita via anon
DROP POLICY IF EXISTS "anon_select_phase_reopen" ON phase_reopen;
CREATE POLICY "anon_select_phase_reopen" ON phase_reopen
  FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "no_anon_write_phase_reopen" ON phase_reopen;
CREATE POLICY "no_anon_write_phase_reopen" ON phase_reopen
  FOR INSERT TO anon WITH CHECK (false);

DROP POLICY IF EXISTS "no_anon_update_phase_reopen" ON phase_reopen;
CREATE POLICY "no_anon_update_phase_reopen" ON phase_reopen
  FOR UPDATE TO anon USING (false);

DROP POLICY IF EXISTS "no_anon_delete_phase_reopen" ON phase_reopen;
CREATE POLICY "no_anon_delete_phase_reopen" ON phase_reopen
  FOR DELETE TO anon USING (false);

-- 6. Corrigir Security Definer View: participants_public
--    Recriar como SECURITY INVOKER (padrão seguro)
DROP VIEW IF EXISTS participants_public;
CREATE OR REPLACE VIEW participants_public
  WITH (security_invoker = true)
AS
  SELECT id, name, confirmed, confirmed_at
  FROM participants;

GRANT SELECT ON participants_public TO anon;
