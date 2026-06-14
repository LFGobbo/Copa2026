# Copa do Mundo 2026 � Documenta��o do Projeto

**�ltima atualiza��o:** 2026-06-13 (v19.9)
**Reposit�rio:** `github.com/LFGobbo/Copa2026`
**Deploy:** https://lfgobbo.github.io/Copa2026/
**Tecnologia:** HTML puro + CSS + JavaScript (zero build tools, sem Node.js)

---

## 1. Vis�o Geral

Aplica��o web autossuficiente (single HTML) para acompanhar a Copa do Mundo 2026:

- 48 sele��es, 12 grupos (A�L), 104 jogos
- Placar ao vivo via FIFA API + entrada manual
- Grupos com classifica��o din�mica (6 crit�rios de desempate, incluindo H2H)
- Mata-mata com bracket autom�tico (propaga��o de resultados)
- Artilharia e assist�ncias
- Convocados (1248 jogadores) com fotos e busca
- Regras atualizadas (SAOT, VAR, 8s/5s/10s)
- **Bol�o** integrado com Supabase (palpites, ranking, pontua��o)
- Service Worker para cache offline
- Persist�ncia redundante (IndexedDB + 3� localStorage)

### Restri��es

- HTML principal (~242KB) com dados essenciais inline (`GAMES`, `GROUPS`)
- Dados pesados (`PLAYERS` ~116KB, `PLAYER_PHOTOS` ~174KB) em JSON externo
- Zero depend�ncias, zero build steps
- Dados extra�dos de `Copa_2026_Completa.xlsx` (3 sheets)

---

## 2. Arquitetura

```
index.html (ou copa2026.html)
+-- CSS inline (~240 linhas) � design system completo, responsivo, dark theme
+-- HTML est�tico (~200 linhas) � header, tabs, content containers, popups
+-- JS inline (~1900 linhas) � toda a l�gica da aplica��o
�
+-- players.json       ? 1248 jogadores (carregado via XHR ass�ncrono)
+-- photos.json        ? 951 URLs de fotos (carregado via XHR ass�ncrono)
�
+-- sw.js              ? Service Worker (cache-first + stale-while-revalidate)
�
+-- *.png (7 logos broadcast + 4 assets) ? est�ticos cacheados pelo SW
�
+-- Supabase (REST API) ? Bol�o (participants, picks, special_picks)
```

### Fluxo de inicializa��o

1. HTML carrega com CSS + estrutura + `GAMES`/`GROUPS` inline
2. `_loadAllData()` dispara XHR paralelos para `players.json` e `photos.json`
3. `initFifaMaps()` busca calend�rio FIFA, monta mapeamento de times/jogadores
4. `_loadPersistent()` tenta restaurar scores/goals/cards de IndexedDB + localStorage (3 chaves)
5. `renderGames()`, `renderGroups()`, `renderBracket()`, `renderScorers()` na tab ativa
6. `bolaoInit()` carrega ranking do bol�o do Supabase
7. `setInterval(updateCountdown, 1000)` � countdown em tempo real
8. `setInterval(fetchCalendar, pollingInterval)` � FIFA API polling (10s com live, 60s sem)
9. Service Worker registrado em background

---

## 3. Invent�rio de Arquivos

| Arquivo | Tamanho | Fun��o |
|---|---|---|
| `index.html` | ~242KB | App principal (deploy GitHub Pages) |
| `copa2026.html` | ~242KB | C�pia id�ntica (compatibilidade) |
| `players.json` | ~116KB | 1248 jogadores (48 times � 26) |
| `photos.json` | ~174KB | 951 URLs de fotos (Wikipedia + FIFA) |
| `sw.js` | 2KB | Service Worker v20 |
| `bola_t.png` | 36KB | Bola Trionda (redimensionada) |
| `mascote1_t.png` | ~41KB | Mascote principal |
| `mascote2_t.png` | ~41KB | Mascote secund�rio |
| `mascote3_t.png` | ~41KB | Mascote terci�rio |
| `logo_globo.png` | � | Logo Globo |
| `logo_sportv.png` | � | Logo SporTV |
| `logo_cazetv.png` | � | Logo Caz�TV (20px altura no CSS) |
| `logo_sbt.png` | � | Logo SBT |
| `logo_nsports.png` | � | Logo N Sports |
| `logo_globoplay.png` | � | Logo Globoplay |
| `logo_getv.png` | � | Logo Ge TV |
| `AGENTS.md` | � | Esta documenta��o |
| `LEVANTAMENTO_TECNICO.md` | � | An�lise t�cnica detalhada |
| `opencode.json` | � | Configura��o OpenCode |
| `.gitignore` | � | Regras git |

---

## 4. Modelo de Dados

### 4.1 GAMES (inline no HTML)

```js
// Array de 104 objetos
{
  n: 1,                    // N�mero do jogo (1-104)
  f: "Grupo A",            // Fase (ou "Mata-Mata")
  d: "11/06 Qui",          // Data
  t: "16:00",              // Hor�rio (Bras�lia, UTC-3)
  s: "Azteca � Cidade do M�xico",  // Est�dio
  a: "M�xico",             // Time A (mandante)
  b: "�frica do Sul",      // Time B (visitante)
  br: "Globo � SporTV � Caz�TV � SBT",  // Broadcasts (separador U+00B7)
  sa: "",                  // Placar A (seed inicial, vazio)
  sb: ""                   // Placar B (seed inicial, vazio)
}
```

### 4.2 GROUPS (inline)

