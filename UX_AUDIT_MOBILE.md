
# Auditoria de UX Mobile — Copa do Mundo 2026

**Data:** 2026-06-16
**Dispositivos-alvo:** iPhone 12/13/14/15 (390px), iPhone SE (375px), Galaxy S22/S23 (360px), Galaxy Fold (280px)
**App:** Single HTML (320KB), ~3775 linhas, 9 abas, ~40+ elementos interativos

---

## Nota Geral Mobile: 6.8/10

O app é funcional e entrega muita informação. A aba Jogos foi otimizada (filtros horizontais, hero compacto, countdown compacto — ~128px recuperados). Permanecem pendentes: touch targets, swipe, tabelas densas, e otimização de teclado.

**Desktop: 8.0/10** — layout sólido, navegação por hover funciona bem, espaçamento adequado.

---

## Top 20 Problemas

### 🔴 #1 — Touch targets abaixo do mínimo recomendado (44px)
| Campo | Valor |
|---|---|
| **Severidade** | **Crítica** |
| **Onde** | Global — todos os botões e inputs |
| **O quê** | Apple HIG e Material Design recomendam **44px mínimo** para alvos de toque. O app tem: filter-btn (calculado ~30px), tab (~36px), expand-btn (28px!), refresh-btn (28px!), bsp-ko-btn (calculado ~32px). Apenas .bsp-input (48px) e .popup-close (44px) estão ok. |
| **Impacto** | Usuários erram o toque frequente, especialmente no expand-btn para expandir jogos passados. Frustração em filtros. |
| **Sugestão** | Adicionar `min-height:44px; min-width:44px` a todos os interactive elements. Usar padding em vez de height fixa para manter estética. |
| **Ganho** | Redução drástica de erros de toque, conformidade com diretrizes mobile. |

### 🔴 #2 — Nenhum gesto de navegação (swipe)
| Campo | Valor |
|---|---|
| **Severidade** | **Crítica** |
| **Onde** | Tab navigation |
| **O quê** | Zero handlers para swipe, touchstart, touchend. |
| **Impacto** | Usuário precisa tocar precisamente em tabs pequenas no topo. |
| **Sugestão** | Implementar swipe horizontal com `touchstart`/`touchend`, delta >50px navega para aba adjacente. |
| **Ganho** | Navegação fluida, consistente com apps modernos. |

### 🔴 #3 — Tab bar sobrecarregada (9 itens)
| Campo | Valor |
|---|---|
| **Severidade** | **Crítica** |
| **Onde** | `.tabs` |
| **O quê** | 9 tabs, apenas ~3 visíveis no iPhone SE. |
| **Sugestão** | Reduzir labels, agrupar, ou menu "Mais" para overflow. |
| **Ganho** | Navegação mais rápida. |

### 🟠 #4 — Tabela de classificação (Grupos) — 12 colunas inutilizáveis
| Campo | Valor |
|---|---|
| **Severidade** | **Alta** |
| **Onde** | `#tab-grupos` |
| **Sugestão** | Mostrar TOP 3 colunas (P, SG, GP) em layout de lista vertical. |
| **Ganho** | Legibilidade imediata. |

