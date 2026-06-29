-- Passo 1: Adicionar coluna bonus_points na tabela participants (só precisa rodar uma vez)
ALTER TABLE participants ADD COLUMN IF NOT EXISTS bonus_points INTEGER DEFAULT 0;

-- Passo 2: Dar 100 pontos de bônus para o Heitor Guilherme
-- VERIFIQUE o nome exato antes de rodar (case-insensitive abaixo)
UPDATE participants
SET bonus_points = 100
WHERE LOWER(name) = LOWER('Heitor Guilherme');

-- Confirmar que foi aplicado (deve retornar 1 linha com bonus_points = 100)
SELECT id, name, confirmed, bonus_points
FROM participants
WHERE LOWER(name) = LOWER('Heitor Guilherme');