```js
const GROUPS = {
  "A": ["�frica do Sul", "Coreia do Sul", "M�xico", "Rep�blica Tcheca"],
  "B": ["B�snia", "Canad�", "Catar", "Su��a"],
  // ... at� "L"
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
// Total: 48 times � 26 jogadores = 1248
```

### 4.4 PLAYER_PHOTOS (photos.json)

```js
{
  "Alisson": "https://upload.wikimedia.org/.../Alisson.jpg",
  // ... 951 entradas (~76% de cobertura)
}
```

Tamb�m usa fallback da Squad API da FIFA (`PlayerPicture.PictureUrl`) via `FIFA_PHOTO_BY_TEAM_NUM`.

### 4.5 Scores (runtime + persistido)

```js
scores = {
  1: { a: 2, b: 0, pen: 'a' },  // pen opcional (p�naltis)
  2: { a: 2, b: 1 },
  // ...
}
```

### 4.6 Goals (runtime + persistido)

```js
goals = {
  1: {
    a: [
      { key: "g_1711664400000", player: "10", pname: "Ra�l Jim�nez",
        type: "gol", minute: 45, assist: "17", aname: "Orbel�n Pineda",
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
      { key: "c_1711664400000", player: "4", pname: "Edson �lvarez",
        type: "yellow", minute: 32, team: "a", auto: true }
    ],
    b: []
  }
}
```

### 4.8 Suspens�es (runtime)

`getSuspensions(gameId)` agrega cart�es de **jogos anteriores** de cada time:
- 2 cart�es amarelos (em jogos distintos) = suspenso
- 1 cart�o vermelho = suspenso

---

## 5. CSS Architecture

### Design System

- **Tema:** Dark mode com glassmorphism (fundo `#08081a`, cards `#18183a`)
- **Tipografia:** Inter font embedded como base64 (64KB, latin subset, 400-700)
- **Cores:** 12 cores de grupo (A�L), ouro para Brasil/destaques
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

| Breakpoint | Mudan�as |
|---|---|
| `768px` | Header sem mascotes, tabs scroll�veis, popup mais largo |
| `480px` | Game card com grid-template-areas, inputs menores, fonte 18px |

### Componentes principais (classes)

| Classe | Fun��o |
|---|---|
| `.game-card` | Card de jogo (grid 5 colunas) |
| `.game-card.live` | Ao vivo: borda verde + glow + pulse |
| `.game-card.collapsed` | Jogos passados (colapsado, expande com +) |
| `.countdown-bar` | Barra superior de pr�ximos jogos |
| `.filter-btn` | Filtro de grupo (12 cores) |
| `.group-card` | Tabela de classifica��o |
| `.bracket-tree` | SVG do mata-mata |
| `.scorers-table` | Tabela de artilharia |
| `.bolao-*` / `.bsp-*` | Bol�o (ranking, cards de palpite) |
| `.popup-overlay` | Modal de gol/cart�o |

---

## 6. JavaScript Architecture

### 6.1 N�cleo e Configura��o

| Vari�vel / Const | Descri��o |
|---|---|
| `GAMES` | 104 jogos (inline) |
| `GROUPS` | 12 grupos (inline) |
| `PLAYERS` | 1248 jogadores (carregado de players.json) |
| `scores` `goals` `cards` | Estado runtime + persistido |
| `REFEREES` | Cache de �rbitros (Wikipedia) |
| `BAK_KEYS` | 3 chaves de localStorage para redund�ncia |
| `VALID_TABS` | Whitelist de abas v�lidas (inclui `diagnostico`) |
| `_LIVE_WINDOW` | 10800000ms � janela para live/past (3h cobre 90'+30'+p�naltis) |
| `TIMELINE_HASH` | Hash de eventos da timeline para detectar corre��es da FIFA |
| `GAME_BY_ID` | `GAME_BY_ID[g.n] = g` � lookup direto, elimina `GAMES.find()` |

### 6.2 Fun��es por Dom�nio

#### Persist�ncia

| Fun��o | Descri��o |
|---|---|
| `_loadPersistent()` | Tenta 3 chaves localStorage, replica entre elas |
| `saveState()` | IndexedDB + 3 localStorage |
| `_openDB()` / `_idbSave()` / `_idbLoad()` | IndexedDB (store separado: s/g/c) |

#### Renderiza��o

| Fun��o | Descri��o |
|---|---|
| `dynRender(el, html)` | Renderiza s� se mudou (evita flicker) |
| `renderGames(filter)` | Lista jogos (pr�ximos primeiro, passados colapsados) |
| `renderGameCard(g)` | Card individual (placar, times, eventos, p�naltis) |
| `renderGroups()` | 12 tabelas de classifica��o |
| `renderThirdPlaced()` | Tabela de melhores 3�s colocados |
| `renderBracket()` / `renderBracketCards()` / `renderBracketTree()` | Mata-mata (cards + SVG) |
| `renderScorers()` | Artilharia + assist�ncias |
| `renderSquads()` | Convocados com virtualiza��o (IntersectionObserver) |

#### Bracket (Mata-Mata)

| Fun��o | Descri��o |
|---|---|
| `_groupStandings(letter)` | Classifica��o do grupo (6 crit�rios: P ? GD ? GF ? H2H P ? H2H GD ? H2H GF) |
| `_rankedThirds()` | 8 melhores 3�s colocados |
| `_winnerOf(n)` | Vencedor de um jogo (com p�naltis) |
| `_loserOf(n)` | Perdedor de um jogo |
| `resolveTeam(placeholder)` | Resolve slot: "1� Grupo A", "V. Jogo 73", "0" (3�) |
| `_THIRD_SLOTS` | Mapeamento de slots de 3� nos jogos KO |

