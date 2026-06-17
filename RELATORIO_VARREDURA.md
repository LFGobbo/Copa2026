# Varredura Técnica — Copa do Mundo 2026 (Copa2026)
**Data:** 17/06/2026
**Método:** leitura de código + testes reais em Node.js com dados de produção (GAMES/GROUPS extraídos do index.html), seguindo a "Regra de Ouro" do AGENTS.md (testar antes de teorizar).
**Escopo:** index.html (frontend completo), bolao-worker.js (Cloudflare Worker), SQLs do Supabase, sw.js, scripts PowerShell.

---

## 🔴 Críticos (afetam dinheiro/prêmios reais ou expõem dados)

### 1. Anon key do Supabase exposta + RLS desabilitado → acesso direto sem autenticação
**Onde:** `index.html` linha ~2772 (função `bolaoShowParcial`), `supabase-migration.sql` linhas 18-21.

O código contém a `anon key` do Supabase em texto puro, visível a qualquer pessoa que abra o DevTools. Isso por si só é normal (chaves anon são públicas por design) — o problema é que o `supabase-migration.sql` **desabilita explicitamente o RLS** (Row Level Security) nas tabelas `participants`, `picks`, `special_picks` e `pick_history`, justificando que "a anon key não tem mais acesso direto". Essa premissa está errada: a própria aplicação usa essa anon key para acessar `special_picks` diretamente, sem passar pelo Worker.

**Impacto real:** qualquer pessoa com essa chave (extraível do código-fonte público) pode ler ou escrever diretamente nessas 4 tabelas via REST API do Supabase — incluindo inserir/alterar palpites de qualquer participante, sem precisar de login, JWT, ou respeitar nenhum prazo. Isso ultrapassa em gravidade qualquer validação que o Worker tenta impor, porque ele simplesmente pode ser contornado.

**Recomendação:** reabilitar RLS nessas 4 tabelas com políticas que restrinjam o acesso da `anon key` a leitura pública apenas de campos não sensíveis (ex: nome do participante, ranking), e nenhuma escrita. Toda escrita deve continuar exclusivamente pelo Worker com `service_role` key.

### 2. `POST /picks` e `PATCH /confirm` no Worker não validam prazo nem completude
**Onde:** `bolao-worker.js` linhas 127-139 e 209-213.

O frontend (`bolaoSavePick`, `bolaoConfirmAll`) valida no JS do navegador que o palpite só pode ser salvo até 2h antes do jogo, e que a confirmação só ocorre com todos os palpites preenchidos. **O Worker (backend) não repete nenhuma dessas validações.** Qualquer usuário autenticado pode chamar a API diretamente (via `fetch` no console do navegador, por exemplo) e:
- Enviar/alterar um palpite depois do jogo já ter começado ou terminado (sabendo o resultado real)
- Confirmar a participação com 0 palpites preenchidos

**Recomendação:** mover as validações de deadline e completude para o Worker, que é a única barreira que de fato não pode ser contornada pelo usuário.

### 3. 3º colocados do mata-mata: atribuição de slot ignora a regra de exclusão de grupo da FIFA
**Onde:** `index.html`, `_THIRD_SLOTS` (linha 634) e seu uso em `resolveTeam`/`_bolaoResolveTeam`.

Testei e confirmei: a regra oficial da FIFA (Anexo C do regulamento) define, para cada um dos 8 jogos que recebem um 3º colocado, um **subconjunto específico de grupos elegíveis** — justamente para impedir que um time enfrente, na Rodada de 32, o 1º colocado do próprio grupo. Exemplo real (confirmado via busca): jogo 74 = 1º Grupo E vs melhor 3º entre grupos A/B/C/D/F (E está excluído); jogo 79 = 1º Grupo A vs melhor 3º entre C/E/F/H/I (A está excluído).

