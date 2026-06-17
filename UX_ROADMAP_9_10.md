
# Roadmap Estratégico: Mobile de 6.5 → 9.0

**Produto:** Copa do Mundo 2026 — Single HTML App
**Foco:** UX Mobile-first, redesign estrutural
**Meta:** Experiência nativa, fluida, comparável a apps como Sofascore, OneFootball, Nubank

---

## 1. Filosofia do Redesign

O app atual é um **site desktop adaptado para mobile**. Cada tela carrega toda a informação disponível de uma vez, esperando que o usuário encontre o que precisa.

A versão 9/10 precisa ser **mobile-native**: informação progressiva, gestos como navegação primária, densidade reduzida, toque como input principal.

### Princípios
| Princípio | Aplicação |
|---|---|
| **Mobile First** | Layout começa no celular, desktop herda |
| **Thumb Zone** | Ações principais na metade inferior da tela |
| **Progressive Disclosure** | Mostra o essencial, revela detalhes sob demanda |
| **Gestos > Cliques** | Swipe, pull, tap & hold substituem botões |
| **Instantâneo** | Skeleton screens, feedback tátil, transições 60fps |

---

## 2. Redesign da Arquitetura de Navegação

### Problema Atual
9 abas no topo, apenas 3-4 visíveis, scroll horizontal. Hierarquia plana (tudo tem o mesmo peso).

### Proposta: Bottom Navigation + Contextual Top Bar

```
┌─────────────────────────────────────┐
│  ┌──────────────────────────────┐  │
│  │  🇧🇷 Brasil 4×2 Marrocos     │  │  ← Contextual top bar
│  │  ⏱ 67' AO VIVO              │  │     (mostra info do jogo atual)
│  └──────────────────────────────┘  │
│                                     │
│           [Conteúdo da aba]         │
│                                     │
│                                     │
│                                     │
│  ┌────┬────┬────┬────┬──────┐      │
│  │ 🏠 │ ⚽ │ 📊 │ 🎯 │ ⋮    │      │  ← Bottom Navigation
│  │Início│Jogos│Grupos│Bolão│Mais │     (5 itens, sempre visível)
│  └────┴────┴────┴────┴──────┘      │
└─────────────────────────────────────┘
```

### Bottom Nav: 5 abas

| Ícone | Aba | Função |
|---|---|---|
| 🏠 **Início** | Dashboard pessoal | Próximo jogo, placares ao vivo, seus palpites de hoje, resumo rápido |
| ⚽ **Jogos** | Todos os jogos | Lista completa com filtros (igual hoje, mas com a aba "Hoje" integrada como atalho) |
| 📊 **Grupos** | Classificação | Tabelas dos 12 grupos + terceiros |
| 🎯 **Bolão** | Bolão completo | Login, palpites, ranking, estatísticas |
| ⋮ **Mais** | Overflow | Mata-Mata, Artilheiros, Convocados, Regras, Diagnóstico |

### Impacto
| Aspecto | Atual | Novo | Ganho |
|---|---|---|---|
| Abas visíveis sem scroll | 3-4 | 5 | Menos atrito |
| Alcance do polegar | Topo (estica) | Base (natural) | Ergonomia |
| Hierarquia | Plana | Priorizada | Foco no que importa |
| Descoberta | Baixa | Média | Mais uso de features |

### Detalhamento da Aba "Início" (Dashboard)

A aba **Início** substitui a atual "Hoje" e se torna o **default** do app. Ela é um dashboard pessoal que responde:

