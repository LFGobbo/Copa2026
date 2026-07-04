# Copa do Mundo 2026 — Documentação do Projeto

**Última atualização:** 2026-07-04 (v20.21 — Fix: ranking geral inteiro quebrava quando um participante tinha zero palpites registrados)
**Repositório:** `github.com/LFGobbo/Copa2026`
**Deploy:** https://lfgobbo.github.io/Copa2026/
**Tecnologia:** HTML puro + CSS + JavaScript (zero build tools, sem Node.js)

---

> ⚠️ **LEIA PRIMEIRO — Seção 19**
> Antes de qualquer alteração de código, leia a **Seção 19 — Protocolo Obrigatório de Desenvolvimento**.
> Ela tem prioridade sobre todas as demais seções deste documento.

---

## 1. Visão Geral

Aplicação web autossuficiente (single HTML) para acompanhar a Copa do Mundo 2026:

- 48 seleções, 12 grupos (A-L), 104 jogos
  - Bolão cobre apenas 99 jogos (os 5 primeiros já haviam começado quando o bolão abriu)
- Placar ao vivo via FIFA API + entrada manual
- Grupos com classificação dinâmica (7 critérios de desempate, H2H primeiro, fair play, ranking FIFA)
- Mata-mata com bracket automático (propagação de resultados)
- Artilharia e assistências
- Convocados (1248 jogadores) com fotos e busca
- Regras atualizadas (SAOT, VAR, 8s/5s/10s)
- **Bolão** integrado com Supabase (palpites, ranking, pontuação)
- Service Worker para cache offline
- Persistência redundante (IndexedDB + 3 localStorage)

### Restrições

- HTML principal (~336KB) com dados essenciais inline (`GAMES`, `GROUPS`)
- Dados pesados (`PLAYERS` ~116KB, `PLAYER_PHOTOS` ~174KB) em JSON externo
- Zero dependências, zero build steps
- Dados extraídos de `Copa_2026_Completa.xlsx` (3 sheets)

---

## 2. Arquitetura

```
index.html (ou copa2026.html)
+-- CSS inline (~480 linhas) | design system completo, responsivo, dark theme
+-- HTML estático (~200 linhas) | header, tabs, content containers, popups
+-- JS inline (~2500 linhas) | toda a lógica da aplicação
|
+-- players.json       | 1248 jogadores (carregado via XHR assíncrono)
+-- photos.json        | 951 URLs de fotos (carregado via XHR assíncrono)
|
+-- sw.js              | Service Worker (cache-first + stale-while-revalidate)
|
+-- *.png (7 logos broadcast + 4 assets) | estáticos cacheados pelo SW
|
+-- Supabase (REST API) | Bolão (participants, picks, special_picks)
```

### Fluxo de inicialização

1. HTML carrega com CSS + estrutura + `GAMES`/`GROUPS` inline
2. `_loadAllData()` dispara XHR paralelos para `players.json` e `photos.json`
3. `initFifaMaps()` busca calendário FIFA, monta mapeamento de times/jogadores
4. `_loadPersistent()` tenta restaurar scores/goals/cards de IndexedDB + localStorage (3 chaves)
5. `renderGames()`, `renderGroups()`, `renderBracket()`, `renderScorers()` na tab ativa
6. `bolaoInit()` carrega ranking do bolão do Supabase
7. `setInterval(updateCountdown, 1000)` — countdown em tempo real
8. `setInterval(fetchCalendar, pollingInterval)` — FIFA API polling (10s com live, 60s sem)
9. Service Worker registrado em background

---

## 3. Inventário de Arquivos

| Arquivo | Tamanho | Função |
|---|---|---|
| `index.html` | ~336KB | App principal (deploy GitHub Pages) |
| `copa2026.html` | ~336KB | Cópia idêntica (compatibilidade) |
| `players.json` | ~116KB | 1248 jogadores (48 times · 26) |
| `photos.json` | ~174KB | 951 URLs de fotos (Wikipedia + FIFA) |
| `sw.js` | 2.7KB | Service Worker v21 (fallback só navigate) |
| `bola_t.png` | 36KB | Bola Trionda (redimensionada) |
| `mascote1_t.png` | ~41KB | Mascote principal |
| `mascote2_t.png` | ~41KB | Mascote secundário |
| `mascote3_t.png` | ~41KB | Mascote terciário |
| `logo_globo.png` | ? | Logo Globo |
| `logo_sportv.png` | ? | Logo SporTV |
| `logo_cazetv.png` | ? | Logo CazéTV (20px altura no CSS) |
| `logo_sbt.png` | ? | Logo SBT |
| `logo_nsports.png` | ? | Logo N Sports |
| `logo_globoplay.png` | ? | Logo Globoplay |
| `logo_getv.png` | ? | Logo Ge TV |
| `AGENTS.md` | ? | Esta documentação |
| `LEVANTAMENTO_TECNICO.md` | ? | Análise técnica detalhada |
| `opencode.json` | ? | Configuração OpenCode |
| `.gitignore` | ? | Regras git |

---

## 4. Modelo de Dados

### 4.1 GAMES (inline no HTML)

```js
// Array de 104 objetos
{
  n: 1,                    // Número do jogo (1-104)
  f: "Grupo A",            // Fase (ou "Mata-Mata")
  d: "11/06 Qui",          // Data
  t: "16:00",              // Horário (Brasília, UTC-3)
  s: "Azteca · Cidade do México",  // Estádio
  a: "México",             // Time A (mandante)
  b: "África do Sul",      // Time B (visitante)
  br: "Globo · SporTV · CazéTV · SBT",  // Broadcasts (separador U+00B7)
  sa: "",                  // Placar A (seed inicial, vazio)
  sb: ""                   // Placar B (seed inicial, vazio)
}
```

### 4.2 GROUPS (inline)

```js
const GROUPS = {
  "A": ["África do Sul", "Coreia do Sul", "México", "República Tcheca"],
  "B": ["Bósnia", "Canadá", "Catar", "Suíça"],
  // ... até "L"
}
```

### 4.3 PLAYERS (players.json)

```js
{
  "Brasil": [
    {
      "num": 1, "name": "Alisson", "pos": "Goleiro",
      "club": "Liverpool", "pais": "Inglaterra"
    },
    // ... 26 jogadores por time
  ]
}
// Total: 48 times · 26 jogadores = 1248
```

### 4.4 PLAYER_PHOTOS (photos.json)

```js
{
  "Alisson": "https://upload.wikimedia.org/.../Alisson.jpg",
  // ... 951 entradas (~76% de cobertura)
}
```

Também usa fallback da Squad API da FIFA (`PlayerPicture.PictureUrl`) via `FIFA_PHOTO_BY_TEAM_NUM`.

### 4.5 Scores (runtime + persistido)

```js
scores = {
  1: { a: 2, b: 0, pen: 'a' },  // pen opcional (pênaltis)
  2: { a: 2, b: 1 },
  // ...
}
```

### 4.6 Goals (runtime + persistido)

```js
goals = {
  1: {
    a: [
      { key: "g_1711664400000", player: "10", pname: "Raúl Jiménez",
        type: "gol", minute: 45, assist: "17", aname: "Orbelín Pineda",
        auto: true, team: "a" }
    ],
    b: []
  }
}
```

`auto: true` = vindo da FIFA Timeline API. Tipos: `gol`, `pen`, `falta`, `own`.

### 4.7 Cards (runtime + persistido)

```js
cards = {
  1: {
    a: [
      { key: "c_1711664400000", player: "4", pname: "Edson Álvarez",
        type: "yellow", minute: 32, team: "a", auto: true }
    ],
    b: []
  }
}
```

### 4.8 Suspensões (runtime)

`getSuspensions(gameId)` agrega cartões de **jogos anteriores** de cada time:
- 2 cartões amarelos (em jogos distintos) = suspenso
- 1 cartão vermelho = suspenso

---

## 5. CSS Architecture

### Design System

- **Tema:** Dark mode com glassmorphism (fundo `#08081a`, cards `#18183a`)
- **Tipografia:** Inter font embedded como base64 (64KB, latin subset, 400-700)
- **Cores:** 12 cores de grupo (A-L), ouro para Brasil/destaques
- **Responsivo:** 3 breakpoints com `clamp()` fluido

### CSS Variables

```css
:root {
  --bg: #08081a;           --surface: #11112e;
  --card: #18183a;         --card-hover: #1e1e44;
  --border: #252550;       --border-light: #333368;
  --gold: #ffdf00;         --green: #00c853;
  --red: #ff1744;          --blue: #448aff;
  --orange: #ff9100;       --text: #eaeaf2;
  --muted: #6a6a8e;
  --fs-body: clamp(13px, 1.8vw, 17px);
  --fs-sm: clamp(10px, 1.3vw, 13px);
  --fs-xs: clamp(8px, 1vw, 11px);
  --sp-sm: clamp(8px, 1.2vw, 16px);
  --card-min: 280px;
}
```

### Responsivo

| Breakpoint | Mudanças |
|---|---|
| `768px` | Header sem mascotes, tabs scrolláveis, popup mais largo |
| `480px` | Game card com grid-template-areas, inputs menores, fonte 18px |

### Componentes principais (classes)

| Classe | Função |
|---|---|
| `.game-card` | Card de jogo (grid 5 colunas) |
| `.game-card.live` | Ao vivo: borda verde + glow + pulse |
| `.game-card.collapsed` | Jogos passados (colapsado, expande com +) |
| `.countdown-bar` | Barra superior de próximos jogos |
| `.filter-btn` | Filtro de grupo (12 cores) |
| `.group-card` | Tabela de classificação |
| `.bracket-tree` | SVG do mata-mata |
| `.scorers-table` | Tabela de artilharia |
| `.bolao-*` / `.bsp-*` | Bolão (ranking, cards de palpite) |
| `.popup-overlay` | Modal de gol/cartão |

---

## 6. JavaScript Architecture

### 6.1 Núcleo e Configuração

| Variável / Const | Descrição |
|---|---|
| `GAMES` | 104 jogos (inline) |
| `GROUPS` | 12 grupos (inline) |
| `PLAYERS` | 1248 jogadores (carregado de players.json) |
| `scores` `goals` `cards` | Estado runtime + persistido |
| `REFEREES` | Cache de Árbitros (Wikipedia) |
| `BAK_KEYS` | 3 chaves de localStorage para redundância |
| `VALID_TABS` | Whitelist de abas válidas (inclui `diagnostico`) |
| `_LIVE_WINDOW` | 10800000ms — janela para live/past (3h cobre 90'+30'+pênaltis) |
| `TIMELINE_HASH` | Hash de eventos da timeline para detectar correções da FIFA |
| `GAME_BY_ID` | `GAME_BY_ID[g.n] = g` — lookup direto, elimina `GAMES.find()` |
| `MATCH_HALFTIME` | Mapa idMatch → true (intervalo entre 1T e 2T) |
| `MATCH_SECOND_KICKOFF` | Mapa idMatch → Date (UTC do inicio do 2T via Type 8 ou SecondHalfKickOffTime) |

### 6.2 Funções por Domínio

#### Persistência

| Função | Descrição |
|---|---|
| `_loadPersistent()` | Tenta 3 chaves localStorage, replica entre elas |
| `saveState()` | IndexedDB + 3 localStorage |
| `_openDB()` / `_idbSave()` / `_idbLoad()` | IndexedDB (store separado: s/g/c) |

#### Renderização

| Função | Descrição |
|---|---|
| `dynRender(el, html)` | Renderiza só se mudou (evita flicker) |
| `renderGames(filter)` | Lista jogos (próximos primeiro, passados colapsados) |
| `renderGameCard(g)` | Card individual (placar, times, eventos, pênaltis) |
| `renderGroups()` | 12 tabelas de classificação |
| `renderThirdPlaced()` | Tabela de melhores 3ºs colocados |
| `renderBracket()` / `renderBracketCards()` / `renderBracketTree()` | Mata-mata (cards + SVG) |
| `renderScorers()` | Artilharia + assistências |
| `renderSquads()` | Convocados com virtualização (IntersectionObserver) |

#### Bracket (Mata-Mata)

| Função | Descrição |
|---|---|
| `_groupStandings(letter)` | Classificação do grupo (7 critérios FIFA 2026: P → H2H P/SG/GF → GD → GF → fair play → ranking FIFA) |
| `_rankedThirds()` | 8 melhores 3ºs colocados |
| `_winnerOf(n)` | Vencedor de um jogo (com pênaltis) |
| `_loserOf(n)` | Perdedor de um jogo |
| `resolveTeam(placeholder)` | Resolve slot: "1º Grupo A", "V. Jogo 73", "0" (3º) |
| `_THIRD_SLOTS` | Mapeamento de slots de 3º nos jogos KO |

#### Placares e Eventos

| Função | Descrição |
|---|---|
| `isGameLive(g)` | Live detection (MATCH_STARTED + 3h window) |
| `gameIsPast(g)` | Jogo encerrado (fora janela 3h + tem placar) |
| `gameUTC(g)` | Converte data/hora para UTC (offset fixo +3 BRT) |
| `scoreInput()` | Handler de input de placar |
| `addGoalUI(id, team)` / `addCardUI(id, team)` | Abre popup de gol/cartão |
| `confirmGoal()` / `confirmCard()` | Salva evento |
| `removeGoal(id, team, key)` / `removeCard(...)` | Remove evento |
| `setPen(id, side)` | Define vencedor nos pênaltis |
| `getSuspensions(forGame)` | Agrega suspensões por time |

#### FIFA API

| Função | Descrição |
|---|---|
| `fetchFifaScores(timeout)` | GET `/api/v3/calendar/matches` |
| `mergeScores(map)` | Merge scores da FIFA nos locais |
| `initFifaMaps()` | Mapeia team IDs, match IDs, squads |
| `fetchCalendar()` | Polling principal (10s/60s) |
| `processTimeline(idMatch, gameId)` | Processa Timeline API (gols, cartões) |
| `auditData()` | Compara scores locais vs FIFA |

#### Convocados

| Função | Descrição |
|---|---|
| `renderSquads()` | Gera placeholders, hidrata com IntersectionObserver |
| `getPlayerPhoto(name, team, num)` | Busca foto (Wikipedia → FIFA Squad → fallback bandeira) |
| `flag(t)` | Bandeira via flagcdn.com com lazy loading |
| `broadcastBadge(br)` | Logos de transmissão |

#### Utilitários

| Função | Descrição |
|---|---|
| `esc(s)` | XSS escape |
| `flag(t)` | Bandeira HTML |
| `teamRow(n, c)` | Time + bandeira |
| `toBRT(g)` | Horário Brasília |

#### Countdown

| Função | Descrição |
|---|---|
| `updateCountdown()` | Atualiza a cada 1s: abertura → AO VIVO → próximo jogo |
| `scheduleCountdown()` | `setTimeout` recursivo — 1s se live, 30s se não |

#### Árbitros

| Função | Descrição |
|---|---|
| `loadAllReferees()` | Busca Wikipedia para 48 jogos, cache 6h |
| `_fetchWikiRefs(letter, cb)` | Wikipedia action=parse |

### 6.3 Funções de Diagnóstico

| Função | Descrição |
|---|---|
| `renderDiagnostico()` | Aba oculta `#diagnostico`: mostra mapeamento FIFA, hashes de timeline, scores locais |
| `switchTab(tab)` | Muda de aba sem `.tab` visível (usado para `diagnostico`) |

---

## 7. Bolão (Betting Pool)

### 7.1 Configuração Supabase

```
URL:  https://etbezmraylbvlnycltha.supabase.co
Tier: Free
Chave anônima: (removida do front-end na v19.7 — só o Worker usa service_role)
```

### 7.2 Cloudflare Worker (bolao-worker.js)

Middleware de segurança entre frontend e Supabase:

```
URL: https://copa2026-bolao.luizfelipegobbo.workers.dev
Turnstile Site Key: 0x4AAAAAADj0kWY7cUoZ_uwS (pública, vai no HTML)
Turnstile Secret: ver CREDENCIAIS_COPA2026.md (arquivo local, fora do repositório — nunca commitar este valor)
```

- **`POST /register`** — Turnstile validation + cria participante (hash server-side)
- **`POST /login`** — Compara senha (hash server-side), retorna JWT
- **`POST /picks`** — Salva palpites + histórico (requer JWT)
- **`GET /mypicks`** — Palpites do usuário logado (requer JWT)
- **`GET /ranking`** — Ranking público (sem auth)
- **`POST /special-picks`** — Campeão + artilheiro (requer JWT)
- **`PATCH /confirm`** — Confirma todos os palpites (requer JWT)
- **`PATCH /admin/unlock`** — Desbloqueia participante (admin)
- **`DELETE /reset`** — Limpa tudo (admin key)

### 7.3 Tabelas

| Tabela | Colunas | Função |
|---|---|---|
| `participants` | `id (uuid), name (unique), password (sha256), confirmed (bool), created_at` | Usuários |
| `picks` | `id, participant_id (fk), game_n (int), goals_a (int), goals_b (int), ko_pick (text), created_at, updated_at` | Palpites por jogo |
| `special_picks` | `id, participant_id (fk, unique), champion (text), top_scorer (text), locked (bool)` | Palpites especiais |

### 7.4 Funcionalidades

- Login/cadastro com SHA-256 via `crypto.subtle`
- Palpites por jogo (grid de inputs, trava 2h antes)
- Palpites especiais (campeão +50pts, artilheiro +20/+10)
- Simulação do bracket baseada nos palpites
- Botões de desempate em KO (quem passa?)
- Confirmação geral (bloqueia edição)
- Ranking com medalhas, pontos, detalhes expansíveis
- Desempate: 1º mais exatos, 2º mais resultados, 3º mais bônus

### 7.5 Pontuação

