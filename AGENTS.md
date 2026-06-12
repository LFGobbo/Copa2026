# 🚨 REGRA OBRIGATÓRIA: DOCUMENTAÇÃO CONTÍNUA

Sempre que editar qualquer arquivo do projeto (HTML, JS, CSS, SW, config), ATUALIZE IMEDIATAMENTE este arquivo:
1. Na seção da versão atual (vXX.XX), adicione o que mudou, onde e por quê
2. Na seção Pendências, mova o item de "pendente" para "resolvido" se aplicável
3. Na seção Última atualização, atualize a data
4. Na seção Arquivos Relevantes, atualize se necessário

Nunca termine uma sessão sem o AGENTS.md refletir exatamente o estado atual do projeto.

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
**2026-06-11 — Sessão v13 (árbitro funcional, ordem cronológica, flickering resolvido, regras de suspensão)**

## Objetivo
App HTML autossuficiente para acompanhar partidas, grupos, mata-mata, artilheiros, convocados e regras da Copa do Mundo 2026. Compartilhável via WhatsApp, com persistência em localStorage.

## Restrições
- HTML principal (~170KB) com dados essenciais inline (GAMES, GROUPS); dados pesados (PLAYERS, PLAYER_PHOTOS) em JSON externo
- Zero build tools, sem Node.js/Python — HTML puro + JSON + SW
- Dados de `Copa_2026_Completa.xlsx` (3 sheets: Jogos, Grupos & Chaveamento, _Dados)

## Versões

### v13 (atual — 2026-06-11)
**Mudanças:**
- **Árbitro funcional** — Wikipedia scraper trocado de `action=query&prop=extracts` (que NÃO retorna dados de infobox) para `action=parse` (HTML completo). Regex ajustado para `<a>Nome</a> (<a>País</a>)`. Agora exibe corretamente o árbitro no card do jogo
- **Ordem cronológica gols+cartões** — `renderGameCard()` merge goals e cards em único array `events`, ordenado por minuto
- **Flickering resolvido** — CSS `.dyn-content` com `opacity:0` + `body.render-ready` evita flash inicial. Re-renders usam `requestAnimationFrame` para fade-out/in suave
- **Regras de cartões/suspensões** — nova seção na aba Regras explicando: 2 amarelos = suspensão, pendurado (1 amarelo), vermelho direto, zeragem após quartas de final
- **Botão remover cartão removido** — cartões agora são apenas automáticos (via timeline API), sem botão × para remover (economiza espaço)

### v12 (2026-06-11)
**Mudanças:**
- **JSON externo** — PLAYERS (48 times, 1248 jogadores) e PLAYER_PHOTOS (951 fotos) extraídos para `players.json` (116KB) e `photos.json` (174KB). HTML caiu de 499KB para 170KB (−66%). Carregamento via XMLHttpRequest com graceful degradation
- **Virtualização com IntersectionObserver** — `renderSquads()` gera 1248 placeholders com shimmer, hidrata sob demanda com rootMargin 200px
- **Bracket com propagação automática** — `resolveTeam()` resolve `1°/2° Grupo X`, `V. Jogo N`, `Perd. Jogo N`, `0` (3º colocado). SVG 1050×640
- **SW reescrito (v12)** — STATIC (cache-first), DATA (stale-while-revalidate), HTML (network-first)
- **Ranking de assistências** — `renderScorers()` exibe gols e assistências lado a lado em flexbox
- **Bugfix: gameUTC BRT fixo** — horários no GAMES são Brasília (UTC-3), não fuso do estádio. `gameUTC()` usa offset fixo +3
- **Bugfix: placar via timeline** — calendário FIFA retorna `HomeTeamScore: null`. `processTimeline()` agora extrai placar final dos eventos (HomeGoals/AwayGoals cumulativos) e seta `scores[gameId]`
- **Bugfix: `forEach` aninhado** — `processTimeline()` faltava `});` entre loops de cartões e gols, impedia JS inteiro de executar
- **Cartões automáticos** — timeline API processa Type 2 (amarelo) e Type 3 (vermelho), exibe no game card
- **Horário Brasília** — cards exibem `HH:MM Brasília`
- **Meta tags OG** — og:title, og:description, og:image, og:url
- **Todas as correções da v11.10** mantidas (window.event, saveState try/catch, esc() XSS, polling backoff, tiebreakers H2H, etc)

