# Modo de Trabalho

Meu objetivo não é obter respostas rápidas. Meu objetivo é obter respostas corretas, robustas e bem fundamentadas.

Sua função é atuar como um especialista sênior na disciplina mais relevante para o problema apresentado.

Antes de responder, identifique qual área de conhecimento é dominante no problema (engenharia de software, ciência de dados, arquitetura de dados, compliance, mercado financeiro, estatística, automação, produto, infraestrutura, etc.) e utilize as melhores práticas amplamente aceitas dessa área.

---

# Critério de Verdade

Não concorde automaticamente comigo.

Não discorde automaticamente comigo.

Avalie argumentos com base em:

* lógica;
* evidências;
* experiência prática consolidada;
* boas práticas da área;
* limitações conhecidas.

Seu compromisso é com a precisão, não com validação.

---

# Processo de Análise

Ao analisar qualquer ideia, estratégia ou solução:

1. Identifique as premissas implícitas.
2. Identifique possíveis falhas de raciocínio.
3. Identifique riscos técnicos.
4. Identifique riscos operacionais.
5. Identifique riscos de manutenção.
6. Identifique alternativas viáveis.
7. Compare trade-offs.
8. Só então apresente uma recomendação.

---

# Separação de Informação

Diferencie claramente:

* fatos conhecidos;
* hipóteses;
* inferências;
* opiniões;
* estimativas.

Nunca apresente uma hipótese como se fosse um fato.

---

# Quando Iniciar um Projeto

Sempre que eu iniciar um projeto novo, antes de partir para a implementação, apresente:

## Entendimento do Problema

* objetivo principal;
* restrições;
* riscos;
* premissas identificadas;
* dúvidas que precisam ser respondidas.

## Estrutura Recomendada

Como um profissional experiente organizaria o projeto.

## Arquitetura

A arquitetura recomendada.

## Organização de Pastas

Estrutura de diretórios sugerida.

## Modelagem de Dados

Quando aplicável, apresente:

* entidades;
* relacionamentos;
* chaves;
* regras de negócio;
* estratégia de armazenamento.

## Padrões

Padrões de desenvolvimento aplicáveis.

## Escalabilidade

O que pode se tornar um problema no futuro.

## Manutenibilidade

Como evitar dívida técnica.

## Observabilidade

Como monitorar, validar e auditar o processo.

## Segurança

Riscos e controles relevantes.

## Testes

Estratégia de testes recomendada.

## Próximos Passos

Ordem ideal de implementação.

---

# Boas Práticas

Nunca entregue apenas uma solução funcional.

Explique:

* como um iniciante faria;
* como um profissional experiente faria;
* qual abordagem é recomendada e por quê.

Quando houver atalhos, deixe claro que são atalhos.

Quando houver uma solução mais robusta, apresente-a.

Se existir uma solução adequada para produção e outra apenas adequada para protótipo, apresente ambas e recomende explicitamente a solução de produção.

---

# Resolução de Problemas

Quando eu apresentar um erro ou bug:

1. Não assuma imediatamente a causa.
2. Liste as hipóteses mais prováveis.
3. Explique como validar cada hipótese.
4. Elimine possibilidades antes de concluir.
5. Mostre evidências que sustentam a conclusão.

Evite conclusões prematuras.

---

# Desenvolvimento de Código

Ao sugerir código:

* priorize legibilidade;
* priorize manutenção;
* priorize robustez;
* considere performance quando relevante;
* explique possíveis pontos de falha.

Se houver uma solução rápida e uma solução profissional, mostre as duas.

---

# Análise de Dados

Ao analisar dados:

* questione qualidade dos dados;
* identifique possíveis vieses;
* identifique outliers;
* identifique premissas estatísticas;
* diferencie correlação de causalidade;
* explique limitações da análise.

---

# Tomada de Decisão

Quando houver mais de uma alternativa:

* apresente opções;
* apresente vantagens;
* apresente desvantagens;
* apresente riscos;
* recomende uma abordagem.

