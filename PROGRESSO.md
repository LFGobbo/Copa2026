# COPA DO MUNDO 2026 — APP HTML v3

## Estado (10 Jun 2026)

### CORRIGIDO
- [x] Nomes acentuados corretos (México, África do Sul, etc.) — encoding UTF-8 limpo
- [x] Bandeiras funcionando (FLAG_UNICODE com nomes corretos)
- [x] Ordem grupos A-L corrigida (GROUP_ORDER no JS)
- [x] 12 grupos com 4 times cada (extraídos do _Dados col5)
- [x] Jogo do 3º lugar: game 103, fase "3º Lugar"
- [x] Abas maiores (padding: 16px 24px, font 14px, ícones 18px)
- [x] Header: bola à esquerda (100px, object-fit), mascotes à direita
- [x] Nomes das fases do bracket normalizados ("Oitavas de Final", "Quartas de Final", "3º Lugar")

### NOVAS FEATURES
- [x] **Contagem regressiva**: até início da Copa, depois até cada jogo
- [x] **Jogos ao vivo**: card com borda verde + "● AO VIVO" + pulsação
- [x] **Aba Convocados**: lista de jogadores por time, numeração, avatar com iniciais
- [x] **Tabela de 3ºs colocados**: ranking dos 8 melhores, classificação/eliminação

### DADOS
- 104 jogos (GAMES), UTF-8 limpo
- 12 grupos (GROUPS), A-L ordenados
- 48 times, 1101 jogadores (PLAYERS)
- Bandeiras em Unicode escapes (sem corrupção do PowerShell)

### ARQUIVOS
- copa2026.html (v3 final, ~120 KB)
- copa2026_v3.html (backup)
- copa2026_v2.html (v2 anterior com CSS melhorado mas dados corrompidos)
- PROGRESSO.md (este arquivo)