#### Placares e Eventos

| Fun��o | Descri��o |
|---|---|
| `isGameLive(g)` | Live detection (MATCH_STARTED + 3h window) |
| `gameIsPast(g)` | Jogo encerrado (fora janela 3h + tem placar) |
| `gameUTC(g)` | Converte data/hora para UTC (offset fixo +3 BRT) |
| `scoreInput()` | Handler de input de placar |
| `addGoalUI(id, team)` / `addCardUI(id, team)` | Abre popup de gol/cart�o |
| `confirmGoal()` / `confirmCard()` | Salva evento |
| `removeGoal(id, team, key)` / `removeCard(...)` | Remove evento |
| `setPen(id, side)` | Define vencedor nos p�naltis |
| `getSuspensions(forGame)` | Agrega suspens�es por time |

#### FIFA API

| Fun��o | Descri��o |
|---|---|
| `fetchFifaScores(timeout)` | GET `/api/v3/calendar/matches` |
| `mergeScores(map)` | Merge scores da FIFA nos locais |
| `initFifaMaps()` | Mapeia team IDs, match IDs, squads |
| `fetchCalendar()` | Polling principal (10s/60s) |
| `processTimeline(idMatch, gameId)` | Processa Timeline API (gols, cart�es) |
| `auditData()` | Compara scores locais vs FIFA |

#### Convocados

| Fun��o | Descri��o |
|---|---|
| `renderSquads()` | Gera placeholders, hidrata com IntersectionObserver |
| `getPlayerPhoto(name, team, num)` | Busca foto (Wikipedia ? FIFA Squad ? fallback bandeira) |
| `flag(t)` | Bandeira via flagcdn.com com lazy loading |
| `broadcastBadge(br)` | Logos de transmiss�o |

#### Utilit�rios

| Fun��o | Descri��o |
|---|---|
| `esc(s)` | XSS escape |
| `flag(t)` | Bandeira HTML |
| `teamRow(n, c)` | Time + bandeira |
| `toBRT(g)` | Hor�rio Bras�lia |

#### Countdown

| Fun��o | Descri��o |
|---|---|
| `updateCountdown()` | Atualiza a cada 1s: abertura ? AO VIVO ? pr�ximo jogo |
| `scheduleCountdown()` | `setTimeout` recursivo � 1s se live, 30s se n�o |

#### �rbitros

| Fun��o | Descri��o |
|---|---|
| `loadAllReferees()` | Busca Wikipedia para 48 jogos, cache 6h |
| `_fetchWikiRefs(letter, cb)` | Wikipedia action=parse |

### 6.3 Fun��es de Diagn�stico

| Fun��o | Descri��o |
|---|---|
| `renderDiagnostico()` | Aba oculta `#diagnostico`: mostra mapeamento FIFA, hashes de timeline, scores locais |
| `switchTab(tab)` | Muda de aba sem `.tab` vis�vel (usado para `diagnostico`) |

---

## 7. Bol�o (Betting Pool)

### 7.1 Configura��o Supabase

```
URL:  https://etbezmraylbvlnycltha.supabase.co
Tier: Free
Chave an�nima: (removida do front-end na v19.7 � s� o Worker usa service_role)
```

### 7.2 Cloudflare Worker (bolao-worker.js)

Middleware de seguran�a entre frontend e Supabase:

```
URL: https://copa2026-bolao.luizfelipegobbo.workers.dev
Turnstile Site Key: 0x4AAAAAADj0kWY7cUoZ_uwS
Turnstile Secret: 0x4AAAAAADj0kQff4_E5yllvUOzc2sCtF2k
```

- **`POST /register`** � Turnstile validation + cria participante (hash server-side)
- **`POST /login`** � Compara senha (hash server-side), retorna JWT
- **`POST /picks`** � Salva palpites + hist�rico (requer JWT)
- **`GET /mypicks`** � Palpites do usu�rio logado (requer JWT)
- **`GET /ranking`** � Ranking p�blico (sem auth)
- **`POST /special-picks`** � Campe�o + artilheiro (requer JWT)
- **`PATCH /confirm`** � Confirma todos os palpites (requer JWT)
- **`PATCH /admin/unlock`** � Desbloqueia participante (admin)
- **`DELETE /reset`** � Limpa tudo (admin key)

### 7.3 Tabelas

| Tabela | Colunas | Fun��o |
|---|---|---|
| `participants` | `id (uuid), name (unique), password (sha256), confirmed (bool), created_at` | Usu�rios |
| `picks` | `id, participant_id (fk), game_n (int), goals_a (int), goals_b (int), ko_pick (text), created_at, updated_at` | Palpites por jogo |
| `special_picks` | `id, participant_id (fk, unique), champion (text), top_scorer (text), locked (bool)` | Palpites especiais |

### 7.3 Funcionalidades

- Login/cadastro com SHA-256 via `crypto.subtle`
- Palpites por jogo (grid de inputs, trava 2h antes)
- Palpites especiais (campe�o +50pts, artilheiro +20/+10)
- Simula��o do bracket baseada nos palpites
- Bot�es de desempate em KO (quem passa?)
- Confirma��o geral (bloqueia edi��o)
- Ranking com medalhas, pontos, detalhes expans�veis
- Desempate: 1� mais exatos, 2� mais resultados, 3� mais b�nus

### 7.4 Pontua��o