```
┌─────────────────────────────────────┐
│  ☀️ Bom dia, João!                  │
│                                     │
│  ⏱ PRÓXIMO JOGO EM 2h30            │
│  ┌─────────────────────────────┐    │
│  │ Argentina 🆚 Jordânia       │    │
│  │ 27/jun 23:00 • AT&T Stadium │    │
│  │ Você palpitou: 3×0 🇦🇷       │    │
│  └─────────────────────────────┘    │
│                                     │
│  🔴 AO VIVO (2 jogos)              │
│  ┌──────────┐ ┌──────────┐         │
│  │ França 1 │ │ Iraque 0 │         │
│  │ Senegal0 │ │ Noruega 1│         │
│  │ 32'      │ │ 18'      │         │
│  └──────────┘ └──────────┘         │
│                                     │
│  🎯 Seus palpites de hoje (3)      │
│  ┌─────────────────────────────┐    │
│  │ Argentina × Jordânia: 3×0  │    │
│  │ Portugal × RD Congo: 2×1   │    │
│  │ Inglaterra × Gana: 3×0 ✅  │    │
│  └─────────────────────────────┘    │
│                                     │
│  📊 VOCÊ ESTÁ EM 3º NO BOLÃO       │
│  ┌─────────────────────────────┐    │
│  │ 🥇 João 124pts              │    │
│  │ 🥈 Maria 118pts             │    │
│  │ 🥉 Você 112pts ▲2 esta rodada│   │
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
```

**Esforço:** Alto (requer nova estrutura de dados + componente)
**Impacto:** Altíssimo (muda a primeira impressão do app)
**Ganho na nota:** +0.5

---

## 3. Swipe entre Abas (Navegação por Gestos)

### Implementação
```js
let touchStartX = 0, touchStartY = 0;
document.addEventListener('touchstart', e => {
  touchStartX = e.changedTouches[0].screenX;
});
document.addEventListener('touchend', e => {
  let dx = e.changedTouches[0].screenX - touchStartX;
  if (Math.abs(dx) > 60) {
    // swipe horizontal → navega entre abas
    let tabs = ['inicio','jogos','grupos','bolao','mais'];
    let current = tabs.indexOf(currentTab);
    if (dx > 0 && current > 0) switchTab(tabs[current-1]);
    if (dx < 0 && current < tabs.length-1) switchTab(tabs[current+1]);
  }
});
```

### Considerações
- Swipe vertical = scroll normal (não deve conflitar)
- Swipe horizontal = navegação (apenas se não houver scroll horizontal no conteúdo)
- Feedback visual: animação de slide entre abas
- **Conflito com pull-to-refresh:** resolver com dead zone diagonal (se ângulo >30°, ignora)

### Esforço: Médio (2-3h)
### Impacto: Alto
### Ganho na nota: +0.3

---

## 4. Pull-to-Refresh

### Implementação
```js
let pullStartY = 0, pulling = false;
document.addEventListener('touchstart', e => {
  if (window.scrollY === 0) { pullStartY = e.touches[0].clientY; pulling = true; }
});
document.addEventListener('touchmove', e => {
  if (!pulling) return;
  let dy = e.touches[0].clientY - pullStartY;
  if (dy > 0) {
    // Mostrar indicador visual de pull
    document.getElementById('pull-indicator').style.transform = `scaleY(${Math.min(dy/80, 1)})`;
  }
});
document.addEventListener('touchend', e => {
  if (!pulling) return;
  let dy = e.changedTouches[0].clientY - pullStartY;
  if (dy > 80) { /* refresh */ fetchCalendar(); }
  pulling = false;
});
```

### UI
- Indicador sutil no topo (seta + "Puxe para atualizar" / "Solte para atualizar")
- Spinner nativo durante refresh
- Haptic feedback sutil ao soltar (se disponível)

### Esforço: Médio (2h)
### Impacto: Alto
### Ganho na nota: +0.2

---

## 5. Redesign Tabela de Classificação (Mobile-first)

### Problema Atual
12 colunas em tabela HTML. Scroll horizontal. Fonte 10px. Ilegível.

### Solução: Card Vertical com Barras Visuais

Em vez de tabela, cada time vira um **cartão vertical**:

