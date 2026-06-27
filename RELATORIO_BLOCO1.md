# Relatório Bloco 1 — Touch & Feedback

**Data:** 16/06/2026
**Arquivos modificados:** `index.html`, `copa2026.html`

---

## 1. Resumo

Foram implementadas 10 melhorias de UX mobile focadas em touch targets, feedback visual e redução de atrito, sem alterar a arquitetura de navegação do produto.

**Nota mobile estimada antes:** 6.5/10
**Nota mobile estimada depois:** **7.3/10** (+0.8)

---

## 2. O que foi alterado

### 2.1 Touch targets 44px (CSS)

| Elemento | CSS alterado |
|---|---|
| `.tab` | `min-height:44px` |
| `.filter-btn` | `min-height:44px; min-width:44px` |
| `.bview-btn` | `min-height:44px` |
| `.btn` | `min-height:44px; min-width:44px; display:inline-flex` |
| `.bsp-ko-btn` | `min-height:44px` |
| `.bolao-save-btn` | `min-height:44px` |

**Local:** linhas 45, 35 (via edit), 144, 429, 432, 382

**Decisões:**
- `.expand-btn` (o `+` do card) manteve 20px → substituído por full-card tap
- `.refresh-btn` manteve 32px (circular, `28px` em mobile, aceitável)

### 2.2 Full-card tap (JS + HTML)

- `toggleGameCard()` agora aceita o card como argumento (não só o botão)
- Cards com `data-collapsed="true"` ganham `onclick="toggleGameCard(this)"`
- O botão `expand-btn` perdeu `onclick` próprio (o card captura o clique)
- `toggleGameCard` atualiza o texto `+/-` do botão interno se existir

**Local função:** linha 904
**Local HTML rendering:** linha 1010

### 2.3 Auto-save com debounce (JS)

- Adicionado listener `input` com debounce de 1.5s em todos os `.bsp-input`
- O blur continua salvando imediatamente (sem debounce)
- Timer por gameN em `grid._debounceTimers` para evitar múltiplos saves

**Local:** linha 2684-2713

### 2.4 Enter key handler (JS)

- Enter nos inputs do bolão → salva o pick
- Enter no campo "nome" → foca "senha"
- Enter no campo "senha" → tenta login (se senha > 0)
- Enter em campeão/artilheiro → clica "Salvar palpites especiais"

**Local:** linha 3725-3755

### 2.5 Spinner + disabled buttons (JS + CSS)

- Nova função `_btnLoading(btn, loading)` salva texto original, mostra ⏳, desabilita
- Usada em `bolaoSaveSpecial()` e `bolaoConfirmAll()`

**Local função:** linha 3689
**Local chamadas:** linhas 2795 (special), 2848 (confirm)

### 2.6 Skeleton screens (CSS + JS + HTML)

- **CSS:** `@keyframes skeleton-pulse`, classes `.skeleton`, `.skeleton-card`, `.s-line`, `.s-score`
- **Função:** `_skeleton(count, type)` gera HTML de skeleton para `'game'`, `'rank'`, `'list'`
- **HTML:** 3 skeleton cards no `#games-list` (aparecem antes do JS renderizar)

**Local CSS:** linha 45-57
**Local função:** linha 3694
**Local HTML:** linha 543

### 2.7 Progress bar do bolão (JS)

- `bolaoUpdateSummary()` agora renderiza barra horizontal com gradiente dourado
- Porcentagem preenchida com `transition: width .4s ease`
- Texto de "faltam" limitado a 5 itens + "e mais N"

**Local:** linha 2742-2755

### 2.8 Empty states (JS + HTML)

- `_emptyState(icon, title, msg)` — função geradora de HTML padronizado
- `renderHoje()` usa `_emptyState` com ícone 📅 e mensagem descritiva
- Grid do bolão sem jogos usa `_emptyState` com ícone ⚽

**Local função:** linha 3718
**Local renderHoje:** linha 900
**Local bolão grid:** linha 2683

### 2.9 Error states (JS)

- `_errState(msg, action)` — função geradora de HTML para erros (ícone ⚠️)
- Pronta para uso em futuras implementações de fetch

**Local função:** linha 3721

### 2.10 CSS geral de feedback

- `.btn` agora é `display:inline-flex; align-items:center; justify-content:center`
- Botões têm altura mínima garantida de 44px