O código atual ignora completamente essa exclusão: ele ordena os 12 terceiros colocados por pontos/SG/gols e atribui simplesmente por **posição no ranking geral** (`_THIRD_SLOTS.indexOf(gameN)` → `thirds[slotIdx]`), sem checar de qual grupo vem cada time. Provei com um teste controlado que isso pode (e eventualmente vai, dependendo da combinação real de resultados) colocar o 3º colocado do Grupo A para jogar contra o 1º colocado do próprio Grupo A.

**Impacto:** esse é o módulo mais usado do bolão (define o bracket inteiro do mata-mata) e pode gerar uma simulação de chaveamento **incorreta**, divergente do anúncio oficial da FIFA, afetando a pontuação calculada de todo mundo no bolão a partir da Rodada de 32.

**Recomendação:** implementar a tabela real (Anexo C — 495 combinações) ou, no mínimo, um algoritmo que respeite a exclusão de grupo ao montar os slots. Vale revisar como o sorteio real for anunciado pela FIFA antes do início do mata-mata, já que a atribuição final só é conhecida depois que os 8 melhores terceiros são definidos.

---

## 🟠 Importantes (lógica incorreta, mas cenários mais raros ou de menor impacto)

### 4. Desempate cíclico de 3 times produz resultado não-determinístico
**Onde:** `_groupStandings()` e `_bolaoGroupStandings()`, comparador usado em `Array.sort()`.

Quando 3 times empatam em pontos, saldo de gols e gols marcados formando um "ciclo" de confrontos diretos (A bate B, B bate C, C bate A), o comparador pairwise usado no `sort()` não é transitivo. Provei isso invertendo a ordem do array de entrada (`GROUPS['C'].reverse()`) sem mudar nenhum placar: a classificação mudou de `[Brasil, Escócia, Marrocos]` para `[Escócia, Marrocos, Brasil]`. A regra real da FIFA prevê sorteio nesse caso raro — o app não tem esse mecanismo e, em vez disso, depende de um efeito colateral do motor de ordenação do navegador.

**Recomendação:** detectar esse cenário e, ou aplicar os critérios extras da FIFA (cartões/fair play, ranking FIFA), ou ao menos fixar a ordem de forma determinística e documentada (ex: sempre ordem alfabética) em vez de depender do `sort()`.

### 5. Matching de nome do artilheiro usa substring bidirecional (`indexOf`)
**Onde:** `bolaoCalcTotal`, função `matchName` (linha ~1937).

Testei: `matchName('Endrick', 'Rick')` retorna `true`. Qualquer nome de jogador que seja substring textual de outro (em qualquer direção) é tratado como o mesmo jogador. Isso pode gerar pontuação indevida (10 ou 20 pontos de bônus) no palpite especial de artilheiro, caso dois jogadores diferentes do torneio tenham nomes com essa relação.

**Recomendação:** usar comparação exata (após normalização de acentos/case), com um mapeamento explícito de variações de grafia conhecidas, em vez de substring matching.

### 6. `gameIsPast`/`isGameLive`: limiar de 2h30 pode ser insuficiente para jogos com prorrogação + pênaltis
**Onde:** linhas 204 e 219 do `main.js`, constante `9000000` (ms).

Calculei: 90min + intervalo + 30min de prorrogação + intervalo + pênaltis + acréscimos típicos facilmente passam de 2h45min reais. Se o placar parcial já estiver salvo (atualização em tempo real durante o jogo), o app pode marcar erroneamente um jogo como "encerrado" enquanto a prorrogação/pênaltis ainda rolam, afetando badges de "AO VIVO" e possivelmente o travamento de edição de palpites.

**Recomendação:** aumentar o limiar para 3h15-3h30 quando o jogo é de mata-mata (que pode ter prorrogação), mantendo 2h30 só para fase de grupos.

### 7. Documentação desincronizada do código: backup automático do Worker não existe
**Onde:** AGENTS.md seção 17 vs. `deploy-worker.ps1`.

O AGENTS.md afirma "Backup automático: Copy-Item bolao-worker.js bolao-worker.js.backup" a cada deploy, mas o script real não contém essa linha. Cada deploy sobrescreve o Worker no Cloudflare sem nenhum backup automático local, dependendo inteiramente de disciplina manual.