```
┌─────────────────────────────────────┐
│  GRUPO A                            │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ 1  🇲🇽 México        7 pts  │    │
│  │   ████████████░░░░  +5 SG   │    │
│  │   3J  2V  1E  0D  7GP 2GC   │    │
│  └─────────────────────────────┘    │
│  ┌─────────────────────────────┐    │
│  │ 2  🇿🇦 África do Sul  4 pts │    │
│  │   ████████░░░░░░░░░░  +1 SG │    │
│  │   3J  1V  1E  1D  4GP 3GC   │    │
│  └─────────────────────────────┘    │
│  ┌─────────────────────────────┐    │
│  │ 3  🇰🇷 Coreia do Sul 3 pts │    │
│  │   ██████░░░░░░░░░░░░  -2 SG │    │
│  └─────────────────────────────┘    │
│  ┌─────────────────────────────┐    │
│  │ 4  🇨🇿 Rep. Tcheca  1 pt  │    │
│  │   ██░░░░░░░░░░░░░░░░  -4 SG │    │
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
```

**Barra de progresso visual:** largura proporcional aos pontos (máximo 9pts = 100%). Cores: verde (classificado), amarelo (3º lugar), vermelho (eliminado).

**Detalhes expandem** ao tocar no card: mostra jogos do time, artilheiros, próximos jogos.

### Esforço: Alto (4-6h)
### Impacto: Muito Alto
### Ganho na nota: +0.5

---

## 6. Redesign Bolão para Mobile

### Problemas
- Inputs de palpite lado a lado, muito pequenos
- 99 jogos renderizados de uma vez
- Login confuso (checkbox + botão + 2 inputs)
- Sem teclado numérico
- Sem feedback de salvamento

### Solução: Progressive Pick Flow

#### 6a. Palpites em Stepper

Em vez de grid de 99 cards, mostrar **5 palpites por vez** em um carrossel horizontal:

```
┌─────────────────────────────────────┐
│  Palpite 1 de 5 · Rodada de Grupos  │
│                                     │
│  ┌─────────────────────────────┐    │
│  │                             │    │
│  │     🇦🇷 Argentina            │    │
│  │         🆚                   │    │
│  │     🇯🇴 Jordânia             │    │
│  │                             │    │
│  │     [3]  ×  [1]             │    │
│  │                             │    │
│  │  ⏱ Fecha em 2h30           │    │
│  │  ✅ Palpite salvo!          │    │
│  │                             │    │
│  │  ◀          ▶               │    │
│  │  │■■■■■□□□□□│               │    │
│  └─────────────────────────────┘    │
│                                     │
│  [✅ Salvar todos (12/15 restantes)]│
└─────────────────────────────────────┘
```

#### 6b. Login Unificado

Agrupar em único passo:

```
┌─────────────────────────────────────┐
│  Entrar no Bolão                    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ 👤 Nome                     │    │
│  │ [______________________]    │    │
│  │ 🔒 Senha                    │    │
│  │ [______________________]    │    │
│  │                             │    │
│  │ [✅ Entrar]  [➕ Criar Conta]│    │
│  │                             │    │
│  │ Ao entrar, você concorda    │    │
│  │ com as regras do bolão      │    │
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
```

#### 6c. Fácil Acesso aos Especiais

Botão flutuante "⭐ Palpites Especiais" que abre bottom sheet com campeão + artilheiro.

### Esforço: Alto (6-8h)
### Impacto: Alto
### Ganho na nota: +0.4

---

## 7. Redesign Game Card (Mobile)

### Problema Atual
Grid de 4 colunas: Num | Time A | Placar | Time B. Nomes de times com bandeiras em fonte 11px. Muita informação comprimida.

### Solução: Card Otimizado para Thumb

```
┌─────────────────────────────────────┐
│  ⚽ Grupo C · #6                     │
│  ┌─────────────────────────────┐    │
│  │ 🇧🇷 Brasil            ⚠1 susp │    │
│  │             4 × 2             │    │
│  │ 🇲🇦 Marrocos                  │    │
│  │                             │    │
│  │ 13/jun 19:00 • MetLife      │    │
│  │ Globo | SporTV | CazéTV     │    │
│  │                             │    │
│  │ ⚽ Vini Jr 12' ⚽ Neymar 45+2│    │
│  │ ⚽ Raphinha 67' ⚽ Endrick 89│    │
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
```