### 🟠 #5 — Ranking do Bolão — 6 colunas apertadas
| Campo | Valor |
|---|---|
| **Severidade** | **Alta** |
| **Sugestão** | Versão mobile: 3 colunas (#, Nome, Pontos). Detalhes no expand. |
| **Ganho** | Leitura clara do ranking. |

### 🟢 #6 [RESOLVIDO v19.17] — Filter bar horizontal scroll
| Campo | Valor |
|---|---|
| **Severidade** | Resolvida |
| **O quê** | Filters agora usam `flex-wrap:nowrap;overflow-x:auto` — 1 fileira rolável. min-height 32px. |
| **Ganho** | Economia de ~88px verticais. |

### 🟠 #7 — Bolão: campos não persistem placeholder ao focar
| Campo | Valor |
|---|---|
| **Severidade** | **Alta** |
| **Sugestão** | Usar float label ou persistent hint. |
| **Ganho** | Menos erros de preenchimento. |

### 🟠 #8 — Nenhum suporte a teclado (Enter para submit)
| Campo | Valor |
|---|---|
| **Severidade** | **Alta** |
| **Sugestão** | Adicionar `onkeydown="if(event.key==='Enter')..."` nos inputs. |
| **Ganho** | Redução de atrito. |

### 🟡 #9 — Jogos passados collapsed — expand-btn muito pequeno
| Campo | Valor |
|---|---|
| **Severidade** | **Média** |
| **Sugestão** | Aumentar para 44px ou tap na linha inteira do card. |
| **Ganho** | Facilidade para consultar jogos passados. |

### 🟡 #10 — Tooltip popup pode vazar para fora da tela
| Campo | Valor |
|---|---|
| **Severidade** | **Média** |
| **Sugestão** | Boundary checking no posicionamento. |
| **Ganho** | Tooltip sempre visível. |

### 🟡 #11 — 104 game cards renderizados de uma vez
| Campo | Valor |
|---|---|
| **Severidade** | **Média** |
| **Onde** | `#games-list` |
| **Sugestão** | Paginação ou virtual scrolling com IntersectionObserver. |
| **Ganho** | Performance em dispositivos fracos. |

### 🟡 #12 — Bolão: grid de palpites sem teclado numérico
| Campo | Valor |
|---|---|
| **Severidade** | **Média** |
| **Sugestão** | `<input type="number" inputmode="numeric" pattern="[0-9]*">` |
| **Ganho** | Agilidade ao preencher dezenas de palpites. |

### 🟡 #13 — Bolão: sem feedback visual de loading ao salvar
| Campo | Valor |
|---|---|
| **Severidade** | **Média** |
| **Sugestão** | Desabilitar botão e mostrar spinner. |
| **Ganho** | Segurança e clareza. |

### 🟡 #14 — Convocados: avatar muito pequeno no mobile
| Campo | Valor |
|---|---|
| **Severidade** | **Média** |
| **Sugestão** | Aumentar para 36x46px no mobile. |
| **Ganho** | Fotos úteis para identificar jogadores. |

### 🟡 #15 — Bracket view: SVG tree não adaptado ao mobile
| Campo | Valor |
|---|---|
| **Severidade** | **Média** |
| **Sugestão** | Mobile: forçar card view (já existe). |
| **Ganho** | Bracket legível em qualquer tela. |

### 🔵 #16 — Sem pull-to-refresh
| Campo | Valor |
|---|---|
| **Severidade** | **Baixa** |
| **Sugestão** | Implementar pull-to-refresh. |
| **Ganho** | Consistência com padrão mobile. |

### 🔵 #17 — Acesso ao diagnóstico (#diagnostico)
| Campo | Valor |
|---|---|
| **Severidade** | **Baixa** |
| **Sugestão** | Manter como está (hidden por design). |

### 🔵 #18 — Bolão checkbox "Li e concordo" confuso
| Campo | Valor |
|---|---|
| **Severidade** | **Baixa** |
| **Sugestão** | Unificar login/cadastro com concordância implícita. |

### 🔵 #19 — Turnstile widget pode vazar em telas muito pequenas
| Campo | Valor |
|---|---|
| **Severidade** | **Baixa** |
| **Sugestão** | Testar em 280px e ajustar com `transform:scale()`. |

### 🔵 #20 — Safe area insets incompletos
| Campo | Valor |
|---|---|
| **Severidade** | **Baixa** |
| **Sugestão** | Adicionar `env(safe-area-inset-*)` a header, popups, ranking. |

---

## Quick Wins (correções rápidas, alto impacto)

| # | Correção | Esforço | Impacto | Onde | Status |
|---|---|---|---|---|---|
| 1 | `<input type="number" inputmode="numeric">` nos palpites | 5 min | Médio | Bolão | Pendente |
| 2 | `Enter` key handler nos inputs de login/especiais | 5 min | Médio | Bolão | Pendente |
| 3 | Desabilitar botão + spinner ao salvar | 10 min | Alto | Bolão | Pendente |
| 4 | `min-height:44px` nos filter-btn, expand-btn, tabs | 15 min | Alto | Global | Pendente |
| 5 | Filtro horizontal scroll (em vez de wrap) | 10 min | Médio | Jogos | ✅ FEITO v19.17 |
| 6 | Tooltip boundary check (não vazar viewport) | 10 min | Baixo | Tooltip | Pendente |
| 7 | Forçar card view no bracket se <480px | 5 min | Baixo | Mata-Mata | Pendente |
| 8 | Abreviar tab label "bolao-estatisticas" → "Estatísticas" | 2 min | Alto | Tabs | Pendente |

---

## Melhorias Estratégicas de UX

| # | Melhoria | Esforço | Impacto | Descrição |
|---|---|---|---|---|
| 1 | Swipe entre abas | 2-4h | Alto | Navegação fluida, elimina scroll horizontal na tab bar |
| 2 | Pull-to-refresh | 1-2h | Médio | Consistência com padrão mobile |
| 3 | Redesign tabela de grupos para mobile | 4-6h | Alto | Cartão vertical com destaques visuais |
| 4 | Floating Action Button (FAB) para "próximo jogo" | 2-3h | Médio | Atalho para o jogo atual/que vai começar |
| 5 | Notificações push (Service Worker) | 4-8h | Alto | Lembrar de palpites, gols ao vivo |
| 6 | Haptic feedback em interações | 1-2h | Baixo | Resposta tátil em palpites e confirmações |
| 7 | Tela de onboarding na primeira visita | 3-4h | Médio | Explicar as abas principais |
| 8 | Modo escuro nativo (prefers-color-scheme) | 30min | Baixo | Já tem dark theme, mas ajustar para OS |

---

## Melhorias de Conversão e Engajamento

| # | Melhoria | Ganho esperado |
|---|---|---|
| 1 | Lembrar palpite não salvo com localStorage | Redução de abandono |
| 2 | Deadline countdown no grid de palpites | Mais palpites preenchidos |
| 3 | Share dos palpites (WhatsApp) | Viralidade |
| 4 | Notificação de resultado | Reengajamento |
| 5 | Mini-resumo semanal | Engajamento recorrente |
| 6 | Desafio entre amigos | Crescimento orgânico |

---

## Comparação Mobile vs Desktop

| Aspecto | Desktop (8.0) | Mobile (6.8) | Gap |
|---|---|---|---|
| Touch targets | Hover funciona, clique preciso 44px+ | Abaixo do mínimo (20-28px) | Crítico |
| Navegação | Todas as 9 abas visíveis | Só 3-4 cabem na tela | Grande |
| Tabelas | Confortáveis | Scroll horizontal intenso | Grande |
| Bolão formulários | Rápidos com teclado físico | Lentos, sem teclado numérico | Médio |
| Bracket | Visualização completa | Tree quebra, card view ok | Médio |
| Performance | 104 cards sem problema | Pode travar em low-end | Médio |
| Gestos | Não se aplica | Ausência de swipe/pull | Grande |
| Espaço vertical útil | Conteúdo começa ~10% viewport | Conteúdo começa ~30% viewport | Melhorou (+22%) |

---

## Plano de Ação Priorizado

### Fase 1 — Imediato (Quick Wins, < 1h)
1. `inputmode="numeric"` nos palpites do bolão (#12)
2. Enter key handler nos formulários (#8)
3. Abreviar tab label "bolao-estatisticas" (#3)
4. Spinner + disabled em botões de salvar (#13)
5. Tooltip boundary check (#10)

### Fase 2 — Próxima (Alto impacto, 2-4h)
1. Touch targets 44px em todos os elementos (#1)
2. ~~Filtro horizontal scroll em vez de wrap (#6)~~ ✅ FEITO v19.17
3. Forçar card view no bracket mobile (#15)
4. Avatar 36x46px nos convocados (#14)

### Fase 3 — Essa semana (Melhorias estratégicas, 4-8h)
1. Swipe entre abas
2. Pull-to-refresh
3. Redesign tabela classificação para mobile (#4)
4. Safe area em todos os elementos (#20)

### Fase 4 — Médio prazo
1. Paginação/virtual scroll nos jogos (#11)
2. Notificações push
3. Redesign ranking bolão para mobile (#5)
4. Onboarding na primeira visita

---

## Nota Final

O app tem um coração funcional excelente — dados completos, bolão integrado, placar ao vivo. A aba Jogos foi otimizada em v19.17 (~128px recuperados via filtros horizontais, hero compacto, countdown compacto).

Os maiores desafios remanescentes:
1. **Touch targets** — filter-btn em 32px (tradeoff aceito por espaço)
2. **Ausência de gestos** — swipe e pull-to-refresh são padrão da indústria
3. **Tabelas com colunas demais** — 12 colunas na classificação, 6 no ranking
4. **Teclado não otimizado** — inputs de número abrindo teclado alfa

Com os Quick Wins restantes (Fase 1), o app sobe para 7.5/10. Com as melhorias estruturais (Fase 2-3), chega a 8.5/10.