### v11.10**
- **Correção grupos I/J** — dados de GAMES e GROUPS estavam com times trocados entre grupos I e J (Argentina, Argélia, Áustria, Jordânia no I; França, Iraque, Noruega, Senegal no J). Jogo #20 movido de G para I. 11 jogos afetados (#17-#72). Todas as tabelas de classificação agora estão corretas
- **window.event eliminado** — `setFilter()`, `selectPlayer()`, `selectAssist()`, `selectGoalType()` agora aceitam parâmetro `e` explícito. Funciona no Firefox/Safari (não dependem mais de `window.event` legado do Chrome)
- **saveState() com try/catch** — se localStorage estourar cota, não quebra mais a execução do app
- **isGameLive() com verificação MATCH_ENDED** — se a timeline API marcou o jogo como encerrado (Type 26), o badge AO VIVO desaparece mesmo dentro da janela de 3h
- **updateCountdown() reescrito** — mostra múltiplos jogos ao vivo simultaneamente (pipe separado). Após a abertura, mostra contagem regressiva para o próximo jogo com horário local
- **Horário local** — todos os cards de jogo exibem "(horário local)" após o horário
- **Match minute global replace** — `MatchMinute.replace(/'/g,"")` em vez de `replace("'","")` (só 1ª ocorrência)
- **SW cache assets corrigido** — `url.endsWith('./bola_t.png')` nunca funcionava (URL absoluta). Cache version bump v4→v11
- **<link preconnect> removido** — Google Fonts embedada, preconnect desnecessário
- **Race condition timers** — `tabClick` limpa `_rsTimer` antes de criar novos timeouts
- **alt text nas fotos** — 1248 imagens com `alt="Nome do Jogador"`
- **Critérios de desempate** — head-to-head completo nos grupos (6 critérios: pontos → GD → GF → H2H pontos → H2H GD → H2H GF). Goals scored como 3º critério nos 3º colocados
- **XSS escape** — `esc()` function aplicada em nomes de jogadores, times, e dados da API FIFA
- **Polling com backoff** — 10s com jogos ao vivo, 60s sem
- **Object.values polyfill** — compatibilidade com browsers antigos
- **console.error/warn** — adicionado em todos os catches silenciosos (timeline, squad, cache)
- **Meta tags OG** — og:title, og:description, og:image, og:url para compartilhamento WhatsApp
- **Refresh button** — feedback textual no countdown-next: ✓ atualizado / ⚠ erro / ℹ sem mudanças
- **Dead data limpo** — `sa`/`sb` do jogo #1 (México 1x0 África do Sul) nunca eram lidos, removidos
- **Cartões amarelo/vermelho (FEATURE)** — dados salvos em localStorage, processamento automático via timeline API (Type 2=amarelo, Type 3=vermelho), exibição no game card como badges coloridas, entrada manual via popup com toggle Gol/Cartão, botão "+Cartão" em cada time no card do jogo

### v11.9
**Mudanças:**
- **+86 novas fotos Wikipedia** — batch query da Wikipedia API para todos os 1248 artigos, encontrou 86 novas thumbnails (total: 951 fotos, 76% dos jogadores)
- **Flag fallback** — `avatar-fallback` div com bandeira do time como background para jogadores sem foto (opacity .35, grayscale)
- **photoCoverage() diagnostic** — mostra % de cobertura e top-5 times com mais faltantes no console

### v11.8
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
- **Repositório**: `github.com/LFGobbo/Copa2026` (master, v12)
- **GitHub Pages**: ATIVADO em `https://lfgobbo.github.io/Copa2026/`
- **FIFA API**: Fetch direto do navegador com CORS aberto (`Access-Control-Allow-Origin: *`). Timeout 10s (manual) / 8s (polling).
- **Robô alternativo**: `robot.ps1` não foi implementado. O app usa fetch direto na FIFA API com polling a cada 10s.
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
- ~~Grupos I/J com dados trocados~~ ✅ v11.10
- ~~window.event em 4 funções~~ ✅ v11.10
- ~~saveState sem try/catch~~ ✅ v11.10
- ~~SW cache assets quebrado~~ ✅ v11.10
- ~~AO VIVO falso positivo~~ ✅ v11.10
- ~~Critérios de desempate incompletos~~ ✅ v11.10
- ~~XSS sem escape~~ ✅ v11.10
- ~~Polling sem backoff~~ ✅ v11.10
- ~~Cartões amarelo/vermelho~~ ✅ v11.10
- ~~Meta tags OG~~ ✅ v11.10
- ~~Bracket com propagação automática~~ ✅ v12
- ~~Virtualização renderSquads~~ ✅ v12
- ~~Extrair dados para JSON externo~~ ✅ v12
- ~~Placar via timeline (não calendário)~~ ✅ v12
- ~~Artilheiros lado a lado~~ ✅ v12
- ~~gameUTC com fuso correto (BRT)~~ ✅ v12
- ~~Árbitro do Wikipedia~~ ✅ v13
- ~~Ordem cronológica gols+cartões~~ ✅ v13
- ~~Flickering na página~~ ✅ v13
- ~~Regras de cartões/suspensões~~ ✅ v13
- Transmissões TV (getv, globoplay, etc.) — hardcoded no campo `br` do GAMES. Esperando usuário informar dados atualizados
- Otimizar imagens pesadas (bola_t.png 477KB, mascotes 300KB+) com compressão
- `parseInt()` sem radix 10 em múltiplos locais (baixa prioridade)
- Hash change causa scroll indesejado em mobile
- Broadcast separator `·` corrompido em algumas entradas (ex: `Globo�SporTV�Caz�TV`) — possivelmente encoding issue
- Falta indicador visual de jogador pendurado/suspenso nos cards de jogo

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
- **Compartilhar**: mandar o link `https://lfgobbo.github.io/Copa2026/` ou o arquivo `copa2026.html`. Abre no navegador, funciona 100% offline (com Service Worker), placar pode ser digitado manualmente ou via FIFA API ao vivo.
- **Nota**: `robot.ps1` não foi implementado. O app usa fetch direto na FIFA API.

## Arquivos Relevantes (2026-06-11 v13)
- `index.html` — app principal (v13, deploy GitHub Pages, ~170KB)
- `players.json` — dados dos 1248 jogadores (116KB)
- `photos.json` — URLs das fotos dos jogadores (174KB)
- `copa2026.html` — cópia de index.html (mantido por compatibilidade)
- `Iniciar Copa.bat` — atalho para robot.ps1 (NÃO FUNCIONAL)
- `sw.js` — Service Worker v12 (cache-first assets, stale-while-revalidate JSONs, network-first HTML)
- `opencode.json` — configuração OpenCode (aponta para AGENTS.md)
- `.gitignore` — git ignore rules
- `logo_globo.png`, `logo_sportv.png`, `logo_cazetv.png`, `logo_sbt.png`, `logo_nsports.png` — logos broadcast
- `bola_t.png`, `mascote1_t.png`, `mascote2_t.png`, `mascote3_t.png` — assets visuais
- `AGENTS.md` — documentação mestra (este arquivo)