**Mudanças:**
- Time mandante + visitante em **stack vertical** com placar central grande
- Fonte do time maior (14-16px)
- Ao vivo: badge "🔴 AO VIVO 67'" pulsando
- Toque no card → abre detalhes (eventos, escalação se disponível)
- Toque longo → menu de contexto (ver no grupo, copiar resultado)

### Esforço: Médio (3-4h)
### Impacto: Alto
### Ganho na nota: +0.3

---

## 8. Skeleton Screens e Loading States

### Problema Atual
- `squads-loading` com spinner
- Bolão: "Carregando..." texto simples
- Games: render síncrono (pode travar 50ms+ em low-end)

### Solução: Skeleton Placeholders

```css
.skeleton { background: linear-gradient(90deg, var(--card) 25%, var(--card-hover) 50%, var(--card) 75%);
  background-size: 200% 100%; animation: shimmer 1.5s infinite; border-radius: var(--radius-sm); }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
```

**Onde aplicar:**
- **Games:** 5 skeleton cards enquanto `fetchFifaScores` não retorna
- **Groups:** 4 skeleton rows por grupo
- **Bolão ranking:** 10 skeleton rows
- **Scorers:** 5 skeleton rows
- **Squads:** já tem (`.squads-loading`), mas trocar shimmer por skeleton mais realista (formato de card)

### Esforço: Baixo-Médio (1-2h)
### Impacto: Alto (performance percebida)
### Ganho na nota: +0.2

---

## 9. Estados de Erro e Vazio

### Problema Atual
- "Sem jogos hoje" — funcional mas sem call to action
- Falha na FIFA API — silenciosa (console.warn)
- Bolão offline — badge "📡 Dados offline" mas sem ação

### Solução

#### Empty State: "Sem jogos hoje"
```
┌─────────────────────────────────────┐
│                                     │
│         📅                          │
│     Sem jogos hoje                  │
│                                     │
│  Próximo jogo:                     │
│  Argentina vs Jordânia              │
│  27/jun 23:00                       │
│                                     │
│  [🔔 Lembrar quando começar]        │
│                                     │
│  Ver jogos de [amanhã ▾]            │
│                                     │
└─────────────────────────────────────┘
```

#### Error State: Falha na API
```
┌─────────────────────────────────────┐
│                                     │
│         ⚠️                          │
│  Não foi possível atualizar         │
│  os placares ao vivo                │
│                                     │
│  Última atualização: 14:32          │
│                                     │
│  [🔄 Tentar novamente]               │
│                                     │
└─────────────────────────────────────┘
```

#### Error State: Bolão offline
```
┌─────────────────────────────────────┐
│                                     │
│  📡 Dados offline                   │
│  (atualizados em 14:32)             │
│                                     │
│  Ranking pode estar desatualizado   │
│  Os palpites continuam sendo        │
│  salvos localmente                  │
│                                     │
│  [🔄 Tentar reconectar]              │
│                                     │
└─────────────────────────────────────┘
```

### Esforço: Médio (2-3h)
### Impacto: Médio
### Ganho na nota: +0.2

---

## 10. Performance Percebida

### Problema Atual
- 104 game cards no DOM de uma vez
- `dynRender` com innerHTML + replace (reflow)
- Sem `content-visibility` nos cards colapsados

### Melhorias

| Técnica | Esforço | Ganho |
|---|---|---|
| `content-visibility: auto` nos game cards | 15min | Renderização sob demanda |
| Virtual scrolling com reciclagem de nodes | 4-6h | DOM com max 20 cards |
| CSS `will-change: transform` em animações | 5min | GPU acelerado |
| `loading="lazy"` em todas as imagens | Já tem | — |
| Preconnect para flagcdn.com, FIFA API | 5min | DNS resolvido antes |
| `requestAnimationFrame` no dynRender | 30min | Sem flashes |
| Debounce no `saveState()` (já tem? verificar) | 10min | Menos escrita em disco |

### Efeito cascata

