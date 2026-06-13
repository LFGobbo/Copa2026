# Copa do Mundo 2026 — Documentação do Projeto

**Última atualização:** 2026-06-13 (v19.5)
**Repositório:** `github.com/LFGobbo/Copa2026`
**Deploy:** https://lfgobbo.github.io/Copa2026/
**Tecnologia:** HTML puro + CSS + JavaScript (zero build tools, sem Node.js)

---

## 1. Visão Geral

Aplicação web autossuficiente (single HTML) para acompanhar a Copa do Mundo 2026:

- 48 seleções, 12 grupos (A–L), 104 jogos
- Placar ao vivo via FIFA API + entrada manual
- Grupos com classificação dinâmica (6 critérios de desempate, incluindo H2H)
- Mata-mata com bracket automático (propagação de resultados)
- Artilharia e assistências
- Convocados (1248 jogadores) com fotos e busca
- Regras atualizadas (SAOT, VAR, 8s/5s/10s)
- **Bolão** integrado com Supabase (palpites, ranking, pontuação)
- Service Worker para cache offline
- Persistência redundante (IndexedDB + 3× localStorage)

### Restrições

- HTML principal (~242KB) com dados essenciais inline (`GAMES`, `GROUPS`)
- Dados pesados (`PLAYERS` ~116KB, `PLAYER_PHOTOS` ~174KB) em JSON externo
- Zero dependências, zero build steps
- Dados extraídos de `Copa_2026_Completa.xlsx` (3 sheets)

---

## 2. Arquitetura

```
index.html (ou copa2026.html)
├── CSS inline (~240 linhas) — design system completo, responsivo, dark theme
├── HTML estático (~200 linhas) — header, tabs, content containers, popups
├── JS inline (~1900 linhas) — toda a lógica da aplicação
│
├── players.json       → 1248 jogadores (carregado via XHR assíncrono)
├── photos.json        → 951 URLs de fotos (carregado via XHR assíncrono)
│
├── sw.js              → Service Worker (cache-first + stale-while-revalidate)
│
├── *.png (7 logos broadcast + 4 assets) → estáticos cacheados pelo SW
│
└── Supabase (REST API) → Bolão (participants, picks, special_picks)
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
| `index.html` | ~242KB | App principal (deploy GitHub Pages) |
| `copa2026.html` | ~242KB | Cópia idêntica (compatibilidade) |
| `players.json` | ~116KB | 1248 jogadores (48 times × 26) |
| `photos.json` | ~174KB | 951 URLs de fotos (Wikipedia + FIFA) |
| `sw.js` | 2KB | Service Worker v20 |
| `bola_t.png` | 36KB | Bola Trionda (redimensionada) |
| `mascote1_t.png` | ~41KB | Mascote principal |
| `mascote2_t.png` | ~41KB | Mascote secundário |
| `mascote3_t.png` | ~41KB | Mascote terciário |
| `logo_globo.png` | — | Logo Globo |
| `logo_sportv.png` | — | Logo SporTV |
| `logo_cazetv.png` | — | Logo CazéTV (20px altura no CSS) |
| `logo_sbt.png` | — | Logo SBT |
| `logo_nsports.png` | — | Logo N Sports |
| `logo_globoplay.png` | — | Logo Globoplay |
| `logo_getv.png` | — | Logo Ge TV |
| `AGENTS.md` | — | Esta documentação |
| `LEVANTAMENTO_TECNICO.md` | — | Análise técnica detalhada |
| `opencode.json` | — | Configuração OpenCode |
| `.gitignore` | — | Regras git |

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
  s: "Azteca – Cidade do México",  // Estádio
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
// Total: 48 times × 26 jogadores = 1248
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
- **Cores:** 12 cores de grupo (A–L), ouro para Brasil/destaques
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
| `REFEREES` | Cache de árbitros (Wikipedia) |
| `BAK_KEYS` | 3 chaves de localStorage para redundância |
| `VALID_TABS` | Whitelist de abas válidas |

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
| `_groupStandings(letter)` | Classificação do grupo (6 critérios: P → GD → GF → H2H P → H2H GD → H2H GF) |
| `_rankedThirds()` | 8 melhores 3ºs colocados |
| `_winnerOf(n)` | Vencedor de um jogo (com pênaltis) |
| `_loserOf(n)` | Perdedor de um jogo |
| `resolveTeam(placeholder)` | Resolve slot: "1° Grupo A", "V. Jogo 73", "0" (3º) |
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
| `setInterval(1000)` | Loop do countdown |

#### Árbitros

| Função | Descrição |
|---|---|
| `loadAllReferees()` | Busca Wikipedia para 48 jogos, cache 6h |
| `_fetchWikiRefs(letter, cb)` | Wikipedia action=parse |

---

## 7. Bolão (Betting Pool)

### 7.1 Configuração Supabase

```
URL:  https://etbezmraylbvlnycltha.supabase.co
Tier: Free
Chave anônima: (inline no HTML, é pública por design)
```

### 7.2 Tabelas

| Tabela | Colunas | Função |
|---|---|---|
| `participants` | `id (uuid), name (unique), password (sha256), confirmed (bool), created_at` | Usuários |
| `picks` | `id, participant_id (fk), game_n (int), goals_a (int), goals_b (int), ko_pick (text), created_at, updated_at` | Palpites por jogo |
| `special_picks` | `id, participant_id (fk, unique), champion (text), top_scorer (text), locked (bool)` | Palpites especiais |

### 7.3 Funcionalidades

- Login/cadastro com SHA-256 via `crypto.subtle`
- Palpites por jogo (grid de inputs, trava 2h antes)
- Palpites especiais (campeão +50pts, artilheiro +20/+10)
- Simulação do bracket baseada nos palpites
- Botões de desempate em KO (quem passa?)
- Confirmação geral (bloqueia edição)
- Ranking com medalhas, pontos, detalhes expansíveis
- Desempate: 1º mais exatos, 2º mais resultados, 3º mais bônus

### 7.4 Pontuação

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

### 7.5 Funções do Bolão

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

### 7.6 Admin

```
_bAdm('BolaoAdmin2026!', 'Nome')  → console do DevTools
```

---

## 8. Service Worker (sw.js)

**Cache name:** `copa2026-v20`

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
4. **Update:** versão nova força `controllerchange` → reload automático

---

## 9. Persistência

### Estratégia de 3 camadas

```
saveState()
├── IndexedDB (store 'copa2026', key 's'=scores, 'g'=goals, 'c'=cards)
├── localStorage 'copa2026_data'
├── localStorage 'copa2026_bak1'
└── localStorage 'copa2026_bak2'
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

