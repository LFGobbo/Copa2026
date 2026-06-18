-- ============================================================
-- Copa2026 Bolão — FIX DE SEGURANÇA: Reabilitar RLS
-- ============================================================
-- Motivo: a anon key do Supabase está hardcoded em texto puro no
-- index.html (usada pela função bolaoShowParcial para ler
-- special_picks direto, sem passar pelo Worker). Com RLS
-- desabilitado, essa anon key dá acesso de LEITURA E ESCRITA
-- irrestrito a participants, picks, special_picks e pick_history
-- para qualquer pessoa que inspecione o código-fonte do site.
--
-- Este script reabilita RLS e cria policies que:
--   1. Permitem ao público (anon) LER apenas os campos não-sensíveis
--      necessários para ranking/estatísticas (nome, picks, special_picks).
--   2. NUNCA permitem escrita via anon key (INSERT/UPDATE/DELETE).
--   3. NUNCA expõem a coluna "password" de participants para anon.
--   4. O Worker continua funcionando 100% igual, pois ele usa a
--      service_role key, que sempre faz bypass de RLS por padrão.
--
-- Executar no SQL Editor do Supabase Dashboard.
-- ============================================================

-- 1. Reabilitar RLS nas 4 tabelas
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE picks ENABLE ROW LEVEL SECURITY;
ALTER TABLE special_picks ENABLE ROW LEVEL SECURITY;
ALTER TABLE pick_history ENABLE ROW LEVEL SECURITY;

-- 2. Remover policies antigas (se existirem, para podermos recriar do zero)
DROP POLICY IF EXISTS "anon_select_name" ON participants;
DROP POLICY IF EXISTS "anon_no_write_participants" ON participants;
DROP POLICY IF EXISTS "anon_select_picks" ON picks;
DROP POLICY IF EXISTS "anon_no_write_picks" ON picks;
DROP POLICY IF EXISTS "anon_select_special_picks" ON special_picks;
DROP POLICY IF EXISTS "anon_no_write_special_picks" ON special_picks;
DROP POLICY IF EXISTS "anon_no_access_pick_history" ON pick_history;

-- 3. participants: permitir SELECT público apenas de id, name, confirmed
--    (NÃO da coluna password). RLS não filtra colunas diretamente, então
--    a forma segura é criar uma VIEW pública sem a coluna password e
--    bloquear todo acesso direto à tabela via anon.
CREATE POLICY "no_anon_access_participants" ON participants
  FOR ALL
  TO anon
  USING (false);

-- View segura, sem a coluna password, para leitura pública (ex: ranking)
CREATE OR REPLACE VIEW participants_public AS
  SELECT id, name, confirmed, confirmed_at
  FROM participants;

GRANT SELECT ON participants_public TO anon;

-- 4. picks: leitura pública permitida (necessária para ranking/estatísticas),
--    mas NUNCA escrita via anon (toda escrita deve passar pelo Worker
--    autenticado com service_role key).
CREATE POLICY "anon_select_picks" ON picks
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "no_anon_write_picks" ON picks
  FOR INSERT
  TO anon
  WITH CHECK (false);

CREATE POLICY "no_anon_update_picks" ON picks
  FOR UPDATE
  TO anon
  USING (false);

CREATE POLICY "no_anon_delete_picks" ON picks
  FOR DELETE
  TO anon
  USING (false);

-- 5. special_picks: mesma lógica de picks (leitura pública, zero escrita)
CREATE POLICY "anon_select_special_picks" ON special_picks
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "no_anon_write_special_picks" ON special_picks
  FOR INSERT
  TO anon
  WITH CHECK (false);

CREATE POLICY "no_anon_update_special_picks" ON special_picks
  FOR UPDATE
  TO anon
  USING (false);

CREATE POLICY "no_anon_delete_special_picks" ON special_picks
  FOR DELETE
  TO anon
  USING (false);

-- 6. pick_history: histórico interno, não precisa ser público.
--    Bloquear todo acesso via anon (só o Worker com service_role acessa).
CREATE POLICY "no_anon_access_pick_history" ON pick_history
  FOR ALL
  TO anon
  USING (false);

-- ============================================================
-- IMPORTANTE — Ação necessária no código depois deste SQL:
-- ============================================================
-- A função bolaoShowParcial() no index.html faz:
--   fetch('https://.../rest/v1/special_picks?select=...', {headers:{apikey:supaKey,...}})
--
-- Isso continuará funcionando após este SQL (special_picks tem SELECT
-- liberado para anon). Mas o ideal é trocar essa chamada para passar
-- pelo Worker (endpoint /admin/parcial ou similar) em vez de bater
-- direto no Supabase com a anon key hardcoded no HTML. Isso é uma
-- limpeza recomendada, não estritamente necessária para a correção
-- de segurança em si.
--
-- Após rodar este script, teste:
--   1. O site carrega o ranking normalmente (leitura pública OK)
--   2. bolaoSavePick() continua funcionando (escrita via Worker, que
--      usa service_role key e ignora RLS)
--   3. Uma tentativa de escrita direta usando a anon key deve falhar
--      com erro de permissão (RLS bloqueando)
-- ============================================================