Implementando virtual scrolling + content-visibility:
- DOM inicial cai de ~2000 nodes para ~300
- Time to Interactive reduz de ~800ms para ~200ms
- Menos memória → menos GC → menos jank

### Esforço: Médio (4-6h)
### Impacto: Alto
### Ganho na nota: +0.3

---

## 11. Acessibilidade Mobile

### Problemas Atuais
- ARIA roles existem mas estão incompletos
- `aria-label` ausente em inputs
- Foco visível só com `:focus-visible`
- Contraste: alguns elementos têm opacidade muito baixa (`.br-badge opacity: 0.4`)
- Touch targets pequenos (já mencionado)

### Melhorias Essenciais

| # | Melhoria | Esforço | Impacto |
|---|---|---|---|
| 1 | `aria-label` em todos os inputs (placar, bolão, busca) | 30min | Alto para leitores de tela |
| 2 | `role="status"` no countdown e audit badge | 5min | Atualizações anunciadas |
| 3 | `aria-live="polite"` em resultados que mudam | 10min | Scores anunciados |
| 4 | Contraste mínimo 4.5:1 (revisar opacity baixas) | 30min | Legibilidade |
| 5 | `prefers-reduced-motion` para animações | 15min | Evitar tontura |
| 6 | Suporte a `prefers-color-scheme` (light mode) | 1h | Preferência do sistema |
| 7 | Dynamic Type (font-size ajustável) | Já usa clamp | — |
| 8 | `aria-expanded` em cards colapsados | 15min | Estado anunciado |

### Esforço: Baixo-Médio (2-3h)
### Impacto: Alto (inclusão)
### Ganho na nota: +0.2

---

## 12. Haptic Feedback e Microinterações

### Onde aplicar

| Interação | Tipo | Implementação |
|---|---|---|
| Palpite salvo | ✅ Sucesso | `navigator.vibrate(10)` |
| Palpite errado (fora do prazo) | ⛔ Erro | `navigator.vibrate([30,50,30])` |
| Confirmar todos | ⚠️ Atenção | `navigator.vibrate(20)` |
| Pull-to-refresh solto | 🔄 Refresh | `navigator.vibrate(15)` |
| Troca de aba via swipe | 👆 Toque | `navigator.vibrate(5)` (sutil) |

```js
function haptic(pattern) {
  if (window.navigator && navigator.vibrate) navigator.vibrate(pattern);
}
```

**Nota:** `navigator.vibrate()` funciona em Android (Chrome). iOS não suporta — usar biblioteca como `impactHaptic` via Taptic Engine se quiser cobertura total.

### Esforço: Baixo (30min)
### Impacto: Médio (percepção de qualidade)
### Ganho na nota: +0.1

---

## 13. Onboarding e Primeira Visita

### Problema Atual
Usuário novo cai direto na aba "Jogos" com 104 cards. Sem contexto do que é o app ou como usar.

### Solução: Overlay de Boas-Vindas (primeira visita apenas)

```
┌─────────────────────────────────────┐
│                                     │
│  🏆 COPA DO MUNDO 2026              │
│                                     │
│  Acompanhe todos os 104 jogos       │
│  com placar ao vivo, grupos,        │
│  mata-mata e convocados.            │
│                                     │
│  🎯 Participe do bolão e            │
│     dispute com seus amigos!        │
│                                     │
│  ┌─────────────────────────────┐    │
│  │    ▶ Ver Próximo Jogo        │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │           Pular              │    │
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
```

Após o onboarding, um **tooltip coach** aponta para a bottom nav:

```
┌─────────────────────────────────────┐
│                            ┌─────┐   │
│                            │Deslize│  │
│                            │para   │  │
│                            │navegar│  │
│                            │  👆   │  │
│                            └─────┘   │
│  ┌────┬────┬────┬────┬──────┐       │
│  │ 🏠 │ ⚽ │ 📊 │ 🎯 │ ⋮    │       │
│  └────┴────┴────┴────┴──────┘       │
└─────────────────────────────────────┘
```