`FIFA_TEAM_MAP` (48 entries) mapeia código FIFA → nome português. `FIFA_PLAYER_MAP` mapeia `IdPlayer` → nossos jogadores por time + número.

### Polling

- 10s quando há jogos ao vivo
- 60s sem jogos ao vivo
- AbortController com timeout 8s (automático) / 10s (manual)

---

## 11. Armadilhas Conhecidas

### Encoding

- `ConvertTo-Json` no PS 5.1 faz duplo-encode UTF-8 (ex: "Á" → "Ã\x81")
- Broadcast separator usa `·` (U+00B7), split regex deve ser `\u00b7`
- Arquivos salvos com `[System.IO.StreamWriter]` e `UTF8Encoding($false)` para evitar BOM

### Dados

- Gol contra armazenado no time do botão clicado (inversão corrigida na renderização)
- **Gol contra truncado pelo placar**: gols contra ficam em `autoGoals[B]` mas `autoGoalsB.slice(0, finalAway)` os remove porque `finalAway=0`. Separa-se normais de contras antes da truncagem, cada grupo usa seu placar
- `HomeTeamScore: null` no calendário FIFA → placar extraído da Timeline API
- Grupos I/J tiveram dados trocados (corrigido v11.10)

### Código

- `onerror` em strings JS precisa de escape de aspas (`\'`)
- `parseInt()` sem radix 10 causa bugs em mobile
- `forEach` aninhado pode faltar `});` (quebrou processTimeline no v12)
- `dynRender` assíncrono com rAF causa flicker se `slideUp` CSS anima 104 cards
- **Chave de cartão sem EventId**: usar minuto como identificador permite duplicatas se o mesmo cartão for reprocessado. Usar `gameId_c_EventId` + `seenCardEvents` para deduplicação
- **`newEvents` vs timeline completa**: processar só eventos novos (`EventId > lastId`) impede revalidação de cartões removidos pela API. A timeline completa deve ser varrida, com `auto` marcador para distinguir auto de manual
- **`parseInt` em minuto com acréscimo**: `parseInt("90+8")` retorna 90, não 98. Usar `_parseMinute` que calcula "90+8" → 98

### Bolão

- Campos vazios = sem palpite (não assume 0-0)
- `ko_pick` coluna precisa ser adicionada na tabela `picks` se não existir
- SHA-256 via `crypto.subtle` requer HTTPS (ou localhost)

---

## 12. Regras Obrigatórias de Desenvolvimento

### Antes de qualquer commit

