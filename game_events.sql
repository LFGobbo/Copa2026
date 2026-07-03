-- Tabela game_events: cache compartilhado de gols/cartões (resolvidos no cliente)
-- Aditiva, não mexe em nenhuma tabela existente, não apaga nada.
CREATE TABLE IF NOT EXISTS game_events (
  game_n INTEGER PRIMARY KEY,
  goals JSONB DEFAULT '{}'::jsonb,
  cards JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Recarregar o cache de schema do PostgREST (mesma lição aprendida com bonus_points:
-- sem isso a API pode continuar "não vendo" a tabela nova por um tempo)
NOTIFY pgrst, 'reload schema';

-- Conferir que foi criada
SELECT table_name FROM information_schema.tables WHERE table_name = 'game_events';