### Esforço: Médio (3-4h)
### Impacto: Médio (reduz abandono na primeira visita)
### Ganho na nota: +0.2

---

## 14. Densidade de Informação e Progressive Disclosure

### Problema Central
Cada tela tenta mostrar TUDO de uma vez. O cérebro humano processa ~3-4 chunks por vez.

### Princípios

| Princípio | Aplicação |
|---|---|
| **7±2** | Máximo 7 itens por tela antes de scroll |
| **3-click rule** | Qualquer informação em até 3 toques |
| **Progressive disclosure** | Essencial primeiro, detalhes depois |
| **Chunking** | Agrupar info relacionada visualmente |

### Onde Aplicar

| Tela | Hoje | Novo |
|---|---|---|
| Jogos | 104 cards na vertical | 10 próximos + "Ver mais" |
| Grupos | 12 tabelas completas | Topo de cada grupo + expand |
| Ranking | 6 colunas | 3 colunas + expand por linha |
| Scorers | Lista completa | Top 10 + "Ver todos" |
| Convocados | 48 times × 26 jogadores | Time selecionado + scroll |

### Esforço: Alto (várias telas)
### Impacto: Muito Alto
### Ganho na nota: +0.5

---

## 15. Notificações e Engajamento

### Usando o Service Worker existente

O `sw.js` já está registrado. Podemos usar Push API para:

| Tipo | Trigger | Conteúdo |
|---|---|---|
| **Jogo começou** | FIFA API → MATCH_STARTED | "🔴 Argentina vs Jordânia começou!" |
| **Gol** | Timeline API | "⚽ Argentina 1×0 Jordânia — Messi 23'" |
| **Jogo terminou** | MATCH_ENDED | "✅ Fim de jogo! Veja seu palpite" |
| **Palpite prestes a fechar** | Cron 30min antes | "⏰ Palpite para Argentina×Jordânia fecha em 30min" |
| **Bolão: você subiu/desceu** | Snapshot | "📊 Você subiu para 3º lugar!" |

```js
// No service worker
self.addEventListener('push', event => {
  const data = event.data.json();
  self.registration.showNotification(data.title, {
    body: data.body,
    icon: '/bola_t.png',
    badge: '/bola_t.png',
    vibrate: [200, 100, 200],
    data: { url: data.url }
  });
});
```

### Esforço: Alto (6-8h, incluindo backend de push)
### Impacto: Alto (reengajamento)
### Ganho na nota: +0.3

---

## 16. Resumo de Todas as Melhorias

| # | Melhoria | Esforço | Impacto UX | Ganho Nota | Fase |
|---|---|---|---|---|---|
| 1 | Bottom Navigation (5 abas) | Alto | Altíssimo | +0.5 | 1 |
| 2 | Dashboard "Início" personalizado | Alto | Altíssimo | +0.5 | 2 |
| 3 | Swipe entre abas | Médio | Alto | +0.3 | 1 |
| 4 | Pull-to-refresh | Médio | Alto | +0.2 | 1 |
| 5 | Redesign tabela classificação (card visual) | Alto | Muito Alto | +0.5 | 2 |
| 6 | Redesign bolão (stepper + login unificado) | Alto | Alto | +0.4 | 2 |
| 7 | Redesign game card (stack vertical) | Médio | Alto | +0.3 | 1 |
| 8 | Skeleton screens | Baixo-Médio | Alto | +0.2 | 1 |
| 9 | Estados de erro/vazio | Médio | Médio | +0.2 | 1 |
| 10 | Virtual scrolling + content-visibility | Médio | Alto | +0.3 | 2 |
| 11 | Acessibilidade (aria, contraste, motion) | Baixo-Médio | Alto | +0.2 | 1 |
| 12 | Haptic feedback | Baixo | Médio | +0.1 | 2 |
| 13 | Onboarding | Médio | Médio | +0.2 | 2 |
| 14 | Densidade + progressive disclosure | Alto | Muito Alto | +0.5 | 3 |
| 15 | Notificações push | Alto | Alto | +0.3 | 3 |

