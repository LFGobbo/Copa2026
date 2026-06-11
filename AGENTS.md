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
**2026-06-11 — Sessão GitHub Pages (fetch direto FIFA API + site hospedado)**

## Objetivo
App HTML autossuficiente para acompanhar partidas, grupos, mata-mata, artilheiros, convocados e regras da Copa do Mundo 2026. Compartilhável via WhatsApp, com persistência em localStorage.

## Restrições
- HTML único, sem build tools, sem Node.js/Python
- Windows PowerShell 5.1 para extração de dados do Excel e robô de placares
- Dados de `Copa_2026_Completa.xlsx` (3 sheets: Jogos, Grupos & Chaveamento, _Dados)

## Versões

### v7 (atual — 2026-06-10)
**Mudanças:**
- **0x0 não apagava** — `scoreInput()`: antes `v=parseInt(this.value)||0;` (parseInt("")→NaN→0, zero voltava). Agora se input vazio, deleta o score entry.
- **Botões de gol sempre no DOM** — `renderGameCard()`: agora renderiza os botões `+Gol` sempre com `style.display` condicional, em vez de omiti-los do HTML quando `hasScore===false`.
- **Own goal storage fix** (importado da v1.1) — `confirmGoal()`: calcula `storeTeam = (type==='own') ? adversario : currentTeam`. Gol contra é salvo no time adversário, resolvendo a pendência #3.
- **NaN guard no polling/refresh** (importado da v1.1) — refresh button e polling agora fazem `parseInt()` + `isNaN()` antes de mesclar, evitando NaN na estrutura `scores`.
- **Botão refresh (⟳)** no countdown-bar — fetch manual em `/livescores` com feedback visual (gira, fica vermelho se falhar).
- **Polling automático** — IIFE que fetch `/livescores` a cada 10s, mescla, `saveState()`, re-renderiza se mudou.
- **robot.ps1** criado mas **HttpListener não respondeu** nos testes (firewall/permissão — pendência #1).
- **Iniciar Copa.bat** — duplo clique que chama robot.ps1 com ExecutionPolicy Bypass.
- Salvou `copa2026_v7.html` + sobrescreveu `copa2026.html`

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

## Status Atual do Robô
- **Script criado**: robot.ps1 (completo, com polling, mapeamento, servidor HTTP)
- **Iniciador criado**: Iniciar Copa.bat
- **Teste**: HttpListener não respondeu. Hipóteses:
  1. Firewall do Windows bloqueando a porta
  2. HttpListener precisa de permissão elevada em algumas configs
  3. Algo no PS 5.1 impedindo o listener de aceitar conexões
  4. Porta 9999 já em uso
- **Para testar amanhã**: Executar PowerShell como Admin, testar com `Test-NetConnection localhost:9999`, verificar `Get-NetTCPConnection`, ou tentar porta diferente (ex: 8080)

## Armadilhas Conhecidas (Critical Context)
- `ConvertTo-Json` no PS 5.1 duplo-encode UTF-8 (ex: "Á" → "Ã\x81"). Solução: construir JSON manualmente com `.Replace()` e escrever via `[System.IO.StreamWriter]` com `UTF8Encoding($false)`.
- `Add-Content -Encoding UTF8` adiciona BOM no PS 5.1 → usar `[System.IO.StreamWriter]`.
- **Broadcast separator**: dado usa `·` (middle dot U+00B7), NÃO `•` (bullet U+2022). Split regex deve ser `\u00b7`, não `\u2022` ou caracter literal (que vira U+FFFD por corrupção de encoding).
- Formato de gol: `goals[gameId][teamSide] = [{key, player, pname, type, assist, aname}]`. Gol contra atualmente armazenado no time cujo botão foi clicado (não no time adversário) — a exibição v4 corrige isso movendo na renderização.
- Artilharia agrega todos `goals[gameId][teamSide]` — v4 filtra `type==="own"`.
- **0x0 não apagava**: corrigido (parseInt("")→NaN→0). Agora input vazio → deleta entry.
- **Botões de gol**: renderizados sempre no DOM com `style.display` condicional. `scoreInput()` toggla display via `canAddGoal()`.
- **Polling**: IIFE no final do HTML, `fetch /livescores` a cada 10s. Se robô desligado, falha silenciosa (não afeta uso manual).

## Pendências (amanhã - ordem sugerida)

### Alta prioridade
1. **Debug robot.ps1** — HttpListener não conecta. Testar como Admin, firewall (`New-NetFirewallRule`), porta alternativa (8080), ou trocar abordagem (ex: `netcat`/`python -m http.server` se disponível).
2. **Dados do mata-mata corrompidos** — 8 jogos (#74,77,79,80,81,82,85,87) têm `b:"0"` no GAMES. O time B é literalmente "0". Veio do Excel com célula vazia → zero no PS. Precisa reextrair ou corrigir manualmente no JSON.
3. **Auditar removeGoal + own goal** — Claude alertou que após o fix do own goal, `removeGoal` pode receber `team` errado. **Análise prévia**: `gl.team` é salvo como `storeTeam` no `confirmGoal`, e `renderGoalBadge` usa `gl.team||st||team`. Parece correto, mas verificar com dados reais de own goal no localStorage.

### Média prioridade
4. **Contagem regressiva errada para jogos pós-meia-noite** — Jogo #5 (Turquia x Austrália) 13/06 01:00. O código trata como 01h do dia 13, mas é madrugada do dia 14 no Brasil. Afeta detecção "ao vivo" e "próximo jogo". Precisa tratar horário como UTC-3 ou verificar fuso por jogo.
5. **Imagens dos mascotes com caminho absoluto** — `C:\Users\Gobbo\Downloads\...` não existe em outro PC. Embedar base64 no HTML ou usar caminho relativo.

### Baixa prioridade
6. **localStorage conflito robô vs manual** — Polling sobrescreve `scores[id]` sem checar se usuário editou manualmente.
7. **Mascotes com caminho absoluto** — embedar base64 ou caminho relativo.
8. **Google Fonts offline** — cai para system-ui. Aceitável, mas poderia embedar.

### Itens resolvidos nesta sessão
- ~~0x0 não apagava~~ ✅ corrigido
- ~~Botões de gol sumiam~~ ✅ renderizados sempre no DOM
- ~~Own goal storage~~ ✅ `confirmGoal` agora salva no time adversário via `storeTeam`
- ~~NaN guard no polling/refresh~~ ✅ `parseInt` + `isNaN` antes de merge
- ~~Janela "ao vivo" 2h~~ ✅ aumentada para 3h (10800000ms)
- ~~renderThirdPlaced V/E/D quebrado~~ ✅ agora acumula `w/d/l` igual `renderGroups`
- ~~Documentação AGENTS.md~~ ✅ atualizada com todos os itens

## Como compartilhar com amigos
- **Com robô**: mandar a pasta inteira (`copa2026.html` + `robot.ps1` + `Iniciar Copa.bat` + logos). Amigo dá duplo clique no `.bat`.
- **Sem robô (só placar manual)**: mandar só `copa2026.html`. Abre no navegador direto, funciona 100% offline, placar é digitado manualmente.

## Arquivos Relevantes (2026-06-10)
- `copa2026.html` — app final (v7, o que vai no WhatsApp)
- `copa2026_v7.html` — backup v7
- `copa2026_v6.html` — backup v6
- `copa2026_v5.html`, `v4`, `v3`, `v2`, `v2_semiestrutura`, `v1` — backups históricos
- `copa2026_v3.html` — **arquivo ativo de edição** (sempre editar este, depois copiar para copa2026.html)
- `robot.ps1` — servidor HTTP + proxy FIFA (NÃO TESTADO)
- `Iniciar Copa.bat` — atalho para robot.ps1
- `logo_globo.png`, `logo_sportv.png`, `logo_cazetv.png`, `logo_sbt.png`, `logo_nsports.png` — logos broadcast
- `$env:USERPROFILE\Downloads\bola_t.png`, `mascote1_t.png`, `mascote2_t.png`, `mascote3_t.png` — assets visuais
- `$env:USERPROFILE\Downloads\Copa_2026_Completa.xlsx` — dados fonte (Excel)
- `$env:TEMP\_games_v3.json`, `_groups_v3.json`, `_players_v3.json` — dados extraídos
- `PROGRESSO.md` — log do projeto
- `AGENTS.md` — documentação mestra (este arquivo)
