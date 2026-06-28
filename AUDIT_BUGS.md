# Auditoria Copa2026 — Bugs Pendentes

> Última atualização: 2026-06-28  
> Bugs corrigidos nesta sessão: 4a, 4b, 5, 6, 9, fetchFifaScores, _bolaoReopenStatusFetched, copa2026.html encoding

---

## Bug 1 & 2 — KO scoring no snapshot do worker é código morto

**Arquivo:** `bolao-worker.js` — função `task=snapshot`  
**Problema:** `GAME_KEY_MAP` só mapeia jogos 1–72 (grupo). Jogos KO (73–104) não têm entrada no mapa, então a lógica de `calcKOPts` nunca é atingida durante o snapshot automático do worker.  
**Impacto:** Pontuação KO não é calculada pelo worker. O frontend contorna via `checkAutoSnapshot` que recalcula localmente — por isso funciona na prática, mas o snapshot salvo no banco não reflete KO pts.  
**Risco:** Médio — se o frontend ficar offline ou o usuário não recarregar, o ranking no banco fica desatualizado para KO.  
**Solução sugerida:** Estender `GAME_KEY_MAP` para cobrir jogos 73–104, ou separar o mapeamento de grupo do KO no snapshot. Requer teste cuidadoso para não quebrar scoring de grupo.

---

## Bug 3 — `useFullTable` com lógica divergente entre worker e frontend

**Arquivo:** `bolao-worker.js` e `index.html`  
**Problema:** A condição que decide se um participante usa tabela completa (15/9/6/3 + bônus) ou reduzida (10/6/4/2, sem bônus) tem implementações ligeiramente diferentes nos dois lugares.  
**Impacto:** Baixo enquanto Bug 1 não for corrigido (o worker não executa scoring KO de qualquer forma). Se Bug 1 for corrigido, pode gerar divergência de pontuação entre o que o worker salva e o que o frontend mostra.  
**Risco:** Baixo agora, médio após Bug 1 ser corrigido.  
**Solução sugerida:** Extrair a lógica de `useFullTable` para uma função compartilhada, ou garantir que os dois lados usem exatamente a mesma condição. Corrigir junto com Bug 1.

---

## Bug 7 — Cron auto-reopen conta jogos KO ao verificar fim da fase de grupos

**Arquivo:** `bolao-worker.js` — cron `auto-reopen`  
**Problema:** O threshold de jogos para abrir a fase KO conta o total de jogos finalizados, incluindo os próprios jogos KO. Se jogos KO forem registrados antes do threshold ser avaliado, a contagem pode disparar a abertura de uma fase incorretamente.  
**Impacto:** Baixo no calendário atual (Copa 2026 tem fases bem separadas no tempo). Risco mais real em reprocessamentos manuais ou se o cron rodar em situação de dados inconsistentes.  
**Risco:** Baixo.  
**Solução sugerida:** Filtrar a contagem por fase ao verificar thresholds — ex. contar apenas jogos ≤72 para o threshold de r32, apenas 73–88 para r16, etc.

---

## Bug 8 — `_bolaoGetBracketCache` ignora parâmetro `picks`

**Arquivo:** `index.html`  
**Problema:** A função `_bolaoGetBracketCache(picks)` recebe `picks` mas não o usa — sempre retorna o cache global independente do argumento.  
**Impacto:** Nenhum — a função não é chamada em produção (código órfão).  
**Risco:** Nenhum no estado atual.  
**Solução sugerida:** Remover a função se não for usada, ou corrigir o parâmetro se vier a ser necessária.

---

## Notas gerais

- `bolao-worker.js` e `index.html` devem sempre ser mantidos em sync quanto à lógica de scoring.
- `copa2026.html` é sempre gerado via `cp index.html copa2026.html` — nunca editar diretamente.
- Qualquer mudança no worker deve ser validada com `node --check bolao-worker.js` antes do deploy.
- Qualquer mudança no frontend deve extrair o `<script>` e validar com `node --check`.