1. **Balanço de chaves JS**: `{` e `}` devem ter saldo zero
2. **Funções críticas**: `dynRender`, `renderSquads`, `renderBracketTree`, `renderBracketCards`, `resolveTeam`, `isGameLive`, `updateCountdown`, `renderGames`, `renderGroups`, `renderScorers`, `esc`, `flag`, `broadcastBadge` — todas presentes
3. **Tag `<script>` íntegra**: `const GAMES` deve estar dentro de `<script>`, não em atributo HTML
4. **Strings JS com aspas escapadas**: `onerror="this.style.display=\'none\'"` (não `'none''`)
5. **Estrutura HTML válida**: tags balanceadas, sem atributos engolidos
6. **Arquivos idênticos**: `index.html` e `copa2026.html` devem ter mesmo conteúdo

### Verificação de regressão

Toda melhoria deve:
- Identificar funções/fluxos existentes que podem ser afetados
- Testar manualmente fluxos existentes na mesma área
- Verificar integridade de dados previamente funcionais
- Executar balanço de chaves + verificação de funções críticas
- Se alterar persistência, verificar `saveState()` sem exceções

---

## 13. Version History

### v19.5 (atual — 2026-06-13)
- **Dead code removido**: `@keyframes goalFlash`, `@keyframes spin` duplicado (2x→1x), `@keyframes squad-shimmer` duplicado (2x→1x), `.squads-loading` e `.loading-spinner` duplicados
- **`console.log` de produção removidos**: 6 logs de debug em `initFifaMaps()`, 2 logs em `fetchCalendar()` — produção silenciosa
- **`alt=""` nos mascotes**: `mascote1_t.png`, `mascote2_t.png`, `mascote3_t.png` agora com `alt=""`
- **`hashchange` listener**: navegação por hash manual agora funciona (ex: `#grupos`)
- **`:focus-visible`**: tabs, filter-btn, mode-btn, bview-btn, pen-btn, refresh-btn, score-input com outline dourado
- **ARIA básico**: tabs com `role="tablist"` + `role="tab"` + `aria-selected` + `tabindex`, popup com `role="dialog" aria-modal`, inputs de placar com `aria-label`
- **Countdown adaptativo**: `scheduleCountdown()` com `setTimeout` recursivo — 1s com jogos ao vivo, 30s sem (substitui `setInterval(1000)` que rodava pra sempre)
- **`Iniciar Copa.bat` corrigido**: agora abre GitHub Pages em vez de chamar `robot.ps1` inexistente
- **Mandante no bracket**: `🏟` ao lado do time da casa na view de cards do mata-mata
- **Cópia `copa2026.html` sincronizada** com `index.html`

### v19.2
- **`_bolaoWinnerOf` resolvido** — agora retorna time real via `_bolaoResolveTeam(g.a,gameN)` em vez do placeholder literal (`g.a`). A cascata KO agora propaga nomes de times corretos
- **`_bolaoResolveTeam` — "Perd. Jogo N"** — novo handler para placeholder de perdedor de jogo KO (3º lugar). Resolve o vencedor, encontra o perdedor comparando com os dois lados
- **Pontuação KO com validação de times** — `bolaoCalcTotal` agora verifica se os times que o usuário simulou (`_bolaoResolveTeam`) batem com os times reais (`resolveTeam` do app). Se diferirem, o palpite vale 0 pts (evita pontuação por sorte com bracket errado)
- **Regra de ouro adicionada** — "Nunca teorize sobre bugs — teste com dados reais primeiro" (seção 15)

### v19.1
- **Removido** `.live-clock` do card de jogo (relógio ⏱ não sincronizava corretamente)

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
- IndexedDB + 3× localStorage
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

**Nunca teorize sobre bugs — teste com dados reais primeiro.**

Antes de propor qualquer solução para um bug de lógica JS:
1. Extrair as funções afetadas do `index.html`
2. Montar um script Node.js com dados reais dos `GAMES`/`GROUPS`
3. Rodar o teste e ver o output real
4. Só então corrigir

*Exemplo: o bug `_bolaoWinnerOf` semanas de debug teriam sido evitadas rodando `node /tmp/test_bolao.js` que mostrou imediatamente `Winner jogo 75: '1° Grupo F'` em vez do time resolvido.*

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
console.log(_bolaoResolveTeam('1° Grupo F', 75))  // Testar resolução
console.log(_bolaoWinnerOf(75))                   // Vencedor simulado
console.log(_bolaoGroupStandings('F'))            // Classificação simulada
console.log(_bolaoRankedThirds())                 // 8 melhores 3os
```