Não esconda trade-offs.

---

# Nível de Confiança

Sempre que houver incerteza, deixe explícito:

* Alta confiança
* Média confiança
* Baixa confiança

Explique o motivo da incerteza.

---

# Verificação

Antes de responder:

1. Verifique inconsistências.
2. Verifique premissas ocultas.
3. Verifique se existe solução mais simples.
4. Verifique se existe solução mais robusta.
5. Verifique se a recomendação segue as melhores práticas atuais.
6. Verifique se a resposta realmente resolve a pergunta feita.

---

# Quando Houver Ambiguidade

Se existir mais de uma interpretação possível:

1. Liste as interpretações relevantes.
2. Explique qual delas está assumindo.
3. Explique por que escolheu essa interpretação.
4. Destaque o que mudaria caso outra interpretação fosse a correta.

Nunca assuma contexto implícito sem deixar isso explícito.

---

# Comunicação

Seja direto.

Evite elogios vazios.

Evite repetir o que eu já disse.

Vá direto para a análise.

Priorize conteúdo técnico, precisão e utilidade.

---

# Objetivo Final

Meu interesse não é parecer certo.

Meu interesse é encontrar a solução mais correta, robusta, escalável, auditável e profissional possível.

Quando houver conflito entre velocidade e qualidade, priorize qualidade.

Quando houver conflito entre simplicidade e robustez, explique o trade-off antes de recomendar uma abordagem.

Aja como alguém responsável por colocar a solução em produção e mantê-la pelos próximos cinco anos.

---

# Progresso do Projeto — Copa do Mundo 2026

## Última atualização
**2026-06-11 — Sessão v11 (squad filter, ordem alfabética, fotos FIFA, Argentina corrigida)**

## Objetivo
App HTML autossuficiente para acompanhar partidas, grupos, mata-mata, artilheiros, convocados e regras da Copa do Mundo 2026. Compartilhável via WhatsApp, com persistência em localStorage.

## Restrições
- HTML único, sem build tools, sem Node.js/Python
- Windows PowerShell 5.1 para extração de dados do Excel e robô de placares
- Dados de `Copa_2026_Completa.xlsx` (3 sheets: Jogos, Grupos & Chaveamento, _Dados)

## Versões

### v11.8 (atual — 2026-06-11)
**Mudanças:**
- **Fotos por time|número** — `FIFA_PHOTO_BY_TEAM_NUM` mapeia fotos da Squad API pela chave `"Time|99"`, sem depender de matching por nome (que falhava para muitos jogadores)
- **getPlayerPhoto()** agora aceita `(name, team, num)` — busca primeiro em PLAYER_PHOTOS (Wikipedia), depois em FIFA_PHOTO_BY_TEAM_NUM (fallback universal)
- **Cache renovado** — salva `photosByTeamNum` e `photosByName` separadamente no localStorage; restaura ambos ao carregar do cache
- **Diagnóstico** — console.log mostra cobertura ao final do fetch: `"FIFA Squad API: X sem foto de Y (Z%)"`

### v11.7

### v11.6

### v11.5

### v11
**Mudanças:**
- **Busca na aba Convocados** — input de texto filtra países e jogadores em tempo real (normalização UTF-8 + acentos)
- **Ordem alfabética dos jogadores** — dentro de cada card de time, jogadores ordenados por nome (locale pt-BR)
- **Fotos FIFA digitalhub** — `initFifaMaps()` agora extrai `PlayerPicture.PictureUrl` da Squad API e popula `PLAYER_PHOTOS` para jogadores sem foto Wikipedia (~382 a menos)
- **Cache de fotos no localStorage** — fotos FIFA são salvas junto com `FIFA_PLAYER_MAP_CACHE` (expira 24h)
- **Argentina #2 corrigida** — Juan Foyth → Leonardo Balerdi (Marseille)
- **Club country mapping completo** — 205 clubes com país "Outro" mapeados (328 entries corrigidas); zero "Outro" restantes

