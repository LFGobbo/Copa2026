# Levantamento Técnico Completo — Copa do Mundo 2026 App
**Data:** 2026-06-12 | **Arquivo analisado:** index.html (173KB) | **Versão:** v15  
**Metodologia:** análise estática linha a linha de HTML, CSS (89KB), JS (77KB), players.json (113KB), photos.json (169KB), sw.js

---

## Sumário executivo

O app está funcional e tecnicamente bem estruturado para um projeto single-file sem build tools. A arquitetura é coerente e as escolhas de trade-off (inline vs externo, polling vs WebSocket) são defensáveis. A análise identificou **4 bugs ativos**, **11 oportunidades de melhoria de qualidade**, **6 melhorias de UX/visual** e **4 itens de manutenibilidade**. Nenhum é bloqueante imediato — o app funciona durante a Copa. A priorização abaixo é por impacto real, não por complexidade de implementação.

---

## 1. Estado atual — o que funciona bem

| Área | Status |
|---|---|
| Dados dos 104 jogos, 12 grupos, 48 times | Corretos e consistentes |
| Placares ao vivo via FIFA API + polling 10s/60s adaptativo | Funcional |
| Gols + cartões via Timeline API (auto e manual) | Funcional |
| Bracket com propagação automática (`resolveTeam`) | Funcional |
| Classificação grupos com H2H completo | Funcional |
| Ranking de 3ºs colocados | Funcional |
| Artilheiros + assistências | Funcional |
| Árbitros via Wikipedia (scraping live) | Funcional, mas custoso |
| Service Worker v15 (stale-while-revalidate) | Funcional |
| Virtualização de convocados (IntersectionObserver) | Funcional (corrigido) |
| JSON externos (players + photos) | Funcional |

---

## 2. Bugs ativos

### BUG-01 — Árbitros re-fetched 12× a cada reload, sem cache
**Severidade:** Média  
**Onde:** `function loadAllReferees()` + `function _fetchWikiRefs()`

```js
function loadAllReferees(){
  GROUP_ORDER.forEach(function(l){
    setTimeout(function(){_fetchWikiRefs(l)}, 600 * GROUP_ORDER.indexOf(l))
  })
}
```

`loadAllReferees()` é chamado incondicionalmente na inicialização. Não verifica `localStorage`. Resultado: 12 requests HTTP ao Wikipedia (espaçados 600ms cada = 6,6 segundos totais), ~150KB de HTML por grupo, ~1,8MB de dados baixados a cada reload, sem nenhuma persistência. Se o Wikipedia estiver lento ou offline, `REFEREES` fica vazio e nenhum árbitro aparece.

**Impacto:** Lentidão de 6,6s na atualização dos cards de jogos (renderGames é chamado 12× ao final de cada fetch). Sem offline graceful.

**Fix:**
```js
function loadAllReferees(){
  var CACHE='copa2026_refs', TTL=6*3600*1000; // 6 horas
  try {
    var c = JSON.parse(localStorage.getItem(CACHE) || 'null');
    if(c && c.ts && Date.now()-c.ts < TTL && c.data){
      Object.assign(REFEREES, c.data);
      renderGames(currentFilter);
      return;
    }
  } catch(e){}
  var pending = GROUP_ORDER.length;
  function onDone(){
    if(--pending === 0 && Object.keys(REFEREES).length > 0){
      try { localStorage.setItem(CACHE, JSON.stringify({ts:Date.now(), data:REFEREES})); } catch(e){}
    }
  }
  GROUP_ORDER.forEach(function(l){
    setTimeout(function(){ _fetchWikiRefs(l, onDone); }, 600*GROUP_ORDER.indexOf(l));
  });
}
```
`_fetchWikiRefs` precisa aceitar um callback `cb` e chamá-lo no `.then()` e no `.catch()`.

---

### BUG-02 — Tab restore via `location.hash` sem whitelist
**Severidade:** Baixa (não é RCE, mas quebra navegação)  
**Onde:** bloco de inicialização no final do script

```js
var saved = window.location.hash.replace('#','') || localStorage.getItem('copa2026_tab');
var tab = document.querySelector('.tab[data-tab="' + saved + '"]');
```

`saved` vem direto de `location.hash` sem sanitização e é concatenado num seletor CSS. Uma URL como `index.html#jogos"]); alert(1)//` não executa JS (querySelector não avalia código), mas pode lançar `DOMException: SyntaxError` e impedir o restore da tab. Além disso, `photoCoverage()` é chamada incondicionalmente — função de diagnóstico em produção.

**Fix:**
```js
var VALID_TABS = ['jogos','grupos','mata-mata','artilheiros','convocados','regras'];
var saved = window.location.hash.replace('#','') || localStorage.getItem('copa2026_tab');
if(saved && VALID_TABS.indexOf(saved) >= 0){
  var tab = document.querySelector('.tab[data-tab="'+saved+'"]');
  if(tab) tab.click();
}
```