**Recomendação:** adicionar a linha de backup no início do `deploy-worker.ps1`, ou corrigir a documentação para refletir o processo manual real.

---

## 🟡 Menores / observações

### 8. Service Worker pode mascarar erros de rede de APIs externas como HTML
**Onde:** `sw.js` linha 49-51.

O fallback genérico `fetch(e.request).catch(() => caches.match('index.html'))` intercepta qualquer requisição da página, incluindo chamadas ao Worker do bolão e à API da FIFA (cross-origin). Se essas chamadas falharem por rede, o SW devolve o HTML da página como se fosse a resposta da API, podendo causar erros de parse JSON silenciosos no código que espera JSON.

**Recomendação:** restringir esse fallback a navegações de página (`e.request.mode === 'navigate'`), não a toda e qualquer requisição.

### 9. Loop de retry sem limite em `fetchSquads`/`fetchCalendar`
**Onde:** `initFifaMaps()`, linha 1175.

Se `FIFA_TEAM_IDS` nunca for populado (API da FIFA indisponível persistentemente), o código entra em `fetchCalendar().then(fetchSquads)` repetidamente sem número máximo de tentativas nem backoff crescente. Em uma falha prolongada da API da FIFA, isso pode gerar tráfego de rede desnecessário e contínuo no navegador do usuário.

**Recomendação:** adicionar um contador de tentativas máximas com backoff exponencial, similar ao que já existe em `_bolaoFetch`.

### 10. Merge de IndexedDB usa "first-write-wins" em vez de "newest-wins"
**Onde:** linhas 113-121, callback de carregamento do IndexedDB.

O merge entre `localStorage` e `IndexedDB` só preenche chaves ausentes (`if(!scores[k])`), nunca substitui um valor já presente mesmo que o IndexedDB tenha dado mais recente. Hoje os dois são escritos juntos via `saveState()`, então o risco prático é baixo, mas é uma fragilidade arquitetural caso a sincronia entre os dois armazenamentos se perca em algum cenário futuro.

---

## ✅ Testado e confirmado correto (sem bug encontrado)

- `_groupStandings`/`_bolaoGroupStandings`: pontos, saldo de gols, gols marcados e desempate por confronto direto (H2H) par-a-par — todos calculados corretamente em múltiplos cenários testados com dados reais.
- `bolaoCalcPickPts`: a tabela de pontuação (10/6/4/2/0) responde corretamente a todos os cenários testados, incluindo casos de borda (placares invertidos, empates).
- `_bolaoWinnerOf`/`_bolaoResolveTeam` para "V. Jogo N" e "Perd. Jogo N": resolvem corretamente o vencedor/perdedor em cascata através de múltiplas rodadas.
- O bug histórico do jogo 75 mencionado no AGENTS.md (resolução incorreta de placeholder) não foi reproduzido — parece já corrigido.
- Estrutura de dados: 104 jogos, todos presentes, sem duplicatas; 72 jogos de grupo + 32 de mata-mata confirmados.
- Scripts `sync.ps1` e `backup-supabase.ps1`: sem bugs identificados.
- `.gitignore`: protege corretamente `.worker-token` e `.supabase-key` (as chaves verdadeiramente secretas).

---

## Resumo executivo

Os achados mais urgentes para corrigir, em ordem de prioridade, são o item 1 (RLS desabilitado + anon key exposta — risco de manipulação externa de dados do bolão) e o item 2 (Worker sem validação server-side de prazo). Juntos, eles significam que a integridade dos palpites e do ranking do bolão depende inteiramente da boa-fé dos participantes, sem nenhuma barreira técnica real impedindo trapaça. O item 3 (slots de 3º colocado) é o bug de lógica mais sério porque afeta diretamente a precisão da simulação do mata-mata para todos os participantes, mesmo sem nenhuma má-fé envolvida.