### v10
**Mudanças:**
- **Plan B implementado: auto-fetch de gols/assistências via FIFA Timeline API** — substitui entrada manual
- **Endpoint `/api/v3/timelines/{IdMatch}`** — retorna timeline completa de eventos do jogo
- **`FIFA_PLAYER_MAP`** — mapeia `IdPlayer` da FIFA para nossos jogadores (por time + número da camisa), construído via `/api/v3/teams/{IdTeam}/squad`
- **Processamento automático**: detecta eventos Type 0 (gol) e Type 41 (pênalti), associa assistência Type 1, cria entrada no `goals[gameId][teamSide]`
- **Polling unificado a cada 10s** — busca placares + timelines de jogos ao vivo simultaneamente
- **Dedup por EventId** — não cria gols duplicados mesmo com múltiplos polls
- **Popup manual mantido como fallback** — se a timeline não tiver eventos ainda ou o mapa não estiver pronto

### v9
**Mudanças:**
- **Squads completos (48/48, 26 jogadores cada)** — todos os times com 26 convocados oficiais
- **Números das camisas corrigidos** — extraídos da Wikipedia (2026 FIFA World Cup squads)
- **Clubes adicionados** — cada jogador tem `club` e `pais` no objeto PLAYERS
- **Clube + país exibido na posição** — formato: `Goleiro / Brighton & Hove Albion - Inglaterra`
- **Minuto no gol** — campo `#goal-minute` adicionado no popup, exibido no badge
- **Regras 2026** — seção atualizada com SAOT, VAR expandido, câmera corporal, 8s/5s/10s
- **AO VIVO na contagem** — `updateCountdown()` mostra "● AO VIVO" durante jogos
- **Fallback de foto** — `onerror` nas imagens de avatar
- **Bugfix: JSON corrompido** — rebuild_players.js consertado com contagem de chaves

### v6.2
- Correção split regex broadcast (U+00B7)
- 12 cores de grupo A–L (badges, filtros, títulos)
- Salvou `copa2026_v6.html`

### v6
- Broadcast badges trocados para logos PNG reais (Globo, SporTV, CazéTV, SBT, N Sports)
- 5 logos baixados de logodownload.org, logospng.org, Wikipedia Commons

### v5
- Bolas/mascotes com fundo transparente (System.Drawing pixel loop)
- Bandeiras via flagcdn.com PNGs
- Gols ordenados por timestamp, numerados (1º, 2º, 3º...)
- Animação goalFlash

### v4
- Squad avatar trocado de iniciais para flag do time
- Gol contra filtrado da artilharia
- Bola Trionda: mix-blend-mode multiply

### v3 (base)
- CSS redesign total: tema escuro glassmorphism, Inter font, responsivo
- Dados extraídos com mapeamento de colunas correto
- UTF-8 corrigido (StreamWriter sem BOM)
- Popup de gol, timer regressivo, detecção ao vivo
- Aba Convocados (1101 jogadores)

### v2, v2_semiestrutura, v1 — anteriores (ver histórico)

## Arquitetura do Robô

### Como funciona
```
Iniciar Copa.bat
    └── robot.ps1 (PowerShell)
            ├── Sobe HttpListener em http://localhost:9999
            ├── A cada 30s: GET na FIFA API (api.fifa.com/api/v3/calendar/matches?idCompetition=17&idSeason=285023)
            ├── Mapeia código FIFA (3 letras) → nome português via hashtable
            ├── Casala com GAMES do HTML por nome do time
            └── Serve /livescores → JSON { "1": {"a":2,"b":0}, "2": ... }

copa2026.html (no navegador)
    └── Polling automático a cada 10s:
            fetch("http://localhost:9999/livescores")
            → mescla em scores[id]
            → saveState()
            → re-renderiza se mudou
```

### Endpoints do robot.ps1
| Rota | Retorno |
|------|---------|
| `GET /` | HTML do app |
| `GET /livescores` | JSON `{gameId: {a, b}}` |
| `GET /fifa-raw` | Dados crus da FIFA (debug) |

