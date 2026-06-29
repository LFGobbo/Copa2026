# Auditoria Copa2026 — Status dos Bugs

> Última atualização: 2026-06-29

---

## ✅ Bug 7 — Cron auto-reopen contava jogos KO para threshold de grupos

**Status:** CORRIGIDO  
**Arquivo:** `bolao-worker.js` — cron `auto-reopen`  
**Problema:** O auto-reopen fazia um fetch extra à FIFA API para contar jogos concluídos, o que era redundante e poderia divergir dos dados em `live_scores`.  
**Correção:** Substituído por contagem direta de `live_scores` (Supabase), que é a mesma fonte usada pelo snapshot — consistente e sem chamada externa adicional.

---

## ✅ Bug 1 & 2 — KO scoring no snapshot do worker era código morto

**Status:** PARCIALMENTE CORRIGIDO  
**Arquivo:** `bolao-worker.js` — `task=snapshot` e `task=fifa`  
**Problema:** `GAME_KEY_MAP` cobria apenas jogos 1–72 (grupo). Jogos KO (73–104) não entravam em `realScores`, tornando o branch `isKO` inacessível.  
**Correção aplicada:**
- `GAME_KEY_MAP` movido para escopo compartilhado entre `task=fifa` e `task=snapshot`
- `task=fifa` agora inclui `game_n` no upsert de `live_scores` para jogos de grupo (via GAME_KEY_MAP)
- `task=snapshot` agora usa `s.game_n` de `live_scores` (fallback para GAME_KEY_MAP por retrocompatibilidade)
- Novo endpoint `PATCH /admin/set-game-n` para admin taggear jogos KO manualmente

**SQL necessário (rodar no Supabase):** `live_scores_game_n.sql`

**Limitação restante:** Para jogos KO, `game_n` em `live_scores` precisa ser setado manualmente via `PATCH /admin/set-game-n` após cada jogo KO completar. Exemplo:
```
PATCH /admin/set-game-n
{ "adminPass": "...", "game_key": "BRA_ARG", "game_n": 89 }
```
O `game_key` é `homeAbbr_awayAbbr` — verificar em `live_scores` após rodar `task=fifa`.

---

## ⚠️ Bug 3 — `useFullTable` com lógica divergente entre worker e frontend

**Status:** DOCUMENTADO — correção completa inviável sem refatoração maior  
**Arquivo:** `bolao-worker.js` — `task=snapshot`  
**Problema:**
- **Frontend:** `useFullTable = acertouConfronto && !temReopen` (correto — exige que o usuário tenha previsto os times certos E não tenha reaberto)
- **Worker:** `useFullTable = !hasReopen` (incompleto — não verifica `acertouConfrunto`)

**Por que não foi corrigido completamente:** Para calcular `acertouConfrunto` no worker, seria necessário replicar toda a lógica de resolução de bracket do frontend — saber quais times o usuário previu para cada confronto KO com base nos palpites dos rounds anteriores. Código de alta complexidade e risco.

**Impacto real:** O snapshot do worker pode sobrestimar levemente os pontos KO de participantes que palpitaram no confronto errado e não reabriram. O ranking ao vivo mostrado aos usuários é calculado pelo frontend, que verifica `acertouConfrunto` corretamente — não é afetado. Apenas o gráfico de evolução histórica (que usa `ranking_snapshots`) pode ter leve divergência.

**Comentário adicionado no código** para documentar a limitação.

---

## ✅ Bug 8 — `_bolaoGetBracketCache` ignorava parâmetro `picks`

**Status:** N/A — função não encontrada no código atual  
A função foi removida em versão anterior ou o bug era referência a código que não existia mais.

---

## Notas gerais

- `copa2026.html` é sempre gerado via `cp index.html copa2026.html` — nunca editar diretamente.
- Qualquer mudança no worker: validar com `node --check bolao-worker.js`.
- Qualquer mudança no HTML: extrair `<script>` e validar com `node --check`.
- O ranking ao vivo é 100% calculado no frontend. O `ranking_snapshots` é apenas histórico (gráfico de evolução).