| Acerto | Pontos |
|---|---|
| Placar exato | 10 |
| Resultado + gol do vencedor | 6 |
| Resultado + gol do perdedor | 4 |
| Só resultado (vitória/empate) | 2 |
| Errou | 0 |
| Bônus final (placar exato na Final #104) | +20 (acumulável) |
| Campeão | +50 |
| Artilheiro exato | +20 |
| Artilheiro empatado | +10 |

### 7.6 Funções do Bolão

| Função | Descrição |
|---|---|
| `_supaFetch(path, method, body)` | Wrapper REST Supabase |
| `bolaoLogin()` | Login/cadastro |
| `bolaoSavePick(gameN)` | Salva palpite individual |
| `bolaoKOPick(gameN, side)` | Salva desempate KO |
| `bolaoSaveSpecial()` | Salva campeão + artilheiro |
| `bolaoConfirmAll()` | Trava tudo |
| `bolaoCalcPoints(...)` | Calcula pontos de um palpite |
| `bolaoCalcTotal(participantId)` | Pontuação total |
| `bolaoRenderRanking()` | Ranking com medalhas |
| `bolaoRenderPicksGrid()` | Grid de palpites |
| `_bolaoGetBracket(picks)` | Bracket simulado |
| `bolaoSimular()` | Gera dados de teste (9 participantes) |

### 7.7 Admin

```
_bAdm('BolaoAdmin2026!', 'Nome')  — console do DevTools
```

---


### 7.8 Reabertura do Mata-Mata (Bolão KO Reopen)

Implementada nas sessões de 2026-06-27/28. Permite que participantes editem palpites do mata-mata após saber os confrontos reais.

#### Tabelas novas no Supabase

| Tabela | Colunas | Função |
|---|---|---|
| `picks_reopen` | `id, participant_id (fk), game_n (int), score_a (int), score_b (int), created_at` | Palpites reeditados no mata-mata |
| `phase_reopen` | `id, phase (text unique), open (bool), deadline (timestamptz), game_ns (int[])` | Controle admin de quais fases estão abertas |

> ⚠️ `picks` é IMUTÁVEL (palpites originais). `picks_reopen` guarda os palpites novos da reabertura.

#### Fases KO e seus jogos

```javascript
KO_PHASE_GAMES = {
  r32:   [73..88],   // Rodada de 32 (16 jogos)
  r16:   [89..96],   // Oitavas de Final (8 jogos)
  qf:    [97..100],  // Quartas de Final (4 jogos)
  sf:    [101..102], // Semifinal (2 jogos)
  '3rd': [103],      // Terceiro Lugar (1 jogo)
  final: [104],      // Final (1 jogo)
}
```

#### Auto-abertura via Worker (Cron)

```javascript
PHASE_THRESHOLD = { r32: 72, r16: 88, qf: 96, sf: 100, '3rd': 102, final: 103 }
// Quando completed >= threshold → abre a próxima fase via upsert em phase_reopen
```

#### Endpoints do Worker

| Método | Rota | Função |
|---|---|---|
| `GET` | `/reopen-status` | Retorna fases abertas + deadlines (público) |
| `POST` | `/picks-reopen` | Salva palpite da reabertura (requer JWT) |
| `POST` | `/admin/reopen` | Abre fase manualmente (admin key) |

#### Pontuação da Reabertura

| Situação | Tabela |
|---|---|
| Acertou confronto e não editou | Tabela cheia: 15/9/6/3 + bônus de fase |
| Acertou confronto mas editou | Tabela reduzida: 10/6/4/2 |
| Errou confronto | Tabela reduzida: 10/6/4/2 |

#### Posição dos elementos no HTML

```
<div id="bolao-reopen-banner">          ← FORA do bolao-logged-area (visível sem login)
<div id="bolao-logged-area">
  ...palpites...
  <div id="bolao-confirm-area">
  <div id="bolao-reopen-section">       ← DENTRO, APÓS palpites
```

#### Estados dos cards em `bolaoRenderReopenSection()`

- **🔒 Acertou confronto / não editou**: borda verde, bônus garantido, "Editar mesmo assim" + aviso de redução
- **🔓 Errou confronto**: borda azul, inputs abertos, botão Salvar
- **✓ Salvo**: borda verde forte, placar em destaque, "Alterar palpite"

#### Fonte do palpite original nos cards

`_bolaoMyPicks[gn]` (vem de `/mypicks`, sem filtro de maxGame) como primária.
`_bolaoAllPicks[pid][gn]` como fallback — o ranking filtra por `game_n <= maxGame` (só jogos iniciados), então picks de jogos futuros não voltam no ranking.

#### Fluxo de carregamento pós-login (performance)

```javascript
// PARALELO — reduz tempo pela metade:
await Promise.all([bolaoLoadMyData().catch(e=>{}), bolaoLoadRanking().catch(e=>{})]);
bolaoRenderPicksGrid(); bolaoLoadMajority(); bolaoPopulateSpecials();
if(Object.keys(_bolaoOpenPhases||{}).length) bolaoRenderReopenSection();
```

## 8. Service Worker (sw.js)

**Cache name:** `copa2026-v21`

### Estratégia por tipo de recurso

| Recurso | Estratégia | Exemplos |
|---|---|---|
| Assets estáticos | Cache First | `*.png` (logos, bola, mascotes) |
| Dados JSON | Stale-While-Revalidate | `players.json`, `photos.json` |
| HTML | Network First | `index.html` |
| API externa | Network First (fallback index.html) | FIFA API, flagcdn |

### Ciclo de vida

1. **Install:** pré-cacheia assets estáticos, `skipWaiting()`
2. **Activate:** limpa caches antigos, `clients.claim()`, notifica `SW_UPDATED`
3. **Fetch:** roteia conforme estratégia acima
4. **Update:** versão nova força `controllerchange` — reload automático

---

## 9. Persistência

### Estratégia de 3 camadas

```
saveState()
+-- IndexedDB (store 'copa2026', key 's'=scores, 'g'=goals, 'c'=cards)
+-- localStorage 'copa2026_data'
+-- localStorage 'copa2026_bak1'
+-- localStorage 'copa2026_bak2'
```

### Recuperação

`_loadPersistent()` tenta as 3 chaves localStorage, replica dados entre elas se achar. `setTimeout` 200ms carrega IndexedDB e mergeia se ausente.

---

## 10. FIFA API

### Endpoints

| Endpoint | Uso |
|---|---|
| `/api/v3/calendar/matches?idCompetition=17&idSeason=285023` | Scores ao vivo (polling) |
| `/api/v3/timelines/{IdMatch}` | Eventos (gols, cartões) |
| `/api/v3/teams/{IdTeam}/squad?idCompetition=17&idSeason=285023` | Squad + fotos |

### Mapeamento

`FIFA_TEAM_MAP` (48 entries) mapeia código FIFA — nome português. `FIFA_PLAYER_MAP` mapeia `IdPlayer` — nossos jogadores por time + número.

### Polling

- 10s quando há jogos ao vivo
- 60s sem jogos ao vivo
- AbortController com timeout 8s (automático) / 10s (manual)

---

## 11. Armadilhas Conhecidas

### Encoding

- `ConvertTo-Json` no PS 5.1 faz duplo-encode UTF-8 (ex: "ç" → "?\x81")
- Broadcast separator usa `?` (U+00B7), split regex deve ser `\u00b7`
- Arquivos salvos com `[System.IO.StreamWriter]` e `UTF8Encoding($false)` para evitar BOM

### Dados

- Gol contra armazenado no time do botão clicado (inversão corrigida na renderização)
- **Gol contra truncado pelo placar**: gols contra ficam em `autoGoals[B]` mas `autoGoalsB.slice(0, finalAway)` os remove porque `finalAway=0`. Separa-se normais de contras antes da truncagem, cada grupo usa seu placar
- `HomeTeamScore: null` no calendário FIFA — placar extraído da Timeline API
- Grupos I/J tiveram dados trocados (corrigido v11.10)

### Código

- `onerror` em strings JS precisa de escape de aspas (`\'`)
- `parseInt()` sem radix 10 causa bugs em mobile
- `forEach` aninhado pode faltar `});` (quebrou processTimeline no v12)
- `dynRender` assíncrono com rAF causa flicker se `slideUp` CSS anima 104 cards
- **Chave de cartão sem EventId**: usar minuto como identificador permite duplicatas se o mesmo cartão for reprocessado. Usar `gameId_c_EventId` + `seenCardEvents` para deduplicação
- **`newEvents` vs timeline completa**: processar só eventos novos (`EventId > lastId`) impede revalidação de cartões removidos pela API. A timeline completa deve ser varrida, com `auto` marcador para distinguir auto de manual
- **`parseInt` em minuto com acréscimo**: `parseInt("90+8")` retorna 90, não 98. Usar `_parseMinute` que calcula "90+8" — 98
- **`JSON.stringify` remove whitespace**: usar `JSON.parse`/`JSON.stringify` em JSON embutido no HTML remove trailing newlines. `const a=[...]\nconst b={}` vira `const a=[...]const b={}` que é `SyntaxError`. ASI não insere `;` entre duas declarações `const` na mesma linha. Prefira string replacement cirúrgico; se precisar de parse, preserve manualmente o caractere de borda

### Bolão

- Campos vazios = sem palpite (não assume 0-0)
- `ko_pick` coluna precisa ser adicionada na tabela `picks` se não existir
- SHA-256 via `crypto.subtle` requer HTTPS (ou localhost)

### Cache/atualização (celular "desatualizado")

- **Antes de investigar código**: se o usuário disser que o celular (ou qualquer navegador) está mostrando dado antigo/incompleto que o PC já tem, primeiro pedir para fechar a aba/PWA por completo (não só minimizar) e reabrir. Uma aba já aberta continua com o JS antigo em memória mesmo depois de um deploy novo — o Service Worker atualiza o cache em background, mas isso não afeta uma página já carregada. Só investigar código se o problema persistir depois de um reload de verdade (caso real: 2026-07-03, jogos #83/84/85 "sumidos" no celular — resolvido só com reload, `game_events` no Supabase já tinha os dados certos o tempo todo).
- **`_bolaoBackfillPushEvents` (varredura de sessão)**: dispara `POST /events/bulk` (1 requisição só) uma vez por dia por navegador. Se precisar forçar reenvio antes de 24h para debug, limpar `localStorage.removeItem('copa2026_backfill_date')` no console.

---

## 12. Regras Obrigatórias de Desenvolvimento

### Antes de qualquer commit

1. **Balanço de chaves JS**: `{` e `}` devem ter saldo zero
2. **Funções críticas**: `dynRender`, `renderSquads`, `renderBracketTree`, `renderBracketCards`, `resolveTeam`, `isGameLive`, `updateCountdown`, `renderGames`, `renderGroups`, `renderScorers`, `esc`, `flag`, `broadcastBadge` — todas presentes
3. **Tag `<script>` íntegra**: `const GAMES` deve estar dentro de `<script>`, não em atributo HTML
4. **Strings JS com aspas escapadas**: `onerror="this.style.display=\'none\'"` (não `'none''`)
5. **Estrutura HTML válida**: tags balanceadas, sem atributos engolidos
6. **Arquivos idênticos**: `index.html` e `copa2026.html` devem ter mesmo conteúdo — sempre editados e commitados juntos, na mesma sessão. Nunca houve caso real de divergência entre os dois até hoje.

### Antes de qualquer deploy (executar automaticamente, sem precisar que o usuário peça)

O Worker é sobrescrito a cada deploy (seção 17) — a versão anterior em produção é perdida, mesmo que o Git esteja correto. Dois riscos diferentes, duas verificações diferentes, ambas a serem executadas pelo agente sem necessidade de solicitação explícita:

**Risco A — trabalho local não commitado (perdido entre sessões):**
1. `git status` — confirmar que não há nada pendente de commit antes de começar a editar
2. `git pull` — garantir que está com a última versão do remoto
3. Fazer as alterações
4. `git add -A && git commit -m "..." && git push` — commit e push antes do deploy, nunca depois

**Risco B — produção tem algo que o Git local não tem (perdido na sobrescrita, mesmo com Git "correto"):**
Antes de rodar `deploy-worker.ps1`, buscar o script atualmente em produção via API do Cloudflare (mesmo endpoint/token de leitura usado pelo deploy) e comparar com o `bolao-worker.js` local. Se não houver diferença além do que foi planejado, seguir com o deploy automaticamente. **Só parar e perguntar ao usuário se houver uma diferença não esperada** (ex: alguém editou o Worker direto no painel) — isso pode ser uma correção de emergência que ainda não voltou pro Git, e só o usuário sabe se ela deve ser preservada.

O mesmo vale para Supabase: se uma alteração de schema ou dado foi feita direto no SQL Editor do dashboard (fora de uma migration documentada), ela não está em nenhum arquivo local — confirmar com o usuário antes de qualquer operação que dependa do schema esperado, só nesse caso específico de divergência real.

Sem branches neste projeto (commit direto na main) — por isso essas verificações automáticas são a única proteção contra perda de trabalho, e devem rodar a cada deploy, não apenas quando solicitado.

### Verificação de regressão

Toda melhoria deve:
- Identificar funções/fluxos existentes que podem ser afetados
- Testar manualmente fluxos existentes na mesma área
- Verificar integridade de dados previamente funcionais
- Executar balanço de chaves + verificação de funções críticas
- Se alterar persistência, verificar `saveState()` sem exceções

### 12.1 Convenções de Código (validadas no código real em 2026-06-20)

### Declaração de variáveis
- `var` é o padrão dominante (1034 ocorrências). `const` só é usado para dados estruturais imutáveis no topo do arquivo (`GAMES`, `GROUPS`, `PLAYERS`, `DATA_VERSION`, `FLAG_ISO`, `GROUP_NAMES`, `GROUP_ORDER`, `BRACKET_ROUNDS`). `let` só aparece 3 vezes, para o estado runtime que é reatribuído (`scores`, `goals`, `cards`).
- **Não introduzir `let`/`const` em código novo só por preferência pessoal** — o projeto é majoritariamente ES5-style (`var`, `function` tradicional). Seguir o padrão existente evita inconsistência visual e mantém compatibilidade com o restante do arquivo.

### Nomenclatura
- Funções e variáveis: `camelCase` (`renderGames`, `currentFilter`)
- Constantes de configuração (mesmo que declaradas com `var`): `UPPER_SNAKE_CASE` (`BAK_KEYS`, `FIFA_TEAM_MAP`, `VALID_TABS`, `_LIVE_WINDOW`)
- Prefixo `_` = função ou variável interna/privada, **nunca chamada via `onclick` ou outro atributo HTML**. Confirmado: das 29 chamadas `onclick` no HTML, nenhuma usa função com `_`.
- Sem prefixo `_` = pode ser entry point de UI (`onclick`, `onchange`) ou função pública de alto nível
- Módulo do bolão: prefixo `bolao`/`_bolao` (`bolaoSavePick`, `_bolaoResolveTeam`) — sempre `bolao` em minúsculo no início, nunca `Bolao`

### Estilo
- Aspas duplas (`"`) são predominantes em código (727 vs 351 simples, excluindo blocos de dados JSON) — preferir duplas em código novo
- Indentação: 2 espaços por nível
- `function` tradicional, nunca arrow function (`=>`) — zero ocorrências no arquivo inteiro
- `parseInt()` sempre com radix (`parseInt(x, 10)`) — regra já documentada na seção 11, mas há 1 ocorrência residual sem radix (`parseInt(gid)`, função de diagnóstico) que ainda não foi corrigida

---

## 13. Version History

### v20.14 a v20.18 — Serie de incidentes reais: gols/cartões sumindo no celular (2026-07-03)

**Contexto:** depois do v20.13 (fix do backfill N+1), o usuário reportou que o problema original —
gols/cartões faltando na aba Jogos em alguns jogos (#81, #83, #84, #85), afetando artilheiros —
persistia, e que a página continuava lenta/travando no carregamento ("tela tremendo"). O usuário
pediu explicitamente para não teorizar e testar tudo de verdade antes de declarar qualquer coisa
resolvida (Regra de Ouro, §15). O processo de investigação real, incluindo becos sem saída,
está registrado abaixo porque cada etapa ensinou algo sobre o sistema.

#### v20.14 — PROCESSED_EVENTS e outros mapas nunca eram restaurados entre sessões

**Causa raiz encontrada e comprovada com teste isolado em Node (reproduzindo hoisting de `var`):**
o bloco que restaura `MATCH_ENDED`, `MATCH_STARTED`, `FIFA_MATCH_IDS`, `MATCH_FINALIZED`,
`MATCH_TIMELINE_FAILED`, `MATCH_TIMELINE_EMPTY` do `localStorage` (perto do topo do arquivo,
logo após `_savedData`) rodava **~1300 linhas antes** da declaração `var` dessas variáveis
(`var FIFA_TEAM_IDS={},FIFA_MATCH_IDS={},...`). Como a declaração `var` é hoisted mas a
atribuição só acontece na linha onde está escrita, `typeof MATCH_ENDED` nesse ponto do arquivo
era sempre `'undefined'`, e o bloco de restauração inteiro era código morto — nunca executava,
desde sempre. Além disso, `PROCESSED_EVENTS` (que marca "timeline desse jogo já processada,
não precisa buscar de novo") nunca fazia parte do `saveState()`/restauração.

**Efeito prático:** todo carregamento de página tratava todos os ~85 jogos já encerrados como
"nunca processados", refazendo a busca do timeline na FIFA e reenviando pro servidor para cada
um — 85 buscas + 85 envios + até 340 re-renderizações completas da tela, em toda carga.

**Fix:** bloco de restauração movido para logo depois da declaração das variáveis (dentro do
mesmo `var FIFA_TEAM_IDS=...` statement), estendido para incluir `PROCESSED_EVENTS`, e
`saveState()` passou a persistir `processedEvents` também.

**Efeito colateral não previsto (só descoberto na v20.16/17):** ao persistir `PROCESSED_EVENTS`
entre sessões, um jogo que teve UM fetch de timeline parcial/incompleto em qualquer sessão
anterior (ver v20.15) passou a ficar **permanentemente** marcado como "processado" com dado
incompleto — antes (bug), toda sessão tinha uma chance nova de tentar de novo; depois do fix,
não. Isso tornou visível um bug pré-existente mais grave (v20.15).

### v20.15 — Reconstrução de gols/cartões da timeline apagava dado bom (incidente #83/#84)

**Como foi descoberto:** ao simular uma carga "fria" (navegador/localStorage zerados) para
testar o fix acima, o próprio agente reproduziu o bug ao vivo — e nesse processo **sobrescreveu
com dado incompleto** os jogos #83 e #84 no cache compartilhado (Supabase `game_events`),
apagando gol e cartão que já estavam corretos lá, no meio de uma sessão real do usuário. Dados
reparados manualmente via `POST /events` com os valores corretos (havia backup do dump
completo feito momentos antes).

**Causa raiz:** a função que processa o timeline da FIFA (`processTimeline`, dentro do
`.then()` do fetch) **sempre descarta e reconstrói do zero** os eventos `auto` de gol/cartão
a cada chamada, mesmo que a resposta da FIFA venha parcial (jogador substituto sem
`FIFA_PLAYER_MAP[e.IdPlayer]` mapeado → evento silenciosamente descartado com `return`/`if(!ci)return`,
sem fallback). Isso é destrutivo tanto localmente (`goals[gameId]`/`cards[gameId]`) quanto no
que é enviado pro servidor via `_bolaoPushEvents`.

**Fix em duas camadas:**
1. **Servidor** (`bolao-worker.js`, rotas `POST /events` e `POST /events/bulk`): antes de
   gravar, busca o que já existe no Supabase para os `game_n` envolvidos (`_filterNonRegressing`)
   e descarta qualquer linha nova cujo total de eventos (gols+cartões) seja MENOR que o já salvo.
   Testado com 3 cenários (timeline parcial bloqueada, dado completo aceito, jogo novo sem
   histórico aceito) — todos corretos.
2. **Cliente** (`index.html`/`copa2026.html`, dentro de `processTimeline`): mesma guarda antes
   de sobrescrever `goals[gameId]`/`cards[gameId]` localmente — se o total novo for menor que o
   que já existia (local ou vindo do pull do cache compartilhado), mantém o antigo e não marca
   `changed`/não reenvia pro servidor.

### v20.16 — Pull do cache compartilhado não marcava jogo como resolvido (causa real da travada)

Mesmo depois do v20.14, uma carga fria ainda disparava dezenas de buscas na FIFA porque o
`_bolaoPullEventsOnce()` (que busca `GET /events` uma vez por carga) preenchia `goals`/`cards`
mas nunca marcava `PROCESSED_EVENTS`, então o `poll()` — que roda logo depois, em paralelo —
não tinha como saber que aquele jogo já estava resolvido via cache, e disparava a busca na FIFA
mesmo assim. **Fix:** `_bolaoPullEventsOnce` agora marca `PROCESSED_EVENTS[matchId]='fromCache'`
para qualquer jogo que já tenha gol/cartão (local ou recém-vindo do pull), evitando a busca
redundante. Testado em Node com simulação de 85 jogos: 85 buscas redundantes → 0.

### v20.17 — `.catch(function(){})` vazio escondia falhas do pull

Investigando por que mesmo com os fixes acima um jogo específico (#83) continuava sem dado
numa carga limpa (confirmado repetidas vezes ao vivo no Chrome, sem theorizar — via
`performance.getEntriesByType('resource')` e leitura direta do estado `goals`/`cards`/
`PROCESSED_EVENTS`/`_fetchingTimelines` no console), descobriu-se que a única tentativa de
`GET /events` do `_bolaoPullEventsOnce()` terminava em `.catch(function(){})` — qualquer falha
(rede, timing, exceção) era engolida em silêncio, sem log, sem retry. Chamar a função
manualmente sempre funcionava (prova de que a lógica em si estava correta); o problema era a
falta de resiliência da única tentativa automática.

**Fix:** `_bolaoPullEventsOnce` agora tenta 3 vezes (0s, 6s, 16s após o load), cada tentativa
com `fetch(...,{cache:'no-store'})` (elimina qualquer chance de servir resposta antiga do cache
HTTP do navegador) e loga no console (`console.warn`) se uma tentativa falhar, em vez de
engolir o erro. **Causa raiz exata de por que a 1ª tentativa às vezes não completava não foi
100% isolada** (não reproduziu um erro síncrono nem assíncrono capturável nos testes manuais) —
a mitigação por retry + no-store + log é robusta o suficiente na prática e foi validada com
teste real ao vivo repetido (ver v20.18), mas se o log de warning aparecer no console de algum
usuário no futuro, isso vai finalmente dar a pista que faltou aqui.

### v20.21 — Ranking geral inteiro caía quando um participante tinha zero palpites (2026-07-04)

**Contexto:** o usuário deu um bônus manual de 100 pontos pro participante Heitor Guilherme
(entrou depois, via `heitor_bonus.sql`, coluna `bonus_points`), combinado que ele NÃO teria
nenhum palpite contando normalmente — só o bônus fixo. Resultado: com `bonus_points=100` e
**zero linhas** em `picks`/`picks_reopen`, a aba Bolão parou de mostrar o ranking pra TODO
MUNDO, com a mensagem genérica "Erro ao carregar ranking. Verifique sua conexão." (mensagem
enganosa — o servidor respondia normalmente, o problema era 100% no processamento no navegador).

Nota separada, fora do bug em si: nesta mesma investigação o usuário avisou que havia trabalho
de outra sessão/IA direto no GitHub que ainda não tinha sido puxado para a cópia local — o
`git push` do fix foi inicialmente rejeitado (`fetch first`), revelando 34 commits no remoto
(incluindo `.github/workflows/cron-bolao.yml`, vários fixes em `_bolaoGetScore`/pontuação KO/
reopen) que não existiam na cópia local usada para diagnosticar o bug. O fix abaixo foi
re-verificado e reaplicado em cima da versão real do GitHub antes do commit/push, para não
reverter esse trabalho.

**Causa raiz, confirmada ao vivo no Chrome (não teorizada):** `bolaoRenderRanking()` desenha o
card de detalhe de TODOS os participantes numa mesma passada via `bolaoRenderDetail(pid)`. Para
jogos do mata-mata, essa função calcula `dAcertou` (se o participante "acertou o confronto")
chamando `_bolaoResolveTeam(...)`, que quando o participante não tem NENHUM palpite de fase de
grupos cai de volta pro resultado REAL (é assim que a função consegue simular o resto do
chaveamento). Isso faz `dAcertou` dar `true` por coincidência mesmo sem o usuário ter palpitado
nada. O código então segue pro branch que assume que existe um palpite (`dActivePick=pick`), mas
`pick` é `undefined` — `dActivePick.a` lança `TypeError: Cannot read properties of undefined
(reading 'a')`, sem `try/catch` ao redor daquele participante especificamente, derrubando a
renderização da tabela inteira.

A função que realmente calcula os PONTOS (`bolaoCalcTotal`) já tinha a proteção certa (checagem
de `hasPick` ANTES de olhar `acertouConfronto`) — por isso a pontuação do Heitor em si (100 pts,
só o bônus) sempre esteve correta; só a função de RENDERIZAÇÃO do card de detalhe
(`bolaoRenderDetail`) não tinha o mesmo cuidado. Bug antigo, nunca exposto antes porque nenhum
participante tinha zero palpites simultaneamente com um jogo do mata-mata já resolvido cujo
"confronto simulado" batesse por coincidência com o real.

**Como foi validado (Golden Rule cumprida):** reproduzido ao vivo no Chrome via
`javascript_tool`, isolando `bolaoRenderDetail(heitorId)` do resto do fluxo — erro reproduzido
game a game até achar o jogo exato (#76, Rodada de 32) e a linha exata (`dActivePick.a`). Fix
testado ao vivo primeiro (patch da função em memória via `eval`, sem alterar nenhum arquivo),
rodado contra os 32 participantes reais + `bolaoRenderRanking()` completo, confirmando zero erros
e `bolaoCalcTotal(heitorId)` retornando `{total:100, bonusCount:100}` como esperado — só depois
disso o fix foi aplicado nos arquivos de verdade (e, após descobrir a divergência com o remoto,
reaplicado na versão correta puxada do GitHub).

**Fix:** em `bolaoRenderDetail`, a condição que decide se o jogo do mata-mata deve ser tratado
como "sem palpite válido" (card de forfeit/pular) passou a exigir também `hasPick`, não só
`dAcertou`:
```js
// antes: if(!dAcertou&&!dHasReopen){
if((!dAcertou||!hasPick)&&!dHasReopen){
```
Aplicado em `index.html` e `copa2026.html` (idênticos), sintaxe validada com `node --check` antes
do deploy.

### v20.20 — Fix .ft + _bolaoGetScore: pontuação ET e simulação bolão (2026-07-04)

**Contexto:** Usuário reportou que a grid de palpites do bolão mostrava times REAIS em vez dos times da simulação do bolão. Ao investigar, descobriu-se que `_bolaoWinnerOf` estava vazando para o bracket real (`resolveTeam`) sempre que a simulação do bolão não resolvia um placeholder. Paralelamente, jogos de mata-mata com prorrogação (#82, #86) estavam pontuando com o placar completo (incluindo ET) porque `scores[gameN].ft` estava ausente.

**Correções:**

**1. `_bolaoGetScore` (linha 3045) — fallback para scores reais:**
Adicionado fallback para `scores[gameN]` quando o usuário não tem palpite para o jogo. Essencial porque o usuário só tem picks de mata-mata (79-96), sem picks de grupos (6-72). Sem esse fallback, `_bolaoGroupStandings` retornava `null` para todos os grupos, e a simulação inteira quebrava.

```js
// Antes: retornava null se usuário não tinha pick
function _bolaoGetScore(gameN,picks){
  var p=picks?picks[gameN]:_bolaoMyPicks[gameN];
  if(p&&p.a!==undefined&&p.b!==undefined)return {a:p.a,b:p.b};
  return null;
}

// Depois: fallback para scores reais
function _bolaoGetScore(gameN,picks){
  var s=scores[gameN];
  if(gameN < BOLAO_FIRST) return (s&&s.a!==undefined)?{a:s.a,b:s.b}:null;
  var p=picks?picks[gameN]:_bolaoMyPicks[gameN];
  if(p&&p.a!==undefined&&p.b!==undefined)return {a:p.a,b:p.b};
  return (s&&s.a!==undefined&&s.b!==undefined)?{a:s.a,b:s.b}:null;
}
```

**2. `_bolaoTp` (linha 3193) — removeu vazamento para bracket real:**
Substituiu fallback `resolveTeam(placeholder, g.n)` por exibição do placeholder em muted. Impede que a grid mostre times do bracket real quando a simulação falha.

**3. `_bolaoWinnerOf` (linha 3101) — retorna nome do time em vez de g.a/g.b:**
Revertida alteração anterior que fazia `_winnerOf` retornar placeholders. `_bolaoWinnerOf` agora retorna `_bolaoResolveTeam(g.a, gameN, picks)` (time resolvido) em vez de `g.a` (placeholder literal).

**4. `bolaoCalcTotal` (linha 3318) — fallback MATCH_90_SCORE para placar de 90 min:**
Adicionado `MATCH_90_SCORE[FIFA_MATCH_IDS[g.n]]` como fallback para `real.ft` no cálculo de pontos KO. Resolve o bug onde `scores[gameN].ft` está ausente para jogos com prorrogação processados antes do v20.12, fazendo a pontuação usar o placar completo (incluindo ET) em vez do placar de 90 min.

**5. `_bolaoMyPicks` — adicionado `.ko` ao pick carregado (linha ~3923):**
Garante que `_bolaoMyPicks[p.game_n].ko` seja populado a partir de `p.ko_pick`, permitindo que `_bolaoWinnerOf` encontre a escolha de desempate KO sem cair no fallback `_bolaoKOPicks`.

**6. `_bolaoAllPicks[pid]` → `_bolaoMyPicks` em 3 lugares (4234, 4319, 4841):**
Corrige referências que usavam o mapa global de TODOS os picks quando deveriam usar APENAS os picks do usuário logado.

**Commits:** `0b4971b` (fixes 1-3), `1db2e1b` (fix 4), `1d582e8` (force rebuild), `386a8a8` (refinamento .ft), `2575d1f` (force rebuild final)

**Validação:** Testado em Node com dados reais — `_bolaoGroupStandings` retorna times corretos com fallback para scores reais. `_bolaoTp` mostra times em vez de placeholders na grid.

**Pendente:** Usuário reportou que a grid ainda não mostra os times "certos" (esperava ver times diferentes dos reais). A simulação usa resultados reais de grupos porque o usuário não tem picks de grupos — os picks KO só afetam QUEM VENCE cada jogo, não QUAIS TIMES chegam lá. Para resolver, seria necessário adicionar picks de grupos (6-72).

### v20.19 — Regras clarificadas: palpite vale só 90min, bônus é só pênaltis (2026-07-03)

**Contexto:** usuário pediu clareza nas regras — não estava explícito que o palpite vale apenas para o tempo regulamentar, e o bônus de +5 pts mencionava "prorrogação" junto com pênaltis.

**Mudanças:**
1. **Linha de pontuação**: "Pontuação" renomeada para "Pontuação (apenas 90 min)" com explicação: palpite vale para o placar ao final do tempo regulamentar, prorrogação e pênaltis não contam para o placar — contam apenas para o bônus de desempate
2. **Bônus +5 pts**: "Bônus pênaltis / prorrogação" corrigido para "Bônus pênaltis: +5 pts se acertar quem vence nos pênaltis (vale mesmo se editou o palpite). Prorrogação não dá bônus — só pênaltis."
3. **Item novo na reabertura do mata-mata**: lembrete dourado de que no mata-mata o palpite também vale apenas para 90 min — se for a prorrogação, compara com o resultado ao final do 1º+2º tempo, não com o placar final
4. **GitHub Pages**: rebuild forçado (commit vazio `78887b3`) após falha do Actions
5. **Worker**: verificado idêntico à produção (65551 bytes, mesmo hash), deployado mesmo assim

**Commits:** `5f791d9` (regras), `78887b3` (force rebuild)
**Worker:** deployado (idêntico)

### v20.18 — Validação final ao vivo (Regra de Ouro cumprida)

Depois de v20.14 a v20.17, validação final feita com o protocolo mais rigoroso da sessão:
navegação cruzando de domínio (`example.com` → site) para garantir que nenhum timer/handler de
teste anterior contaminasse a medição, `localStorage`/`IndexedDB`/Cache API/Service Worker
zerados antes de cada teste, e leitura direta do estado (`goals[83]`, `cards[83]`, `goals[84]`,
`cards[84]`, contagem total de jogos com dado) 20s após o load. Resultado: **85/85 jogos com
dado completo automaticamente**, jogos #83/#84 com todos os gols e cartões corretos, sem
intervenção manual. Confirmado também pelo usuário em dispositivo real.

**Lição de metodologia registrada para o futuro:** neste mesmo processo de investigação, testes
consecutivos no mesmo domínio sem navegar para outro domínio entre eles causaram contagens de
rede infladas/contaminadas (chegou a mostrar 383 requisições que eram na verdade sobra de
testes anteriores acumulados, não de uma única carga). **Sempre que for medir requisições de
rede ou timing de carregamento no Chrome, navegar para um domínio diferente (ex.: `example.com`)
antes do teste real, para garantir uma medição limpa de uma única carga.**

### v20.13 — Fix backfill N+1 requests (trava ~10s no load) + truncamento em 3 arquivos (2026-07-03)

**Contexto:** usuário reportou celular não carregando gols/cartões na aba Jogos (impactando artilheiros) e, separadamente, a página travando ~10s no carregamento ("tela tremendo", inutilizável).

**Bug 1 investigado — celular sem gols/cartões (NÃO era bug de código):**
- Testado o cache compartilhado (`GET /events`) direto no console do usuário: `count: 86`, dados batendo 100% com o PC.
- Causa real: aba do celular estava presa em JS antigo em memória, de antes do deploy do dia (`c6ebb8f`). Fechar a aba/PWA por completo e reabrir resolveu — confirmado pelo usuário com teste real, não suposição.
- **Lição para o futuro**: antes de investigar código quando "celular está desatualizado", pedir para fechar a aba/PWA por completo (não só minimizar) e reabrir. Service Worker atualiza o cache em background, mas uma aba já aberta continua rodando o JS antigo até ser de fato recarregada.

**Bug 2 confirmado e corrigido — trava de ~10s no carregamento:**
- Medido via Chrome DevTools (network requests reais, não teoria): **239 requisições POST para `/events`** disparadas em duas cargas de página.
- Causa raiz: `_bolaoBackfillPushEvents()` percorria todo `goals`/`cards` local e chamava `_bolaoPushEvents(gid)` — 1 fetch por jogo — para TODOS os jogos com dado local, toda vez que a página carregava. Nesta fase do campeonato (~85 jogos disputados), isso é ~85-100 requisições HTTP paralelas de uma vez. Mais grave no celular (CPU/rede mais fracas).
- **Fix cliente** (`index.html` e `copa2026.html`, função `_bolaoBackfillPushEvents`): agrupa tudo em UM único POST para `/events/bulk` em vez de N POSTs para `/events`. Também só roda 1x por dia por navegador (flag em `localStorage['copa2026_backfill_date']`), já que o dado raramente muda de um dia pro outro — mudanças ao vivo continuam indo na hora via `_bolaoPushEvents` (inalterado).
- **Fix servidor** (`bolao-worker.js`): novo endpoint `POST /events/bulk` que aceita `{rows:[{game_n,goals,cards}...]}` e faz upsert de tudo em uma única chamada ao Supabase (`on_conflict=game_n`, `Prefer: resolution=merge-duplicates`). Endpoint `/events` (singular) mantido intacto para os pushes ao vivo.
- **Validado antes de aplicar** (Regra de Ouro, §15): lógica de montagem das `rows` testada em Node.js com os dados reais extraídos do próprio `index.html` (seed de scores/goals/cards), sem lançar exceção, contagem de requisições confirmada 1 em vez de N. Sintaxe de `bolao-worker.js` e do `<script>` de `index.html` validada com `node --check` antes de gravar nos arquivos finais.
- **Pendente**: rodar `deploy-worker.ps1` para publicar o Worker (o endpoint `/events/bulk` só existe localmente até o deploy) e dar commit+push do HTML. Ver §17 e §19.14 para os comandos exatos.

**Incidente paralelo — truncamento em 3 arquivos, não só `index.html`:**
- Ao investigar, descobriu-se que `index.html`, `copa2026.html` E `bolao-worker.js` estavam truncados localmente (arquivo cortado no meio de uma instrução, sobra de sessão anterior interrompida pelo usuário). A §19.12 já documentava esse risco só para `index.html`/`AGENTS.md` — agora also cobre `bolao-worker.js` e qualquer arquivo grande do repo.
- Durante a própria recuperação, uma tentativa de restaurar via `git show HEAD:arquivo > arquivo` (redirecionamento de shell direto na pasta sincronizada com OneDrive) **truncou o arquivo de novo**, silenciosamente, sem erro — mesmo o comando aparentando ter funcionado. Ver §19.14 (novo) para o padrão que efetivamente funcionou nesta sessão.
- Também apareceu um `.git/index.lock` órfão (resíduo de um comando que falhou no meio), bloqueando `git add`/`commit` com "Another git process seems to be running". O agente não conseguiu apagar esse arquivo de dentro do sandbox (`rm`/`git checkout` deram "Operation not permitted" na pasta sincronizada) — precisou pedir para o usuário apagar manualmente. Ver §19.14.

### v20.12 — Fix completo ET scoring: timeline reconstruction + localStorage migration (2026-07-02)

**Contexto:** continuação do v20.11. As primeiras tentativas (898d509, 5615b7d, 099c115, 87b2886) corrigiram parcialmente o problema da Bélgica, mas deixavam bugs residuais: fórmula `min(hs,as)` quebrava em jogos onde ambas as equipes marcaram em ET (ex: 2-2 → 5-3: `min(5,3)=3≠2`), performance catastrófica na aba bolão, e o fix bloqueado por dados antigos no localStorage.

**Bugs resolvidos:**

**1. `min(hs,as)` errado para ET com gols de ambos os times (Fix B)**
- Substituído por leitura de `FIFA_TIMELINES_RAW[idMatch].data.Event[]` — percorre eventos até `MatchMinute > 90`, captura último `HomeGoals`/`AwayGoals` ≤ 90min.
- Parsing robusto: `parseInt(e.MatchMinute.replace(/'/g,'').split('+')[0], 10)` — trata `"90+5"→90` (regulação) e `"91"→91` (ET).

**2. Detecção ET via timeline (Fix C)**
- `MATCH_EXTRA_TIME[idMatch]=true` setado ao encontrar qualquer evento com minuto > 90.
- Não depende mais de capturar `MatchStatus=5` em tempo real durante o poll.

**3. `needsEtFix` — força processTimeline mesmo com `PROCESSED_EVENTS` setado (Fix E/F)**
- Condição nova em `poll()` e `initTimelineSync()`: `!MATCH_90_SCORE[id]&&!MATCH_PENALTIES[id]&&scores[gn].a!==scores[gn].b&&g.f não começa com 'Grupo'&&now>liveWindow`.
- Dispara `processTimeline` mesmo que `PROCESSED_EVENTS[id]` esteja setado — cobertura para qualquer sessão que tenha perdido o ET ao vivo.

**4. Lentidão na aba bolão — loop infinito de needsEtFix (Fix D)**
- **Causa:** `MATCH_90_SCORE` só era setado dentro de `if(MATCH_EXTRA_TIME[idMatch])`. Jogos KO de regulação (placar desigual, sem ET) nunca setavam `MATCH_90_SCORE` → `needsEtFix` retriggava a cada poll infinitamente (8 jogos × cada poll = 8 processTimeline calls/poll).
- **Fix:** `MATCH_90_SCORE[idMatch]` sempre setado para qualquer jogo KO que passe por `processTimeline`, independente de ET. Atualiza `scores[gn].ft` e re-render apenas se `MATCH_EXTRA_TIME[idMatch]` for true.
- **Debounce:** `window._et90RenderTimer = setTimeout(bolaoRenderRanking, 400)` — consolida múltiplos timelines concorrentes em um único re-render.

**5. localStorage bloqueando fix para usuários com sessão antiga (Fix G)**
- **Causa:** `loadFifaRaw()` restaura `MATCH_90_SCORE` do localStorage. Se um usuário tinha valor antigo/errado de `MATCH_90_SCORE[belgium_id]` (ex: `{a:1,b:1}` da fórmula `min()` quebrada), o `needsEtFix` checa `!MATCH_90_SCORE[id]→false` → nunca corrigia.
- **Fix em `loadFifaRaw()`:** após restaurar `m90` e `met`, deleta `MATCH_90_SCORE[k]` para qualquer jogo onde `MATCH_EXTRA_TIME[k]=true && !MATCH_PENALTIES[k]`. O valor é re-derivado automaticamente da timeline em cache na mesma sessão (via Fix B em `fetchFifaScores`).

**Commits:** 898d509 → 5615b7d → 099c115 → 87b2886 → 8fd29ba

**Validação:** `scores[82]={a:3,b:2,ft:{a:2,b:2}}` — Bélgica: placar final 3-2, 90min 2-2 ✅

---

### v20.11 — Fix placar 90min para jogos decididos na prorrogação (2026-07-02)

**Problema:** Jogos de mata-mata decididos na prorrogação (ex: Bélgica R32, 2-2 nos 90min, 3-2 no ET) marcavam palpites com placar errado. `MATCH_90_SCORE` só era setado se o cron pegasse o jogo durante `MatchStatus=5` COM placar empatado (`hs===as`). Se o gol do ET caísse entre dois polls, a condição falhava e `real.ft` ficava `undefined` → `_real90 = real = {3,2}` (placar final, não dos 90min).

**Causa raiz:** `if(hs===as&&!MATCH_90_SCORE[m.IdMatch]) MATCH_90_SCORE[m.IdMatch]={a:hs,b:as}` — condição `hs===as` elimina o caso onde o gol já caiu em ET.

**Fix inicial (linha 2259):** removida condição `hs===as` no bloco `MatchStatus=5`; usa `Math.min(hs,as)` como aproximação. Substituído integralmente pelo Fix B no v20.12.

**Commit:** 898d509

---

### v20.10 (2026-06-30) - Fix PROCESSED_EVENTS falsy — loop infinito em reconcileScores

- **Root cause:** `PROCESSED_EVENTS[idMatch]=maxId` — se `maxId=0` (jogo sem EventId numérico), valor é falsy. `reconcileScores` checa `if(PROCESSED_EVENTS[id])return` → nunca pulava o jogo → chamava `processTimeline` para todos os jogos stale a cada poll.
- **Impacto medido:** 77× processTimeline de reconcileScores + 42× do poll loop = 119 chamadas em 30s → 370 dynRender/elemento em 77s.
- **Fix:** `PROCESSED_EVENTS[idMatch]=maxId||'done'` — sempre truthy após processamento bem-sucedido.
- **Resultado:** dynRender 370 → **5** em 30s (-98%).

### v20.9 (2026-06-30) - Guard PROCESSED_EVENTS em recent no poll

- **processTimeline spam corrigido:** poll chamava `processTimeline` para todos os jogos com `recent=true` (dentro de 24h) sem verificar se já foram processados. Resultado: 14 chamadas por poll, 56 em 38s — incluindo jogos de ontem já finalizados. Fix: `(recent&&!PROCESSED_EVENTS[id])` em vez de `recent`. Resultado verificado ao vivo: 6 processTimeline em 56s (1/poll, só o jogo ao vivo).
- **saveState spam corrigido:** consequência direta — caiu de 50 chamadas em 38s para 6 (1/poll). Tempo total em saveState: 85ms → 30ms.
- `copa2026.html` sincronizado.

### v20.8 (2026-06-30) - Debounce poll focus/visibilitychange

- **Poll flooding corrigido**: `window.focus` e `document.visibilitychange` disparavam `poll()` imediatamente a cada alternância de foco (ex: DevTools). Confirmado ao vivo: 13 polls em 15s em vez de 1-2. Fix: `_lastPollTime` registra o timestamp do último poll; listeners ignoram o evento se o último poll foi há menos de 5s. Resultado verificado ao vivo: 3 polls em 30s (correto para intervalo de 10s com live).
- `copa2026.html` sincronizado.

### v20.7 (2026-06-30) - Otimizações de performance (ver §20)

- Cache getSuspensions, H2H pré-computado em renderGroups, regex dynRender compilada, clearInterval pagehide, renderHoje removido, poll reordenado (mergeScores antes dos renders)

### v20.6 (2026-06-30) - Fixes bracket + reabertura + bônus pênaltis + pontos por fase

- **Relógio prorrogação/pênaltis**: badge mostrava `120+7'` em vez de `Prorr. 120+7'`. Detecção por base ≥ 105 min. Adicionado `MATCH_PENALTIES` para mostrar `Pên. 120+X'` separado de `Prorr.`
- **Palpites R32 visíveis no login**: check `hasReopen` movido antes do early return — palpites de reabertura agora aparecem mesmo quando times ainda não resolvidos
- **Loop infinito `bolaoUpdateReopenBanner`**: r32 com `open=true` mas deadline expirado causava recursão infinita (`ERR_INSUFFICIENT_RESOURCES`). Removidas chamadas recursivas no `else if(remaining<=0)` e no `.catch()`; fases expiradas agora movidas corretamente para `_bolaoClosedPhases`
- **Crash silencioso na seção reopen**: `TypeError` em `reopen.a` quando jogo passado mas sem palpite. Condição `if(hasReopen||gameIsPast(g))` corrigida para `if(hasReopen)`
- **Bracket mostrando "0" e grupos**: `resolveTeam('V. Jogo N')` retornava `{name:'0'}` sem resolver o placeholder de 3° colocado. Corrigido: quando `_winnerOf(N)` retorna um placeholder (`'0'`, `'1° Grupo X'`, etc.), agora chama `resolveTeam()` recursivamente em vez de retornar direto
- **Bracket mostrando "0" antes de `allFinished`**: `_resolveThirdPlaceSlot` só resolvia quando todos os 8 terceiros estavam decididos. Agora resolve com `pending:true` assim que `thirds.length>=8`
- **Reabertura somente leitura em fase fechada**: fases com prazo encerrado (`_bolaoClosedPhases`) não exibem mais inputs editáveis — apenas cards `✓ Salvo/Concluído` para palpites já salvos
- **Pontos por fase KO incorretos**: `bolaoRenderStats` usava `bolaoCalcPickPts` (fórmula de grupos) com palpite original, ignorando reopen picks, tabela cheia/reduzida e bônus. Corrigido para usar mesma lógica de `bolaoCalcTotal`
- **Bônus pênaltis nunca concedido**: `activePick.ko` guarda `'a'`/`'b'` (lado), mas comparação era feita contra `_winnerOf()` que retorna nome do time — nunca batiam. Corrigido em 4 lugares (bolaoCalcTotal, detalhe, ranking, stats) para comparar lado via `MATCH_PEN_WINNER`

### v20.5 (2026-06-28) - Fix palpite original + perf login + docs

- **Palpite original nos cards**: corrigida fonte de dados — `_bolaoMyPicks[gn]` (do `/mypicks`, sem filtro) em vez de `_bolaoAllPicks[pid][gn]` (filtrado por maxGame, não tem jogos futuros). Resolvia "Palpite original: —" em todos os cards
- **Promise.all no login**: `bolaoLoadMyData` e `bolaoLoadRanking` em paralelo — tempo de carregamento pós-login reduzido ~50%
- **SW_UPDATED corrigido**: listener do Service Worker tinha string duplicada `'SW_UPDATE'SW_UPDATED'` — corrigido
- **AGENTS.md**: seções 7.8 (reabertura mata-mata), 19.12 (edição segura de arquivos grandes) e version history adicionados

### v20.4 (2026-06-28) - Reabertura Mata-Mata: cards + banner + popup + countdown

- **Banner externo ao logged-area**: `#bolao-reopen-banner` movido para FORA do `#bolao-logged-area` — aparece sem login
- **Hardcoded R32 fallback**: `bolaoUpdateReopenBanner()` com `_r32OpenFrom=2026-06-28T04:10Z` e `_r32Deadline=2026-06-28T18:55Z`
- **Popup sessionStorage**: `bolaoShowReopenPopup(phase)` — uma vez por aba, volta ao recarregar
- **Cards da reabertura** (`bolaoRenderReopenSection`): três estados (🔒/🔓/✓), palpite original em todos, bônus correto, cancelar ao editar locked
- **Times reais no countdown**: `resolveTeam(g.a, g.n)` com try/catch — mostra nomes reais em vez de "2° Grupo A"
- **Todos os jogos R32 no countdown**: janela alargada para 7 dias
- **`bolao-reopen-section` dentro do logged-area**: posicionado após `#bolao-confirm-area`

### v20.3 (2026-06-27) - Worker: endpoints reabertura + auto-abertura cron + pontuação KO

- **Worker endpoints**: `GET /reopen-status`, `POST /picks-reopen`, `POST /admin/reopen`
- **Auto-abertura cron**: `completed >= PHASE_THRESHOLD[phase]` → upsert em `phase_reopen`
- **Tabelas SQL**: `picks_reopen` e `phase_reopen` criadas no Supabase
- **Pontuação KO**: Tabela cheia (15/9/6/3) para acertou+não editou; Tabela reduzida (10/6/4/2) para editou ou errou

### v20.1 (2026-06-27) - Bracket visual reescrito + correção crítica de dados J98/J99

- **Bracket SVG reescrito (`renderBracketTree`)**: layout simétrico de dois lados (esq→J101, dir→J102) com Final central, idêntico ao bracket oficial FIFA 2026. Conectores ortogonais (horizontal→vertical→horizontal) eliminam cruzamento de linhas. Cores por fase: verde (R32), azul (Oitavas), laranja (Quartas), vermelho (SF), dourado (Final), roxo (3º Lugar). SVG com largura fixa + overflow-x:auto para scroll horizontal no mobile
- **Bug crítico corrigido — J98 e J99 estavam com conexões trocadas**: J98 apontava para W(J91)×W(J92) e J99 para W(J93)×W(J94). O correto conforme bracket oficial é J98=W(J93)×W(J94) e J99=W(J91)×W(J92). Com o bug, Brasil (J76→J91→J98→J101) e Alemanha (J74→J89→J97→J101) se encontravam na Semifinal em vez da Final — contradizendo o chaveamento oficial
- **Distribuição correta dos quadrantes**:
  - Esquerdo (→J101): J74,J77,J73,J75 (top) + J83,J84,J81,J82 (bot) → J89,J90,J93,J94 → J97,J98
  - Direito (→J102): J76,J78,J79,J80 (top) + J86,J88,J85,J87 (bot) → J91,J92,J95,J96 → J99,J100
- **Sync copa2026.html**: ambos os arquivos atualizados (dados + visualização)

### v20.0 (2026-06-27) - Protocolo Obrigatório de Desenvolvimento (seção 19)

- **AGENTS.md v20.0**: adicionada seção 19 — Protocolo Obrigatório de Desenvolvimento com 11 subseções: engenharia antes de programação, fluxo de 6 etapas para bugs (reprodução→auditoria→hipótese→correção→testes→validação visual), interface como fonte da verdade, evidências obrigatórias, critério de encerramento com checklist, proibição de declarar sucesso sem comprovação, alterações mínimas, proibição de tentativa e erro, auditoria pós-correção, sincronização index.html/copa2026.html, checklist mental de 8 perguntas
- **Regra de Ouro (seção 15) reescrita**: versão mais forte — proíbe teorizar ou declarar sucesso sem evidências objetivas
- **Callout no topo do arquivo**: aviso "LEIA PRIMEIRO — Seção 19" logo abaixo do cabeçalho, garante que o protocolo seja lido antes de qualquer documentação técnica

### v19.37 (2026-06-20) - Fix login bloqueado: inputs não eram mais desabilitados após prazo

- **Login bloqueado corrigido**: `bolaoInit()` desabilitava os inputs de nome/senha quando o prazo de inscrição passava (`if(!_bolaoParticipantId) ... disabled=true`), impedindo que participantes existentes logassem. Removida a linha — o cadastro já está bloqueado em 3 camadas independentes (botão disabled, `bolaoRegister()` early return, Worker 403), então não há motivo para desabilitar os campos de login

### v19.36 (2026-06-20) - Cadastro bloqueado, evolução chart refeito, card colors, speciais ocultos, fix picks login

- **Cadastro bloqueado**: Botão "Criar conta" removido, substituído por "Cadastro fechado" (disabled). Worker `/register` retorna 403. `bolaoRegister()` no frontend agora só exibe aviso. Turnstile removido da UI de login. Participantes existentes continuam logando normalmente
- **Gráfico de evolução refeito**: SVG responsivo (largura 100%) com grade horizontal, labels de posição, gradiente dourado sob a linha (fill area), pontos com destaque (última rodada maior), labels de rodada no eixo X, card informativo lateral com posição/total/pontos/rodadas/variação. Background escuro com cantos arredondados
- **Card colors (estados visuais)**: Classes CSS `bsp-live-neutral` (jogo ao vivo sem pontuação), `bsp-result` (verde, 2-6 pts), `bsp-exact` (ouro, 10 pts), `bsp-final` (ouro forte, final #104). Aplicadas dinamicamente em `bolaoRenderPicksGrid()`
- **Palpites especiais ocultos do ranking**: `showSpecials` agora usa o novo deadline de reabertura (terça 23/06 23:59) em vez do jogo #32. Enquanto o prazo de reabertura estiver vigente, ninguém vê os especiais alheios no ranking
- **Fix picks sumindo no login**: Adicionado try/catch em `bolaoLoadMyData()` com mensagem visível ao usuário em caso de erro. Reset de `_bolaoMyPicks` só ocorre após confirmação de carregamento bem-sucedido
- **Fix duplicata por espaços duplos**: Normalização de nomes no Worker e frontend agora colapsa espaços múltiplos (`.replace(/\s+/g, ' ')`). Impede criação de "Nome  Sobrenome" quando "Nome Sobrenome" já existe
- **Usuário "Luiz  Gobbo" (duplo espaço) deletado**: 0 picks, não confirmado, especial (Espanha/Embape) removido em cascata. Backup verificado via Supabase REST API antes da exclusão
- **Banner de reabertura especiais**: Banner dourado com countdown até terça 23/06 23:59, inputs reabilitados, deadline do jogo #32 substituído pelo novo prazo
- **Worker e index.html sincronizados**: Deploy do Worker via Cloudflare API (PUT multipart), push para GitHub Pages

### v19.31 (2026-06-18) - renderGroups() sincronizado com ordem FIFA 2026 + numero do jogo no bracket
- **renderGroups() corrigido**: ordem de desempate mudou de P->GD->GF->H2H->alpha para P->H2H->GD->GF->fair play->FIFA ranking->alpha, igualando ao `_resolveGroupOrder()` usado pelo bracket. Antes a divergencia causava casos onde a tabela de grupos mostrava o Brasil fora do 3o lugar mas o bracket o elegia como 3o colocado
- **renderThirdPlaced() atualizado**: adicionado fair play + FIFA ranking como criterios de desempate
- **Numero do jogo nos cards do bracket**: badge `#73`-`#104` no topo de cada card do mata-mata
- **Sync copa2026.html**

### v19.30 (2026-06-18) - Bracket do mata-mata corrigido conforme oficial FIFA 2026
- **Round of 16 pares corrigidos**: G89=W74xW77, G90=W73xW75, G91=W76xW78, G93=W83xW84, G94=W81xW82, G95=W86xW88, G96=W85xW87 (antes estavam com oponentes trocados, o que propagava times errados para QF/SF/Final)
- **Semifinal 2 venue** (G102): MetLife-Nova Jersey -> Mercedes-Benz-Atlanta
- **3o lugar venue** (G103): Lumen-Seattle -> Hard Rock-Miami
- **Bracket completo conferido** vs 3 fontes oficiais: FIFA.com (knockout stage article), ESPN bracket, FOX Sports bracket
- **Sync copa2026.html**

### v19.29 (2026-06-18) - Ordem dos criterios de desempate corrigida para FIFA 2026
- **H2H passa a ser step one**: confronto direto (pts/SG/GF) resolvido antes do saldo geral, conforme regulamento FIFA 2026 (antes era GD/GF geral primeiro, depois H2H)
- **Fair play adicionado**: cartoes amarelos (-1pt) e vermelhos (-3pt) contam como 5o criterio de desempate
- **Ranking FIFA substitui sorteio**: `FIFA_RANK` constante com ranking de junho/2026 das 48 selecoes
- **Edicao anterior do ranking**: se mesmo ranking (teoricamente impossivel), usa edicoes anteriores
- **3os colocados**: `_rankedThirds()` e `_bolaoRankedThirds()` agora incluem fair play + FIFA ranking
- **`_resolveGroupOrder` reescrita**: estrutura recursiva por blocos, 5 fases (H2H/geral/fair-play/ranking/alpha)
- **`_groupStandings`**: calcula `cond` (conduct score) por time a partir de `cards[]`
- **Regras atualizadas**: texto dos criterios de desempate na aba Regras
- **`FIFA_RANK`**: 48 selecoes ranqueadas (Argentina #1, Brasil #6, etc.)
- **Sync copa2026.html**

### v19.28 (2026-06-18) - Corrige horarios de 5 jogos vs schedule oficial FIFA
- Game 29 (Turquia x Paraguai): 01:00 -> 00:00
- Game 73 (Rodada de 32, SoFi/LA): 21:00 -> 16:00
- Game 98 (Quartas, SoFi/LA): 14:00 -> 16:00
- Game 99 (Quartas, Hard Rock/Miami): 16:00 -> 18:00
- Game 100 (Quartas, Arrowhead/KC): 20:00 -> 22:00
- Cross-check completo de 104 jogos vs worldcupschedule.app (UTC->BRT) e kickoffclock.com CSV oficial
- Sync copa2026.html

### v19.27 (2026-06-18) - Bloco 1 final: todos os 10 itens da varredura corrigidos
- **Item 1 (RLS)**: `supabase-rls-fix.sql` — reabilita RLS nas 4 tabelas, policies seguras
- **Item 2 (Worker validação)**: Worker v19.10 com `BOLAO_GAMES`, `gameUTC()`, `bolaoDeadline()`, validação server-side de prazo e completude
- **Item 3 (Anexo C)**: `_ANNEXC_MATRIX` inline (495 combinações) + `_resolveGroupOrder` com H2H e alphabetical tiebreaker
- **Item 4 (Desempate cíclico)**: `_resolveGroupOrder` detecta blocos empatados, aplica H2H completo, fallback alfabético determinístico
- **Item 5 (Matching artilheiro)**: `matchName` com `.normalize('NFD')` e comparação exata (substitui `indexOf`)
- **Item 6 (Threshold 2h30)**: `_LIVE_WINDOW=10800000` (3h) unificado, comentário documentando a correção
- **Item 7 (Backup Worker)**: `deploy-worker.ps1` agora faz `Copy-Item $ScriptFile $backupFile -Force` antes de cada deploy
- **Item 8 (SW mascarar erros)**: `sw.js` v21 com `e.request.mode==='navigate'` restringe fallback HTML a navegações
- **Item 9 (Retry sem limite)**: `fetchSquads(calendarRetries)` com max 5 tentativas + exponential backoff
- **Item 10 (IndexedDB merge)**: Merge preservado (escrita simultânea em localStorage + IndexedDB via `saveState()`)
- **Bloco 1 UX**: Bottom navigation (`nav-bar`), skeleton screens, spinner loading, full-card tap, touch targets 44px, auto-save debounce 1.5s, empty/error states, progress bar bolão, estatísticas (individuais, comparação, zebra, evolução)
- **Worker deploy automático**: `deploy-worker.ps1` copia `bolao-worker.js.backup` antes de subir
- **`bolao-worker.js.backup` sincronizado** pelo próprio script de deploy

### v19.21b (2026-06-17) - Reverte colunas desktop + remove diff/LIDER do mobile

- **Desktop**: Colunas voltam ao original (Especiais | Exatos | Jogos | Pontos) — 6 colunas. Sem coluna Desempenho, sem coluna Distancia, sem "(líder)" no nome
- **Mobile**: Subtitulo apenas metricas (`3ex · 5res`) — sem "LÍDER", sem "−N pts"
- **Mantidos** `rank-first` (leader maior/padding), `mob-rank-self` (borda azul + "VOCÊ ·"), `bolao-rank-self` (fundo azul + "VOCÊ ·") — melhorias visuais sem afetar colunas
- Legenda do ranking restaurada para Especiais/Exatos/Jogos/Pontos

### v19.21a (2026-06-17) - Ranking: Desempenho coluna, Opcao B mobile, rank-first, mob-rank-self, especiais no expandido (PARCIALMENTE REVERTIDO via v19.21b)

- **BREAKING**: Tabela de ranking reestruturada de 6 colunas para 5 (REVERTIDO em v19.21b)
- **Mobile Opcao B**: Subtitulo linha unica com LÍDER e diferenca (REMOVIDO em v19.21b)
- **Desempenho coluna** (REVERTIDO em v19.21b)
- **NOVO (mantido)**: `rank-first` — líder com padding 12px, nome 15px/800, pts 22px
- **NOVO (mantido)**: `mob-rank-self` — borda azul + "VOCÊ ·" via `::before`
- **NOVO (mantido)**: `bolao-rank-self` — fundo azul desktop + "VOCÊ ·" via `::before`
- **NOVO (mantido)**: Especiais removidos do card ranking principal, movidos para `bolaoRenderDetail()` (secao "🏆 PALPITES ESPECIAIS")
- **Dead code**: `mob-rank-line2` CSS removido

### v19.20 (2026-06-17) - Compactacao vertical cards bolao + estados visuais

- **Compactacao vertical ~20-30%**: `bsp-card` padding 12->8px, gap 4->3px, `bsp-score-row` margin 0, `bolao-ko` so renderizado se tem conteudo, `bsp-ko-label` margin 4->2px, `bolao-majority` margin/padding 5->3px, input padding 6->4px (<480px), card padding 6px (<480px)
- **Sistema de estados visuais**: borda esquerda 4px colorida — `bsp-card-missing` (vermelho+glow), `bsp-card-result` (verde #4ade80), `bsp-card-exact` (ouro+glow), `bsp-card-final` (ouro+glow forte). Inline missingStyle substituido por classe CSS. `bsp-locked` opacity 0.7->0.9
- Tag `pre-bolao-mobile-redesign` criada antes das alteracoes

### v19.19 (2026-06-17) - Bolao mobile UX: top3 premium, ranking 2 linhas, status+pts, KO checkmark, detalhes separados

- **Top 3 premium**: classes `rank-gold/silver/bronze` com borda 2px + bg sutil + box-shadow glow
- **Subtitulo ranking em 2 linhas**: status+pts na mesma linha (`bsp-status-pts` flex), fase+data na mesma linha (`bsp-header` compacto)
- **KO com checkmark**: botao selecionado ganha ✔️ + fundo dourado
- **Detalhes expandidos separados**: "PONTUADOS" e "PRÓXIMOS" como secoes distintas

### v19.18 (2026-06-17) - 6 correcoes mobile + cache ranking + Enter key

- **#1 Bandeiras CSS**: `flag()` trocada de `<img>` para `<span>` com `background-image`. Fim do flicker reportado por usuarios
- **#2 Cards estaveis**: `_expandedGames` global preserva estado de expansao manual apos cada poll
- **#3 Scroll-to-top**: `window.scrollTo(0,0)` no inicio de `switchTab()`
- **#4 "Ir para anteriores" + "Expandir todos"**: link no topo da aba Jogos + botao no cabecalho ANTERIORES
- **#5 Backoff polling**: `_pollFails` contador, exponencial 10s->120s, reseta no sucesso. `pagehide` limpa timer
- **#6 Cleanup memoria**: `setInterval` a cada 10min remove TIMELINE_HASH/PROCESSED_EVENTS/MATCH_MINUTE de jogos encerrados ha >24h
- **Cache ranking 30s TTL**: `_rankingCachedAt` evita fetch se cache tem <30s. Fallback localStorage com 1h
- **Enter key**: suporte Enter no login (bolao-name/bolao-pass) e palpites especiais (bolao-champion/bolao-scorer)

### v19.17 (2026-06-16) - Merge Hoje+Jogos + Hero AO VIVO + Correcoes

- **Aba Hoje fundida com Jogos**: A tab "Hoje" foi removida da barra de navegacao. Bookmarks/URLs com `#hoje` sao redirecionados para `#jogos`. O contudo de "Hoje" agora aparece como secao dentro da aba Jogos
- **Hero AO VIVO**: Quando ha jogos ao vivo, um card destacado (borda dourada, glow, badge "AO VIVO pulsante") aparece no topo da lista. Usa o mesmo mecanismo de relogio `.live-clock` dos cards normais. Sem jogos ao vivo, o hero fica oculto
- **Secoes temporais na aba Jogos**: `renderGames()` agora organiza os jogos em HOJE, PROXIMOS e ANTERIORES (apenas no filtro "Todas"). Cada secao tem cabecalho com icone e cor. Filtros de grupo/mata-mata continuam sendo lista plana
- **26 horarios de jogos corrigidos** (cross-reference Exame/BBC/GE): jogos 17, 32, 85 e toda Rodada de 32 tiveram horarios ajustados para bater com as fontes oficiais
- **SyntaxError critico corrigido**: `JSON.stringify` removeu a quebra de linha entre `GAMES[...]` e `const GROUPS`, colapsando tudo na mesma linha. `const a=[]const b={}` e SyntaxError no JS — ASI nao insere ponto-e-virgula entre duas declaracoes `const` na mesma linha. O script inteiro parava de executar, site ficava sem conteudo dinamico (jogos, grupos, bracket, artilharia)
- **Auto-scroll removido**: `_scrolledToLive` e seu `scrollIntoView` no refresh removidos. Ao recarregar a pagina no celular, o site nao desce mais sozinho para o primeiro jogo ao vivo. Variavel `_scrolledToLive` e suas referencias deletadas (dead code)
- **Filtros mobile horizontal**: no mobile (<480px), `.filters` agora usa `flex-wrap:nowrap;overflow-x:auto` → 1 fileira rolável em vez de 3. `min-height:32px` nos botões (vs 44px). Economia: ~88px
- **Countdown compacto**: `padding` reduzido de 6px→4px, `min-height` de 36px→32px, `font-size` do relógio de 14px→13px, `margin-bottom` de 16px→8px. Economia: ~12px
- **Hero AO VIVO compacto**: `padding` reduzido de `--sp-md`→`--sp-sm`, `score-display` reduzido de `--fs-lg`→`--fs-body`. Economia: ~8px
- **Espaço vertical recuperado**: ~128px sem AO VIVO, ~148px com AO VIVO. HOJE seção começa em 30% da viewport (vs 52%) em iPhone SE

### v19.15 (2026-06-15) - Anti-piscar: badge atualiza so textContent sem recriar DOM

- **Anti-piscar**: `updateCountdown` verifica `sp.textContent !== timeStr` antes de escrever no DOM. Badge criado uma unica vez, reutilizado nas atualizacoes seguintes

### v19.14 (2026-06-15) - rawMin como fonte da verdade, drift max 3min

- **rawMin como fonte da verdade**: `disp = Math.max(run, rawMin)` invertido — agora `rawMin` da Timeline/Calendar API e a fonte principal. Calculo por kickoff usado so quando `rawMin === 0` (antes do primeiro evento)
- **Drift max 3min**: entre polls, o relogio avanca no maximo 3min alem do ultimo `rawMin` — evita travar sem saltar para o valor inflado do 1T
- **top:-26px**: badge mais acima, sem sobrepor o placar

### v19.13 (2026-06-15) - HT detection, MatchStatus=4, Type 6/8, 120+X' extra time

- **Intervalo (HT)**: `MATCH_HALFTIME` detectado via Calendar API (`MatchStatus=4`) e Timeline API (`Type 6` = fim 1T, `Type 8` = inicio 2T)
- **Segundo tempo recalibrado**: `MATCH_SECOND_KICKOFF` guarda UTC do inicio do 2T. Quando disponivel, recalcula o relogio a partir dele
- **Prorrogacao**: `disp<=90 → N'`, `disp<=105 → 90+X'`, `disp>105 → 120+N'`, cap `135+`
- **Novas variaveis globais**: `MATCH_HALFTIME`, `MATCH_SECOND_KICKOFF`
- **Calendar API**: captura `MatchTime` (minuto direto) e `SecondHalfKickOffTime`
- **Diagnostico**: console.log dos `Type`/`TypeLocalized` durante jogos ao vivo

### v19.12 (2026-06-15) - Ajustes relogio ao vivo: grid, contain, absolute

- **v19.12d**: `contain:layout` removido do `.game-card` (so `contain:style`), `overflow:visible` no `.game-score`, badge volta a `position:absolute;top:-18px` relativo ao `.game-score`
- **v19.12c**: Badge mudou de `order:-1` (flex) para `position:absolute` com `contain:layout` removido. `rawStr` preserva string original do `MATCH_RAW_MINUTE` para exibir `90+8'` em vez de `98'`
- **v19.12b**: `.game-score` com `position:relative`, `.live-clock` com `position:absolute;top:-20px;left:50%;transform:translateX(-50%)` — flutua acima sem ocupar slot no grid
- **v19.12a**: CSS `.live-clock` com `grid-column:3;grid-row:1` (quebrou layout) + formato `90+X'` e cap 105min. Revertido

### v19.11 (2026-06-15) - Relogio ao vivo + dados FIFA crus + layout mobile fix

- **Relogio ao vivo**: `MATCH_RAW_MINUTE` armazena minuto cru da timeline (ex: "90+8"). Countdown mostra `45'` / `90+8'` / `FT` para jogos ao vivo usando `MATCH_KICKOFF` real (Type 7 UTC) em vez de horario agendado. Card do jogo ganhou badge `.live-clock` dourado
- **Dados FIFA crus salvos**: `FIFA_CALENDAR_RAW` + `FIFA_TIMELINES_RAW[idMatch]` persistidos em localStorage via `saveFifaRaw()`/`loadFifaRaw()` para auditoria/debug
- **SyntaxError critico corrigido**: `(function initTimelineSync(){...} function dailyMaintenance(){...})();` — duas declaracoes de funcao dentro de operador de agrupamento sem operador entre elas. JS engine lancava SyntaxError, script inteiro nao executava
- **Cache stale limpo**: `DATA_VERSION = 3` — se localStorage tem dados pre-fix (gol contra, cartao, parseInt), limpa tudo e comeca fresco
- **Layout mobile**: `100vh` -> `100dvh` (evita reflow da barra de URL). `overflow-anchor: auto`. Bandeiras com `width="24" height="18"` no HTML + CSS. Flag-fallback com dimensoes inline
- **Grid do card mobile**: 768px e 480px agora usam 4 colunas `num | team-a | score | team-b` (igual desktop). Times lado a lado com placar entre eles
- **ScrollIntoView block:start**: em vez de `block:center` que jogava o card pro meio da tela. `history.scrollRestoration='manual'` impede browser de competir pelo scroll
- **Bolao: card com palpite faltando destacado em vermelho**: borda vermelha (2px) + glow nos cards do grid que ainda nao foram preenchidos. Some imediatamente ao preencher os dois campos
- **Bolao deadline 2h -> 30min**: `BOLAO_TWO_H` de 7200000 para 1800000
- **BolaoShowParcial(): especiais direto do Supabase**: funcao agora busca `special_picks` direto da API REST do Supabase (sem worker, sem depender de `showSpecials`). Exibe OK/Parcial/Nenhum corretamente
- **BolaoShowParcial(): fallback _bolaoMySpecial**: para o usuario logado, usa `_bolaoMySpecial` se `_bolaoAllSpecials` estiver vazio
- **BolaoSaveSpecial(): topScorer -> top_scorer**: corrigido campo camelCase para snake_case (equivalente ao banco)
- **Estatisticas: Zebra da Copa sort por %**: zebra ordenada por `pct` decrescente (maior % de erro primeiro)
- **Relogio ao vivo refinado**: badge `.live-clock` injetado dinamicamente pelo `updateCountdown()` (nao depende do render). Usa `_parseMinute` para comparar minuto de evento vs tempo decorrido do `MATCH_KICKOFF`. `dynRender` normaliza removendo `.live-clock` da comparacao para evitar re-render a cada poll. Badge posicionado com `flex:0 0 100%; margin-top:-20px` dentro do `.game-score`, visualmente acima do placar sem `overflow:hidden` no card
- **dynRender(): normalizacao de relogio**: regex remove `<div class="live-clock...>` da comparacao de HTML para evitar que o conteudo dinamico do badge cause substituicao desnecessaria do DOM (e o consequente pula-pula)
- **overflow:hidden removido do .game-card**: impedia o badge do relogio de aparecer em telas menores (posicionado absolute acima do placar)

### v19.10 (2026-06-14) - Ajustes finais + Correcoes de Live/Ao Vivo

- **Scroll bouncing corrigido**: _scrolledToLive flag global so permite scroll-into-view na primeira renderizacao. Resetado ao trocar filtro ou clicar na aba Jogos. Elimina salto a cada polling
- **Aba Bolao movida para primeira posicao**: tab bar agora inicia com Bolao, seguido de Jogos. Enfase na funcionalidade de Bolao durante a Copa
- **Regras do bolao recolhidas por padrao**: adicionada classe collapsed ao abrir a pagina. Usuario clica para expandir
- **copa2026.html sincronizado** com index.html
- **bolaoShowParcial()**: funcao console que mostra tabela de participantes com picks preenchidos/total, confirmacao, e FALTA para nao confirmados
- **Worker retorna pickCounts**: /ranking agora inclui pickCounts (picks nao-nulos, busca paginada com Range headers). Frontend armazena em _bolaoPickCounts com cache offline
- **MATCH_ENDED check movido para dentro do .then()**: antes rodava sincronamente antes do fetch resolver; agora a comparacao acontece dentro da callback, detectando MatchStatus=0 corretamente
- **Re-render sempre na poll**: renderGames(), renderGroups(), renderBracket(), renderScorers() chamados em toda poll completa. dynRender evita flicker
- **MATCH_ENDED persistido**: saveState() salva matchEnded/matchStarted, _loadPersistent() restaura - sobrevive a refresh
- **Fallback game_+n para MATCH_ENDED**: no load, marca jogos com placar + >2.5h como encerrados mesmo sem FIFA_MATCH_IDS populado. isGameLive/gameIsPast verificam essa chave
- **Heuristica preservada em 2.5h** (9000000ms): cobre 90min+15HT+30ET+15penaltis. Protege acuracia do bolao em jogos KO
- **backup-supabase.ps1**: script PowerShell que faz dump de todas as 6 tabelas do Supabase para JSONs em /backups/
- **Seguranca de exclusao documentada**: secao 15 do AGENTS.md - backup obrigatorio antes de deletar, nunca deletar sem confirmar com o usuario
- **Console Reference**: secao 17 do AGENTS.md - documentacao completa de todas as funcoes e variaveis acessiveis via DevTools

### v19.9 (2026-06-13) — Auditoria final: correções críticas para produção

- **`_bolaoMajority` declarado e populado**: variável agora existe e é carregada via `GET /majority` após login. Função `bolaoMajorityHtml` não lança mais ReferenceError
- **`_bolaoConfirmedAt` populado**: armazenado do retorno de `/stats` (campo `confirmed_at`) para exibir data/hora real da confirmação
- **Worker `/snapshot` e `/majority/refresh` aceitam JWT**: além do `X-Admin-Key`, agora aceitam token JWT válido. Frontend consegue gravar snapshots e atualizar cache da maioria
- **`on_conflict=participant_id,round`**: upsert em `ranking_snapshots` evita duplicatas quando múltiplas abas tentam gravar
- **`_bolaoResolveTeam` recebe `picks` do participante**: pipeline completo (`_bolaoGetScore` → `_bolaoGroupStandings` → `_bolaoRankedThirds` → `_bolaoWinnerOf` → `_bolaoResolveTeam`) agora aceita parâmetro opcional `picks`. `bolaoCalcTotal` passa os picks do participante alvo, não do usuário logado
- **`_bolaoBracketCache` invalidado**: cache resetado em `bolaoSavePick()` — simulação do bracket reflete alterações de picks
- **`bolaoLoadRanking` com tratamento de erro**: `catch` agora mostra mensagem "Erro ao carregar ranking" em vez de silenciar
- **Countdown adaptativo melhorado**: atualiza a cada 1s quando há jogos ao vivo OU próximo jogo nas próximas 24h (antes era só ao vivo)
- **CSS `--bg2` → `--bg`**: variável não definida corrigida no `.bsp-input`
- **`bolaoLoadEvolution` chamada no login**: gráfico de evolução carrega ao logar (antes só carregava após snapshot)
- **`bolaoLoadMajority` adicionada**: carrega dados da maioria e re-renderiza grid de palpites
- **`_bolaoFetch` com retry e backoff**: 3 tentativas com delay exponencial (1s, 2s, 4s) para recuperação de falhas temporárias Worker/Supabase
- **Worker `/health`**: endpoint de monitoramento `GET /health` — `{ok: true, uptime: ...}`
- **Worker `/cron`**: endpoint para cron jobs externos (keepalive Supabase + poll FIFA + snapshot). Protegido por `?secret=ADMIN_KEY`. Configurar em cron-job.org a cada 5 min
- **Worker `/scores`**: proxy para tabela `live_scores` do Supabase — scores centralizados da FIFA
- **Tabela `live_scores`**: cache centralizado de placares no Supabase, populado pelo Worker Cron
- **Cache offline do ranking**: `localStorage` guarda último ranking bem-sucedido (TTL 1h). Se Worker offline, mostra ranking cacheado com indicador "⚠️ Dados offline"
- **Fallback de scores**: quando `fetchFifaScores` retorna vazio, polling tenta `GET /scores` (Worker → Supabase `live_scores`) como segunda fonte

### v19.8 (2026-06-13) — GAMES ordenado + Bolão completo

- **GAMES array reordenado**: agora ordenado por data (`d`) e horário (`t`) em vez de número do jogo (`n`). Game 5 (Austrália vs Turquia, 14/06 01:00) movido da posição 5 para a posição 8 (após jogos de 13/06). Mata-mata (jogos 73-104) também reordenado — ex: jogo 76 (29/06 13:00) agora antes de 74 (29/06 17:30)
- **`GAME_BY_ID[g.n]` cache** continua funcionando (independe da ordem do array)
- **`renderGames()` sort corrigido**: `games.sort(function(a,b){return a.n-b.n})` substituído por sort por data/hora — antes ignorava a ordem cronológica e reordenava por número do jogo
- **n-values corrigidos**: Game 5 (Austrália vs Turquia, 14/06 01:00) renumerado de n=5 para n=8; games 6→5 (Catar vs Suíça), 7→6 (Brasil vs Marrocos), 8→7 (Haiti vs Escócia). Agora os `n` correspondem — ordem cronológica real
- **`copa2026.html` sincronizado** com `index.html`
- **`_bolaoFetch` agora propaga `err.status`**: HTTP status code preservado no erro (não só mensagem)
- **`bolaoLogin()` com mensagens claras**: 401="Senha incorreta", 403="Conta bloqueada", 409="Nome já cadastrado — tente outro ou verifique a senha" (em vez de "Erro: ..." genérico)
- **Syntax error corrigido**: try externo removido acidentalmente durante refatoração — código comum ficou solto, quebrando o site. Restaurado aninhamento try/catch original
- **`BOLAO_FIRST` alterado de 7 para 6**: após renumerar jogos 5-8, Brasil vs Marrocos virou jogo #6 — bolão começa dele
- **Bolão progressivo**: `bolaoRenderPicksGrid()` agora só mostra jogos até o primeiro não travado (o "jogo atual"). — medida que o tempo passa, novos jogos aparecem. Palpites pré-preenchidos para jogos futuros ainda são salvos, mas os cards só ficam visíveis quando chegar a vez
- **Sigilo de palpites**: Worker filtra `GET /ranking` por `maxGame` (último jogo que começou). Palpites de jogos futuros não são retornados pelo servidor — nem via DevTools
- **Especiais ocultos**: Campeão/artilheiro só retornados após jogo #32 começar (`showSpecials=1`)
- **Summary de preenchimento**: aviso mostrando quantos palpites foram preenchidos e quais faltam
- **Pontuação no card flutuante**: durante o jogo mostra pontos provisórios; ranking só contabiliza após `gameIsPast()`
- **Regras do bolão reescritas**: texto completo explicando sigilo, progressão, status e pontuação ao vivo
- **`_bolaoConfirmedStatus`**: nova store no frontend que rastreia `confirmed` de cada participante
- **Worker `/ranking` retorna `confirmed`**: `select=id,name,confirmed` para o frontend saber quem confirmou
- **`bolaoCalcTotal` verifica confirmação**: se o participante não confirmou, retorna 0 pts — palpites salvos só contam após "Confirmar todos"
- **Regra de confirmação explicita**: texto "Só valem para pontuação depois de clicar em Confirmar todos os palpites" na lista de regras
- **`_groupStandings` H2H completo**: 3 subcritérios restauratos (H2H pontos — H2H saldo — H2H gols marcados). Havia sido minificado perdendo GD e GF do confronto direto
- **`_loserOf` com pênaltis**: agora reconhece `s.pen` para determinar perdedor em jogos decididos nos pênaltis (antes retornava `null` em empates)
- **Regras com destaque visual**: palavras-chave em vermelho/laranja/verde/azul/ouro para chamar atenção (OBRIGATÓRIA, Só VALEM APÓS CONFIRMAR, RASCUNHOS, OCULTOS, PRÉVIA)
- **Estatísticas pessoais**: nova seção `#bolao-stats-section` com grid de pontos, exatos, resultados, bônus e pontos por fase
- **Evolução no ranking**: gráfico SVG mostrando posição ao longo das rodadas (`GET /evolution`)
- **Palpite da maioria**: exibe os 3 palpites mais comuns de cada jogo, com porcentagem (`GET /majority`)
- **Snapshot automático**: `checkAutoSnapshot()` grava posição de todos no banco quando um jogo encerra (`POST /snapshot`, tabela `ranking_snapshots`)
- **`confirmed_at`**: Worker salva timestamp ao confirmar (`PATCH /confirm` + `confirmed_at`)
- **`renderGroups()` sort fix**: `.sort(function(a,b){return a.n-b.n})` adicionado para ordem consistente em jogos no mesmo dia
- **`_bolaoGetBracket` sem mutação global**: usa `JSON.parse(JSON.stringify(scores))` para clonagem profunda, evitando vazamento de palpites do bolão para o bracket real
- **`mergeScores` dispara `checkAutoSnapshot`**: ao receber placar da FIFA, verifica se algum jogo encerrou e grava snapshot
- **`supabase-additions.sql`**: migration para `confirmed_at`, `ranking_snapshots`, `majority_cache`
- **Worker novas rotas**: `GET /stats`, `GET /majority`, `POST /majority/refresh`, `POST /snapshot`, `GET /evolution`
- **Palpite da maioria cacheado**: tabela `majority_cache` no Supabase, calculado pelo Worker (`POST /majority/refresh`)
- **`_bolaoSnappedGames`**: rastreia localStorage de snapshots já feitos para evitar duplicatas

### v19.7 (2026-06-13) — Deploy Completo + Root route
- **Turnstile corrigido**: `turnstile.getResponse(document.getElementById('bolao-turnstile'))` em vez de `'bolao-turnstile'` string
- **Worker configurado**: 6 env vars no Cloudflare (SUPABASE_URL, SUPABASE_KEY, TURNSTILE_SEC, JWT_SECRET, ADMIN_KEY, ADMIN_HASH)
- **SQL migration executado**: `pick_history` criada, RLS desabilitado
- **Verificado**: `/ranking` retorna 19 participantes, 597 picks, 5 specialPicks — bolão 100% funcional
- **Root route**: `GET /` agora retorna lista de rotas em vez de 404
- **Cloudflare Worker (`bolao-worker.js`)**: Middleware de segurança entre frontend e Supabase. Rotas: `/register` (com Turnstile), `/login` (hash server-side + JWT), `/picks` (com histórico), `/mypicks`, `/ranking`, `/special-picks`, `/confirm`, `/admin/unlock`, `/reset`
- **Turnstile (Cloudflare)**: Widget anti-bot no formulário de cadastro. Token validado no Worker (server-side real, não apenas no cliente)
- **Senha nunca mais vaza**: Hash SHA-256 + salt (`JWT_SECRET`) computado no Worker. Cliente envia senha em texto puro (HTTPS), `password` coluna nunca retornada ao frontend
- **JWT**: Token assinado com HS256, 90 dias de validade, enviado em `Authorization: Bearer` em todas as requisições autenticadas
- **`_supaFetch` removido**: Todas as chamadas diretas ao Supabase substituídas por `_bolaoFetch()` que passa pelo Worker
- **`SUPA_KEY` e `SUPA_URL` removidos do frontend**: Anon key não está mais no HTML
- **`pick_history`**: Nova tabela no Supabase que registra cada alteração de palpite com timestamp
- **RLS desabilitado**: Worker usa `service_role` key, anon key não tem mais acesso
- **`_hash()` removido**: Cliente não precisa mais computar SHA-256
- **`_bAdm` atualizado**: Agora usa Worker (`/admin/unlock`) em vez de Supabase direto
- **`_bAdmHash` removido**: Hash do admin não fica mais no frontend

### v19.6 (2026-06-13)
- **`MATCH_ENDED` como fonte principal**: `isGameLive()` e `gameIsPast()` agora priorizam `MATCH_STARTED`/`MATCH_ENDED` da FIFA. Janela fallback aumentada para 4h (`_WINDOW_4H`=14400000ms) cobre prorrogação + pênaltis
- **`TIMELINE_HASH`**: Hash SHA-like da timeline completa detecta correções da FIFA mesmo sem novos `EventId`. Processa eventos de novo se o hash mudar (ex: gol adicionado/removido pela FIFA)
- **Assist lookup por `AssistPlayerId`**: Se a FIFA enviar `AssistPlayerId`, usa direto mapeando `FIFA_PLAYER_MAP`. Fallback mantém o scan `Type===1` anterior
- **`GAME_BY_ID[]` cache**: Lookup direto `GAME_BY_ID[g.n] = g` elimina todos os `GAMES.find()` (~15 chamadas lineares)
- **Aba Diagnóstico oculta (`#diagnostico`)**: Acessível via URL hash, mostra mapeamento FIFA (times/jogos), hashes recentes da timeline, scores locais — debug interno sem interferir nas abas normais
- **`switchTab(tab)`**: Nova função para navegar a abas sem `.tab` visível na DOM
- **`_LIVE_WINDOW`**: `10800000ms` (3h) substitui `10800000` hardcoded em 3 locais. Cobre 90min + prorrogação + pênaltis sem estender demais

### v19.5 (2026-06-13)
- **Dead code removido**: `@keyframes goalFlash`, `@keyframes spin` duplicado (2x→1x), `@keyframes squad-shimmer` duplicado (2x→1x), `.squads-loading` e `.loading-spinner` duplicados
- **`console.log` de produção removidos**: 6 logs de debug em `initFifaMaps()`, 2 logs em `fetchCalendar()` — produção silenciosa
- **`alt=""` nos mascotes**: `mascote1_t.png`, `mascote2_t.png`, `mascote3_t.png` agora com `alt=""`
- **`hashchange` listener**: navegação por hash manual agora funciona (ex: `#grupos`)
- **`:focus-visible`**: tabs, filter-btn, mode-btn, bview-btn, pen-btn, refresh-btn, score-input com outline dourado
- **ARIA básico**: tabs com `role="tablist"` + `role="tab"` + `aria-selected` + `tabindex`, popup com `role="dialog" aria-modal`, inputs de placar com `aria-label`
- **Countdown adaptativo**: `scheduleCountdown()` com `setTimeout` recursivo — 1s com jogos ao vivo, 30s sem (substitui `setInterval(1000)` que rodava pra sempre)
- **`Iniciar Copa.bat` corrigido**: agora abre GitHub Pages em vez de chamar `robot.ps1` inexistente
- **Mandante no bracket**: indicador ao lado do time da casa na view de cards do mata-mata
- **Cópia `copa2026.html` sincronizada** com `index.html`

### v19.2
- **`_bolaoWinnerOf` resolvido** — agora retorna time real via `_bolaoResolveTeam(g.a,gameN)` em vez do placeholder literal (`g.a`). A cascata KO agora propaga nomes de times corretos
- **`_bolaoResolveTeam` — "Perd. Jogo N"** — novo handler para placeholder de perdedor de jogo KO (3º lugar). Resolve o vencedor, encontra o perdedor comparando com os dois lados
- **Pontuação KO com validação de times** — `bolaoCalcTotal` agora verifica se os times que o usuário simulou (`_bolaoResolveTeam`) batem com os times reais (`resolveTeam` do app). Se diferirem, o palpite vale 0 pts (evita pontuação por sorte com bracket errado)
- **Regra de ouro adicionada** — "Nunca teorize sobre bugs — teste com dados reais primeiro" (seção 15)

### v19.1
- **Removido** `.live-clock` do card de jogo (relógio — não sincronizava corretamente)

### v19 — Bolão com Supabase
- Bolão completo: login SHA-256, palpites, ranking, Supabase
- Botões de desempate KO, bracket simulado, confirmação
- Admin unlock via console

### v16.2 — Suspensão + Performance
- Indicador de suspensos nos cards
- Encoding fix Globoplay/Ge TV
- Lazy loading em bandeiras, render cache
- Audit badge, refresh error some em 3s
- Third-place com ranking position

### v16.1 — Third-place fix
- `_resolvedTeamRow` passa `gameNum` para `resolveTeam`
- Nome do time em vez de grupo no bracket

### v16 — Persistência Bulletproof
- IndexedDB + 3 localStorage
- Seed dados reais FIFA (jogos 1-2)
- Auditoria, mobile improvements
- Jogos passados colapsados, scroll automático
- Bugfixes broadcast/referee/hash

### v15 — Anti-Flicker Final
- `dynRender` síncrono, `slideUp` removido
- Bracket SVG reescrito
- Hotfixes onerror + id="assist-opts"

### v14 — Reaplicação Incremental
- 3ºs lugares, árbitro Wikipedia, ordem cronológica gols+cartões
- Countdown simultâneo, live game enfático
- Globoplay/Ge TV

### v12 — JSON Externo + Virtualização
- PLAYERS e PLAYER_PHOTOS extraídos para JSON
- IntersectionObserver para convocados (1248 placeholders)
- Bracket automático, FIFA Timeline API

### v11.x — Correções e Fotos
- Grupos I/J corrigidos, window.event eliminado
- Busca em convocados, fotos Wikipedia + FIFA
- Clubes mapeados (zero "Outro")

### v10 — FIFA Timeline API
- Auto-fetch de gols/assistências
- Player map por time + número

### v9 — Squads Completos
- 1248 jogadores, números reais, clubes
- Regras 2026, AO VIVO no countdown

### v6–v3 — Fundação
- Broadcast logos, bandeiras, gols ordenados
- CSS redesign dark theme, responsivo
- Popup de gol, timer regressivo

---

## 14. Como Testar

### Local
Abra `index.html` diretamente no navegador (file:// funciona, mas Service Worker requer http://).

### GitHub Pages
https://lfgobbo.github.io/Copa2026/

### Simulação do Bolão
```js
// No console do DevTools:
bolaoSimular()  // 9 participantes com palpites
```

### Reset
```js
bolaoLimpar()   // Limpa scores locais
bolaoReseta()   // Apaga Supabase + localStorage + recarrega
```

### Admin Bolão
```js
_bAdm('BolaoAdmin2026!', 'Nome do Participante')
```

---

## 15. Regra de Ouro (Debug)

**É proibido teorizar sobre bugs ou declarar sucesso sem validação. Toda hipótese deve ser comprovada com evidências, toda correção deve ser validada por testes e, quando houver interface, pela própria interface. A aplicação funcionando corretamente sempre prevalece sobre logs, testes automatizados ou conclusões teóricas.**

Antes de propor qualquer solução para um bug de lógica JS:
1. Extrair as funções afetadas do `index.html`
2. Montar um script Node.js com dados reais dos `GAMES`/`GROUPS`
3. Rodar o teste e ver o output real
4. Só então corrigir

*Exemplo: o bug `_bolaoWinnerOf` semanas de debug teriam sido evitadas rodando `node /tmp/test_bolao.js` que mostrou imediatamente `Winner jogo 75: '1º Grupo F'` em vez do time resolvido.*

### Antes de culpar causa externa

Quando o usuário reporta "quebrou" ou "não está funcionando", a tentação é apontar causas externas (cache do navegador, rede instável, Supabase fora do ar, FIFA API lenta, Cloudflare Worker travado). **Pela experiência registrada neste projeto, a causa real quase sempre foi erro no próprio código.** Por isso:

1. Antes de sugerir qualquer causa externa, revisar e testar o código relevante (seguindo os passos 1-4 acima)
2. Só mencionar causa externa depois de confirmar que o código está correto através de teste real, não suposição
3. Se a causa real for de fato código, registrar como **Incidente** na seção 16, mesmo padrão do caso "guimo"

### Comandos úteis pelo console (F12)

**Desbloquear participante confirmado:**
```js
_bAdm('BolaoAdmin2026!', 'Nome Exato do Participante')
```
Reseta `confirmed=false` no Supabase. Participante precisa recarregar a página.

**Apagar participante de teste** (SQL Editor do dashboard Supabase):
```sql
DELETE FROM participants WHERE name = 'Nome do participante';
-- picks e special_picks são apagados em cascata automaticamente
```

**Ver estado atual na memória:**
```js
console.log(_bolaoMyPicks)          // Palpites carregados
console.log(_bolaoKOPicks)          // Escolhas de empate KO
console.log(_bolaoParticipantId, _bolaoName, _bolaoConfirmed)  // Status do login
console.log(_bolaoResolveTeam('1º Grupo F', 75))  // Testar resolução
console.log(_bolaoWinnerOf(75))                   // Vencedor simulado
console.log(_bolaoGroupStandings('F'))            // Classificação simulada
console.log(_bolaoRankedThirds())                 // 8 melhores 3os
```

## 16. Backup e Recuperação

### Backup automático no repositório
- Arquivos marcados com .backup no repositório são cópias do último estado estável
- index.html.backup — Última versão HTML funcional
- olao-worker.js.backup — Última versão do Worker funcional
- Para restaurar: copiar o .backup por cima do arquivo original e fazer deploy

### Backup server-side (Worker proxy)
- GET /app no Worker serve o site completo sem depender 100% do GitHub Pages
- Imagens e JSON são cacheados na Cache API do Cloudflare Workers
- Se GitHub Pages ficar offline, o Worker serve do cache
- Endereço: https://copa2026-bolao.luizfelipegobbo.workers.dev/app

### Procedimento de emergência
1. Se GitHub Pages quebrar: os usuários acessam via /app
2. Se Worker quebrar: colar bolao-worker.js.backup no Cloudflare
3. Se HTML quebrar: colar index.html.backup no lugar e push
4. Se Supabase perder dados: restore do dump (se existir) ou recadastrar usuários

### Regras de segurança para exclusão de usuários
1. **Sempre fazer backup primeiro** — rodar `.\backup-supabase.ps1` antes de qualquer exclusão. Os JSONs ficam em `/backups/` com timestamp
2. **Nunca deletar usuário sem confirmar com o usuário primeiro** — perguntar explicitamente: "Tem certeza que quer deletar [NOME]?"
3. **Sempre listar os usuários encontrados** antes de deletar
4. **Nunca usar `delete` com cascade sem antes tentar backup** — o Supabase free tier não tem point-in-time recovery
5. **Em caso de dúvida sobre qual usuário deletar, perguntar** — nunca assumir
6. **Incidente "guimo" (14/06/2026)**: o agente deletou o usuário "guimo" por engano ao confundir com "teste". **SEMPRE confirmar o nome exato com o usuário antes de qualquer exclusão.** Se deletar sem querer, recriar via cadastro normal — os picks antigos estarão perdidos (não há recovery point pra linhas deletadas no free tier do Supabase). O backup do Supabase (rodar `.\backup-supabase.ps1` antes) teria evitado a perda.
7. **Padrão recorrente — culpar causa externa em vez de revisar código primeiro**: por experiência registrada, quando algo "quebra" e o agente aponta causa externa (rede, cache, API terceira) sem testar antes, a causa real quase sempre acaba sendo erro no próprio código. **Sempre revisar e testar o código antes de afirmar que o problema é externo.**
## 17. Deploy Automatico do Worker

### Script PowerShell (deploy-worker.ps1)
- Sobe o bolao-worker.js para o Cloudflare via API (sem wrangler, sem Node.js)
- Le o token de .worker-token (gitignorado) ou da env CF_API_TOKEN
- Uso: .\deploy-worker.ps1

### Token
- Armazenado em .worker-token (nao comita por .gitignore)
- Permissoes: template Edit Cloudflare Workers (Workers Scripts Write + Workers Routes Write)
- Se expirar, gerar novo em dash.cloudflare.com/profile/api-tokens

### Fluxo de deploy
powershell
.\deploy-worker.ps1
# [OK] copa2026-bolao deployado com sucesso!

### Notas
- O script usa multipart/form-data para enviar o JS + metadata
- O Worker e sobrescrito a cada deploy (versao anterior e perdida)
- Sempre manter bolao-worker.js.backup sincronizado com a ultima versao estavel
- Backup automatico: Copy-Item bolao-worker.js bolao-worker.js.backup

## 17.1 Diagnóstico do Worker

### Script diagnose-worker.ps1
- Verifica se o token CF está válido
- Lista os bindings atuais do worker (env vars configuradas)
- Testa o endpoint /cron e /health
- Uso: `powershell -ExecutionPolicy Bypass -File ".\diagnose-worker.ps1"`

### Bindings atuais (deploy-worker.ps1 configura todos)
| Variável | Tipo |
|---|---|
| SUPABASE_URL | plain_text |
| SUPABASE_KEY | secret_text |
| JWT_SECRET | secret_text |
| TURNSTILE_SEC | secret_text |
| ADMIN_KEY | secret_text |
| ADMIN_HASH | secret_text |
| CRON_SECRET | secret_text |

> ⚠️ NUNCA usar `wrangler deploy` direto — limpa todos os bindings. Usar sempre `deploy-worker.ps1`.

### Cron manual (durante jogos)
```powershell
# Atualizar placares FIFA → live_scores:
Invoke-RestMethod "https://copa2026-bolao.luizfelipegobbo.workers.dev/cron?secret=<CRON_SECRET>&task=fifa"

# Tudo (keepalive + fifa + snapshot + auto-reopen):
Invoke-RestMethod "https://copa2026-bolao.luizfelipegobbo.workers.dev/cron?secret=<CRON_SECRET>&task=all"
```
Ver CREDENCIAIS_COPA2026.md para o valor real de CRON_SECRET.

### Abrir fase KO manualmente
```powershell
Invoke-RestMethod "https://copa2026-bolao.luizfelipegobbo.workers.dev/admin/phase-reopen" `
  -Method PATCH -ContentType "application/json" `
  -Body '{"phase_name":"r32","open":true,"adminPass":"<ADMIN_PASS>","deadline":null}'
# Fases válidas: r32, r16, qf, sf, 3rd, final
```

### Tabela live_scores (Supabase)
Criada manualmente em 2026-06-29. Schema:
```sql
CREATE TABLE live_scores (
  game_key text PRIMARY KEY,     -- "MEX_RSA" (home_abbrev_away_abbrev da FIFA)
  home_team text, away_team text,
  goals_home integer, goals_away integer,
  game_n integer,                -- número do jogo no bolão (mapeado via GAME_KEY_MAP)
  match_id text,
  match_status integer,          -- 0=FT 1=scheduled 3=live 4=HT 5=ET 6=penalties
  goals_home_90 integer,         -- placar de 90min (só preenchido em ET)
  goals_away_90 integer,
  updated_at timestamptz DEFAULT now()
);
```
Popular: rodar `task=fifa` no cron.

## 17.2 Bugs corrigidos (2026-06-29, sessão v20.4)

### Worker (bolao-worker.js)
1. **`match_status: m.MatchStatus || null`** — `0 || null = null` em JS; jogos encerrados (FT=0) eram gravados com status null, quebrando o auto-reopen. Fix: `(m.MatchStatus != null) ? m.MatchStatus : null`

2. **Upsert sem `Prefer: resolution=merge-duplicates`** — PostgREST retornava 409 em vez de atualizar. Fix: adicionado header em todos os POSTs com `on_conflict` (live_scores e ranking_snapshots).

3. **Limite de 50 subrequests CF** — `task=fifa` fazia 1 supaFetch por jogo (~75 jogos). Fix: acumula tudo em array e faz 1 POST em batch.

4. **auto-reopen pulava fases com deadline vencido** — a r32 nunca abria automaticamente porque o prazo (5min antes do jogo 73) já tinha passado. Fix: remove o guard de deadline no auto-reopen; abre a fase mesmo assim (sem definir deadline).

5. **`ranking_snapshots` sem UNIQUE constraint** — upsert falhava com 42P10. Fix: `ALTER TABLE ranking_snapshots ADD CONSTRAINT ... UNIQUE (participant_id, round)` após `DELETE` de duplicatas.

### Frontend (index.html)
6. **Placeholders KO não resolvidos em Zebra da Copa e Palpite da Maioria** — seções de estatísticas usavam `g.a`/`g.b` direto. Fix: aplicar `resolveTeam()` antes de exibir, igual ao que já era feito nos jogos ao vivo.

## 18. Console Reference (DevTools F12)

### Funções do Bolão

| Função | Descrição |
|---|---|
| `bolaoShowParcial()` | Tabela de todos participantes: palpites preenchidos/total, confirmação, quanto falta (só não confirmados) |
| `bolaoSimular()` | Gera 9 participantes de teste com palpites aleatórios (debug) |
| `bolaoLimpar()` | Limpa scores locais (placares manuais) |
| `bolaoReseta()` | Apaga Supabase + localStorage + recarrega a página |
| `bolaoLogin()` | Abre o modal de login/cadastro |
| `bolaoSavePick(gameN)` | Salva palpite individual de um jogo |
| `bolaoKOPick(gameN, side)` | Salva desempate KO (side: 'a' ou 'b') |
| `bolaoSaveSpecial()` | Salva campeão + artilheiro |
| `bolaoConfirmAll()` | Trava todos os palpites |
| `bolaoCalcTotal(participantId)` | Pontuação total de um participante |
| `bolaoRenderRanking()` | Força re-render do ranking |
| `bolaoRenderPicksGrid()` | Força re-render do grid de palpites |

### Funções de Admin/Manutenção

| Função | Descrição |
|---|---|
| `_bAdm('BolaoAdmin2026!', 'Nome')` | Desbloqueia participante confirmado (reseta confirmed=false) |
| `checkAutoSnapshot()` | Força snapshot manual da posição atual no ranking_snapshots |

### Variáveis de Diagnóstico (console)

| Variável | Descrição |
|---|---|
| `_bolaoMyPicks` | Seus palpites (99 jogos do bolão, de um total de 104 — os 5 primeiros já haviam começado quando o bolão abriu) |
| `_bolaoAllPicks` | Palpites de todos participantes (só jogos já iniciados — sigilo) |
| `_bolaoPickCounts` | Contagem real de picks de cada participante (99 jogos do bolão) |
| `_bolaoParticipants` | Lista de participantes {id, name, confirmed} |
| `_bolaoConfirmedStatus` | Mapa participantId → true/false (confirmou ou não) |
| `_bolaoConfirmedAt` | Mapa participantId → timestamp ISO (data/hora da confirmação) |
| `_bolaoToken` | JWT atual (se logado) |
| `_bolaoParticipantId` | Seu ID (se logado) |
| `_bolaoName` | Seu nome (se logado) |
| `_bolaoConfirmed` | Se você confirmou |
| `_bolaoKOPicks` | Suas escolhas de desempate KO |
| `_bolaoBracketCache` | Bracket simulado em cache |
| `_bolaoMajority` | Palpites da maioria (3 mais comuns por jogo) |
| `_bolaoSnappedGames` | Jogos que já tiveram snapshot |

### Variáveis do App (console)

| Variável | Descrição |
|---|---|
| `GAMES` | Array com 104 jogos |
| `GROUPS` | Objeto com 12 grupos (A-L) |
| `scores` | Estado runtime dos placares { gameN: {a, b, pen} } |
| `goals` | Eventos de gol { gameN: {a: [...], b: [...]} } |
| `cards` | Cartões { gameN: {a: [...], b: [...]} } |
| `MATCH_STARTED` | Mapa FIFA matchId → true (jogo começou) |
| `MATCH_ENDED` | Mapa FIFA matchId → true (jogo encerrou) + chave `game_+N` (heurística local) |
| `FIFA_MATCH_IDS` | Mapa gameN → FIFA matchId |
| `PLAYERS` | 1248 jogadores carregados de players.json |
| `PLAYER_PHOTOS` | URLs de fotos carregadas de photos.json |
| `REFEREES` | Cache de árbitros (Wikipedia) |

---

## 19. Protocolo Obrigatório de Desenvolvimento

**Esta seção tem prioridade sobre todas as demais. Em caso de conflito, ela prevalece.**

---

### 19.1 Engenharia antes de programação

Este projeto **não permite programação baseada em hipóteses**.

Antes de alterar qualquer linha de código é obrigatório compreender exatamente onde está a origem do problema. Nunca alterar lógica apenas porque ela "parece" ser a responsável.

---

### 19.2 Fluxo obrigatório para qualquer bug

Toda correção deve seguir exatamente esta sequência. Pular etapas é proibido.

**Etapa 1 — Reprodução**

Reproduzir o problema antes de qualquer outra ação. Informar:
- como reproduzir
- onde ocorre (função, linha, componente)
- frequência (sempre, às vezes, condição específica)
- impacto (visual, dados, funcionalidade)

Se não conseguir reproduzir, não alterar código.

**Etapa 2 — Auditoria da cadeia completa**

Percorrer toda a cadeia relevante. Nunca assumir onde está o bug.

```
API FIFA / Supabase / Worker
↓
Parser / mergeScores / processTimeline
↓
Estado runtime (scores / goals / cards)
↓
Cache / persistência (IndexedDB / localStorage)
↓
Função de renderização (renderGames / renderGroups / renderBracket)
↓
HTML gerado (dynRender)
↓
Interface visual no navegador
```

Comparar em cada etapa: entrada recebida · saída produzida · saída esperada.

Somente após percorrer toda a cadeia identificar a causa raiz.

**Etapa 3 — Hipótese**

Após encontrar a possível causa:
- explicar por que ela é a causa (não apenas onde está)
- antes de alterar código, tentar provar que a hipótese está **errada**
- somente após resistir às tentativas de refutação, utilizar a hipótese

Quando existir mais de uma hipótese plausível, não escolher a primeira. Coletar evidências suficientes para eliminar as demais antes de modificar qualquer código.

**Etapa 4 — Correção**

Alterar apenas o mínimo necessário. É proibido:
- refatorar código não relacionado ao bug
- alterar arquitetura sem necessidade
- modificar regras de negócio sem necessidade
- criar hardcode ou valores mágicos
- criar exceções específicas que mascaram o problema real

**Etapa 5 — Testes**

Toda alteração deve ser testada. Obrigatórios:
- caso original (o bug reportado)
- casos semelhantes (mesma lógica, dados diferentes)
- casos extremos (edge cases)
- regressão (funcionalidades que poderiam ser afetadas)
- funcionalidades relacionadas (ex: alterar bracket → testar grupos e artilharia)

**Etapa 6 — Validação visual**

Quando existir interface, os testes internos **não são suficientes**. A validação obrigatória é a interface renderizada no navegador.

Se existir divergência entre API, estruturas internas e interface, **a interface prevalece**.

---

### 19.3 Interface é a fonte da verdade

Em caso de conflito entre qualquer das seguintes fontes:
- logs do console
- objetos JavaScript em memória
- testes automatizados (Node.js)
- comportamento visual na interface

**A interface visual sempre prevalece.** Se a interface estiver incorreta, o problema continua existindo — independentemente do que os logs ou testes afirmem.

Um bug não está resolvido enquanto a interface não estiver correta.

---

### 19.4 Evidências obrigatórias

É proibido responder apenas:
- "corrigido"
- "problema resolvido"
- "zero divergências"
- "funcionando"

Toda conclusão deve apresentar evidências objetivas. Formatos aceitos:
- comparação API × interface (valores lado a lado)
- HTML gerado pela função (antes e depois)
- objeto JavaScript antes/depois da correção
- resultado dos testes com output real
- captura ou descrição precisa do comportamento da interface

---

### 19.5 Critério de encerramento

Uma tarefa somente pode ser encerrada quando **todos** os itens abaixo forem verdadeiros:

- [ ] problema reproduzido
- [ ] causa raiz identificada (não apenas localizada)
- [ ] hipótese validada com evidências
- [ ] correção aplicada com alterações mínimas
- [ ] testes executados (caso original + semelhantes + extremos)
- [ ] regressão verificada
- [ ] interface validada visualmente no navegador
- [ ] `index.html` e `copa2026.html` continuam sincronizados
- [ ] usuário aprovou

Se qualquer item for falso, a tarefa permanece aberta.

---

### 19.6 Não declarar sucesso sem comprovação

É proibido afirmar que algo está resolvido sem apresentar evidências objetivas conforme seção 19.4.

É proibido considerar um bug resolvido apenas porque:
- não há erros no console
- o código compila
- os testes passaram
- a lógica parece correta teoricamente

O único critério definitivo é o **comportamento correto da aplicação na interface**.

---

### 19.7 Alterações mínimas

Toda alteração deve seguir o princípio do menor impacto possível. Evitar:
- refatorações não relacionadas ao problema
- alterações em múltiplas funções quando uma basta
- mudanças estruturais sem necessidade
- otimizações não solicitadas

---

### 19.8 Nunca programar por tentativa e erro

É proibido modificar lógica sucessivamente esperando que alguma alteração resolva o problema. Cada alteração deve ter justificativa técnica baseada em evidências coletadas nas etapas anteriores.

---

### 19.9 Auditoria pós-correção

Após qualquer correção, informar obrigatoriamente:
- arquivos alterados e motivo de cada alteração
- funções alteradas
- riscos introduzidos
- regressões verificadas
- como validar que o problema foi resolvido

---

### 19.10 Sincronização obrigatória

Sempre que houver alteração em `index.html`, verificar e sincronizar `copa2026.html` imediatamente na mesma sessão. Ambos devem permanecer funcionalmente idênticos.

---

### 19.11 Checklist mental antes de escrever código

Antes de implementar qualquer correção, responder internamente:

1. Consigo reproduzir o problema?
2. Sei exatamente onde ocorre na cadeia?
3. Tenho evidências que provam a causa raiz?
4. Minha hipótese pode estar errada?
5. Como posso tentar provar que ela está errada?
6. Qual é a menor alteração possível?
7. O que essa alteração pode quebrar?
8. Como vou provar que realmente resolveu?

Se qualquer resposta for "não" ou "não sei", continuar investigando antes de modificar o código.

---

### 19.12 Edição segura de arquivos grandes (index.html e AGENTS.md)

Os arquivos `index.html` (~445KB) e `AGENTS.md` (~87KB) vivem em mounts de rede (`/sessions/`). Dois padrões **proibidos** que já causaram perda de conteúdo neste projeto:

**Proibido 1 — Edit tool ou `f.write()` direto no mount:** trunca o arquivo ao reescrever inteiro.

**Proibido 2 — `python3 -c "..."` com backticks, `$` ou `!` na string:** o bash interpreta os caracteres especiais antes do Python, o script falha no meio, o arquivo fica partido. Já causou perda da seção §20 inteira do AGENTS.md.

**Regra obrigatória para `index.html` e `AGENTS.md`: sempre usar Python salvo em `/tmp` + `shutil.move`.**

#### Padrão seguro — Python salvo em /tmp + move atômico

Escrever o script em `/tmp/script.py` e rodar `python3 /tmp/script.py` — nunca `python3 -c "..."` com conteúdo complexo.

```python
# /tmp/edit_file.py  ← SEMPRE salvar em /tmp, nunca -c inline
import shutil

with open('index.html', 'r', encoding='utf-8') as f:
    c = f.read()
c = c.replace(old, new, 1)
with open('/tmp/index_new.html', 'w', encoding='utf-8') as f:
    f.write(c)
shutil.move('/tmp/index_new.html', 'index.html')
v = open('index.html', encoding='utf-8').read()
assert v.strip().endswith('</html>'), "TRUNCADO!"
```

O mesmo padrão para `AGENTS.md`:

```python
# /tmp/edit_agents.py
import shutil
with open('AGENTS.md', encoding='utf-8') as f:
    c = f.read()
c = c.replace(old, new, 1)
with open('/tmp/agents_new.md', 'w', encoding='utf-8') as f:
    f.write(c)
shutil.move('/tmp/agents_new.md', 'AGENTS.md')
```

`shutil.move` é atômico — ou funciona completamente ou falha, nunca trunca pela metade.

`shutil.move` é atômico — ou funciona completamente ou falha, nunca trunca pela metade.

#### Alternativa — sed in-place (substituições simples de uma linha)

```bash
sed -i "s|texto antigo|texto novo|g" index.html
```

`sed -i` modifica in-place sem reescrever o arquivo inteiro. Nunca trunca.

#### Recuperação quando truncado

```bash
git show HEAD:index.html > /tmp/index_clean.html
cp /tmp/index_clean.html index.html
# Reaplicar patches via Python+move ou sed
```

#### Verificação obrigatória após qualquer edição

```python
c = open('index.html', encoding='utf-8').read()
assert c.strip().endswith('</html>'), "TRUNCADO!"
import re, subprocess
scripts = re.findall(r'<script>(.*?)</script>', c, re.DOTALL)
open('/tmp/check.js','w').write('\n'.join(scripts))
assert subprocess.run(['node','--check','/tmp/check.js']).returncode == 0, "JS INVÁLIDO!"
```

---

### 19.14 Escrevendo em arquivos grandes dentro da pasta sincronizada com OneDrive (Cowork sandbox)

Validado em 2026-07-03: neste ambiente (sandbox Linux montando uma pasta OneDrive do Windows), dois comportamentos além do já descrito em §19.12:

**1) Redirecionamento de shell (`git show HEAD:arquivo > arquivo`) pode truncar silenciosamente.**
Em pelo menos uma ocasião nesta sessão, `git show HEAD:index.html > index.html` (rodado direto na pasta sincronizada) produziu um arquivo mais curto que o original, sem nenhum erro ou aviso — só foi detectado porque o arquivo foi conferido linha a linha logo em seguida. **Nunca confiar num write grande na pasta sincronizada sem imediatamente validar** (`wc -l` + `diff` contra a fonte).

**2) `rm`, `mv` e `git checkout`/`git reset` podem falhar com "Operation not permitted" na pasta sincronizada**, mesmo para arquivos criados na mesma sessão. Isso quebra o padrão `shutil.move` recomendado em §19.12 quando o destino já existe e precisa ser substituído via rename — nesse caso o `shutil.move`/`mv` pode falhar do mesmo jeito. `.git/index.lock` órfão criado por um comando que falhou é um exemplo: não dá pra apagar de dentro do sandbox, precisa pedir pro usuário apagar manualmente no PC.

**Padrão que funcionou de forma confiável nesta sessão — gerar fora da pasta sincronizada, validar, copiar por cima (sem apagar o destino):**

```bash
# 1) Gerar/editar o conteúdo INTEIRO fora da pasta sincronizada (ex: /tmp, que é local ao sandbox)
git show HEAD:index.html > /tmp/index_base.html      # fonte limpa
python3 /tmp/edit_script.py                          # edita /tmp/index_base.html -> /tmp/index_novo.html

# 2) Validar ANTES de tocar na pasta sincronizada
wc -l /tmp/index_novo.html                           # confere numero de linhas esperado
node --check /tmp/extraido_do_script.js              # sintaxe do JS, se aplicavel

# 3) Copiar por cima do arquivo existente (cp sobrescreve o conteudo, NAO apaga/recria o arquivo —
#    isso evita o "Operation not permitted" que rm/mv/git checkout deram nesta sessao)
cp /tmp/index_novo.html "index.html"

# 4) Validar de novo, agora no destino final, IMEDIATAMENTE apos o cp
diff /tmp/index_novo.html index.html                 # tem que dar 0 linhas de diferenca
wc -l index.html                                     # tem que bater com o esperado
```

`cp` (sobrescrever conteúdo de um arquivo que já existe) funcionou de forma confiável quando `rm`/`mv`/`git checkout` (que apagam/recriam o arquivo) falharam. A regra prática: **na pasta sincronizada, prefira sobrescrever conteúdo (`cp`, ou Edit/Write tool) a apagar-e-recriar (`rm`, `mv`, `git checkout`, `shutil.move` quando o destino já existe)** — e sempre valide com `diff`/`wc -l` logo depois, nunca assuma que o comando funcionou só porque não deu erro.

---

## 20. Performance — Otimizações Aplicadas

**Referência:** Auditoria de desempenho realizada em 2026-06-30. A02 estava marcado como problema na auditoria mas **já havia sido corrigido na v19.5** (scheduleCountdown usa setTimeout recursivo, não setInterval fixo).

### 20.1 Cache de getSuspensions (v20.7)

**Problema:** `getSuspensions(forGame)` era chamada 104× por `renderGames` — uma vez para cada `renderGameCard`. Cada chamada executava `GAMES.slice().sort().forEach` (104 iterações) mais 5 níveis de loop aninhado. Total: ~5400 iterações desnecessárias por render cycle.

**Solução:** `var _suspCache=null` declarado globalmente. No início de `renderGames`, `_suspCache={}` reseta o cache. `getSuspensions` verifica `_suspCache[forGame]` antes de computar e armazena o resultado ao final.

**Segurança:** Cache vive apenas dentro de um único `renderGames` síncrono. `cards` e `scores` não mudam durante uma renderização. Resultado idêntico ao original, zero risco de dado incorreto.

### 20.2 H2H e fair-play pré-computados em renderGroups (v20.7)

**Problema:** O comparator do `.sort()` em `renderGroups` chamava `GAMES.filter(...)` (104 itens) a cada par comparado. Para 12 grupos × ~6 comparações por sort × 2 filtros por comparação = ~1440 iterações de GAMES extras por render.

**Solução:** Antes do `.sort()`, pré-computar `_grpGames` (jogos do grupo), `_h2h` (resultado H2H entre todos os pares) e `_cond` (fair-play por time). O comparator consulta esses objetos em O(1).

**Validação:** Testado com `node` usando dados reais do Grupo A. Output idêntico ao algoritmo original em todos os grupos com e sem scores.

**Atenção:** `renderGroups` usa comparator par-a-par (sort JS padrão). Em empates cíclicos de 3 times, o resultado pode não ser totalmente determinístico. O `_resolveGroupOrder` (usado pelo bracket) tem lógica própria para esse caso. Não alterar essa diferença sem entender o impacto no bracket.

### 20.3 Regex de dynRender compilada (v20.7)

**Problema:** A regex `/<div class="live-clock[^>]*>[^<]*<\/div>/g` era recompilada a cada chamada de `dynRender` (centenas de vezes por ciclo).

**Solução:** `var _LIVE_CLOCK_RE = /<div class="live-clock[^>]*>[^<]*<\/div>/g` declarado uma vez antes da função. `dynRender` usa `_LIVE_CLOCK_RE` nas duas substituições.

**Nota:** A flag `g` com `.replace()` é segura para reutilização — `.replace` reseta `lastIndex`. Não usar `_LIVE_CLOCK_RE` com `.exec()` ou `.test()` sem resetar `lastIndex` manualmente.

### 20.4 clearInterval de _specCDInterval no pagehide (v20.7)

O `window._specCDInterval` (countdown de palpites especiais) não tinha cleanup ao fechar a aba. Adicionado ao listener `pagehide` que já existia na linha que limpa `_pollTimer`.

### 20.5 Chamadas de renderHoje() removidas (v20.7)

`function renderHoje(){}` é stub vazio desde v19.17 (aba Hoje fundida com Jogos). As 6 chamadas foram removidas. A definição da função permanece para não quebrar referências externas eventuais.

### 20.6 O que NÃO foi feito e por quê

| Item | Motivo |
|---|---|
| Dirty flag global | Risco de perder render ao esquecer setar flag em alguma fonte de mudança |
| Timeline incremental | Lógica de reconciliação complexa com edge cases documentados na seção 11 |
| bolaoCalcTotal cache | Depende de versioning correto de `scores`; implementar só se bolão render ficar lento na prática |
| SW Cache First para JSONs | Mudança simples mas separada — não misturar com otimizações de runtime |

### 20.10 Fix PROCESSED_EVENTS falsy — loop infinito em reconcileScores (v20.10)

**Root cause identificado via instrumentação ao vivo:**

`processTimeline` registrava `PROCESSED_EVENTS[idMatch]=maxId`. Quando o jogo tinha eventos sem `EventId` numérico (ou nenhum evento), `maxId=0` — valor **falsy**. O guard em `reconcileScores`:

```js
if(PROCESSED_EVENTS[id])return;  // 0 é falsy → não retorna
```

...nunca pulava o jogo. Resultado: a cada poll, `reconcileScores` chamava `processTimeline` para **todos os jogos stale não finalizados** (~25 jogos da fase de grupos).

**Medição ao vivo (30s, jogo 77 ao vivo):**
- Chamadas de processTimeline: 119 (77× de reconcileScores + 42× do poll loop)
- dynRender: **370 por elemento** em 77s

**Fix (L2464):**
```js
// ANTES:
PROCESSED_EVENTS[idMatch]=maxId;
// DEPOIS:
PROCESSED_EVENTS[idMatch]=maxId||'done';
```

`||'done'` garante valor truthy após qualquer processamento bem-sucedido — `reconcileScores` pula o jogo nas próximas rodadas.

**Resultado verificado ao vivo (30s):**
- dynRender: 370 → **5** (-98%)
- processTimeline por poll: ~119 → ~3 (apenas o jogo ao vivo)

### 20.9 Guard PROCESSED_EVENTS em recent no poll (v20.9)

**Problema:** o loop do poll chamava `processTimeline(id, g.n)` para todo jogo com `recent=true` (game UTC + 24h > now), sem verificar `PROCESSED_EVENTS[id]`. A cada poll: ~14 chamadas de processTimeline para jogos já processados → ~14 saveState desnecessários. Confirmado ao vivo: 56 processTimeline e 50 saveState em 38s.

**Fix:** `if(live||(recent&&!PROCESSED_EVENTS[id])||stale)` — `recent` agora tem o mesmo guard que `stale` já tinha.

**Resultado verificado ao vivo (56s, 6 polls):**
- processTimeline: 56 → **6** (-89%)
- saveState: 50 → **6** (-88%)
- dynRender: só games-list atualizado (grupos/bracket/scorers com HTML idêntico → dynRender descartou)

### 20.8 Debounce nos listeners focus/visibilitychange (v20.8)

**Problema:** `window.focus` e `document.visibilitychange` cancelavam o timer do poll e disparavam um novo a cada vez que a janela recebia foco. Com DevTools aberto, simples interações no console geravam 13 polls em 15s — 6× mais que o esperado (1 a cada 10s).

**Confirmado ao vivo:** antes do fix: 13 polls/15s. Após: 3 polls/30s.

**Fix:** `_lastPollTime=0` declarado junto com `_pollTimer`. Atualizado para `Date.now()` no início de cada `poll()`. Ambos os listeners checam `Date.now()-_lastPollTime<5000` antes de agir — ignoram o evento se o último poll foi há menos de 5s.

**Impacto:** elimina o flood de polls ao usar DevTools ou alternar janelas. Sem efeito em uso normal (a cada 10s com live o debounce já expirou).

### 20.7 Reordenamento do poll — mergeScores antes dos renders (v20.7, implementado)

**Problema:** No `.then()` do poll, renders incondicionais ocorriam ANTES de `mergeScores`. Quando a FIFA retornava scores novos: 1 render com dados velhos + 1 render dentro de `mergeScores` = 2 renders, o primeiro sempre desperdiçado.

**Fix aplicado:** `mergeScores(m)` (ou fallback) movido para o início do `.then`. Renders incondicionais **removidos** do poll. O único render por poll é o condicional dentro de `mergeScores` (quando `changed=true`).

**Bloco atual do .then:**

```js
_pollFails=0;
if(m&&Object.keys(m).length){mergeScores(m)}else{...fallback...};
saveState();
if(Object.keys(MATCH_ENDED).length!==endedBefore)setTimeout(checkAutoSnapshot,500);
reconcileScores();
```

**Impacto:** Quando scores mudam: 1 render (antes: 2). Quando nada muda: 0 renders (antes: 1). Dados sempre atualizados no único render que ocorre.

**Segurança verificada:** `scores[]` só é mutado por `mergeScores`, `processTimeline` e funções de console — todas já disparam seus próprios renders. Bolão não toca `scores[]`. Abas mata-mata, jogos e bolão investigadas antes da implementação. `copa2026.html` sincronizado. JS válido. Chaves balanceadas.