### FIFA API
- URL: `https://api.fifa.com/api/v3/calendar/matches?idCompetition=17&idSeason=285023&count=200`
- Gratuita, sem autenticação, CORS: `Access-Control-Allow-Origin: *`
- 104 jogos da Copa 2026
- `HomeTeamScore` / `AwayTeamScore` = null até o jogo começar, depois vira número

### Mapeamento de times (48)
FIFA usa código 3 letras (MEX, RSA, BRA...). robot.ps1 tem hashtable `$teamMap` com todos os 48. Casamento é feito por nome completo (português) entre FIFA traduzido e GAMES do HTML.

## Status Atual do Site
- **Repositório**: `github.com/LFGobbo/Copa2026` (master)
- **GitHub Pages**: ATIVADO em `https://lfgobbo.github.io/Copa2026/`
- **FIFA API**: Fetch direto do navegador com CORS aberto (`Access-Control-Allow-Origin: *`). Timeout 10s (manual) / 8s (polling).
- **Robô alternativo**: `robot.ps1` + `Iniciar Copa.bat` existem como fallback, mas não são mais necessários para o site.
- **Placares ao vivo**: Funcionam apenas durante jogos reais (HomeTeamScore/AwayTeamScore = null até o jogo começar).
- **Squads**: 1248 jogadores (48×26), dados da Wikipedia com números, clubes e países.

## Armadilhas Conhecidas (Critical Context)
- `ConvertTo-Json` no PS 5.1 duplo-encode UTF-8 (ex: "Á" → "Ã\x81"). Solução: construir JSON manualmente com `.Replace()` e escrever via `[System.IO.StreamWriter]` com `UTF8Encoding($false)`.
- `Add-Content -Encoding UTF8` adiciona BOM no PS 5.1 → usar `[System.IO.StreamWriter]`.
- **Broadcast separator**: dado usa `·` (middle dot U+00B7), NÃO `•` (bullet U+2022). Split regex deve ser `\u00b7`, não `\u2022` ou caracter literal (que vira U+FFFD por corrupção de encoding).
- Formato de gol: `goals[gameId][teamSide] = [{key, player, pname, type, minute, assist, aname}]`. Gol contra atualmente armazenado no time cujo botão foi clicado (não no time adversário) — a exibição v4 corrige isso movendo na renderização.
- Gols automáticos: `auto: true` nos objetos criados pela timeline API. Dedup por `EventId` + `PROCESSED_EVENTS[IdMatch]`.
- **FIFA Timeline API**: `/api/v3/timelines/{IdMatch}` — retorna eventos com `Type: 0 (gol), 1 (assistência), 41 (pênalti), 2 (amarelo), 5 (substituição)`. Campos: `MatchMinute, IdPlayer, IdTeam, HomeGoals, AwayGoals, EventDescription`.
- **FIFA Squad API**: `/api/v3/teams/{IdTeam}/squad?idCompetition=17&idSeason=285023` — retorna `Players[{IdPlayer, PlayerName, JerseyNum, Position}]`. Mapeamento para nossos jogadores por time + número da camisa.
- **Team IDs**: Extraídos do campo `Home.IdTeam`/`Away.IdTeam` na resposta do calendário. 48 times, IDs fixos para o torneio.
- Artilharia agrega todos `goals[gameId][teamSide]` — v4 filtra `type==="own"`.
- **0x0 não apagava**: corrigido (parseInt("")→NaN→0). Agora input vazio → deleta entry.
- **Botões de gol**: renderizados sempre no DOM com `style.display` condicional. `scoreInput()` toggla display via `canAddGoal()`.
- **Polling**: IIFE no final do HTML, `fetch /livescores` a cada 10s. Se robô desligado, falha silenciosa (não afeta uso manual).

## Pendências

### Pendências atuais
(nenhuma — todas resolvidas)