| Acerto | Pontos |
|---|---|
| Placar exato | 10 |
| Resultado + gol do vencedor | 6 |
| Resultado + gol do perdedor | 4 |
| S� resultado (vit�ria/empate) | 2 |
| Errou | 0 |
| B�nus final (placar exato na Final #104) | +20 (acumul�vel) |
| Campe�o | +50 |
| Artilheiro exato | +20 |
| Artilheiro empatado | +10 |

### 7.5 Fun��es do Bol�o

| Fun��o | Descri��o |
|---|---|
| `_supaFetch(path, method, body)` | Wrapper REST Supabase |
| `bolaoLogin()` | Login/cadastro |
| `bolaoSavePick(gameN)` | Salva palpite individual |
| `bolaoKOPick(gameN, side)` | Salva desempate KO |
| `bolaoSaveSpecial()` | Salva campe�o + artilheiro |
| `bolaoConfirmAll()` | Trava tudo |
| `bolaoCalcPoints(...)` | Calcula pontos de um palpite |
| `bolaoCalcTotal(participantId)` | Pontua��o total |
| `bolaoRenderRanking()` | Ranking com medalhas |
| `bolaoRenderPicksGrid()` | Grid de palpites |
| `_bolaoGetBracket(picks)` | Bracket simulado |
| `bolaoSimular()` | Gera dados de teste (9 participantes) |

### 7.6 Admin

```
_bAdm('BolaoAdmin2026!', 'Nome')  ? console do DevTools
```

---

## 8. Service Worker (sw.js)

**Cache name:** `copa2026-v20`

### Estrat�gia por tipo de recurso

| Recurso | Estrat�gia | Exemplos |
|---|---|---|
| Assets est�ticos | Cache First | `*.png` (logos, bola, mascotes) |
| Dados JSON | Stale-While-Revalidate | `players.json`, `photos.json` |
| HTML | Network First | `index.html` |
| API externa | Network First (fallback index.html) | FIFA API, flagcdn |

### Ciclo de vida

1. **Install:** pr�-cacheia assets est�ticos, `skipWaiting()`
2. **Activate:** limpa caches antigos, `clients.claim()`, notifica `SW_UPDATED`
3. **Fetch:** roteia conforme estrat�gia acima
4. **Update:** vers�o nova for�a `controllerchange` ? reload autom�tico

---

## 9. Persist�ncia

### Estrat�gia de 3 camadas

```
saveState()
+-- IndexedDB (store 'copa2026', key 's'=scores, 'g'=goals, 'c'=cards)
+-- localStorage 'copa2026_data'
+-- localStorage 'copa2026_bak1'
+-- localStorage 'copa2026_bak2'
```

### Recupera��o

`_loadPersistent()` tenta as 3 chaves localStorage, replica dados entre elas se achar. `setTimeout` 200ms carrega IndexedDB e mergeia se ausente.

---

## 10. FIFA API

### Endpoints

| Endpoint | Uso |
|---|---|
| `/api/v3/calendar/matches?idCompetition=17&idSeason=285023` | Scores ao vivo (polling) |
| `/api/v3/timelines/{IdMatch}` | Eventos (gols, cart�es) |
| `/api/v3/teams/{IdTeam}/squad?idCompetition=17&idSeason=285023` | Squad + fotos |

### Mapeamento

`FIFA_TEAM_MAP` (48 entries) mapeia c�digo FIFA ? nome portugu�s. `FIFA_PLAYER_MAP` mapeia `IdPlayer` ? nossos jogadores por time + n�mero.

### Polling

- 10s quando h� jogos ao vivo
- 60s sem jogos ao vivo
- AbortController com timeout 8s (autom�tico) / 10s (manual)

---

## 11. Armadilhas Conhecidas

### Encoding

- `ConvertTo-Json` no PS 5.1 faz duplo-encode UTF-8 (ex: "�" ? "�\x81")
- Broadcast separator usa `�` (U+00B7), split regex deve ser `\u00b7`
- Arquivos salvos com `[System.IO.StreamWriter]` e `UTF8Encoding($false)` para evitar BOM

### Dados

- Gol contra armazenado no time do bot�o clicado (invers�o corrigida na renderiza��o)
- **Gol contra truncado pelo placar**: gols contra ficam em `autoGoals[B]` mas `autoGoalsB.slice(0, finalAway)` os remove porque `finalAway=0`. Separa-se normais de contras antes da truncagem, cada grupo usa seu placar
- `HomeTeamScore: null` no calend�rio FIFA ? placar extra�do da Timeline API
- Grupos I/J tiveram dados trocados (corrigido v11.10)

### C�digo

- `onerror` em strings JS precisa de escape de aspas (`\'`)
- `parseInt()` sem radix 10 causa bugs em mobile
- `forEach` aninhado pode faltar `});` (quebrou processTimeline no v12)
- `dynRender` ass�ncrono com rAF causa flicker se `slideUp` CSS anima 104 cards
- **Chave de cart�o sem EventId**: usar minuto como identificador permite duplicatas se o mesmo cart�o for reprocessado. Usar `gameId_c_EventId` + `seenCardEvents` para deduplica��o
- **`newEvents` vs timeline completa**: processar s� eventos novos (`EventId > lastId`) impede revalida��o de cart�es removidos pela API. A timeline completa deve ser varrida, com `auto` marcador para distinguir auto de manual
- **`parseInt` em minuto com acr�scimo**: `parseInt("90+8")` retorna 90, n�o 98. Usar `_parseMinute` que calcula "90+8" ? 98

### Bol�o

- Campos vazios = sem palpite (n�o assume 0-0)
- `ko_pick` coluna precisa ser adicionada na tabela `picks` se n�o existir
- SHA-256 via `crypto.subtle` requer HTTPS (ou localhost)

---

## 12. Regras Obrigat�rias de Desenvolvimento

### Antes de qualquer commit

1. **Balan�o de chaves JS**: `{` e `}` devem ter saldo zero
2. **Fun��es cr�ticas**: `dynRender`, `renderSquads`, `renderBracketTree`, `renderBracketCards`, `resolveTeam`, `isGameLive`, `updateCountdown`, `renderGames`, `renderGroups`, `renderScorers`, `esc`, `flag`, `broadcastBadge` � todas presentes
3. **Tag `<script>` �ntegra**: `const GAMES` deve estar dentro de `<script>`, n�o em atributo HTML
4. **Strings JS com aspas escapadas**: `onerror="this.style.display=\'none\'"` (n�o `'none''`)
5. **Estrutura HTML v�lida**: tags balanceadas, sem atributos engolidos
6. **Arquivos id�nticos**: `index.html` e `copa2026.html` devem ter mesmo conte�do

### Verifica��o de regress�o

Toda melhoria deve:
- Identificar fun��es/fluxos existentes que podem ser afetados
- Testar manualmente fluxos existentes na mesma �rea
- Verificar integridade de dados previamente funcionais
- Executar balan�o de chaves + verifica��o de fun��es cr�ticas
- Se alterar persist�ncia, verificar `saveState()` sem exce��es

---

## 13. Version History

### v19.9 (2026-06-13) � Auditoria final: corre��es cr�ticas para produ��o

- **`_bolaoMajority` declarado e populado**: vari�vel agora existe e � carregada via `GET /majority` ap�s login. Fun��o `bolaoMajorityHtml` n�o lan�a mais ReferenceError
- **`_bolaoConfirmedAt` populado**: armazenado do retorno de `/stats` (campo `confirmed_at`) para exibir data/hora real da confirma��o
- **Worker `/snapshot` e `/majority/refresh` aceitam JWT**: al�m do `X-Admin-Key`, agora aceitam token JWT v�lido. Frontend consegue gravar snapshots e atualizar cache da maioria
- **`on_conflict=participant_id,round`**: upsert em `ranking_snapshots` evita duplicatas quando m�ltiplas abas tentam gravar
- **`_bolaoResolveTeam` recebe `picks` do participante**: pipeline completo (`_bolaoGetScore` ? `_bolaoGroupStandings` ? `_bolaoRankedThirds` ? `_bolaoWinnerOf` ? `_bolaoResolveTeam`) agora aceita par�metro opcional `picks`. `bolaoCalcTotal` passa os picks do participante alvo, n�o do usu�rio logado
- **`_bolaoBracketCache` invalidado**: cache resetado em `bolaoSavePick()` � simula��o do bracket reflete altera��es de picks
- **`bolaoLoadRanking` com tratamento de erro**: `catch` agora mostra mensagem "Erro ao carregar ranking" em vez de silenciar
- **Countdown adaptativo melhorado**: atualiza a cada 1s quando h� jogos ao vivo OU pr�ximo jogo nas pr�ximas 24h (antes era s� ao vivo)
- **CSS `--bg2` ? `--bg`**: vari�vel n�o definida corrigida no `.bsp-input`
- **`bolaoLoadEvolution` chamada no login**: gr�fico de evolu��o carrega ao logar (antes s� carregava ap�s snapshot)
- **`bolaoLoadMajority` adicionada**: carrega dados da maioria e re-renderiza grid de palpites
- **`_bolaoFetch` com retry e backoff**: 3 tentativas com delay exponencial (1s, 2s, 4s) para recupera��o de falhas tempor�rias Worker/Supabase
- **Worker `/health`**: endpoint de monitoramento `GET /health` ? `{ok: true, uptime: ...}`
- **Worker `/cron`**: endpoint para cron jobs externos (keepalive Supabase + poll FIFA + snapshot). Protegido por `?secret=ADMIN_KEY`. Configurar em cron-job.org a cada 5 min
- **Worker `/scores`**: proxy para tabela `live_scores` do Supabase � scores centralizados da FIFA
- **Tabela `live_scores`**: cache centralizado de placares no Supabase, populado pelo Worker Cron
- **Cache offline do ranking**: `localStorage` guarda �ltimo ranking bem-sucedido (TTL 1h). Se Worker offline, mostra ranking cacheado com indicador "? Dados offline"
- **Fallback de scores**: quando `fetchFifaScores` retorna vazio, polling tenta `GET /scores` (Worker ? Supabase `live_scores`) como segunda fonte

### v19.8 (2026-06-13) � GAMES ordenado + Bol�o completo

- **GAMES array reordenado**: agora ordenado por data (`d`) e hor�rio (`t`) em vez de n�mero do jogo (`n`). Game 5 (Austr�lia vs Turquia, 14/06 01:00) movido da posi��o 5 para a posi��o 8 (ap�s jogos de 13/06). Mata-mata (jogos 73-104) tamb�m reordenado � ex: jogo 76 (29/06 13:00) agora antes de 74 (29/06 17:30)
- **`GAME_BY_ID[g.n]` cache** continua funcionando (independe da ordem do array)
- **`renderGames()` sort corrigido**: `games.sort(function(a,b){return a.n-b.n})` substitu�do por sort por data/hora � antes ignorava a ordem cronol�gica e reordenava por n�mero do jogo
- **n-values corrigidos**: Game 5 (Austr�lia vs Turquia, 14/06 01:00) renumerado de n=5 para n=8; games 6?5 (Catar vs Su��a), 7?6 (Brasil vs Marrocos), 8?7 (Haiti vs Esc�cia). Agora os `n` correspondem � ordem cronol�gica real
- **`copa2026.html` sincronizado** com `index.html`
- **`_bolaoFetch` agora propaga `err.status`**: HTTP status code preservado no erro (n�o s� mensagem)
- **`bolaoLogin()` com mensagens claras**: 401="Senha incorreta", 403="Conta bloqueada", 409="Nome j� cadastrado � tente outro ou verifique a senha" (em vez de "Erro: ..." gen�rico)
- **Syntax error corrigido**: try externo removido acidentalmente durante refatora��o � c�digo comum ficou solto, quebrando o site. Restaurado aninhamento try/catch original
- **`BOLAO_FIRST` alterado de 7 para 6**: ap�s renumerar jogos 5-8, Brasil vs Marrocos virou jogo #6 � bol�o come�a dele
- **Bol�o progressivo**: `bolaoRenderPicksGrid()` agora s� mostra jogos at� o primeiro n�o travado (o "jogo atual"). � medida que o tempo passa, novos jogos aparecem. Palpites pr�-preenchidos para jogos futuros ainda s�o salvos, mas os cards s� ficam vis�veis quando chegar a vez
- **Sigilo de palpites**: Worker filtra `GET /ranking` por `maxGame` (�ltimo jogo que come�ou). Palpites de jogos futuros n�o s�o retornados pelo servidor � nem via DevTools
- **Especiais ocultos**: Campe�o/artilheiro s� retornados ap�s jogo #32 come�ar (`showSpecials=1`)
- **Summary de preenchimento**: aviso mostrando quantos palpites foram preenchidos e quais faltam
- **Pontua��o no card flutuante**: durante o jogo mostra pontos provis�rios; ranking s� contabiliza ap�s `gameIsPast()`
- **Regras do bol�o reescritas**: texto completo explicando sigilo, progress�o, status e pontua��o ao vivo
- **`_bolaoConfirmedStatus`**: nova store no frontend que rastreia `confirmed` de cada participante
- **Worker `/ranking` retorna `confirmed`**: `select=id,name,confirmed` para o frontend saber quem confirmou
- **`bolaoCalcTotal` verifica confirma��o**: se o participante n�o confirmou, retorna 0 pts � palpites salvos s� contam ap�s "Confirmar todos"
- **Regra de confirma��o explicita**: texto "S� valem para pontua��o depois de clicar em Confirmar todos os palpites" na lista de regras
- **`_groupStandings` H2H completo**: 3 subcrit�rios restauratos (H2H pontos ? H2H saldo ? H2H gols marcados). Havia sido minificado perdendo GD e GF do confronto direto
- **`_loserOf` com p�naltis**: agora reconhece `s.pen` para determinar perdedor em jogos decididos nos p�naltis (antes retornava `null` em empates)
- **Regras com destaque visual**: palavras-chave em vermelho/laranja/verde/azul/ouro para chamar aten��o (OBRIGAT�RIA, S� VALEM AP�S CONFIRMAR, RASCUNHOS, OCULTOS, PR�VIA)
- **Estat�sticas pessoais**: nova se��o `#bolao-stats-section` com grid de pontos, exatos, resultados, b�nus e pontos por fase
- **Evolu��o no ranking**: gr�fico SVG mostrando posi��o ao longo das rodadas (`GET /evolution`)
- **Palpite da maioria**: exibe os 3 palpites mais comuns de cada jogo, com porcentagem (`GET /majority`)
- **Snapshot autom�tico**: `checkAutoSnapshot()` grava posi��o de todos no banco quando um jogo encerra (`POST /snapshot`, tabela `ranking_snapshots`)
- **`confirmed_at`**: Worker salva timestamp ao confirmar (`PATCH /confirm` + `confirmed_at`)
- **`renderGroups()` sort fix**: `.sort(function(a,b){return a.n-b.n})` adicionado para ordem consistente em jogos no mesmo dia
- **`_bolaoGetBracket` sem muta��o global**: usa `JSON.parse(JSON.stringify(scores))` para clonagem profunda, evitando vazamento de palpites do bol�o para o bracket real
- **`mergeScores` dispara `checkAutoSnapshot`**: ao receber placar da FIFA, verifica se algum jogo encerrou e grava snapshot
- **`supabase-additions.sql`**: migration para `confirmed_at`, `ranking_snapshots`, `majority_cache`
- **Worker novas rotas**: `GET /stats`, `GET /majority`, `POST /majority/refresh`, `POST /snapshot`, `GET /evolution`
- **Palpite da maioria cacheado**: tabela `majority_cache` no Supabase, calculado pelo Worker (`POST /majority/refresh`)
- **`_bolaoSnappedGames`**: rastreia localStorage de snapshots j� feitos para evitar duplicatas

### v19.7 (2026-06-13) � Deploy Completo + Root route
- **Turnstile corrigido**: `turnstile.getResponse(document.getElementById('bolao-turnstile'))` em vez de `'bolao-turnstile'` string
- **Worker configurado**: 6 env vars no Cloudflare (SUPABASE_URL, SUPABASE_KEY, TURNSTILE_SEC, JWT_SECRET, ADMIN_KEY, ADMIN_HASH)
- **SQL migration executado**: `pick_history` criada, RLS desabilitado
- **Verificado**: `/ranking` retorna 19 participantes, 597 picks, 5 specialPicks � bol�o 100% funcional
- **Root route**: `GET /` agora retorna lista de rotas em vez de 404
- **Cloudflare Worker (`bolao-worker.js`)**: Middleware de seguran�a entre frontend e Supabase. Rotas: `/register` (com Turnstile), `/login` (hash server-side + JWT), `/picks` (com hist�rico), `/mypicks`, `/ranking`, `/special-picks`, `/confirm`, `/admin/unlock`, `/reset`
- **Turnstile (Cloudflare)**: Widget anti-bot no formul�rio de cadastro. Token validado no Worker (server-side real, n�o apenas no cliente)
- **Senha nunca mais vaza**: Hash SHA-256 + salt (`JWT_SECRET`) computado no Worker. Cliente envia senha em texto puro (HTTPS), `password` coluna nunca retornada ao frontend
- **JWT**: Token assinado com HS256, 90 dias de validade, enviado em `Authorization: Bearer` em todas as requisi��es autenticadas
- **`_supaFetch` removido**: Todas as chamadas diretas ao Supabase substitu�das por `_bolaoFetch()` que passa pelo Worker
- **`SUPA_KEY` e `SUPA_URL` removidos do frontend**: Anon key n�o est� mais no HTML
- **`pick_history`**: Nova tabela no Supabase que registra cada altera��o de palpite com timestamp
- **RLS desabilitado**: Worker usa `service_role` key, anon key n�o tem mais acesso
- **`_hash()` removido**: Cliente n�o precisa mais computar SHA-256
- **`_bAdm` atualizado**: Agora usa Worker (`/admin/unlock`) em vez de Supabase direto
- **`_bAdmHash` removido**: Hash do admin n�o fica mais no frontend

### v19.6 (2026-06-13)
- **`MATCH_ENDED` como fonte principal**: `isGameLive()` e `gameIsPast()` agora priorizam `MATCH_STARTED`/`MATCH_ENDED` da FIFA. Janela fallback aumentada para 4h (`_WINDOW_4H`=14400000ms) cobre prorroga��o + p�naltis
- **`TIMELINE_HASH`**: Hash SHA-like da timeline completa detecta corre��es da FIFA mesmo sem novos `EventId`. Processa eventos de novo se o hash mudar (ex: gol adicionado/removido pela FIFA)
- **Assist lookup por `AssistPlayerId`**: Se a FIFA enviar `AssistPlayerId`, usa direto mapeando `FIFA_PLAYER_MAP`. Fallback mant�m o scan `Type===1` anterior
- **`GAME_BY_ID[]` cache**: Lookup direto `GAME_BY_ID[g.n] = g` elimina todos os `GAMES.find()` (~15 chamadas lineares)
- **Aba Diagn�stico oculta (`#diagnostico`)**: Acess�vel via URL hash, mostra mapeamento FIFA (times/jogos), hashes recentes da timeline, scores locais � debug interno sem interferir nas abas normais
- **`switchTab(tab)`**: Nova fun��o para navegar a abas sem `.tab` vis�vel na DOM
- **`_LIVE_WINDOW`**: `10800000ms` (3h) substitui `10800000` hardcoded em 3 locais. Cobre 90min + prorroga��o + p�naltis sem estender demais

### v19.5 (2026-06-13)
- **Dead code removido**: `@keyframes goalFlash`, `@keyframes spin` duplicado (2x?1x), `@keyframes squad-shimmer` duplicado (2x?1x), `.squads-loading` e `.loading-spinner` duplicados
- **`console.log` de produ��o removidos**: 6 logs de debug em `initFifaMaps()`, 2 logs em `fetchCalendar()` � produ��o silenciosa
- **`alt=""` nos mascotes**: `mascote1_t.png`, `mascote2_t.png`, `mascote3_t.png` agora com `alt=""`
- **`hashchange` listener**: navega��o por hash manual agora funciona (ex: `#grupos`)
- **`:focus-visible`**: tabs, filter-btn, mode-btn, bview-btn, pen-btn, refresh-btn, score-input com outline dourado
- **ARIA b�sico**: tabs com `role="tablist"` + `role="tab"` + `aria-selected` + `tabindex`, popup com `role="dialog" aria-modal`, inputs de placar com `aria-label`
- **Countdown adaptativo**: `scheduleCountdown()` com `setTimeout` recursivo � 1s com jogos ao vivo, 30s sem (substitui `setInterval(1000)` que rodava pra sempre)
- **`Iniciar Copa.bat` corrigido**: agora abre GitHub Pages em vez de chamar `robot.ps1` inexistente
- **Mandante no bracket**: `??` ao lado do time da casa na view de cards do mata-mata
- **C�pia `copa2026.html` sincronizada** com `index.html`

### v19.2
- **`_bolaoWinnerOf` resolvido** � agora retorna time real via `_bolaoResolveTeam(g.a,gameN)` em vez do placeholder literal (`g.a`). A cascata KO agora propaga nomes de times corretos
- **`_bolaoResolveTeam` � "Perd. Jogo N"** � novo handler para placeholder de perdedor de jogo KO (3� lugar). Resolve o vencedor, encontra o perdedor comparando com os dois lados
- **Pontua��o KO com valida��o de times** � `bolaoCalcTotal` agora verifica se os times que o usu�rio simulou (`_bolaoResolveTeam`) batem com os times reais (`resolveTeam` do app). Se diferirem, o palpite vale 0 pts (evita pontua��o por sorte com bracket errado)
- **Regra de ouro adicionada** � "Nunca teorize sobre bugs � teste com dados reais primeiro" (se��o 15)

### v19.1
- **Removido** `.live-clock` do card de jogo (rel�gio ? n�o sincronizava corretamente)

### v19 � Bol�o com Supabase
- Bol�o completo: login SHA-256, palpites, ranking, Supabase
- Bot�es de desempate KO, bracket simulado, confirma��o
- Admin unlock via console

### v16.2 � Suspens�o + Performance
- Indicador de suspensos nos cards
- Encoding fix Globoplay/Ge TV
- Lazy loading em bandeiras, render cache
- Audit badge, refresh error some em 3s
- Third-place com ranking position

### v16.1 � Third-place fix
- `_resolvedTeamRow` passa `gameNum` para `resolveTeam`
- Nome do time em vez de grupo no bracket

### v16 � Persist�ncia Bulletproof
- IndexedDB + 3� localStorage
- Seed dados reais FIFA (jogos 1-2)
- Auditoria, mobile improvements
- Jogos passados colapsados, scroll autom�tico
- Bugfixes broadcast/referee/hash

### v15 � Anti-Flicker Final
- `dynRender` s�ncrono, `slideUp` removido
- Bracket SVG reescrito
- Hotfixes onerror + id="assist-opts"

### v14 � Reaplica��o Incremental
- 3�s lugares, �rbitro Wikipedia, ordem cronol�gica gols+cart�es
- Countdown simult�neo, live game enf�tico
- Globoplay/Ge TV

### v12 � JSON Externo + Virtualiza��o
- PLAYERS e PLAYER_PHOTOS extra�dos para JSON
- IntersectionObserver para convocados (1248 placeholders)
- Bracket autom�tico, FIFA Timeline API

### v11.x � Corre��es e Fotos
- Grupos I/J corrigidos, window.event eliminado
- Busca em convocados, fotos Wikipedia + FIFA
- Clubes mapeados (zero "Outro")

### v10 � FIFA Timeline API
- Auto-fetch de gols/assist�ncias
- Player map por time + n�mero

### v9 � Squads Completos
- 1248 jogadores, n�meros reais, clubes
- Regras 2026, AO VIVO no countdown

### v6�v3 � Funda��o
- Broadcast logos, bandeiras, gols ordenados
- CSS redesign dark theme, responsivo
- Popup de gol, timer regressivo

---

## 14. Como Testar

### Local
Abra `index.html` diretamente no navegador (file:// funciona, mas Service Worker requer http://).

### GitHub Pages
https://lfgobbo.github.io/Copa2026/

### Simula��o do Bol�o
```js
// No console do DevTools:
bolaoSimular()  // 9 participantes com palpites
```

### Reset
```js
bolaoLimpar()   // Limpa scores locais
bolaoReseta()   // Apaga Supabase + localStorage + recarrega
```

### Admin Bol�o
```js
_bAdm('BolaoAdmin2026!', 'Nome do Participante')
```

---

## 15. Regra de Ouro (Debug)

**Nunca teorize sobre bugs � teste com dados reais primeiro.**

Antes de propor qualquer solu��o para um bug de l�gica JS:
1. Extrair as fun��es afetadas do `index.html`
2. Montar um script Node.js com dados reais dos `GAMES`/`GROUPS`
3. Rodar o teste e ver o output real
4. S� ent�o corrigir

*Exemplo: o bug `_bolaoWinnerOf` semanas de debug teriam sido evitadas rodando `node /tmp/test_bolao.js` que mostrou imediatamente `Winner jogo 75: '1� Grupo F'` em vez do time resolvido.*

### Comandos �teis pelo console (F12)

**Desbloquear participante confirmado:**
```js
_bAdm('BolaoAdmin2026!', 'Nome Exato do Participante')
```
Reseta `confirmed=false` no Supabase. Participante precisa recarregar a p�gina.

**Apagar participante de teste** (SQL Editor do dashboard Supabase):
```sql
DELETE FROM participants WHERE name = 'Nome do participante';
-- picks e special_picks s�o apagados em cascata automaticamente
```

**Ver estado atual na mem�ria:**
```js
console.log(_bolaoMyPicks)          // Palpites carregados
console.log(_bolaoKOPicks)          // Escolhas de empate KO
console.log(_bolaoParticipantId, _bolaoName, _bolaoConfirmed)  // Status do login
console.log(_bolaoResolveTeam('1� Grupo F', 75))  // Testar resolu��o
console.log(_bolaoWinnerOf(75))                   // Vencedor simulado
console.log(_bolaoGroupStandings('F'))            // Classifica��o simulada
console.log(_bolaoRankedThirds())                 // 8 melhores 3os
```

## 15. Backup e Recupera��o

### Backup autom�tico no reposit�rio
- Arquivos marcados com .backup no reposit�rio s�o c�pias do �ltimo estado est�vel
- index.html.backup � �ltima vers�o HTML funcional
- olao-worker.js.backup � �ltima vers�o do Worker funcional
- Para restaurar: copiar o .backup por cima do arquivo original e fazer deploy

### Backup server-side (Worker proxy)
- GET /app no Worker serve o site completo sem depender 100% do GitHub Pages
- Imagens e JSON s�o cacheados na Cache API do Cloudflare Workers
- Se GitHub Pages ficar offline, o Worker serve do cache
- Endere�o: https://copa2026-bolao.luizfelipegobbo.workers.dev/app

### Procedimento de emerg�ncia
1. Se GitHub Pages quebrar: os usu�rios acessam via /app
2. Se Worker quebrar: colar bolao-worker.js.backup no Cloudflare
3. Se HTML quebrar: colar index.html.backup no lugar e push
4. Se Supabase perder dados: restore do dump (se existir) ou recadastrar usu�rios
## 16. Deploy Automatico do Worker

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