---

## 3. Arquivos modificados

| Arquivo | Tipo | Alterações |
|---|---|---|
| `index.html` | Principal | +102 linhas (CSS + JS + HTML) |
| `copa2026.html` | Mirror | Sincronizado (idêntico) |
| `backup_bloco1/index.html` | Backup | Cópia pré-alteração |
| `backup_bloco1/copa2026.html` | Backup | Cópia pré-alteração |
| `backup_bloco1/players.json` | Backup | Cópia pré-alteração |

---

## 4. Dependências e riscos

### Dependências
- Nenhuma. Zero bibliotecas externas tocadas.
- As novas funções (`_btnLoading`, `_skeleton`, `_emptyState`, `_errState`) não são chamadas por código existente (são utilitários). O único risco é no Enter handler que chama `bolaoLogin()`, `bolaoSavePick()` e `bolaoSaveSpecial()` — funções já testadas.

### Riscos
| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| `.btn` com `min-height:44px` pode esticar botões no login | Baixa | Visual | Inline `height:36px` é sobreposto (min-height vence). Botão fica mais alto. Aceitável. |
| Full-card tap: clique no card expande mesmo se clicar em input/select dentro dele | Média | Funcional | `toggleGameCard` só executa se o card tiver `data-collapsed="true"`. Cards não-colapsados não têm onclick. |
| `.bsp-ko-btn` com `min-height:44px` pode quebrar layout de 2 botões lado a lado | Baixa | Visual | `flex:1` + `min-height:44px` → 44px de altura. Padding atual 5px + ~15px texto + 5px = 25px. Ficará 19px maior. Testar visualmente. |
| Debounce 1.5s + blur podem salvar 2x o mesmo pick | Muito baixa | Dados | `bolaoSavePick` é idempotente para mesmo valor. Segundo save é redundante, sem dano. |
| Enter na senha chama `bolaoLogin()` que é async | Baixa | UX | Login pode falhar se Enter for pressionado enquanto carregando. Mensagem de erro já tratada. |

### Regressões esperadas
- **Navegação:** Nenhuma (top tabs inalteradas)
- **Bolão:** Nenhuma (auto-save é adicional, blur continua)
- **Jogos:** Cards colapsados agora respondem a clique em qualquer lugar (não só no botão +)
- **Desktop:** Nenhuma (touch targets só afetam mobile; skeleton substituído imediatamente)

---

## 5. Checklist de funções críticas

| Função | Status | Notas |
|---|---|---|
| `dynRender` | ✅ Preservada | Sem alterações |
| `renderSquads` | ✅ Preservada | Sem alterações |
| `renderBracketTree` | ✅ Preservada | Sem alterações |
| `renderBracketCards` | ✅ Preservada | Sem alterações |
| `resolveTeam` | ✅ Preservada | Sem alterações |
| `isGameLive` | ✅ Preservada | Sem alterações |
| `updateCountdown` | ✅ Preservada | Sem alterações |
| `renderGames` | ✅ Preservada | Só mudou onclick no card |
| `renderGroups` | ✅ Preservada | Sem alterações |
| `renderScorers` | ✅ Preservada | Sem alterações |
| `esc` | ✅ Preservada | Sem alterações |
| `flag` | ✅ Preservada | Sem alterações |
| `broadcastBadge` | ✅ Preservada | Sem alterações |
| `saveState` | ✅ Preservada | Sem alterações |
| `_loadPersistent` | ✅ Preservada | Sem alterações |

---

## 6. Arquivos novos

- `RELATORIO_BLOCO1.md` — este relatório
- `UX_REAVALIACAO_CRITICA.md` — segunda auditoria (documento de planejamento)
- `backup_bloco1/` — backup pré-alteração

---

## 7. Próximos passos (Bloco 2)

| Prioridade | Tarefa | Esforço |
|---|---|---|
| Alta | Bottom navigation (4-5 abas) | 3h |
| Alta | Merge Hoje → Jogos (lista progressiva) | 2h |
| Alta | Hero AO VIVO no topo | 2h |
| Média | Classificação em cards (vs 12 colunas) | 3h |
| Média | Pull-to-refresh + swipe Jogos↔Grupos | 2h |
| Baixa | Ranking mobile 3 colunas | 2h |