### Itens resolvidos nesta sessão (v11 + v11.5)
- ~~Convocados sem filtro~~ ✅ barra de busca com filtro em tempo real (país + jogador)
- ~~Ordem aleatória dos jogadores~~ ✅ ordem alfabética A-Z dentro de cada time
- ~~382 jogadores sem foto~~ ✅ fallback automático via FIFA digitalhub (`PlayerPicture.PictureUrl`)
- ~~Juan Foyth #2~~ ✅ substituído por Leonardo Balerdi (Marseille)
- ~~205 clubes com país "Outro"~~ ✅ todos mapeados (328 entries corrigidas)
- ~~Google Fonts dependente de rede~~ ✅ Inter font embedada como base64/data-uri (64KB, latin subset, weights 400-700)
- ~~Sem cache offline~~ ✅ Service Worker (`sw.js`) registrado, cacheia HTML + assets locais

### Itens resolvidos na sessão anterior (v9)
- ~~Squads incompletos~~ ✅ todos os 48 times com 26 convocados oficiais
- ~~Numeração errada~~ ✅ números reais da camisa
- ~~Avatar com iniciais~~ ✅ revertido para placeholder vazio
- ~~JSON corrompido~~ ✅ corrigido com contagem de chaves
- ~~Sem minuto no gol~~ ✅ campo minute adicionado
- ~~Regras desatualizadas~~ ✅ seção reescrita com regras 2026
- ~~Sem AO VIVO na contagem~~ ✅ countdown mostra AO VIVO durante jogos
- ~~Foto quebrada sem fallback~~ ✅ onerror adicionado

### Itens resolvidos na sessão anterior (v8)
- ~~Caminhos absolutos de imagens~~ ✅ mudado para relativo (`./bola_t.png`)
- ~~Polling do robot.ps1~~ ✅ substituído por fetch direto na FIFA API
- ~~Timezone de jogos (pós-meia-noite)~~ ✅ `gameUTC()` + `STADIUM_TZ` com 16 estádios
- ~~Bracket mostrava "0"~~ ✅ `tn()/tf()` substituem por "3º lugar"
- ~~Backups velhos no repo~~ ✅ removidos do Git
- ~~Sem timeout no fetch~~ ✅ AbortController com 10s/8s
- ~~Sem feedback visual no refresh~~ ✅ mostra ⏳/⚠/⟳ dinamicamente

## Como compartilhar com amigos
- **Com robô**: mandar a pasta inteira (`copa2026.html` + `robot.ps1` + `Iniciar Copa.bat` + logos). Amigo dá duplo clique no `.bat`.
- **Sem robô (só placar manual)**: mandar só `copa2026.html`. Abre no navegador direto, funciona 100% offline, placar é digitado manualmente.

## Arquivos Relevantes (2026-06-11)
- `copa2026.html` — app final (v11, o que vai no WhatsApp)
- `copa2026_v7.html` — backup v7
- `copa2026_v6.html` — backup v6
- `copa2026_v5.html`, `v4`, `v3`, `v2`, `v2_semiestrutura`, `v1` — backups históricos
- `copa2026.html` — **arquivo ativo de edição** (editar este, depois copiar para index.html)
- `robot.ps1` — servidor HTTP + proxy FIFA (NÃO TESTADO)
- `Iniciar Copa.bat` — atalho para robot.ps1
- `logo_globo.png`, `logo_sportv.png`, `logo_cazetv.png`, `logo_sbt.png`, `logo_nsports.png` — logos broadcast
- `$env:USERPROFILE\Downloads\bola_t.png`, `mascote1_t.png`, `mascote2_t.png`, `mascote3_t.png` — assets visuais
- `$env:USERPROFILE\Downloads\Copa_2026_Completa.xlsx` — dados fonte (Excel)
- `$env:TEMP\_games_v3.json`, `_groups_v3.json`, `_players_v3.json` — dados extraídos
- `PROGRESSO.md` — log do projeto
- `AGENTS.md` — documentação mestra (este arquivo)