---

## 17. Roadmap para 9/10

### Fase 1 — Fundação Mobile (agora, 1-2 dias)
*Ganho estimado: 6.5 → 7.8*

| Ordem | Tarefa | Esforço |
|---|---|---|
| 1 | Bottom Navigation (5 abas: Início, Jogos, Grupos, Bolão, Mais) | Alto |
| 2 | Swipe entre abas (touchstart/touchend) | Médio |
| 3 | Pull-to-refresh (touch events + indicador) | Médio |
| 4 | Redesign game card mobile (stack vertical) | Médio |
| 5 | Skeleton screens (games, ranking, scorers) | Baixo |
| 6 | Estados de erro/vazio (empty state, error state) | Médio |
| 7 | Acessibilidade básica (aria-label, contraste, reduced-motion) | Baixo |

**Marco:** App com navegação nativa, gestos funcionais, carregamento instantâneo (percebido).

---

### Fase 2 — Experiência Rica (3-5 dias)
*Ganho estimado: 7.8 → 8.5*

| Ordem | Tarefa | Esforço |
|---|---|---|
| 1 | Dashboard "Início" personalizado | Alto |
| 2 | Redesign classificação (card visual) | Alto |
| 3 | Redesign bolão (stepper + login simplificado) | Alto |
| 4 | Virtual scrolling (104 → ~20 cards no DOM) | Médio |
| 5 | Haptic feedback nas interações principais | Baixo |
| 6 | Onboarding / primeira visita | Médio |

**Marco:** Experiência comparável a apps esportivos profissionais.

---

### Fase 3 — Excelência (1-2 semanas)
*Ganho estimado: 8.5 → 9.0*

| Ordem | Tarefa | Esforço |
|---|---|---|
| 1 | Progressive disclosure em todas as telas | Alto |
| 2 | Notificações push (Service Worker + backend) | Alto |
| 3 | Light mode (prefers-color-scheme) | Médio |
| 4 | Testes com usuários reais + ajustes | Contínuo |

**Marco:** App pronto para produção com qualidade premium.

---

## 18. Benchmark (Onde queremos chegar)

| Aspecto | App atual (6.5) | Meta (9.0) | Referência |
|---|---|---|---|
| Navegação | Top tabs, scroll | Bottom nav + swipe | Instagram, Nubank |
| Carregamento | Spinner estático | Skeleton + shimmer | LinkedIn, Facebook |
| Gestos | Nenhum | Swipe, pull, tap&hold | Sofascore, Twitter |
| Tabelas | 12 colunas, fonte 10px | Card visual, 3 destaques | OneFootball |
| Feedback | Texto de status | Haptic + animação + som | Apple Sports |
| Toque | 20-28px | 44px mínimo | Material Design |
| Erro | Silencioso | Estado explícito + ação | Stripe, Linear |
| Offline | Funcional | Cache + indicador claro | Spotify, YouTube |
| Notificações | Nenhuma | Push ao vivo | ESPN, Globo Esporte |

---

## 19. Considerações Finais

### O que NÃO mudar
- **Velocidade de dados:** O app carrega em segundos mesmo em 3G. Preservar.
- **Bolão offline:** Cache de ranking + picks funciona sem internet. Preservar.
- **Single HTML:** Zero build, zero dependências. Preservar.
- **Cobertura de dados:** 104 jogos, 1248 jogadores, 12 grupos. É um dos diferenciais.

### O que SACRIFICAR se necessário
- Dashboard "Início": features complexas podem esperar a Fase 2
- Notificações push: depende de backend, pode ser post-MVP
- Light mode: impacto visual alto, mas funcionalmente não crítico

### Risco Principal
O maior risco é o **tamanho do arquivo HTML** (320KB). Adicionar bottom nav, skeletons, gestos, e novos componentes pode inflar para 400-450KB. Monitorar e, se necessário, externalizar CSS para arquivo separado com cache.

---

**Nota final projetada após roadmap completo: 8.8-9.2/10**