---

### BUG-03 — Broadcasts dos jogos 101–104 com separador sem espaços
**Severidade:** Cosmética  
**Onde:** `const GAMES`, jogos #101–#104

Os jogos `'Globo·SporTV·CazéTV·SBT·N Sports'` (sem espaços ao redor de `·`) enquanto todos os outros usam `'Globo · SporTV · CazéTV · SBT'` (com espaços). Padronizar.

---

### BUG-04 — `_winnerOf()` retorna `null` em empates do mata-mata
**Severidade:** Alta (impacta bracket pós-oitavas)  
**Onde:** `function _winnerOf(gameNum)`

```js
function _winnerOf(gameNum){
  if(s.a > s.b) return g.a;
  if(s.b > s.a) return g.b;
  return null; // empate — pênaltis não registrados
}
```

No mata-mata, empates vão para prorrogação e pênaltis. O app registra o placar do jogo (ex: 1×1) mas não tem campo para registrar o resultado dos pênaltis. Se o jogo terminar 1×1, `_winnerOf` retorna `null` e o bracket não avança.

**Fix:** Adicionar campo `pen` ao objeto de scores + botões de pênalti na UI do game card para jogos KO.

---

## 3. Dívida técnica — qualidade de código

### DT-01 — `renderThirdPlaced` duplica completamente `_groupStandings`
### DT-02 — `renderGoalBadge` declarada mas nunca chamada
### DT-03 — `photoCoverage()` rodando em produção a cada load
### DT-04 — `renderGroups` duplica cálculo que já está em `_groupStandings`
### DT-05 — 14 ocorrências de `parseInt()` sem radix
### DT-06 — CSS com 32 seletores duplicados
### DT-07 — `console.log` em produção (tab restore)
### DT-08 — Broadcasts mutados em runtime (GAMES.forEach na inicialização)

---

## 4. Melhorias de UX e visual

### UX-01 — Pênaltis: campo faltando nos placares do mata-mata
### UX-02 — Indicador visual de jogador pendurado/suspenso
### UX-03 — Filtro de jogos não tem "Mata-Mata"
### UX-04 — Countdown com texto hardcoded "Brasil campeão! 🥇"
### UX-05 — `renderGames` renderiza 104 cards de uma vez sem virtualização
### UX-06 — Bracket cards view: sem indicador de qual time é casa/fora

---

## 5. Performance

### PERF-01 — Imagens não otimizadas: 1,5MB em PNGs
### PERF-02 — Fonte Inter embutida como base64: 62KB no CSS
### PERF-03 — `setInterval(updateCountdown, 1000)` sem cleanup
### PERF-04 — `photos.json` cobertura em 76.4% (294 jogadores sem foto)

---

## 6. Acessibilidade

### ACESS-01 — Zero atributos ARIA no app inteiro
### ACESS-02 — Mascotes sem alt text
### ACESS-03 — Focus visible não abrange todos os elementos interativos

---

## 7. Segurança

### SEG-01 — Hash restore sem whitelist (tab restore)
### SEG-02 — Ausência de Content Security Policy
### SEG-03 — `eval()` ausente, sem injeção de código externo

---

## 8. Manutenibilidade

### MANT-01 — `copa2026.html` e `index.html` desincronizados
### MANT-02 — Três implementações do algoritmo de classificação de grupos
### MANT-03 — Script de 77KB em um único bloco sem separação lógica
### MANT-04 — `Iniciar Copa.bat` aponta para `robot.ps1` inexistente

---

## 9. Plano de execução — priorizado por impacto

### Fase 1 — Antes das Oitavas de Final (~29 de junho) [URGENTE]

| ID | O que fazer | Arquivo | Esforço | Risco |
|---|---|---|---|---|
| BUG-04 | Adicionar campo pênaltis nos placares do mata-mata | index.html | 2h | Médio |
| UX-03 | Adicionar filtro "Mata-Mata" nos botões de filtro | index.html | 15min | Baixo |
| BUG-01 | Cache de árbitros em localStorage (TTL 6h) | index.html | 45min | Baixo |

### Fase 2 — Esta semana

| ID | O que fazer | Arquivo | Esforço | Risco |
|---|---|---|---|---|
| BUG-02 | Whitelist VALID_TABS no hash restore | index.html | 10min | Mínimo |
| BUG-03 | Padronizar broadcasts jogos 101–104 | index.html | 5min | Mínimo |
| DT-02 | Remover `renderGoalBadge` (dead code) | index.html | 2min | Mínimo |
| DT-03 | Remover `photoCoverage()` da inicialização | index.html | 2min | Mínimo |
| DT-07 | Remover `console.log` de debug do tab restore | index.html | 2min | Mínimo |
| DT-05 | Adicionar radix 10 em 14 `parseInt()` | index.html | 5min | Mínimo |
| DT-08 | Mover Globoplay/Ge TV para os dados GAMES diretamente | index.html | 10min | Baixo |
| MANT-01 | Script de hook para sincronizar copa2026.html | .git/hooks | 5min | Mínimo |
| MANT-04 | Corrigir ou remover `Iniciar Copa.bat` | .bat | 5min | Mínimo |

