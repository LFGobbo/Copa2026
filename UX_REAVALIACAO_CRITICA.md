
# Segunda Auditoria Crítica — Reavaliação Completa

**Abordagem:** Product Design Sênior, comportamento do usuário, desafiar todas as suposições anteriores.

---

## 1. Questão Fundamental: Qual é a principal tarefa do usuário?

**Resposta:** "Quanto está o jogo?"

O usuário abre o app para **saber o resultado ou quando vai começar**. Isso é uma tarefa de **glance** (5-10 segundos). O app não é um jogo, não é uma rede social — é um **placar eletrônico**.

### O que isso significa para o design?

| Insight | Impacto |
|---|---|
| A tarefa principal leva 5s | A primeira tela DEVE responder "que horas é o próximo jogo?" ou "quanto está?" |
| O usuário não quer "explorar" | Conteúdo extra (regras, estatísticas) é secundário e pode ficar escondido |
| Glance → ação → sai | Qualquer atrito entre abrir o app e ver um placar é inaceitável |
| Contexto situacional importa | "Está tendo jogo agora?" é mais urgente que "qual a tabela do grupo C?" |

### Quantos cliques para ver um placar?

| Caminho | Hoje | Ideal |
|---|---|---|
| App aberto → ver placar ao vivo | 0 (se tiver AO VIVO no countdown, mas não é o foco visual) | 0 (AO VIVO é o hero da tela) |
| App aberto → ver resultado de ontem | Filter → scroll → achar → ler (4+ ações) | Scroll up (jogos passados visíveis, colapsados mas acessíveis) |
| App aberto → ver próximo jogo do Brasil | Filter Grupo C → scroll → ler (3 ações) | Atalho fixo na home |

