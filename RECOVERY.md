# Plano de Recuperação — Copa2026

**Última atualização:** 2026-06-20

Procedimentos passo-a-passo para cada cenário de falha. Mantenha este documento acessível mesmo offline.

---

## Índice

- [Cenário A — HTML corrompido](#cenário-a--html-corrompido)
- [Cenário B — Worker quebrado](#cenário-b--worker-quebrado)
- [Cenário C — Supabase perdido (dados do bolão)](#cenário-c--supabase-perdido-dados-do-bolão)
- [Cenário D — Falha do GitHub Pages](#cenário-d--falha-do-github-pages)
- [Cenário E — Falha total (tudo ao mesmo tempo)](#cenário-e--falha-total-tudo-ao-mesmo-tempo)
- [Checklists de verificação pós-recuperação](#checklists-de-verificação-pós-recuperação)

---

## Cenário A — HTML corrompido

**Sintomas:** Site não carrega, JS errors no console, elementos da página quebrados.

**Tempo estimado:** 5–10 minutos

**Procedimento:**

1. Acessar o repositório local em `Copa2026_repo/`
2. Backup do HTML atual (caso ainda não exista):
   ```powershell
   Copy-Item index.html index.html.emergency -Force
   ```
3. Restaurar do backup local:
   ```powershell
   Copy-Item index.html.backup index.html -Force
   Copy-Item copa2026.html.backup copa2026.html -Force
   ```
4. Verificar se o site funciona abrindo `index.html` localmente
5. Commit e push:
   ```powershell
   git add index.html copa2026.html
   git commit -m "hotfix: restaura HTML do backup"
   git push
   ```
6. Aguardar 1–2 minutos para o GitHub Pages atualizar
7. Verificar em https://lfgobbo.github.io/Copa2026/

**Ferramentas:** `git`, navegador, console F12

---

## Cenário B — Worker quebrado

**Sintomas:** Login não funciona, palpites não salvam, ranking vazio. Erro no console do Worker (dashboard Cloudflare).

**Tempo estimado:** 5 minutos

**Procedimento:**

1. Acessar dash.cloudflare.com → Workers & Pages → `copa2026-bolao`
2. Clicar em "Quick Edit"
3. Abrir o arquivo local `bolao-worker.js.backup` (backup automático do último deploy)
4. Copiar TODO o conteúdo do backup
5. Colar no editor do Cloudflare, substituindo o conteúdo atual
6. Clicar "Save and Deploy"
7. Verificar endpoints:
   ```powershell
   curl https://copa2026-bolao.luizfelipegobbo.workers.dev/health
   # Deve retornar: {"ok":true,...}
   ```
8. Testar login no site

**Se o backup também estiver corrompido:**
1. Último recurso: restaurar de um commit git anterior que continha `bolao-worker.js`
2. Verificar `git log --oneline -- bolao-worker.js` para encontrar o último commit estável
3. `git checkout <hash> -- bolao-worker.js`
4. Deploy manual via dashboard Cloudflare

**Ferramentas:** Cloudflare Dashboard, `bolao-worker.js.backup`, `git`

---

## Cenário C — Supabase perdido (dados do bolão)

**Sintomas:** Participantes não encontrados, palpites zerados, ranking vazio. Confirmação no dashboard Supabase: tabelas vazias ou com dados corrompidos.

**Tempo estimado:** 30 minutos

**Procedimento (restaurar do último backup local):**

1. Verificar se existe backup em `Copa2026_repo/backups/`:
   ```powershell
   Get-ChildItem Copa2026_repo/backups/ | Sort-Object LastWriteTime -Descending | Select-Object -First 10
   ```
2. Identificar o backup mais recente (timestamp no nome do arquivo)
3. Acessar supabase.com/dashboard → Project `etbezmraylbvlnycltha` → SQL Editor
4. Para cada tabela, criar o INSERT a partir do JSON de backup:
   - Abrir o arquivo JSON de backup (ex: `participants_20260620_120000.json`)
   - Gerar SQL INSERT para cada registro
   - Executar no SQL Editor do Supabase

   Exemplo de template SQL para participants:
   ```sql
   INSERT INTO participants (id, name, password, confirmed, confirmed_at, created_at)
   VALUES ('uuid-aqui', 'Nome', 'hash-aqui', true, 'timestamp', 'timestamp');
   ```
5. Verificar se os dados foram restaurados:
   ```sql
   SELECT COUNT(*) FROM participants;
   SELECT COUNT(*) FROM picks;
   SELECT COUNT(*) FROM special_picks;
   ```

**Se não houver backup local:**
> ⚠️ **Dados perdidos permanentemente.** Sem backup, o Supabase free tier não oferece Point-in-Time Recovery. A única opção é recriar os participantes manualmente e pedir que refaçam os palpites.

**Ferramentas:** Supabase Dashboard, SQL Editor, arquivos JSON em `backups/`

---

## Cenário D — Falha do GitHub Pages

**Sintomas:** https://lfgobbo.github.io/Copa2026/ retorna 404 ou 500.

**Tempo estimado:** 5 minutos

**Procedimento:**

1. Usar o fallback do Worker:
   ```
   https://copa2026-bolao.luizfelipegobbo.workers.dev/app
   ```
   Este endpoint serve o site completo do cache do Cloudflare.

2. Notificar os usuários (WhatsApp/grupo) sobre o link alternativo

3. Tentar re-deploy do GitHub Pages:
   ```powershell
   git commit --allow-empty -m "chore: trigger gh-pages rebuild"
   git push
   ```
   OU acessar Settings → Pages → "Build and deployment" → clicar "Deploy"

4. Verificar status em github.com/LFGobbo/Copa2026/actions

**Ferramentas:** Worker URL, GitHub Dashboard, GitHub Actions

---

## Cenário E — Falha total (tudo ao mesmo tempo)

**Sintomas:** GitHub Pages + Worker + Supabase offline simultaneamente.

**Tempo estimado:** 2 horas

**Procedimento:**

1. **Prioridade 1 — Restaurar o site (estático):**
   - Fazer deploy do `index.html.backup` para qualquer host estático (Netlify, Vercel, ou até localmente via `npx serve`)
   - Ou usar cached version do Service Worker (se o navegador do usuário tiver visitado antes)

2. **Prioridade 2 — Restaurar o Worker:**
   - Seguir [Cenário B](#cenário-b--worker-quebrado)

3. **Prioridade 3 — Restaurar o Supabase:**
   - Seguir [Cenário C](#cenário-c--supabase-perdido-dados-do-bolão)

4. **Prioridade 4 — Notificar usuários:**
   - Informar sobre a indisponibilidade
   - Prazo de tolerância: 24h para reenvio de palpites após restauração

---

## Checklists de verificação pós-recuperação

### Após restaurar HTML
- [ ] Página carrega sem erros no console
- [ ] Aba Jogos exibe os 104 jogos
- [ ] Aba Grupos mostra as 12 tabelas
- [ ] Aba Artilharia funciona
- [ ] Aba Convocados carrega players.json
- [ ] Aba Bolão exibe o ranking público

### Após restaurar Worker
- [ ] `GET /health` retorna 200
- [ ] `GET /ranking` retorna participantes + picks
- [ ] Login funciona (`POST /login`)
- [ ] Salvar pick funciona (`POST /picks`)
- [ ] Salvar especial funciona (`POST /special-picks`)

### Após restaurar Supabase
- [ ] `SELECT COUNT(*) FROM participants` ≥ 31
- [ ] `SELECT COUNT(*) FROM picks` ≥ 2900
- [ ] `SELECT COUNT(*) FROM special_picks` ≥ 25
- [ ] Testar login de 2 participantes aleatórios
- [ ] Verificar ranking reflete os picks restaurados

---

## Referências

| Recurso | Localização |
|---|---|
| HTML backup | `index.html.backup` no repo |
| Worker backup | `bolao-worker.js.backup` no repo |
| Supabase dump | `backups/*.json` no repo |
| Supabase dashboard | supabase.com/dashboard |
| Cloudflare dashboard | dash.cloudflare.com |
| GitHub repo | github.com/LFGobbo/Copa2026 |
| GitHub Pages | lfgobbo.github.io/Copa2026 |
| Worker URL | copa2026-bolao.luizfelipegobbo.workers.dev |
| Worker fallback | copa2026-bolao.luizfelipegobbo.workers.dev/app |
| Credenciais | CREDENCIAIS_COPA2026.md (fora do repo) |