### Fase 3 — Próximas 2 semanas

| ID | O que fazer | Arquivo | Esforço | Risco |
|---|---|---|---|---|
| UX-02 | Indicador suspenso/pendurado nos cards | index.html | 3h | Médio |
| DT-01 | Refatorar `renderThirdPlaced` → usa `_groupStandings` | index.html | 45min | Médio |
| DT-04 | Refatorar `renderGroups` → usa `_groupStandings` | index.html | 1h | Médio |
| UX-04 | Corrigir "Brasil campeão!" hardcoded | index.html | 10min | Baixo |
| UX-06 | Badge de mandante no bracket | index.html | 20min | Baixo |
| ACESS-01 | ARIA mínimo (tabs, inputs, popup) | index.html | 1h | Baixo |
| ACESS-02 | alt="" nos mascotes | index.html | 2min | Mínimo |
| ACESS-03 | :focus-visible nos componentes interativos | index.html | 15min | Mínimo |
| DT-06 | Consolidar CSS duplicado (32 seletores) | index.html | 1h | Baixo |
| PERF-01 | Recomprimir PNGs com pngquant | assets | 30min | Mínimo |
| PERF-03 | setTimeout recursivo no countdown (em vez de setInterval) | index.html | 15min | Baixo |
| MANT-02/03 | Unificar algoritmo de classificação + comentários de seção | index.html | 2h | Médio |

---

## 10. Especificações técnicas para BUG-04 (pênaltis) — o mais urgente

**Quando acontece:** Oitavas, Quartas, Semis, Final — qualquer jogo que terminar empatado no tempo normal.

**Dados:** adicionar campo `pen` em `scores`:
```js
scores[gameId] = {a: 1, b: 1, pen: 'a'} // 'a' = time da casa venceu
```
`saveState()` já persiste `scores` — zero migração necessária.

**UI no renderGameCard (para jogos KO com empate):**
```js
var isKO = !g.f.startsWith('Grupo');
var isTied = hasScore && sa == sb;
if(isKO && isTied){
  var penA = s.pen === 'a', penB = s.pen === 'b';
  html += '<div class="pen-result">'
    + '<button class="pen-btn '+(penA?'active':'')+'" onclick="setPen('+gn+',\'a\')">'
    + flag(g.a)+' Venceu nos pênaltis</button>'
    + '<button class="pen-btn '+(penB?'active':'')+'" onclick="setPen('+gn+',\'b\')">'
    + flag(g.b)+' Venceu nos pênaltis</button>'
    + '</div>';
}
```

**Função `setPen`:**
```js
function setPen(id, side){
  if(!scores[id]) scores[id] = {};
  scores[id].pen = (scores[id].pen === side) ? null : side;
  saveState(); renderGames(currentFilter); renderBracket();
}
```

**`_winnerOf` atualizado:**
```js
function _winnerOf(gameNum){
  var g = GAMES.find(function(x){return x.n===gameNum;}); if(!g) return null;
  var s = scores[gameNum]; if(!s || s.a===undefined || s.b===undefined) return null;
  if(s.a > s.b) return g.a;
  if(s.b > s.a) return g.b;
  if(s.pen === 'a') return g.a;
  if(s.pen === 'b') return g.b;
  return null;
}
```

---

## 11. O que não mudar

- Estrutura do `localStorage` (`copa2026_data`) — usuários têm dados salvos
- Formato dos objetos `goals[]` e `cards[]` — compatibilidade retroativa
- FIFA API URL (`idCompetition=17&idSeason=285023`)
- Mecanismo de polling (10s/60s adaptativo)
- dynRender onde funciona corretamente
- Virtualização de convocados (IntersectionObserver)

---

## 12. Resumo de métricas

| Métrica | Valor atual | Meta |
|---|---|---|
| HTML | 173KB | 173KB (manter) |
| CSS | 89KB | ~70KB (consolidar duplicados) |
| JS | 77KB | ~72KB (remover dead code) |
| Assets PNG | 1.503KB | ~275KB (pngquant) |
| players.json | 113KB | 113KB |
| photos.json | 169KB | 169KB |
| Cobertura de fotos | 76.4% | 90%+ |
| Bugs ativos | 4 | 0 |
| Funções duplicando lógica | 3 | 1 |
| `console.log` em produção | 3+ | 0 |
| Seletores CSS duplicados | 32 | 0 |
| ARIA attributes | 0 | ~15 mínimo |