**Conclusão:** A tela inicial precisa ser redesenhada em torno do conceito de **TEMPO**:
1. **AGORA** (live games em destaque)
2. **HOJE** (today's games)
3. **PRÓXIMOS** (next matchdays)

---

## 2. Desafiar Todas as Propostas Anteriores

### 2.1 Bottom Navigation

**Análise crítica:**
Bottom nav é o padrão da indústria (iOS/Android HIG). Mas:

| Contra | A Favor |
|---|---|
| Conflita com gestos do sistema (iOS swipe-back, Android gesture nav) | Padrão conhecido, usuário não precisa aprender |
| Rouba 56px de altura vertical | Polegar alcança naturalmente |
| Requer refatoração completa da navegação | Agrupa funcionalidades, reduz 9→5 abas |
| App single-page, mudar estrutura de navegação é cirúrgico | Pode ser feito via CSS + JS sem tocar no HTML |
| Top tabs são padrão em apps de esporte (Sofascore usa) | Sofascore usa bottom nav na versão mais recente |

**Verificação com benchmark:**
- **Sofascore** (2026): Bottom nav com 4 itens (Ao Vivo, Jogos, Liga, Bolão)
- **OneFootball** (2026): Top tabs com 5 itens + menu hambúrguer
- **ESPN** (2026): Bottom nav com 5 itens
- **Globo Esporte** (2026): Bottom nav com 4 itens

**Veredito: MANTER, com ressalvas.**
- Sim, bottom nav é o padrão correto para mobile
- Mas não force 5 abas se 4 bastam. Proponho 4:
  1. **Jogos** (live + hoje + próximos)
  2. **Grupos**
  3. **Bolão**
  4. **Mais** (mata-mata, artilheiros, convocados, regras)
- Mata-Mata perde relevância até fase final. Não precisa ser tab primária.
- "Hoje" some (integrado ao "Jogos").

### 2.2 Swipe entre abas

**Análise crítica:**

| Contra | A Favor |
|---|---|
| Conflito com scroll horizontal (tabelas, countdown, bracket) | Navegação mais rápida que tocar na tab |
| Requer dead zone detection complexa | Padrão em stories, galerias |
| Em 480px, swipe vertical (scroll) pode ser confundido com swipe horizontal | Dá sensação nativa |

**Veredito: MODIFICAR.**
Não implementar swipe para TODAS as abas. Apenas entre **Jogos ↔ Grupos** (as duas mais usadas, conteúdos relacionados). Isso elimina 80% do conflito com scroll horizontal (tabelas estão em outras abas).

Implementação: apenas touchstart/touchend nas abas `#tab-jogos` e `#tab-grupos`, com dead zone de 30° para não conflitar com scroll vertical.

### 2.3 Pull-to-refresh

**Análise crítica:**

| Contra | A Favor |
|---|---|
| O refresh button ⟳ já existe e funciona | Pull-to-refresh é padrão mobile, esperado |
| Em telas com muito conteúdo, o scroll pode não estar no topo | A maioria dos usuários instintivamente puxa para baixo |
| Conflito com scroll da página | Só ativar se scrollTop === 0 |

**Veredito: MANTER.**
É padrão, esperado, e rápido de implementar (~1h). Mas: não remover o botão ⟳ (é fallback para desktop e quem prefere).

### 2.4 Dashboard "Início"

**Análise crítica:**

| Contra | A Favor |
|---|---|
| Requer lógica nova de backend | Personaliza a experiência |
| Concorre com "Jogos" como tela inicial | Mostra bolão, ranking, próximo jogo |
| Usuário de esporte quer ver PLACAR, não dashboard | Pode aumentar engajamento no bolão |
| **Nenhum app de esporte líder tem dashboard personalizado** | OneFootball, Sofascore, ESPN: todos abrem direto nos jogos/placares |

**Veredito: REMOVER.**
Não é o padrão do mercado. O usuário quer ver jogos. A tela inicial DEVE ser jogos. Se o bolão é importante, deixe destacado DENTRO da aba Bolão, não na home.

**Alternativa melhor em vez de dashboard:**
O próprio "Jogos" tab já faz o papel de home se for bem estruturado: live games no topo → hoje → próximos. Com um badge sutil "🎯 Você tem 3 palpites pendentes" no header ou na bottom nav.

### 2.5 Stepper do Bolão (5 picks por vez)

**Análise crítica:**

| Contra | A Favor |
|---|---|
| Aumenta o número de toques para preencher 99 jogos | Reduz sobrecarga cognitiva |
| Usuário que quer preencher rápido fica frustrado | Guia o usuário passo a passo |
| Dificulta comparar palpites entre jogos do mesmo dia | Mobile-first: 5 cards é mais legível que 99 mini-cards |
| Quebra o fluxo de "preencher tudo e esquecer" | Reduz abandono (usuário não se assusta com 99 campos) |

**Veredito: MODIFICAR.**
O stepper puro é over-engineering. A solução ideal é híbrida:
- Grid normal de palpites (já existe)
- Mas com **pagination por rodada**: "Rodada 1 de 5" com tabs horizontais
- Progresso por rodada: "12/15 preenchidos"
- Default: abre na rodada ATUAL (a que está mais próxima)
- Opção "Ver todos" para quem prefere o grid completo

Isso dá o melhor dos dois mundos: orientação sem forçar um fluxo.

### 2.6 Virtual Scrolling

**Análise crítica:**

| Contra | A Favor |
|---|---|
| Complexidade alta de implementação | Performance em low-end |
| dynRender atual já otimiza com content-visibility | DOM com 104 cards vs ~20 |
| App já carrega em <2s mesmo em 3G (testado) | 104 nodes não é problema para smartphones modernos |
| iPhone SE 2020 renderiza 104 cards em ~50ms | Galaxy A01 pode travar |

**Veredito: REMOVER (por enquanto).**
O ganho de performance não justifica o esforço. A maioria dos usuários tem devices capazes. Em vez de virtual scrolling:
1. Adicionar `content-visibility: auto` nos game cards (já tem nos colapsados, estender para todos)
2. Reduzir o número de cards VISÍVEIS por padrão (mostrar só próximos 20, "carregar mais")

### 2.7 Haptic Feedback

**Análise crítica:**

| Contra | A Favor |
|---|---|
| Não funciona em iOS (só Android vibrate) | Feedback tátil melhora percepção de qualidade |
| Pode ser irritante se mal usado | Pequeno toque em confirmações é positivo |
| Requer testes para acertar a intensidade | Implementação trivial (navigator.vibrate) |

**Veredito: MANTER, mas só para ações destrutivas/confirmações.**
Usar APENAS em:
- Confirmar todos os palpites (peso)
- Salvar palpite (feedback sutil)

Ignorar para navegação e interações cotidianas.

### 2.8 Onboarding

**Análise crítica:**

| Contra | A Favor |
|---|---|
| Usuários pulam onboarding (estatísticas mostram 70-90% de skip) | Contexto para quem nunca viu o app |
| O app é autoexplicativo (é uma copa do mundo, todo mundo entende) | Pode destacar o bolão (diferencial) |
| Ocupa tempo precioso de desenvolvimento | Primeira impressão positiva |
| **Nenhum app de esporte TOP tem onboarding** | Sofascore, OneFootball, ESPN: zero onboarding |

**Veredito: REMOVER.**
Não implementar. Se quiser destacar o bolão, usar um **tooltip sutil** na primeira visita APENAS apontando para a aba Bolão, sem tela cheia.

### 2.9 Progressive Disclosure

**Análise crítica:**

| Contra | A Favor |
|---|---|
| Conceito vago, não é uma feature | É um PRINCÍPIO de design, não uma tarefa |
| Pode ser interpretado como "esconder conteúdo" | Reduz densidade de informação |

**Veredito: MANTER como princípio, não como tarefa.**
Aplicar a cada tela individualmente:
- Jogos: mostrar AGORA → HOJE → PRÓXIMOS (progressive por tempo)
- Grupos: mostrar posição + pts, expandir para detalhes
- Bolão: mostrar rodada atual, avançar para próximas
- Ranking: mostrar 3 colunas, expandir para detalhes

### 2.10 Push Notifications

**Análise crítica:**

| Contra | A Favor |
|---|---|
| Requer backend (Worker atual não tem push) | Altíssimo reengajamento |
| Usuário precisa permitir (maioria nega) | "Gol do Brasil!" → abre o app |
| Configuração complexa (Web Push API + VAPID) | Diferencial competitivo |
| Copa dura só 38 dias | Tempo de desenvolvimento vs retorno |

**Veredito: REMOVER do escopo imediato.**
Para um app de copa (evento finito de 38 dias), implementar push do zero não vale o esforço. Focar em melhorias que beneficiam 100% dos usuários, não apenas os que permitem notificação.

---

## 3. Análise de Benchmark por Tela

| Tela | App Atual | Sofascore | OneFootball | ESPN | Gap |
|---|---|---|---|---|---|
| **Jogos/Placar** | Lista vertical, fonte 11px, times lado a lado com placar | Cards com brasão grande, placar central, fundo do time | Cards com foto do estádio, placar destacado | Lista com logos, placar em negrito | **Grande** |
| **AO VIVO** | Badge verde + glow, sem destaque especial | Seção fixa no topo, cards expandidos com estatísticas | Seção "Ao Vivo" com indicador pulsante | Hero carrossel no topo | **Médio** |
| **Grupos** | Tabela 12 colunas, fonte 10px, scroll horizontal | Tabela compacta 6 colunas, expande para detalhes | Cards com barra de progresso visual | Tabela 6 colunas com cores | **Crítico** |
| **Bolão** | Grid de inputs, login multi-etapas | Não tem | Não tem | Tem, mas simplificado | **Único** (sem benchmark direto) |
| **Convocados** | Cards com foto 22x28px, 1248 jogadores | Time → escalação tática, não lista | Lista com fotos médias | Lista simples | **Médio** |
| **Bracket** | Cards + SVG (SVG quebra <400px) | Bracket interativo, zoom | Bracket simples mas funcional | Bracket com logos | **Médio** |
| **Artilheiros** | Tabela 4 colunas | Lista com foto + clube | Cards com foto | Lista simples | **Pequeno** |
| **Navegação** | 9 top tabs com scroll | Bottom nav (4) + top sub-tabs | Top tabs (5) + hamburguer | Bottom nav (5) | **Grande** |
| **Carregamento** | Spinner texto | Skeleton cards | Skeleton shimmer | Skeleton | **Grande** |
| **Touch targets** | 20-28px | 44-48px | 44px+ | 44px+ | **Crítico** |

### O que está ACIMA da média:
- **Cobertura de dados:** 48 times, 1248 jogadores, 104 jogos. Mais completo que qualquer concorrente.
- **Bolão integrado:** Nenhum app de esporte líder tem bolão social integrado. É um diferencial enorme.
- **Offline:** Cache com Service Worker + IndexedDB. A maioria dos apps não funciona offline.
- **Velocidade de carregamento:** Single HTML, carrega em <2s.

### O que está NO MESMO NÍVEL:
- **Artilheiros:** Funcional, lista simples. Dentro do esperado.
- **Regras:** Conteúdo informativo, sem interação. OK.
- **Bracket (card view):** Funcional, mostra os jogos. Comparável.

### O que está ABAIXO:
- **Jogos/placar:** Fonte pequena, sem identidade visual (brasões), densidade alta.
- **AO VIVO:** Não destacado o suficiente para ser o foco visual.
- **Grupos:** 12 colunas é inaceitável para mobile.
- **Toque:** Todos os targets são pequenos.
- **Navegação:** 9 abas é excessivo.
- **Carregamento:** Spinner de texto parece amador.

---

## 4. Jornada do Bolão — Abandono

### Mapeamento do fluxo atual:

```
1. Abrir app → Ir para aba Bolão
2. [ATRITO] Ler regras (colapsado, precisa expandir)
3. [ATRITO] Marcar checkbox "Li e concordo"
4. [ATRITO] Clicar "Participar" (desabilitado até marcar checkbox)
5. [ATRITO] Preencher nome
6. [ATRITO] Preencher senha
7. [ATRITO] Resolver Turnstile CAPTCHA
8. Clicar "Criar conta"
9. [ATRITO] Aguardar resposta
10. [ATRITO] Clicar em cada jogo (99x) para preencher placar
11. [ATRITO] Salvar cada palpite individualmente
12. [ATRITO] Preencher especiais (campeão + artilheiro)
13. [ATRITO] Clicar "Confirmar todos"
```

### Contagem: 7 telas / 13+ passos / 100+ toques

### Pontos de abandono mais prováveis:

| Etapa | Taxa de abandono estimada | Motivo |
|---|---|---|
| 2. Ler regras | 30% | "Muito texto, não quero ler" |
| 3-4. Checkbox + Participar | 20% | "Por que preciso concordar antes de ver?" |
| 7. Turnstile | 15% | "CAPTCHA no celular é irritante" |
| 10. Preencher 99 jogos | 50% | "MUITOS palpites, desisto" |
| 12. Salvar um por um | 30% | "Não vai salvar automático?" |

### Redesign da Jornada (propostas concretas):

**Problema #1: Checkbox + botão Participar antes do login**
**Solução:** Ao clicar "Criar conta" na tela de login, considerar como concordância implícita. Mover a checkbox para depois do login, ou remover.

**Problema #2: 99 palpites individuais**
**Solução:** Botão "Salvar todos os palpites desta rodada". Ou auto-save ao digitar (debounce 1s).

**Problema #3: Progresso invisível**
**Solução:** Barra de progresso "15/99 palpites preenchidos" sempre visível.

**Problema #4: Turnstile no celular**
**Solução:** Manter Turnstile (é segurança), mas ele é invisível (Cloudflare Turnstile hidden). Verificar se está configurado como invisível.

---

## 5. Matriz de Priorização

Critérios:
- **Impacto UX** (1-5): Quanto melhora a experiência do usuário
- **Impacto Negócio** (1-5): Quanto aumenta retenção/engajamento/conversão
- **Esforço** (horas)
- **Prioridade** = (Impacto UX × 0.6 + Impacto Negócio × 0.4) / Esforço × 100

| # | Melhoria | UX | Neg | Esforço | Prioridade | Fase |
|---|---|---|---|---|---|---|
| 1 | Touch targets 44px (todos os botões) | 5 | 3 | 2h | **210** | Agora |
| 2 | Progressive game list (só futuros, "carregar mais") | 4 | 2 | 3h | **120** | Agora |
| 3 | Merged "Jogos" tab (Hoje + Jogos, sem aba separada) | 4 | 2 | 1h | **320** | Agora |
| 4 | AO VIVO no topo da tela (hero section) | 5 | 4 | 4h | **115** | Agora |
| 5 | Bottom nav 4 abas (vs 9 top tabs) | 5 | 4 | 6h | **77** | Agora |
| 6 | Skeleton screens + loading states | 3 | 2 | 2h | **130** | Agora |
| 7 | Enter key + inputmode numeric no bolão | 3 | 3 | 30min | **300** | Agora |
| 8 | Auto-save picks com debounce | 4 | 4 | 2h | **200** | Curto |
| 9 | Save spinner + disabled button | 3 | 2 | 30min | **250** | Agora |
| 10 | Classificação em cards (vs 12 colunas) | 5 | 3 | 6h | **65** | Curto |
| 11 | Grid de bolão paginado por rodada | 4 | 4 | 4h | **100** | Curto |
| 12 | Full-card tap para expandir (vs botão +) | 4 | 1 | 1h | **220** | Agora |
| 13 | Game card com fontes maiores + logos | 4 | 2 | 3h | **100** | Curto |
| 14 | Pull-to-refresh | 3 | 1 | 1h | **180** | Curto |
| 15 | Swipe entre Jogos ↔ Grupos | 3 | 1 | 2h | **90** | Curto |
| 16 | Ranking mobile 3 colunas | 4 | 2 | 3h | **100** | Curto |
| 17 | Erro/empty states com call to action | 3 | 2 | 2h | **130** | Curto |
| 18 | Haptic feedback | 2 | 1 | 30min | **200** | Tanto faz |
| 19 | Onboarding | 1 | 2 | 4h | **35** | Remover |
| 20 | Push notifications | 3 | 5 | 8h | **46** | Futuro |
| 21 | Virtual scrolling | 2 | 1 | 6h | **33** | Remover |
| 22 | Dashboard personalizado | 2 | 3 | 8h | **28** | Remover |

---

## 6. As 10 Mudanças com 20 Horas de Desenvolvimento

Se eu tenho EXATAMENTE 20 horas, esta é a ordem:

### Hora 1-2: Touch Targets + Input Fixes (Prioridade: CRÍTICA)

```css
/* Adicionar a todos os interactive elements */
.filter-btn, .tab, .expand-btn, .refresh-btn, .bview-btn,
.bsp-ko-btn, .bolao-save-btn, .btn, .pen-btn,
.bsp-input { min-height: 44px; min-width: 44px; }
```

```html
<!-- Mudar inputs de palpite -->
<input type="number" inputmode="numeric" pattern="[0-9]*" ...>
```

```js
// Enter key handler
document.querySelectorAll('input').forEach(i => {
  i.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const btn = i.closest('form, div')?.querySelector('button:not([disabled])');
      if (btn) btn.click();
    }
  });
});

// Spinner nos botões
function _btnLoading(btn, loading) {
  if (loading) { btn._orig = btn.textContent; btn.textContent = '⏳'; btn.disabled = true; }
  else { btn.textContent = btn._orig || btn.textContent; btn.disabled = false; }
}
```

**Ganho:** Conformidade com diretrizes de toque. Inputs corretos. +0.3 nota.

---

### Hora 3-4: Merged "Jogos" + "Hoje" = Tab Única (Prioridade: ALTA)

```
Jogos tab passa a ser:
  [AO VIVO] — se houver
  [HOJE]   — jogos de hoje
  [PRÓXIMOS] — próximos dias (limitado a 10, "Ver mais")
  [ANTERIORES] — botão "Ver jogos anteriores"
```

**Mudanças no código:**
- `renderGames()` ganha um parâmetro "mode": 'all' | 'upcoming' | 'past'
- Default: 'upcoming' (mostra ao vivo + hoje + próximos 10)
- Botão "Ver anteriores" no final
- Aba "Hoje" removida (data-tab="hoje" some)
- `VALID_TABS` remove 'hoje'

**Ganho:** Home útil de verdade. Menos scroll. +0.5 nota.

---

### Hora 5-6: Skeleton Screens + Loading States (Prioridade: ALTA)

```
Em vez de "Carregando...":
  .skeleton-card (para games)
  .skeleton-row (para ranking)
  .skeleton-table (para grupos)

Função: _skeleton(count, type) que gera HTML placeholder
```

**Ganho:** Percepção de velocidade. +0.2 nota.

---

### Hora 7-8: Full-card tap (Prioridade: MÉDIA)

**Mudança:** Em vez de botão "+" de 28px, o card inteiro é tappable:

```js
function toggleGameCard(card) {
  // Se clicou no card (não em botão/link dentro dele)
  const collapsed = card.getAttribute('data-collapsed');
  if (collapsed === 'true') {
    card.setAttribute('data-collapsed', 'false');
    card.classList.remove('collapsed');
  } else {
    card.setAttribute('data-collapsed', 'true');
    card.classList.add('collapsed');
  }
}
```

E adicionar `cursor:pointer` no `.game-card[data-collapsed="true"]`.

**Ganho:** Facilidade de expandir jogos passados. +0.2 nota.

---

### Hora 9-11: Bottom Navigation (Prioridade: MÉDIA-ALTA)

Implementar bottom nav com 4 abas:

```
┌───────────────────────┐
│     [CONTEÚDO]        │
│                       │
│ ┌────┬────┬────┬────┐ │
│ │⚽   │📊  │🎯  │⋮   │ │ ← 56px
│ │Jogos│Grp │Bolão│+   │ │
│ └────┴────┴────┴────┘ │
└───────────────────────┘
```

Esconder tabs do topo, manter apenas as 4 bottom. A tab "Mais" abre um menu overflow ou expande as tabs escondidas.

**Mudanças:**
- CSS: `.tabs` vira bottom, `.tab` vira botão de bottom nav
- JS: `tabClick()` se adapta
- Conteúdo de Mata-Mata, Artilheiros, Convocados, Regras, Estatisitcas → "Mais"

**Ganho:** Navegação mobile-native. -1 aba (8→4 visível). +0.6 nota.

---

### Hora 12-13: AO VIVO Hero Section (Prioridade: ALTA)

No topo da aba Jogos, se houver jogos AO VIVO, mostrar em destaque:

```
┌─────────────────────────────────────┐
│  🔴 AO VIVO                         │
│  ┌─────────────────────────────┐    │
│  │ 🇧🇷 Brasil     3 × 1        │    │
│  │ 🇲🇦 Marrocos                │    │
│  │ ⏱ 67' • ⚽ Vini Jr 12'     │    │
│  │ ⚽ Raphinha 54' ⚽ Endrick  │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ 🇫🇷 França     2 × 0        │    │
│  │ 🇸🇳 Senegal                 │    │
│  │ ⏱ 32' • ⚽ Mbappé 22'      │    │
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
```

Cards maiores, mais informação, destaque visual (borda verde + glow, já existe).

**Ganho:** "Qual o jogo agora?" respondido em 0 toques. +0.4 nota.

---

### Hora 14-15: Auto-save Picks + Progresso (Prioridade: MÉDIA)

```js
// Auto-save com debounce
let _pickTimer = null;
function bolaoAutoSave(gameN) {
  if (_pickTimer) clearTimeout(_pickTimer);
  _pickTimer = setTimeout(() => bolaoSavePick(gameN), 1500);
}
```

Barra de progresso no topo do grid:
```
🎯 Rodada 1 de 5 — 12/15 preenchidos
[████████████░░░░░░░░░░] 60%
```

**Ganho:** Menos atrito. Menos abandono. +0.3 nota.

---

### Hora 16-17: Pull-to-refresh + Swipe Jogos↔Grupos (Prioridade: BAIXA)

```js
touchstart → touchmove → touchend com detecção de direção
Pull: refreshCalendar()
Swipe: switchTab('jogos') ou switchTab('grupos')
```

**Ganho:** Gestos nativos. +0.2 nota.

---

### Hora 18-20: Classificação em Cards + Ranking Mobile (Prioridade: MÉDIA)

- Grupos: 6 colunas essenciais (P, J, V, E, D, SG) em vez de 12
- Ranking bolão: 3 colunas (#, Nome, Pontos) em vez de 6
- Detalhes expandem ao tocar

**Ganho:** Tabelas legíveis. +0.4 nota.

---

## 7. Roadmap Final 20h

| Hora | Tarefa | Ganho parcial |
|---|---|---|
| 1-2 | Touch targets 44px + inputs numéricos + Enter + spinner | 6.5 → 6.9 |
| 3-4 | Merge Hoje + Jogos (game list progressiva) | 6.9 → 7.3 |
| 5-6 | Skeleton screens + loading states | 7.3 → 7.5 |
| 7-8 | Full-card tap (fim do botão +) | 7.5 → 7.6 |
| 9-11 | Bottom navigation (4 abas) | 7.6 → 8.0 |
| 12-13 | AO VIVO hero section | 8.0 → 8.3 |
| 14-15 | Auto-save picks + progresso | 8.3 → 8.5 |
| 16-17 | Pull-to-refresh + swipe Jogos↔Grupos | 8.5 → 8.6 |
| 18-20 | Classificação cards + ranking mobile | 8.6 → **8.9** |

### Nota final projetada: 8.9/10

(Para 9.0+: precisaria de notificações push + redesign visual completo com brasões + testes com usuários reais)

---

## 8. Conclusão

### O que NÃO fazer (embora pareça bom):
- ❌ Dashboard personalizado (desvio do propósito do app)
- ❌ Onboarding (ninguém usa, todo mundo pula)
- ❌ Virtual scrolling (complexo, ganho marginal)
- ❌ Stepper de bolão (aumenta toques, não diminui)
- ❌ Push notifications (8h de desenvolvimento para 38 dias de copa)

### O que FAZER (nesta ordem):
1. ✅ Touch targets (2h) — **frustração #1 resolvida**
2. ✅ Merge Hoje→Jogos (2h) — **home útil de verdade**
3. ✅ Bottom nav (3h) — **navegação nativa**
4. ✅ Hero AO VIVO (2h) — **0 toques para ver placar**
5. ✅ Auto-save picks (2h) — **menos abandono no bolão**
6. ✅ Skeleton screens (2h) — **percepção de velocidade**
7. ✅ Full-card tap (1h) — **cards expansíveis sem botão**
8. ✅ Classificação simplificada (3h) — **tabelas legíveis**
9. ✅ Pull/swipe (2h) — **gestos nativos**
10. ✅ Enter/inputmode/spinner (1h) — **forms sem atrito**
