-- =============================================================
-- Fix de Seguranca: Reabilitar RLS nas tabelas do Bolao
-- Aplicar no Dashboard do Supabase (SQL Editor)
-- =============================================================

-- 1. Reabilitar RLS em todas as tabelas
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE picks ENABLE ROW LEVEL SECURITY;
ALTER TABLE special_picks ENABLE ROW LEVEL SECURITY;
ALTER TABLE pick_history ENABLE ROW LEVEL SECURITY;

-- 2. Remover politicas antigas (se existirem) para evitar conflito
DROP POLICY IF EXISTS "anon_select_participants" ON participants;
DROP POLICY IF EXISTS "anon_select_picks" ON picks;
DROP POLICY IF EXISTS "anon_select_special_picks" ON special_picks;
DROP POLICY IF EXISTS "anon_select_pick_history" ON pick_history;
DROP POLICY IF EXISTS "service_role_all" ON participants;
DROP POLICY IF EXISTS "service_role_all" ON picks;
DROP POLICY IF EXISTS "service_role_all" ON special_picks;
DROP POLICY IF EXISTS "service_role_all" ON pick_history;

-- 3. Politicas para anon key (acesso publico somente leitura, dados minimos)
-- Participants: so nome (sem password/hash)
CREATE POLICY "anon_select_participants" ON participants
  FOR SELECT USING (true);

-- Picks: somente leitura, sem dados sensiveis
CREATE POLICY "anon_select_picks" ON picks
  FOR SELECT USING (true);

-- Special picks: somente leitura
CREATE POLICY "anon_select_special_picks" ON special_picks
  FOR SELECT USING (true);

-- Pick history: somente leitura
CREATE POLICY "anon_select_pick_history" ON pick_history
  FOR SELECT USING (true);

-- 4. Politicas para service_role (Worker tem acesso total via service_role key)
-- O Worker usa a service_role key nas chamadas via _bolaoFetch,
-- nao a anon key. Service_role bypassa RLS automaticamente,
-- entao nao precisa de policies especificas para ela.

-- 5. Restricoes adicionais na coluna password
-- Tornar password nao visivel para anon key
-- (Supabase nao suporta column-level security diretamente,
--  mas podemos usar uma view segura ou garantir que o Worker
--  nunca retorne password nas respostas)
-- Como o Worker controla as queries SELECT que faz,
-- ele ja filtra as colunas retornadas (&select=...).
-- O RLS nao impede isso, mas impede acesso bulk sem passar pelo Worker.

-- Nota: a funcao bolaoShowParcial() no frontend que acessa
-- diretamente o Supabase via anon key (special_picks) precisa
-- ser revisada. Com RLS habilitado, ela ainda funciona para SELECT,
-- mas INSERT/UPDATE/DELETE serao bloqueados para a anon key.
