// Cloudflare Worker — Copa2026 Bolão (v20.3 — reabertura mata-mata: picks_reopen + phase_reopen)
// ENV vars (configurar no dashboard):
//   SUPABASE_URL  — https://etbezmraylbvlnycltha.supabase.co
//   SUPABASE_KEY  — service_role key (NÃO a anônima!)
//   TURNSTILE_SEC — Secret key do Turnstile
//   JWT_SECRET    — Qualquer string para assinar tokens
//   ADMIN_KEY     — Chave secreta para reset/unlock (endpoints administrativos destrutivos)
//   ADMIN_HASH    — SHA-256('BolaoAdmin2026!' + ':' + JWT_SECRET)
//   CRON_SECRET   — Chave separada para o endpoint /cron (cron-job.org ou CF Cron)
//                   Use um valor DIFERENTE de ADMIN_KEY para isolar permissões:
//                   quem tem CRON_SECRET pode disparar o cron, mas NÃO pode resetar o bolão.

addEventListener('fetch', function (event) {
  event.respondWith(handle(event.request));
});
addEventListener('scheduled', function (event) {
  var cronSecret = (typeof CRON_SECRET !== 'undefined' && CRON_SECRET) ? CRON_SECRET : ADMIN_KEY;
  event.waitUntil(handle(new Request('https://worker/cron?secret=' + cronSecret + '&task=all')));
});

var CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Admin-Key',
};

// ── Dados mínimos do calendário (espelha GAMES do index.html) ──
// Usado SOMENTE para validar prazos de palpite no servidor (deadline check).
// Mantenha sincronizado com o array GAMES do index.html se as datas/horários mudarem.
var BOLAO_GAMES = [{"n":1,"d":"11/06 Qui","t":"16:00","f":"Grupo A"},{"n":2,"d":"11/06 Qui","t":"23:00","f":"Grupo A"},{"n":3,"d":"12/06 Sex","t":"16:00","f":"Grupo B"},{"n":4,"d":"12/06 Sex","t":"22:00","f":"Grupo D"},{"n":5,"d":"13/06 Sáb","t":"16:00","f":"Grupo B"},{"n":6,"d":"13/06 Sáb","t":"19:00","f":"Grupo C"},{"n":7,"d":"13/06 Sáb","t":"22:00","f":"Grupo C"},{"n":8,"d":"14/06 Dom","t":"01:00","f":"Grupo D"},{"n":9,"d":"14/06 Dom","t":"14:00","f":"Grupo E"},{"n":10,"d":"14/06 Dom","t":"17:00","f":"Grupo F"},{"n":11,"d":"14/06 Dom","t":"20:00","f":"Grupo E"},{"n":12,"d":"14/06 Dom","t":"23:00","f":"Grupo F"},{"n":13,"d":"15/06 Seg","t":"13:00","f":"Grupo H"},{"n":14,"d":"15/06 Seg","t":"16:00","f":"Grupo G"},{"n":15,"d":"15/06 Seg","t":"19:00","f":"Grupo H"},{"n":16,"d":"15/06 Seg","t":"22:00","f":"Grupo G"},{"n":17,"d":"16/06 Ter","t":"22:00","f":"Grupo J"},{"n":18,"d":"16/06 Ter","t":"16:00","f":"Grupo I"},{"n":19,"d":"16/06 Ter","t":"19:00","f":"Grupo I"},{"n":20,"d":"17/06 Qua","t":"01:00","f":"Grupo J"},{"n":21,"d":"17/06 Qua","t":"14:00","f":"Grupo K"},{"n":22,"d":"17/06 Qua","t":"17:00","f":"Grupo L"},{"n":23,"d":"17/06 Qua","t":"20:00","f":"Grupo L"},{"n":24,"d":"17/06 Qua","t":"23:00","f":"Grupo K"},{"n":25,"d":"18/06 Qui","t":"13:00","f":"Grupo A"},{"n":26,"d":"18/06 Qui","t":"16:00","f":"Grupo B"},{"n":27,"d":"18/06 Qui","t":"19:00","f":"Grupo B"},{"n":28,"d":"18/06 Qui","t":"22:00","f":"Grupo A"},{"n":29,"d":"19/06 Sex","t":"01:00","f":"Grupo D"},{"n":30,"d":"19/06 Sex","t":"16:00","f":"Grupo D"},{"n":31,"d":"19/06 Sex","t":"19:00","f":"Grupo C"},{"n":32,"d":"19/06 Sex","t":"21:30","f":"Grupo C"},{"n":33,"d":"20/06 Sáb","t":"14:00","f":"Grupo F"},{"n":34,"d":"20/06 Sáb","t":"17:00","f":"Grupo E"},{"n":35,"d":"20/06 Sáb","t":"21:00","f":"Grupo E"},{"n":36,"d":"21/06 Dom","t":"01:00","f":"Grupo F"},{"n":37,"d":"21/06 Dom","t":"13:00","f":"Grupo H"},{"n":38,"d":"21/06 Dom","t":"16:00","f":"Grupo G"},{"n":39,"d":"21/06 Dom","t":"19:00","f":"Grupo H"},{"n":40,"d":"21/06 Dom","t":"22:00","f":"Grupo G"},{"n":41,"d":"22/06 Seg","t":"14:00","f":"Grupo J"},{"n":42,"d":"22/06 Seg","t":"18:00","f":"Grupo I"},{"n":43,"d":"22/06 Seg","t":"21:00","f":"Grupo I"},{"n":44,"d":"23/06 Ter","t":"00:00","f":"Grupo J"},{"n":45,"d":"23/06 Ter","t":"14:00","f":"Grupo K"},{"n":46,"d":"23/06 Ter","t":"17:00","f":"Grupo L"},{"n":47,"d":"23/06 Ter","t":"20:00","f":"Grupo L"},{"n":48,"d":"23/06 Ter","t":"23:00","f":"Grupo K"},{"n":50,"d":"24/06 Qua","t":"16:00","f":"Grupo B"},{"n":49,"d":"24/06 Qua","t":"16:00","f":"Grupo B"},{"n":52,"d":"24/06 Qua","t":"19:00","f":"Grupo C"},{"n":51,"d":"24/06 Qua","t":"19:00","f":"Grupo C"},{"n":54,"d":"24/06 Qua","t":"22:00","f":"Grupo A"},{"n":53,"d":"24/06 Qua","t":"22:00","f":"Grupo A"},{"n":56,"d":"25/06 Qui","t":"17:00","f":"Grupo E"},{"n":55,"d":"25/06 Qui","t":"17:00","f":"Grupo E"},{"n":58,"d":"25/06 Qui","t":"20:00","f":"Grupo F"},{"n":57,"d":"25/06 Qui","t":"20:00","f":"Grupo F"},{"n":60,"d":"25/06 Qui","t":"23:00","f":"Grupo D"},{"n":59,"d":"25/06 Qui","t":"23:00","f":"Grupo D"},{"n":62,"d":"26/06 Sex","t":"16:00","f":"Grupo I"},{"n":61,"d":"26/06 Sex","t":"16:00","f":"Grupo I"},{"n":64,"d":"26/06 Sex","t":"21:00","f":"Grupo H"},{"n":63,"d":"26/06 Sex","t":"21:00","f":"Grupo H"},{"n":66,"d":"27/06 Sáb","t":"00:00","f":"Grupo G"},{"n":65,"d":"27/06 Sáb","t":"00:00","f":"Grupo G"},{"n":68,"d":"27/06 Sáb","t":"18:00","f":"Grupo L"},{"n":67,"d":"27/06 Sáb","t":"18:00","f":"Grupo L"},{"n":70,"d":"27/06 Sáb","t":"20:30","f":"Grupo K"},{"n":69,"d":"27/06 Sáb","t":"20:30","f":"Grupo K"},{"n":72,"d":"27/06 Sáb","t":"23:00","f":"Grupo J"},{"n":71,"d":"27/06 Sáb","t":"23:00","f":"Grupo J"},{"n":73,"d":"28/06 Dom","t":"16:00","f":"Rodada de 32"},{"n":76,"d":"29/06 Seg","t":"14:00","f":"Rodada de 32"},{"n":74,"d":"29/06 Seg","t":"17:30","f":"Rodada de 32"},{"n":75,"d":"29/06 Seg","t":"22:00","f":"Rodada de 32"},{"n":78,"d":"30/06 Ter","t":"14:00","f":"Rodada de 32"},{"n":77,"d":"30/06 Ter","t":"18:00","f":"Rodada de 32"},{"n":79,"d":"30/06 Ter","t":"22:00","f":"Rodada de 32"},{"n":80,"d":"01/07 Qua","t":"13:00","f":"Rodada de 32"},{"n":82,"d":"01/07 Qua","t":"17:00","f":"Rodada de 32"},{"n":81,"d":"01/07 Qua","t":"21:00","f":"Rodada de 32"},{"n":84,"d":"02/07 Qui","t":"16:00","f":"Rodada de 32"},{"n":83,"d":"02/07 Qui","t":"20:00","f":"Rodada de 32"},{"n":85,"d":"03/07 Sex","t":"00:00","f":"Rodada de 32"},{"n":88,"d":"03/07 Sex","t":"15:00","f":"Rodada de 32"},{"n":86,"d":"03/07 Sex","t":"19:00","f":"Rodada de 32"},{"n":87,"d":"03/07 Sex","t":"22:30","f":"Rodada de 32"},{"n":89,"d":"04/07 Sáb","t":"18:00","f":"Oitavas de Final"},{"n":90,"d":"04/07 Sáb","t":"14:00","f":"Oitavas de Final"},{"n":91,"d":"05/07 Dom","t":"17:00","f":"Oitavas de Final"},{"n":92,"d":"05/07 Dom","t":"21:00","f":"Oitavas de Final"},{"n":93,"d":"06/07 Seg","t":"16:00","f":"Oitavas de Final"},{"n":94,"d":"06/07 Seg","t":"21:00","f":"Oitavas de Final"},{"n":95,"d":"07/07 Ter","t":"13:00","f":"Oitavas de Final"},{"n":96,"d":"07/07 Ter","t":"17:00","f":"Oitavas de Final"},{"n":97,"d":"09/07 Qui","t":"17:00","f":"Quartas de Final"},{"n":98,"d":"10/07 Sex","t":"16:00","f":"Quartas de Final"},{"n":99,"d":"11/07 Sáb","t":"18:00","f":"Quartas de Final"},{"n":100,"d":"11/07 Sáb","t":"22:00","f":"Quartas de Final"},{"n":101,"d":"14/07 Ter","t":"16:00","f":"Semifinal"},{"n":102,"d":"15/07 Qua","t":"16:00","f":"Semifinal"},{"n":103,"d":"18/07 Sáb","t":"18:00","f":"3º Lugar"},{"n":104,"d":"19/07 Dom","t":"16:00","f":"Final"}];
var BOLAO_GAME_BY_ID = {};
BOLAO_GAMES.forEach(function (g) { BOLAO_GAME_BY_ID[g.n] = g; });
var BOLAO_FIRST = 6;
var BOLAO_DEADLINE_MS = 7200000; // 2 horas antes do jogo (espelha BOLAO_TWO_H do frontend)
var BOLAO_REOPEN_DEADLINE_MS = 300000; // 5 minutos antes do 1º jogo da fase (reabertura)

// ── Bracket resolution (v20.33) ──
// Port fiel da lógica de chaveamento do frontend (index.html: _resolveGroupOrder,
// _groupStandings/_bolaoGroupStandings, _rankedThirds/_bolaoRankedThirds, Anexo C da FIFA,
// _winnerOf/_bolaoWinnerOf, resolveTeam/_bolaoResolveTeam) para o Worker poder calcular
// corretamente se cada participante "acertou o confronto" (acertouConfronto) num jogo de
// mata-mata, e assim aplicar useFullTable/bônus de fase igual ao frontend (regra v20.22).
// Fonte extraída e conferida linha a linha do index.html em 2026-07-07.
var GROUPS = {"A":["África do Sul","Coreia do Sul","México","República Tcheca"],"B":["Bósnia","Canadá","Catar","Suíça"],"C":["Brasil","Escócia","Haiti","Marrocos"],"D":["Austrália","Estados Unidos","Paraguai","Turquia"],"E":["Alemanha","Costa do Marfim","Curaçao","Equador"],"F":["Holanda","Japão","Suécia","Tunísia"],"G":["Bélgica","Egito","Irã","Nova Zelândia"],"H":["Arábia Saudita","Cabo Verde","Espanha","Uruguai"],"I":["França","Iraque","Noruega","Senegal"],"J":["Argentina","Argélia","Áustria","Jordânia"],"K":["Colômbia","Portugal","RD Congo","Uzbequistão"],"L":["Croácia","Gana","Inglaterra","Panamá"]};
var GROUP_NAMES = {"A":"Grupo A","B":"Grupo B","C":"Grupo C","D":"Grupo D","E":"Grupo E","F":"Grupo F","G":"Grupo G","H":"Grupo H","I":"Grupo I","J":"Grupo J","K":"Grupo K","L":"Grupo L"};
var GROUP_ORDER = ["A","B","C","D","E","F","G","H","I","J","K","L"];
var FIFA_RANK={"Argentina":1,"Espanha":2,"França":3,"Inglaterra":4,"Portugal":5,"Brasil":6,"Marrocos":7,"Holanda":8,"Bélgica":9,"Alemanha":10,"Croácia":11,"Colômbia":13,"México":14,"Senegal":15,"Uruguai":16,"Estados Unidos":17,"Japão":18,"Suíça":19,"Irã":20,"Turquia":22,"Equador":23,"Áustria":24,"Coreia do Sul":25,"Austrália":27,"Argélia":28,"Egito":29,"Canadá":30,"Noruega":31,"Costa do Marfim":33,"Panamá":34,"Suécia":38,"República Tcheca":40,"Paraguai":41,"Escócia":42,"Tunísia":45,"RD Congo":46,"Uzbequistão":50,"Catar":56,"Iraque":57,"África do Sul":60,"Arábia Saudita":61,"Jordânia":63,"Bósnia":64,"Cabo Verde":67,"Gana":73,"Curaçao":82,"Haiti":83,"Nova Zelândia":85};

// Espelha o array GAMES do frontend, mas só com os campos necessários pro chaveamento (n,a,b,f).
// IMPORTANTE: manter sincronizado com GAMES do index.html caso os placeholders de chaveamento mudem.
var BOLAO_GAMES_AB = [{"n":1,"a":"México","b":"África do Sul","f":"Grupo A","d":"11/06 Qui","t":"16:00"},{"n":2,"a":"Coreia do Sul","b":"República Tcheca","f":"Grupo A","d":"11/06 Qui","t":"23:00"},{"n":3,"a":"Canadá","b":"Bósnia","f":"Grupo B","d":"12/06 Sex","t":"16:00"},{"n":4,"a":"Estados Unidos","b":"Paraguai","f":"Grupo D","d":"12/06 Sex","t":"22:00"},{"n":5,"a":"Catar","b":"Suíça","f":"Grupo B","d":"13/06 Sáb","t":"16:00"},{"n":6,"a":"Brasil","b":"Marrocos","f":"Grupo C","d":"13/06 Sáb","t":"19:00"},{"n":7,"a":"Haiti","b":"Escócia","f":"Grupo C","d":"13/06 Sáb","t":"22:00"},{"n":8,"a":"Austrália","b":"Turquia","f":"Grupo D","d":"14/06 Dom","t":"01:00"},{"n":9,"a":"Alemanha","b":"Curaçao","f":"Grupo E","d":"14/06 Dom","t":"14:00"},{"n":10,"a":"Holanda","b":"Japão","f":"Grupo F","d":"14/06 Dom","t":"17:00"},{"n":11,"a":"Costa do Marfim","b":"Equador","f":"Grupo E","d":"14/06 Dom","t":"20:00"},{"n":12,"a":"Suécia","b":"Tunísia","f":"Grupo F","d":"14/06 Dom","t":"23:00"},{"n":13,"a":"Espanha","b":"Cabo Verde","f":"Grupo H","d":"15/06 Seg","t":"13:00"},{"n":14,"a":"Bélgica","b":"Egito","f":"Grupo G","d":"15/06 Seg","t":"16:00"},{"n":15,"a":"Arábia Saudita","b":"Uruguai","f":"Grupo H","d":"15/06 Seg","t":"19:00"},{"n":16,"a":"Irã","b":"Nova Zelândia","f":"Grupo G","d":"15/06 Seg","t":"22:00"},{"n":17,"a":"Argentina","b":"Argélia","f":"Grupo J","d":"16/06 Ter","t":"22:00"},{"n":18,"a":"França","b":"Senegal","f":"Grupo I","d":"16/06 Ter","t":"16:00"},{"n":19,"a":"Iraque","b":"Noruega","f":"Grupo I","d":"16/06 Ter","t":"19:00"},{"n":20,"a":"Áustria","b":"Jordânia","f":"Grupo J","d":"17/06 Qua","t":"01:00"},{"n":21,"a":"Portugal","b":"RD Congo","f":"Grupo K","d":"17/06 Qua","t":"14:00"},{"n":22,"a":"Inglaterra","b":"Croácia","f":"Grupo L","d":"17/06 Qua","t":"17:00"},{"n":23,"a":"Gana","b":"Panamá","f":"Grupo L","d":"17/06 Qua","t":"20:00"},{"n":24,"a":"Uzbequistão","b":"Colômbia","f":"Grupo K","d":"17/06 Qua","t":"23:00"},{"n":25,"a":"República Tcheca","b":"África do Sul","f":"Grupo A","d":"18/06 Qui","t":"13:00"},{"n":26,"a":"Suíça","b":"Bósnia","f":"Grupo B","d":"18/06 Qui","t":"16:00"},{"n":27,"a":"Canadá","b":"Catar","f":"Grupo B","d":"18/06 Qui","t":"19:00"},{"n":28,"a":"México","b":"Coreia do Sul","f":"Grupo A","d":"18/06 Qui","t":"22:00"},{"n":29,"a":"Turquia","b":"Paraguai","f":"Grupo D","d":"20/06 Sáb","t":"00:00"},{"n":30,"a":"Estados Unidos","b":"Austrália","f":"Grupo D","d":"19/06 Sex","t":"16:00"},{"n":31,"a":"Escócia","b":"Marrocos","f":"Grupo C","d":"19/06 Sex","t":"19:00"},{"n":32,"a":"Brasil","b":"Haiti","f":"Grupo C","d":"19/06 Sex","t":"21:30"},{"n":33,"a":"Holanda","b":"Suécia","f":"Grupo F","d":"20/06 Sáb","t":"14:00"},{"n":34,"a":"Alemanha","b":"Costa do Marfim","f":"Grupo E","d":"20/06 Sáb","t":"17:00"},{"n":35,"a":"Equador","b":"Curaçao","f":"Grupo E","d":"20/06 Sáb","t":"21:00"},{"n":36,"a":"Tunísia","b":"Japão","f":"Grupo F","d":"21/06 Dom","t":"01:00"},{"n":37,"a":"Espanha","b":"Arábia Saudita","f":"Grupo H","d":"21/06 Dom","t":"13:00"},{"n":38,"a":"Bélgica","b":"Irã","f":"Grupo G","d":"21/06 Dom","t":"16:00"},{"n":39,"a":"Uruguai","b":"Cabo Verde","f":"Grupo H","d":"21/06 Dom","t":"19:00"},{"n":40,"a":"Nova Zelândia","b":"Egito","f":"Grupo G","d":"21/06 Dom","t":"22:00"},{"n":41,"a":"Argentina","b":"Áustria","f":"Grupo J","d":"22/06 Seg","t":"14:00"},{"n":42,"a":"França","b":"Iraque","f":"Grupo I","d":"22/06 Seg","t":"18:00"},{"n":43,"a":"Noruega","b":"Senegal","f":"Grupo I","d":"22/06 Seg","t":"21:00"},{"n":44,"a":"Jordânia","b":"Argélia","f":"Grupo J","d":"23/06 Ter","t":"00:00"},{"n":45,"a":"Portugal","b":"Uzbequistão","f":"Grupo K","d":"23/06 Ter","t":"14:00"},{"n":46,"a":"Inglaterra","b":"Gana","f":"Grupo L","d":"23/06 Ter","t":"17:00"},{"n":47,"a":"Panamá","b":"Croácia","f":"Grupo L","d":"23/06 Ter","t":"20:00"},{"n":48,"a":"Colômbia","b":"RD Congo","f":"Grupo K","d":"23/06 Ter","t":"23:00"},{"n":50,"a":"Bósnia","b":"Catar","f":"Grupo B","d":"24/06 Qua","t":"16:00"},{"n":49,"a":"Suíça","b":"Canadá","f":"Grupo B","d":"24/06 Qua","t":"16:00"},{"n":52,"a":"Marrocos","b":"Haiti","f":"Grupo C","d":"24/06 Qua","t":"19:00"},{"n":51,"a":"Escócia","b":"Brasil","f":"Grupo C","d":"24/06 Qua","t":"19:00"},{"n":54,"a":"África do Sul","b":"Coreia do Sul","f":"Grupo A","d":"24/06 Qua","t":"22:00"},{"n":53,"a":"República Tcheca","b":"México","f":"Grupo A","d":"24/06 Qua","t":"22:00"},{"n":56,"a":"Curaçao","b":"Costa do Marfim","f":"Grupo E","d":"25/06 Qui","t":"17:00"},{"n":55,"a":"Equador","b":"Alemanha","f":"Grupo E","d":"25/06 Qui","t":"17:00"},{"n":58,"a":"Tunísia","b":"Holanda","f":"Grupo F","d":"25/06 Qui","t":"20:00"},{"n":57,"a":"Japão","b":"Suécia","f":"Grupo F","d":"25/06 Qui","t":"20:00"},{"n":60,"a":"Paraguai","b":"Austrália","f":"Grupo D","d":"25/06 Qui","t":"23:00"},{"n":59,"a":"Turquia","b":"Estados Unidos","f":"Grupo D","d":"25/06 Qui","t":"23:00"},{"n":62,"a":"Senegal","b":"Iraque","f":"Grupo I","d":"26/06 Sex","t":"16:00"},{"n":61,"a":"Noruega","b":"França","f":"Grupo I","d":"26/06 Sex","t":"16:00"},{"n":64,"a":"Uruguai","b":"Espanha","f":"Grupo H","d":"26/06 Sex","t":"21:00"},{"n":63,"a":"Cabo Verde","b":"Arábia Saudita","f":"Grupo H","d":"26/06 Sex","t":"21:00"},{"n":66,"a":"Nova Zelândia","b":"Bélgica","f":"Grupo G","d":"27/06 Sáb","t":"00:00"},{"n":65,"a":"Egito","b":"Irã","f":"Grupo G","d":"27/06 Sáb","t":"00:00"},{"n":68,"a":"Croácia","b":"Gana","f":"Grupo L","d":"27/06 Sáb","t":"18:00"},{"n":67,"a":"Panamá","b":"Inglaterra","f":"Grupo L","d":"27/06 Sáb","t":"18:00"},{"n":70,"a":"RD Congo","b":"Uzbequistão","f":"Grupo K","d":"27/06 Sáb","t":"20:30"},{"n":69,"a":"Colômbia","b":"Portugal","f":"Grupo K","d":"27/06 Sáb","t":"20:30"},{"n":72,"a":"Jordânia","b":"Argentina","f":"Grupo J","d":"27/06 Sáb","t":"23:00"},{"n":71,"a":"Argélia","b":"Áustria","f":"Grupo J","d":"27/06 Sáb","t":"23:00"},{"n":73,"a":"2° Grupo A","b":"2° Grupo B","f":"Rodada de 32","d":"28/06 Dom","t":"16:00"},{"n":76,"a":"1° Grupo C","b":"2° Grupo F","f":"Rodada de 32","d":"29/06 Seg","t":"14:00"},{"n":74,"a":"1° Grupo E","b":"0","f":"Rodada de 32","d":"29/06 Seg","t":"17:30"},{"n":75,"a":"1° Grupo F","b":"2° Grupo C","f":"Rodada de 32","d":"29/06 Seg","t":"22:00"},{"n":78,"a":"2° Grupo E","b":"2° Grupo I","f":"Rodada de 32","d":"30/06 Ter","t":"14:00"},{"n":77,"a":"1° Grupo I","b":"0","f":"Rodada de 32","d":"30/06 Ter","t":"18:00"},{"n":79,"a":"1° Grupo A","b":"0","f":"Rodada de 32","d":"30/06 Ter","t":"22:00"},{"n":80,"a":"1° Grupo L","b":"0","f":"Rodada de 32","d":"01/07 Qua","t":"13:00"},{"n":82,"a":"1° Grupo G","b":"0","f":"Rodada de 32","d":"01/07 Qua","t":"17:00"},{"n":81,"a":"1° Grupo D","b":"0","f":"Rodada de 32","d":"01/07 Qua","t":"21:00"},{"n":84,"a":"1° Grupo H","b":"2° Grupo J","f":"Rodada de 32","d":"02/07 Qui","t":"16:00"},{"n":83,"a":"2° Grupo K","b":"2° Grupo L","f":"Rodada de 32","d":"02/07 Qui","t":"20:00"},{"n":85,"a":"1° Grupo B","b":"0","f":"Rodada de 32","d":"03/07 Sex","t":"00:00"},{"n":88,"a":"2° Grupo D","b":"2° Grupo G","f":"Rodada de 32","d":"03/07 Sex","t":"15:00"},{"n":86,"a":"1° Grupo J","b":"2° Grupo H","f":"Rodada de 32","d":"03/07 Sex","t":"19:00"},{"n":87,"a":"1° Grupo K","b":"0","f":"Rodada de 32","d":"03/07 Sex","t":"22:30"},{"n":89,"a":"V. Jogo 74","b":"V. Jogo 77","f":"Oitavas de Final","d":"04/07 Sáb","t":"18:00"},{"n":90,"a":"V. Jogo 73","b":"V. Jogo 75","f":"Oitavas de Final","d":"04/07 Sáb","t":"14:00"},{"n":91,"a":"V. Jogo 76","b":"V. Jogo 78","f":"Oitavas de Final","d":"05/07 Dom","t":"17:00"},{"n":92,"a":"V. Jogo 79","b":"V. Jogo 80","f":"Oitavas de Final","d":"05/07 Dom","t":"21:00"},{"n":93,"a":"V. Jogo 83","b":"V. Jogo 84","f":"Oitavas de Final","d":"06/07 Seg","t":"16:00"},{"n":94,"a":"V. Jogo 81","b":"V. Jogo 82","f":"Oitavas de Final","d":"06/07 Seg","t":"21:00"},{"n":95,"a":"V. Jogo 86","b":"V. Jogo 88","f":"Oitavas de Final","d":"07/07 Ter","t":"13:00"},{"n":96,"a":"V. Jogo 85","b":"V. Jogo 87","f":"Oitavas de Final","d":"07/07 Ter","t":"17:00"},{"n":97,"a":"V. Jogo 89","b":"V. Jogo 90","f":"Quartas de Final","d":"09/07 Qui","t":"17:00"},{"n":98,"a":"V. Jogo 93","b":"V. Jogo 94","f":"Quartas de Final","d":"10/07 Sex","t":"16:00"},{"n":99,"a":"V. Jogo 91","b":"V. Jogo 92","f":"Quartas de Final","d":"11/07 Sáb","t":"18:00"},{"n":100,"a":"V. Jogo 95","b":"V. Jogo 96","f":"Quartas de Final","d":"11/07 Sáb","t":"22:00"},{"n":101,"a":"V. Jogo 97","b":"V. Jogo 98","f":"Semifinal","d":"14/07 Ter","t":"16:00"},{"n":102,"a":"V. Jogo 99","b":"V. Jogo 100","f":"Semifinal","d":"15/07 Qua","t":"16:00"},{"n":103,"a":"Perd. Jogo 101","b":"Perd. Jogo 102","f":"3º Lugar","d":"18/07 Sáb","t":"18:00"},{"n":104,"a":"V. Jogo 101","b":"V. Jogo 102","f":"Final","d":"19/07 Dom","t":"16:00"}];
var GAME_BY_ID_AB = {};
BOLAO_GAMES_AB.forEach(function (g) { GAME_BY_ID_AB[g.n] = g; });

// Tiebreak em cascata: fase 0 = confronto direto, 1 = saldo/gols geral, 2 = fair play
// (não implementado no Worker — sempre 0, mesma aproximação que o frontend usa na simulação
// do bolão via _bolaoGroupStandings; só afeta o raríssimo caso de empate total até a fase 2),
// 3 = ranking FIFA, 4 = alfabética.
function bracketResolveGroupOrder(teams, pts, gf, ga, groupGames, getScore, getConduct) {
  var withPts = teams.map(function (t) { return { team: t, pts: pts[t] }; });
  withPts.sort(function (a, b) { return b.pts - a.pts; });
  var blocks = [], i = 0;
  while (i < withPts.length) {
    var j = i + 1;
    while (j < withPts.length && withPts[j].pts === withPts[i].pts) j++;
    blocks.push(withPts.slice(i, j).map(function (x) { return x.team; }));
    i = j;
  }
  var result = [];
  function resolveBlock(block, phase) {
    if (block.length <= 1) { if (block.length === 1) result.push(block[0]); return; }
    var cmp;
    if (phase === 0) {
      var h2hPts = {}, h2hGf = {}, h2hGa = {};
      block.forEach(function (t) { h2hPts[t] = 0; h2hGf[t] = 0; h2hGa[t] = 0; });
      groupGames.forEach(function (g) {
        if (block.indexOf(g.a) < 0 || block.indexOf(g.b) < 0) return;
        var s = getScore(g.n); if (!s || s.a === undefined || s.b === undefined) return;
        h2hGf[g.a] += s.a; h2hGa[g.a] += s.b; h2hGf[g.b] += s.b; h2hGa[g.b] += s.a;
        if (s.a > s.b) h2hPts[g.a] += 3; else if (s.a < s.b) h2hPts[g.b] += 3; else { h2hPts[g.a]++; h2hPts[g.b]++; }
      });
      cmp = function (a, b) {
        if (h2hPts[b] !== h2hPts[a]) return h2hPts[b] - h2hPts[a];
        var sa = h2hGf[a] - h2hGa[a], sb = h2hGf[b] - h2hGa[b];
        if (sb !== sa) return sb - sa;
        if (h2hGf[b] !== h2hGf[a]) return h2hGf[b] - h2hGf[a];
        return 0;
      };
    } else if (phase === 1) {
      cmp = function (a, b) {
        var sa = gf[a] - ga[a], sb = gf[b] - ga[b];
        if (sb !== sa) return sb - sa;
        if ((gf[b] || 0) !== (gf[a] || 0)) return (gf[b] || 0) - (gf[a] || 0);
        return 0;
      };
    } else if (phase === 2) {
      cmp = function (a, b) { return (getConduct(a) || 0) - (getConduct(b) || 0); };
    } else if (phase === 3) {
      cmp = function (a, b) { return (FIFA_RANK[a] || 999) - (FIFA_RANK[b] || 999); };
    } else {
      var sorted0 = block.slice().sort(); sorted0.forEach(function (t) { result.push(t); }); return;
    }
    var sorted = block.slice().sort(cmp);
    var subBlocks = [], k = 0;
    while (k < sorted.length) {
      var l = k + 1;
      while (l < sorted.length && cmp(sorted[k], sorted[l]) === 0) l++;
      subBlocks.push(sorted.slice(k, l));
      k = l;
    }
    subBlocks.forEach(function (sub) { resolveBlock(sub, phase + 1); });
  }
  blocks.forEach(function (b) { resolveBlock(b, 0); });
  return result;
}

// Slots de 3os colocados / Anexo C da FIFA (copiado literalmente do index.html em 2026-07-07).
var _THIRD_SLOTS = [74, 77, 79, 80, 81, 82, 85, 87];
var _THIRD_SLOT_WINNER_GROUP = ['E', 'I', 'A', 'L', 'D', 'G', 'B', 'K'];
var _ANNEXC_WINNER_SLOTS = ['1A', '1B', '1D', '1E', '1G', '1I', '1K', '1L'];
var _ANNEXC_MATRIX={"EFGHIJKL":["3E","3J","3I","3F","3H","3G","3L","3K"],"DFGHIJKL":["3H","3G","3I","3D","3J","3F","3L","3K"],"DEGHIJKL":["3E","3J","3I","3D","3H","3G","3L","3K"],"DEFHIJKL":["3E","3J","3I","3D","3H","3F","3L","3K"],"DEFGIJKL":["3E","3G","3I","3D","3J","3F","3L","3K"],"DEFGHJKL":["3E","3G","3J","3D","3H","3F","3L","3K"],"DEFGHIKL":["3E","3G","3I","3D","3H","3F","3L","3K"],"DEFGHIJL":["3E","3G","3J","3D","3H","3F","3L","3I"],"DEFGHIJK":["3E","3G","3J","3D","3H","3F","3I","3K"],"CFGHIJKL":["3H","3G","3I","3C","3J","3F","3L","3K"],"CEGHIJKL":["3E","3J","3I","3C","3H","3G","3L","3K"],"CEFHIJKL":["3E","3J","3I","3C","3H","3F","3L","3K"],"CEFGIJKL":["3E","3G","3I","3C","3J","3F","3L","3K"],"CEFGHJKL":["3E","3G","3J","3C","3H","3F","3L","3K"],"CEFGHIKL":["3E","3G","3I","3C","3H","3F","3L","3K"],"CEFGHIJL":["3E","3G","3J","3C","3H","3F","3L","3I"],"CEFGHIJK":["3E","3G","3J","3C","3H","3F","3I","3K"],"CDGHIJKL":["3H","3G","3I","3C","3J","3D","3L","3K"],"CDFHIJKL":["3C","3J","3I","3D","3H","3F","3L","3K"],"CDFGIJKL":["3C","3G","3I","3D","3J","3F","3L","3K"],"CDFGHJKL":["3C","3G","3J","3D","3H","3F","3L","3K"],"CDFGHIKL":["3C","3G","3I","3D","3H","3F","3L","3K"],"CDFGHIJL":["3C","3G","3J","3D","3H","3F","3L","3I"],"CDFGHIJK":["3C","3G","3J","3D","3H","3F","3I","3K"],"CDEHIJKL":["3E","3J","3I","3C","3H","3D","3L","3K"],"CDEGIJKL":["3E","3G","3I","3C","3J","3D","3L","3K"],"CDEGHJKL":["3E","3G","3J","3C","3H","3D","3L","3K"],"CDEGHIKL":["3E","3G","3I","3C","3H","3D","3L","3K"],"CDEGHIJL":["3E","3G","3J","3C","3H","3D","3L","3I"],"CDEGHIJK":["3E","3G","3J","3C","3H","3D","3I","3K"],"CDEFIJKL":["3C","3J","3E","3D","3I","3F","3L","3K"],"CDEFHJKL":["3C","3J","3E","3D","3H","3F","3L","3K"],"CDEFHIKL":["3C","3E","3I","3D","3H","3F","3L","3K"],"CDEFHIJL":["3C","3J","3E","3D","3H","3F","3L","3I"],"CDEFHIJK":["3C","3J","3E","3D","3H","3F","3I","3K"],"CDEFGJKL":["3C","3G","3E","3D","3J","3F","3L","3K"],"CDEFGIKL":["3C","3G","3E","3D","3I","3F","3L","3K"],"CDEFGIJL":["3C","3G","3E","3D","3J","3F","3L","3I"],"CDEFGIJK":["3C","3G","3E","3D","3J","3F","3I","3K"],"CDEFGHKL":["3C","3G","3E","3D","3H","3F","3L","3K"],"CDEFGHJL":["3C","3G","3J","3D","3H","3F","3L","3E"],"CDEFGHJK":["3C","3G","3J","3D","3H","3F","3E","3K"],"CDEFGHIL":["3C","3G","3E","3D","3H","3F","3L","3I"],"CDEFGHIK":["3C","3G","3E","3D","3H","3F","3I","3K"],"CDEFGHIJ":["3C","3G","3J","3D","3H","3F","3E","3I"],"BFGHIJKL":["3H","3J","3B","3F","3I","3G","3L","3K"],"BEGHIJKL":["3E","3J","3I","3B","3H","3G","3L","3K"],"BEFHIJKL":["3E","3J","3B","3F","3I","3H","3L","3K"],"BEFGIJKL":["3E","3J","3B","3F","3I","3G","3L","3K"],"BEFGHJKL":["3E","3J","3B","3F","3H","3G","3L","3K"],"BEFGHIKL":["3E","3G","3B","3F","3I","3H","3L","3K"],"BEFGHIJL":["3E","3J","3B","3F","3H","3G","3L","3I"],"BEFGHIJK":["3E","3J","3B","3F","3H","3G","3I","3K"],"BDGHIJKL":["3H","3J","3B","3D","3I","3G","3L","3K"],"BDFHIJKL":["3H","3J","3B","3D","3I","3F","3L","3K"],"BDFGIJKL":["3I","3G","3B","3D","3J","3F","3L","3K"],"BDFGHJKL":["3H","3G","3B","3D","3J","3F","3L","3K"],"BDFGHIKL":["3H","3G","3B","3D","3I","3F","3L","3K"],"BDFGHIJL":["3H","3G","3B","3D","3J","3F","3L","3I"],"BDFGHIJK":["3H","3G","3B","3D","3J","3F","3I","3K"],"BDEHIJKL":["3E","3J","3B","3D","3I","3H","3L","3K"],"BDEGIJKL":["3E","3J","3B","3D","3I","3G","3L","3K"],"BDEGHJKL":["3E","3J","3B","3D","3H","3G","3L","3K"],"BDEGHIKL":["3E","3G","3B","3D","3I","3H","3L","3K"],"BDEGHIJL":["3E","3J","3B","3D","3H","3G","3L","3I"],"BDEGHIJK":["3E","3J","3B","3D","3H","3G","3I","3K"],"BDEFIJKL":["3E","3J","3B","3D","3I","3F","3L","3K"],"BDEFHJKL":["3E","3J","3B","3D","3H","3F","3L","3K"],"BDEFHIKL":["3E","3I","3B","3D","3H","3F","3L","3K"],"BDEFHIJL":["3E","3J","3B","3D","3H","3F","3L","3I"],"BDEFHIJK":["3E","3J","3B","3D","3H","3F","3I","3K"],"BDEFGJKL":["3E","3G","3B","3D","3J","3F","3L","3K"],"BDEFGIKL":["3E","3G","3B","3D","3I","3F","3L","3K"],"BDEFGIJL":["3E","3G","3B","3D","3J","3F","3L","3I"],"BDEFGIJK":["3E","3G","3B","3D","3J","3F","3I","3K"],"BDEFGHKL":["3E","3G","3B","3D","3H","3F","3L","3K"],"BDEFGHJL":["3H","3G","3B","3D","3J","3F","3L","3E"],"BDEFGHJK":["3H","3G","3B","3D","3J","3F","3E","3K"],"BDEFGHIL":["3E","3G","3B","3D","3H","3F","3L","3I"],"BDEFGHIK":["3E","3G","3B","3D","3H","3F","3I","3K"],"BDEFGHIJ":["3H","3G","3B","3D","3J","3F","3E","3I"],"BCGHIJKL":["3H","3J","3B","3C","3I","3G","3L","3K"],"BCFHIJKL":["3H","3J","3B","3C","3I","3F","3L","3K"],"BCFGIJKL":["3I","3G","3B","3C","3J","3F","3L","3K"],"BCFGHJKL":["3H","3G","3B","3C","3J","3F","3L","3K"],"BCFGHIKL":["3H","3G","3B","3C","3I","3F","3L","3K"],"BCFGHIJL":["3H","3G","3B","3C","3J","3F","3L","3I"],"BCFGHIJK":["3H","3G","3B","3C","3J","3F","3I","3K"],"BCEHIJKL":["3E","3J","3B","3C","3I","3H","3L","3K"],"BCEGIJKL":["3E","3J","3B","3C","3I","3G","3L","3K"],"BCEGHJKL":["3E","3J","3B","3C","3H","3G","3L","3K"],"BCEGHIKL":["3E","3G","3B","3C","3I","3H","3L","3K"],"BCEGHIJL":["3E","3J","3B","3C","3H","3G","3L","3I"],"BCEGHIJK":["3E","3J","3B","3C","3H","3G","3I","3K"],"BCEFIJKL":["3E","3J","3B","3C","3I","3F","3L","3K"],"BCEFHJKL":["3E","3J","3B","3C","3H","3F","3L","3K"],"BCEFHIKL":["3E","3I","3B","3C","3H","3F","3L","3K"],"BCEFHIJL":["3E","3J","3B","3C","3H","3F","3L","3I"],"BCEFHIJK":["3E","3J","3B","3C","3H","3F","3I","3K"],"BCEFGJKL":["3E","3G","3B","3C","3J","3F","3L","3K"],"BCEFGIKL":["3E","3G","3B","3C","3I","3F","3L","3K"],"BCEFGIJL":["3E","3G","3B","3C","3J","3F","3L","3I"],"BCEFGIJK":["3E","3G","3B","3C","3J","3F","3I","3K"],"BCEFGHKL":["3E","3G","3B","3C","3H","3F","3L","3K"],"BCEFGHJL":["3H","3G","3B","3C","3J","3F","3L","3E"],"BCEFGHJK":["3H","3G","3B","3C","3J","3F","3E","3K"],"BCEFGHIL":["3E","3G","3B","3C","3H","3F","3L","3I"],"BCEFGHIK":["3E","3G","3B","3C","3H","3F","3I","3K"],"BCEFGHIJ":["3H","3G","3B","3C","3J","3F","3E","3I"],"BCDHIJKL":["3H","3J","3B","3C","3I","3D","3L","3K"],"BCDGIJKL":["3I","3G","3B","3C","3J","3D","3L","3K"],"BCDGHJKL":["3H","3G","3B","3C","3J","3D","3L","3K"],"BCDGHIKL":["3H","3G","3B","3C","3I","3D","3L","3K"],"BCDGHIJL":["3H","3G","3B","3C","3J","3D","3L","3I"],"BCDGHIJK":["3H","3G","3B","3C","3J","3D","3I","3K"],"BCDFIJKL":["3C","3J","3B","3D","3I","3F","3L","3K"],"BCDFHJKL":["3C","3J","3B","3D","3H","3F","3L","3K"],"BCDFHIKL":["3C","3I","3B","3D","3H","3F","3L","3K"],"BCDFHIJL":["3C","3J","3B","3D","3H","3F","3L","3I"],"BCDFHIJK":["3C","3J","3B","3D","3H","3F","3I","3K"],"BCDFGJKL":["3C","3G","3B","3D","3J","3F","3L","3K"],"BCDFGIKL":["3C","3G","3B","3D","3I","3F","3L","3K"],"BCDFGIJL":["3C","3G","3B","3D","3J","3F","3L","3I"],"BCDFGIJK":["3C","3G","3B","3D","3J","3F","3I","3K"],"BCDFGHKL":["3C","3G","3B","3D","3H","3F","3L","3K"],"BCDFGHJL":["3C","3G","3B","3D","3H","3F","3L","3J"],"BCDFGHJK":["3H","3G","3B","3C","3J","3F","3D","3K"],"BCDFGHIL":["3C","3G","3B","3D","3H","3F","3L","3I"],"BCDFGHIK":["3C","3G","3B","3D","3H","3F","3I","3K"],"BCDFGHIJ":["3H","3G","3B","3C","3J","3F","3D","3I"],"BCDEIJKL":["3E","3J","3B","3C","3I","3D","3L","3K"],"BCDEHJKL":["3E","3J","3B","3C","3H","3D","3L","3K"],"BCDEHIKL":["3E","3I","3B","3C","3H","3D","3L","3K"],"BCDEHIJL":["3E","3J","3B","3C","3H","3D","3L","3I"],"BCDEHIJK":["3E","3J","3B","3C","3H","3D","3I","3K"],"BCDEGJKL":["3E","3G","3B","3C","3J","3D","3L","3K"],"BCDEGIKL":["3E","3G","3B","3C","3I","3D","3L","3K"],"BCDEGIJL":["3E","3G","3B","3C","3J","3D","3L","3I"],"BCDEGIJK":["3E","3G","3B","3C","3J","3D","3I","3K"],"BCDEGHKL":["3E","3G","3B","3C","3H","3D","3L","3K"],"BCDEGHJL":["3H","3G","3B","3C","3J","3D","3L","3E"],"BCDEGHJK":["3H","3G","3B","3C","3J","3D","3E","3K"],"BCDEGHIL":["3E","3G","3B","3C","3H","3D","3L","3I"],"BCDEGHIK":["3E","3G","3B","3C","3H","3D","3I","3K"],"BCDEGHIJ":["3H","3G","3B","3C","3J","3D","3E","3I"],"BCDEFJKL":["3C","3J","3B","3D","3E","3F","3L","3K"],"BCDEFIKL":["3C","3E","3B","3D","3I","3F","3L","3K"],"BCDEFIJL":["3C","3J","3B","3D","3E","3F","3L","3I"],"BCDEFIJK":["3C","3J","3B","3D","3E","3F","3I","3K"],"BCDEFHKL":["3C","3E","3B","3D","3H","3F","3L","3K"],"BCDEFHJL":["3C","3J","3B","3D","3H","3F","3L","3E"],"BCDEFHJK":["3C","3J","3B","3D","3H","3F","3E","3K"],"BCDEFHIL":["3C","3E","3B","3D","3H","3F","3L","3I"],"BCDEFHIK":["3C","3E","3B","3D","3H","3F","3I","3K"],"BCDEFHIJ":["3C","3J","3B","3D","3H","3F","3E","3I"],"BCDEFGKL":["3C","3G","3B","3D","3E","3F","3L","3K"],"BCDEFGJL":["3C","3G","3B","3D","3J","3F","3L","3E"],"BCDEFGJK":["3C","3G","3B","3D","3J","3F","3E","3K"],"BCDEFGIL":["3C","3G","3B","3D","3E","3F","3L","3I"],"BCDEFGIK":["3C","3G","3B","3D","3E","3F","3I","3K"],"BCDEFGIJ":["3C","3G","3B","3D","3J","3F","3E","3I"],"BCDEFGHL":["3C","3G","3B","3D","3H","3F","3L","3E"],"BCDEFGHK":["3C","3G","3B","3D","3H","3F","3E","3K"],"BCDEFGHJ":["3H","3G","3B","3C","3J","3F","3D","3E"],"BCDEFGHI":["3C","3G","3B","3D","3H","3F","3E","3I"],"AFGHIJKL":["3H","3J","3I","3F","3A","3G","3L","3K"],"AEGHIJKL":["3E","3J","3I","3A","3H","3G","3L","3K"],"AEFHIJKL":["3E","3J","3I","3F","3A","3H","3L","3K"],"AEFGIJKL":["3E","3J","3I","3F","3A","3G","3L","3K"],"AEFGHJKL":["3E","3G","3J","3F","3A","3H","3L","3K"],"AEFGHIKL":["3E","3G","3I","3F","3A","3H","3L","3K"],"AEFGHIJL":["3E","3G","3J","3F","3A","3H","3L","3I"],"AEFGHIJK":["3E","3G","3J","3F","3A","3H","3I","3K"],"ADGHIJKL":["3H","3J","3I","3D","3A","3G","3L","3K"],"ADFHIJKL":["3H","3J","3I","3D","3A","3F","3L","3K"],"ADFGIJKL":["3I","3G","3J","3D","3A","3F","3L","3K"],"ADFGHJKL":["3H","3G","3J","3D","3A","3F","3L","3K"],"ADFGHIKL":["3H","3G","3I","3D","3A","3F","3L","3K"],"ADFGHIJL":["3H","3G","3J","3D","3A","3F","3L","3I"],"ADFGHIJK":["3H","3G","3J","3D","3A","3F","3I","3K"],"ADEHIJKL":["3E","3J","3I","3D","3A","3H","3L","3K"],"ADEGIJKL":["3E","3J","3I","3D","3A","3G","3L","3K"],"ADEGHJKL":["3E","3G","3J","3D","3A","3H","3L","3K"],"ADEGHIKL":["3E","3G","3I","3D","3A","3H","3L","3K"],"ADEGHIJL":["3E","3G","3J","3D","3A","3H","3L","3I"],"ADEGHIJK":["3E","3G","3J","3D","3A","3H","3I","3K"],"ADEFIJKL":["3E","3J","3I","3D","3A","3F","3L","3K"],"ADEFHJKL":["3H","3J","3E","3D","3A","3F","3L","3K"],"ADEFHIKL":["3H","3E","3I","3D","3A","3F","3L","3K"],"ADEFHIJL":["3H","3J","3E","3D","3A","3F","3L","3I"],"ADEFHIJK":["3H","3J","3E","3D","3A","3F","3I","3K"],"ADEFGJKL":["3E","3G","3J","3D","3A","3F","3L","3K"],"ADEFGIKL":["3E","3G","3I","3D","3A","3F","3L","3K"],"ADEFGIJL":["3E","3G","3J","3D","3A","3F","3L","3I"],"ADEFGIJK":["3E","3G","3J","3D","3A","3F","3I","3K"],"ADEFGHKL":["3H","3G","3E","3D","3A","3F","3L","3K"],"ADEFGHJL":["3H","3G","3J","3D","3A","3F","3L","3E"],"ADEFGHJK":["3H","3G","3J","3D","3A","3F","3E","3K"],"ADEFGHIL":["3H","3G","3E","3D","3A","3F","3L","3I"],"ADEFGHIK":["3H","3G","3E","3D","3A","3F","3I","3K"],"ADEFGHIJ":["3H","3G","3J","3D","3A","3F","3E","3I"],"ACGHIJKL":["3H","3J","3I","3C","3A","3G","3L","3K"],"ACFHIJKL":["3H","3J","3I","3C","3A","3F","3L","3K"],"ACFGIJKL":["3I","3G","3J","3C","3A","3F","3L","3K"],"ACFGHJKL":["3H","3G","3J","3C","3A","3F","3L","3K"],"ACFGHIKL":["3H","3G","3I","3C","3A","3F","3L","3K"],"ACFGHIJL":["3H","3G","3J","3C","3A","3F","3L","3I"],"ACFGHIJK":["3H","3G","3J","3C","3A","3F","3I","3K"],"ACEHIJKL":["3E","3J","3I","3C","3A","3H","3L","3K"],"ACEGIJKL":["3E","3J","3I","3C","3A","3G","3L","3K"],"ACEGHJKL":["3E","3G","3J","3C","3A","3H","3L","3K"],"ACEGHIKL":["3E","3G","3I","3C","3A","3H","3L","3K"],"ACEGHIJL":["3E","3G","3J","3C","3A","3H","3L","3I"],"ACEGHIJK":["3E","3G","3J","3C","3A","3H","3I","3K"],"ACEFIJKL":["3E","3J","3I","3C","3A","3F","3L","3K"],"ACEFHJKL":["3H","3J","3E","3C","3A","3F","3L","3K"],"ACEFHIKL":["3H","3E","3I","3C","3A","3F","3L","3K"],"ACEFHIJL":["3H","3J","3E","3C","3A","3F","3L","3I"],"ACEFHIJK":["3H","3J","3E","3C","3A","3F","3I","3K"],"ACEFGJKL":["3E","3G","3J","3C","3A","3F","3L","3K"],"ACEFGIKL":["3E","3G","3I","3C","3A","3F","3L","3K"],"ACEFGIJL":["3E","3G","3J","3C","3A","3F","3L","3I"],"ACEFGIJK":["3E","3G","3J","3C","3A","3F","3I","3K"],"ACEFGHKL":["3H","3G","3E","3C","3A","3F","3L","3K"],"ACEFGHJL":["3H","3G","3J","3C","3A","3F","3L","3E"],"ACEFGHJK":["3H","3G","3J","3C","3A","3F","3E","3K"],"ACEFGHIL":["3H","3G","3E","3C","3A","3F","3L","3I"],"ACEFGHIK":["3H","3G","3E","3C","3A","3F","3I","3K"],"ACEFGHIJ":["3H","3G","3J","3C","3A","3F","3E","3I"],"ACDHIJKL":["3H","3J","3I","3C","3A","3D","3L","3K"],"ACDGIJKL":["3I","3G","3J","3C","3A","3D","3L","3K"],"ACDGHJKL":["3H","3G","3J","3C","3A","3D","3L","3K"],"ACDGHIKL":["3H","3G","3I","3C","3A","3D","3L","3K"],"ACDGHIJL":["3H","3G","3J","3C","3A","3D","3L","3I"],"ACDGHIJK":["3H","3G","3J","3C","3A","3D","3I","3K"],"ACDFIJKL":["3C","3J","3I","3D","3A","3F","3L","3K"],"ACDFHJKL":["3H","3J","3F","3C","3A","3D","3L","3K"],"ACDFHIKL":["3H","3F","3I","3C","3A","3D","3L","3K"],"ACDFHIJL":["3H","3J","3F","3C","3A","3D","3L","3I"],"ACDFHIJK":["3H","3J","3F","3C","3A","3D","3I","3K"],"ACDFGJKL":["3C","3G","3J","3D","3A","3F","3L","3K"],"ACDFGIKL":["3C","3G","3I","3D","3A","3F","3L","3K"],"ACDFGIJL":["3C","3G","3J","3D","3A","3F","3L","3I"],"ACDFGIJK":["3C","3G","3J","3D","3A","3F","3I","3K"],"ACDFGHKL":["3H","3G","3F","3C","3A","3D","3L","3K"],"ACDFGHJL":["3C","3G","3J","3D","3A","3F","3L","3H"],"ACDFGHJK":["3H","3G","3J","3C","3A","3F","3D","3K"],"ACDFGHIL":["3H","3G","3F","3C","3A","3D","3L","3I"],"ACDFGHIK":["3H","3G","3F","3C","3A","3D","3I","3K"],"ACDFGHIJ":["3H","3G","3J","3C","3A","3F","3D","3I"],"ACDEIJKL":["3E","3J","3I","3C","3A","3D","3L","3K"],"ACDEHJKL":["3H","3J","3E","3C","3A","3D","3L","3K"],"ACDEHIKL":["3H","3E","3I","3C","3A","3D","3L","3K"],"ACDEHIJL":["3H","3J","3E","3C","3A","3D","3L","3I"],"ACDEHIJK":["3H","3J","3E","3C","3A","3D","3I","3K"],"ACDEGJKL":["3E","3G","3J","3C","3A","3D","3L","3K"],"ACDEGIKL":["3E","3G","3I","3C","3A","3D","3L","3K"],"ACDEGIJL":["3E","3G","3J","3C","3A","3D","3L","3I"],"ACDEGIJK":["3E","3G","3J","3C","3A","3D","3I","3K"],"ACDEGHKL":["3H","3G","3E","3C","3A","3D","3L","3K"],"ACDEGHJL":["3H","3G","3J","3C","3A","3D","3L","3E"],"ACDEGHJK":["3H","3G","3J","3C","3A","3D","3E","3K"],"ACDEGHIL":["3H","3G","3E","3C","3A","3D","3L","3I"],"ACDEGHIK":["3H","3G","3E","3C","3A","3D","3I","3K"],"ACDEGHIJ":["3H","3G","3J","3C","3A","3D","3E","3I"],"ACDEFJKL":["3C","3J","3E","3D","3A","3F","3L","3K"],"ACDEFIKL":["3C","3E","3I","3D","3A","3F","3L","3K"],"ACDEFIJL":["3C","3J","3E","3D","3A","3F","3L","3I"],"ACDEFIJK":["3C","3J","3E","3D","3A","3F","3I","3K"],"ACDEFHKL":["3H","3E","3F","3C","3A","3D","3L","3K"],"ACDEFHJL":["3H","3J","3F","3C","3A","3D","3L","3E"],"ACDEFHJK":["3H","3J","3E","3C","3A","3F","3D","3K"],"ACDEFHIL":["3H","3E","3F","3C","3A","3D","3L","3I"],"ACDEFHIK":["3H","3E","3F","3C","3A","3D","3I","3K"],"ACDEFHIJ":["3H","3J","3E","3C","3A","3F","3D","3I"],"ACDEFGKL":["3C","3G","3E","3D","3A","3F","3L","3K"],"ACDEFGJL":["3C","3G","3J","3D","3A","3F","3L","3E"],"ACDEFGJK":["3C","3G","3J","3D","3A","3F","3E","3K"],"ACDEFGIL":["3C","3G","3E","3D","3A","3F","3L","3I"],"ACDEFGIK":["3C","3G","3E","3D","3A","3F","3I","3K"],"ACDEFGIJ":["3C","3G","3J","3D","3A","3F","3E","3I"],"ACDEFGHL":["3H","3G","3F","3C","3A","3D","3L","3E"],"ACDEFGHK":["3H","3G","3E","3C","3A","3F","3D","3K"],"ACDEFGHJ":["3H","3G","3J","3C","3A","3F","3D","3E"],"ACDEFGHI":["3H","3G","3E","3C","3A","3F","3D","3I"],"ABGHIJKL":["3H","3J","3B","3A","3I","3G","3L","3K"],"ABFHIJKL":["3H","3J","3B","3A","3I","3F","3L","3K"],"ABFGIJKL":["3I","3J","3B","3F","3A","3G","3L","3K"],"ABFGHJKL":["3H","3J","3B","3F","3A","3G","3L","3K"],"ABFGHIKL":["3H","3G","3B","3A","3I","3F","3L","3K"],"ABFGHIJL":["3H","3J","3B","3F","3A","3G","3L","3I"],"ABFGHIJK":["3H","3J","3B","3F","3A","3G","3I","3K"],"ABEHIJKL":["3E","3J","3B","3A","3I","3H","3L","3K"],"ABEGIJKL":["3E","3J","3B","3A","3I","3G","3L","3K"],"ABEGHJKL":["3E","3J","3B","3A","3H","3G","3L","3K"],"ABEGHIKL":["3E","3G","3B","3A","3I","3H","3L","3K"],"ABEGHIJL":["3E","3J","3B","3A","3H","3G","3L","3I"],"ABEGHIJK":["3E","3J","3B","3A","3H","3G","3I","3K"],"ABEFIJKL":["3E","3J","3B","3A","3I","3F","3L","3K"],"ABEFHJKL":["3E","3J","3B","3F","3A","3H","3L","3K"],"ABEFHIKL":["3E","3I","3B","3F","3A","3H","3L","3K"],"ABEFHIJL":["3E","3J","3B","3F","3A","3H","3L","3I"],"ABEFHIJK":["3E","3J","3B","3F","3A","3H","3I","3K"],"ABEFGJKL":["3E","3J","3B","3F","3A","3G","3L","3K"],"ABEFGIKL":["3E","3G","3B","3A","3I","3F","3L","3K"],"ABEFGIJL":["3E","3J","3B","3F","3A","3G","3L","3I"],"ABEFGIJK":["3E","3J","3B","3F","3A","3G","3I","3K"],"ABEFGHKL":["3E","3G","3B","3F","3A","3H","3L","3K"],"ABEFGHJL":["3H","3J","3B","3F","3A","3G","3L","3E"],"ABEFGHJK":["3H","3J","3B","3F","3A","3G","3E","3K"],"ABEFGHIL":["3E","3G","3B","3F","3A","3H","3L","3I"],"ABEFGHIK":["3E","3G","3B","3F","3A","3H","3I","3K"],"ABEFGHIJ":["3H","3J","3B","3F","3A","3G","3E","3I"],"ABDHIJKL":["3I","3J","3B","3D","3A","3H","3L","3K"],"ABDGIJKL":["3I","3J","3B","3D","3A","3G","3L","3K"],"ABDGHJKL":["3H","3J","3B","3D","3A","3G","3L","3K"],"ABDGHIKL":["3I","3G","3B","3D","3A","3H","3L","3K"],"ABDGHIJL":["3H","3J","3B","3D","3A","3G","3L","3I"],"ABDGHIJK":["3H","3J","3B","3D","3A","3G","3I","3K"],"ABDFIJKL":["3I","3J","3B","3D","3A","3F","3L","3K"],"ABDFHJKL":["3H","3J","3B","3D","3A","3F","3L","3K"],"ABDFHIKL":["3H","3I","3B","3D","3A","3F","3L","3K"],"ABDFHIJL":["3H","3J","3B","3D","3A","3F","3L","3I"],"ABDFHIJK":["3H","3J","3B","3D","3A","3F","3I","3K"],"ABDFGJKL":["3F","3J","3B","3D","3A","3G","3L","3K"],"ABDFGIKL":["3I","3G","3B","3D","3A","3F","3L","3K"],"ABDFGIJL":["3F","3J","3B","3D","3A","3G","3L","3I"],"ABDFGIJK":["3F","3J","3B","3D","3A","3G","3I","3K"],"ABDFGHKL":["3H","3G","3B","3D","3A","3F","3L","3K"],"ABDFGHJL":["3H","3G","3B","3D","3A","3F","3L","3J"],"ABDFGHJK":["3H","3G","3B","3D","3A","3F","3J","3K"],"ABDFGHIL":["3H","3G","3B","3D","3A","3F","3L","3I"],"ABDFGHIK":["3H","3G","3B","3D","3A","3F","3I","3K"],"ABDFGHIJ":["3H","3G","3B","3D","3A","3F","3I","3J"],"ABDEIJKL":["3E","3J","3B","3A","3I","3D","3L","3K"],"ABDEHJKL":["3E","3J","3B","3D","3A","3H","3L","3K"],"ABDEHIKL":["3E","3I","3B","3D","3A","3H","3L","3K"],"ABDEHIJL":["3E","3J","3B","3D","3A","3H","3L","3I"],"ABDEHIJK":["3E","3J","3B","3D","3A","3H","3I","3K"],"ABDEGJKL":["3E","3J","3B","3D","3A","3G","3L","3K"],"ABDEGIKL":["3E","3G","3B","3A","3I","3D","3L","3K"],"ABDEGIJL":["3E","3J","3B","3D","3A","3G","3L","3I"],"ABDEGIJK":["3E","3J","3B","3D","3A","3G","3I","3K"],"ABDEGHKL":["3E","3G","3B","3D","3A","3H","3L","3K"],"ABDEGHJL":["3H","3J","3B","3D","3A","3G","3L","3E"],"ABDEGHJK":["3H","3J","3B","3D","3A","3G","3E","3K"],"ABDEGHIL":["3E","3G","3B","3D","3A","3H","3L","3I"],"ABDEGHIK":["3E","3G","3B","3D","3A","3H","3I","3K"],"ABDEGHIJ":["3H","3J","3B","3D","3A","3G","3E","3I"],"ABDEFJKL":["3E","3J","3B","3D","3A","3F","3L","3K"],"ABDEFIKL":["3E","3I","3B","3D","3A","3F","3L","3K"],"ABDEFIJL":["3E","3J","3B","3D","3A","3F","3L","3I"],"ABDEFIJK":["3E","3J","3B","3D","3A","3F","3I","3K"],"ABDEFHKL":["3H","3E","3B","3D","3A","3F","3L","3K"],"ABDEFHJL":["3H","3J","3B","3D","3A","3F","3L","3E"],"ABDEFHJK":["3H","3J","3B","3D","3A","3F","3E","3K"],"ABDEFHIL":["3H","3E","3B","3D","3A","3F","3L","3I"],"ABDEFHIK":["3H","3E","3B","3D","3A","3F","3I","3K"],"ABDEFHIJ":["3H","3J","3B","3D","3A","3F","3E","3I"],"ABDEFGKL":["3E","3G","3B","3D","3A","3F","3L","3K"],"ABDEFGJL":["3E","3G","3B","3D","3A","3F","3L","3J"],"ABDEFGJK":["3E","3G","3B","3D","3A","3F","3J","3K"],"ABDEFGIL":["3E","3G","3B","3D","3A","3F","3L","3I"],"ABDEFGIK":["3E","3G","3B","3D","3A","3F","3I","3K"],"ABDEFGIJ":["3E","3G","3B","3D","3A","3F","3I","3J"],"ABDEFGHL":["3H","3G","3B","3D","3A","3F","3L","3E"],"ABDEFGHK":["3H","3G","3B","3D","3A","3F","3E","3K"],"ABDEFGHJ":["3H","3G","3B","3D","3A","3F","3E","3J"],"ABDEFGHI":["3H","3G","3B","3D","3A","3F","3E","3I"],"ABCHIJKL":["3I","3J","3B","3C","3A","3H","3L","3K"],"ABCGIJKL":["3I","3J","3B","3C","3A","3G","3L","3K"],"ABCGHJKL":["3H","3J","3B","3C","3A","3G","3L","3K"],"ABCGHIKL":["3I","3G","3B","3C","3A","3H","3L","3K"],"ABCGHIJL":["3H","3J","3B","3C","3A","3G","3L","3I"],"ABCGHIJK":["3H","3J","3B","3C","3A","3G","3I","3K"],"ABCFIJKL":["3I","3J","3B","3C","3A","3F","3L","3K"],"ABCFHJKL":["3H","3J","3B","3C","3A","3F","3L","3K"],"ABCFHIKL":["3H","3I","3B","3C","3A","3F","3L","3K"],"ABCFHIJL":["3H","3J","3B","3C","3A","3F","3L","3I"],"ABCFHIJK":["3H","3J","3B","3C","3A","3F","3I","3K"],"ABCFGJKL":["3C","3J","3B","3F","3A","3G","3L","3K"],"ABCFGIKL":["3I","3G","3B","3C","3A","3F","3L","3K"],"ABCFGIJL":["3C","3J","3B","3F","3A","3G","3L","3I"],"ABCFGIJK":["3C","3J","3B","3F","3A","3G","3I","3K"],"ABCFGHKL":["3H","3G","3B","3C","3A","3F","3L","3K"],"ABCFGHJL":["3H","3G","3B","3C","3A","3F","3L","3J"],"ABCFGHJK":["3H","3G","3B","3C","3A","3F","3J","3K"],"ABCFGHIL":["3H","3G","3B","3C","3A","3F","3L","3I"],"ABCFGHIK":["3H","3G","3B","3C","3A","3F","3I","3K"],"ABCFGHIJ":["3H","3G","3B","3C","3A","3F","3I","3J"],"ABCEIJKL":["3E","3J","3B","3A","3I","3C","3L","3K"],"ABCEHJKL":["3E","3J","3B","3C","3A","3H","3L","3K"],"ABCEHIKL":["3E","3I","3B","3C","3A","3H","3L","3K"],"ABCEHIJL":["3E","3J","3B","3C","3A","3H","3L","3I"],"ABCEHIJK":["3E","3J","3B","3C","3A","3H","3I","3K"],"ABCEGJKL":["3E","3J","3B","3C","3A","3G","3L","3K"],"ABCEGIKL":["3E","3G","3B","3A","3I","3C","3L","3K"],"ABCEGIJL":["3E","3J","3B","3C","3A","3G","3L","3I"],"ABCEGIJK":["3E","3J","3B","3C","3A","3G","3I","3K"],"ABCEGHKL":["3E","3G","3B","3C","3A","3H","3L","3K"],"ABCEGHJL":["3H","3J","3B","3C","3A","3G","3L","3E"],"ABCEGHJK":["3H","3J","3B","3C","3A","3G","3E","3K"],"ABCEGHIL":["3E","3G","3B","3C","3A","3H","3L","3I"],"ABCEGHIK":["3E","3G","3B","3C","3A","3H","3I","3K"],"ABCEGHIJ":["3H","3J","3B","3C","3A","3G","3E","3I"],"ABCEFJKL":["3E","3J","3B","3C","3A","3F","3L","3K"],"ABCEFIKL":["3E","3I","3B","3C","3A","3F","3L","3K"],"ABCEFIJL":["3E","3J","3B","3C","3A","3F","3L","3I"],"ABCEFIJK":["3E","3J","3B","3C","3A","3F","3I","3K"],"ABCEFHKL":["3H","3E","3B","3C","3A","3F","3L","3K"],"ABCEFHJL":["3H","3J","3B","3C","3A","3F","3L","3E"],"ABCEFHJK":["3H","3J","3B","3C","3A","3F","3E","3K"],"ABCEFHIL":["3H","3E","3B","3C","3A","3F","3L","3I"],"ABCEFHIK":["3H","3E","3B","3C","3A","3F","3I","3K"],"ABCEFHIJ":["3H","3J","3B","3C","3A","3F","3E","3I"],"ABCEFGKL":["3E","3G","3B","3C","3A","3F","3L","3K"],"ABCEFGJL":["3E","3G","3B","3C","3A","3F","3L","3J"],"ABCEFGJK":["3E","3G","3B","3C","3A","3F","3J","3K"],"ABCEFGIL":["3E","3G","3B","3C","3A","3F","3L","3I"],"ABCEFGIK":["3E","3G","3B","3C","3A","3F","3I","3K"],"ABCEFGIJ":["3E","3G","3B","3C","3A","3F","3I","3J"],"ABCEFGHL":["3H","3G","3B","3C","3A","3F","3L","3E"],"ABCEFGHK":["3H","3G","3B","3C","3A","3F","3E","3K"],"ABCEFGHJ":["3H","3G","3B","3C","3A","3F","3E","3J"],"ABCEFGHI":["3H","3G","3B","3C","3A","3F","3E","3I"],"ABCDIJKL":["3I","3J","3B","3C","3A","3D","3L","3K"],"ABCDHJKL":["3H","3J","3B","3C","3A","3D","3L","3K"],"ABCDHIKL":["3H","3I","3B","3C","3A","3D","3L","3K"],"ABCDHIJL":["3H","3J","3B","3C","3A","3D","3L","3I"],"ABCDHIJK":["3H","3J","3B","3C","3A","3D","3I","3K"],"ABCDGJKL":["3C","3J","3B","3D","3A","3G","3L","3K"],"ABCDGIKL":["3I","3G","3B","3C","3A","3D","3L","3K"],"ABCDGIJL":["3C","3J","3B","3D","3A","3G","3L","3I"],"ABCDGIJK":["3C","3J","3B","3D","3A","3G","3I","3K"],"ABCDGHKL":["3H","3G","3B","3C","3A","3D","3L","3K"],"ABCDGHJL":["3H","3G","3B","3C","3A","3D","3L","3J"],"ABCDGHJK":["3H","3G","3B","3C","3A","3D","3J","3K"],"ABCDGHIL":["3H","3G","3B","3C","3A","3D","3L","3I"],"ABCDGHIK":["3H","3G","3B","3C","3A","3D","3I","3K"],"ABCDGHIJ":["3H","3G","3B","3C","3A","3D","3I","3J"],"ABCDFJKL":["3C","3J","3B","3D","3A","3F","3L","3K"],"ABCDFIKL":["3C","3I","3B","3D","3A","3F","3L","3K"],"ABCDFIJL":["3C","3J","3B","3D","3A","3F","3L","3I"],"ABCDFIJK":["3C","3J","3B","3D","3A","3F","3I","3K"],"ABCDFHKL":["3H","3F","3B","3C","3A","3D","3L","3K"],"ABCDFHJL":["3C","3J","3B","3D","3A","3F","3L","3H"],"ABCDFHJK":["3H","3J","3B","3C","3A","3F","3D","3K"],"ABCDFHIL":["3H","3F","3B","3C","3A","3D","3L","3I"],"ABCDFHIK":["3H","3F","3B","3C","3A","3D","3I","3K"],"ABCDFHIJ":["3H","3J","3B","3C","3A","3F","3D","3I"],"ABCDFGKL":["3C","3G","3B","3D","3A","3F","3L","3K"],"ABCDFGJL":["3C","3G","3B","3D","3A","3F","3L","3J"],"ABCDFGJK":["3C","3G","3B","3D","3A","3F","3J","3K"],"ABCDFGIL":["3C","3G","3B","3D","3A","3F","3L","3I"],"ABCDFGIK":["3C","3G","3B","3D","3A","3F","3I","3K"],"ABCDFGIJ":["3C","3G","3B","3D","3A","3F","3I","3J"],"ABCDFGHL":["3C","3G","3B","3D","3A","3F","3L","3H"],"ABCDFGHK":["3H","3G","3B","3C","3A","3F","3D","3K"],"ABCDFGHJ":["3H","3G","3B","3C","3A","3F","3D","3J"],"ABCDFGHI":["3H","3G","3B","3C","3A","3F","3D","3I"],"ABCDEJKL":["3E","3J","3B","3C","3A","3D","3L","3K"],"ABCDEIKL":["3E","3I","3B","3C","3A","3D","3L","3K"],"ABCDEIJL":["3E","3J","3B","3C","3A","3D","3L","3I"],"ABCDEIJK":["3E","3J","3B","3C","3A","3D","3I","3K"],"ABCDEHKL":["3H","3E","3B","3C","3A","3D","3L","3K"],"ABCDEHJL":["3H","3J","3B","3C","3A","3D","3L","3E"],"ABCDEHJK":["3H","3J","3B","3C","3A","3D","3E","3K"],"ABCDEHIL":["3H","3E","3B","3C","3A","3D","3L","3I"],"ABCDEHIK":["3H","3E","3B","3C","3A","3D","3I","3K"],"ABCDEHIJ":["3H","3J","3B","3C","3A","3D","3E","3I"],"ABCDEGKL":["3E","3G","3B","3C","3A","3D","3L","3K"],"ABCDEGJL":["3E","3G","3B","3C","3A","3D","3L","3J"],"ABCDEGJK":["3E","3G","3B","3C","3A","3D","3J","3K"],"ABCDEGIL":["3E","3G","3B","3C","3A","3D","3L","3I"],"ABCDEGIK":["3E","3G","3B","3C","3A","3D","3I","3K"],"ABCDEGIJ":["3E","3G","3B","3C","3A","3D","3I","3J"],"ABCDEGHL":["3H","3G","3B","3C","3A","3D","3L","3E"],"ABCDEGHK":["3H","3G","3B","3C","3A","3D","3E","3K"],"ABCDEGHJ":["3H","3G","3B","3C","3A","3D","3E","3J"],"ABCDEGHI":["3H","3G","3B","3C","3A","3D","3E","3I"],"ABCDEFKL":["3C","3E","3B","3D","3A","3F","3L","3K"],"ABCDEFJL":["3C","3J","3B","3D","3A","3F","3L","3E"],"ABCDEFJK":["3C","3J","3B","3D","3A","3F","3E","3K"],"ABCDEFIL":["3C","3E","3B","3D","3A","3F","3L","3I"],"ABCDEFIK":["3C","3E","3B","3D","3A","3F","3I","3K"],"ABCDEFIJ":["3C","3J","3B","3D","3A","3F","3E","3I"],"ABCDEFHL":["3H","3F","3B","3C","3A","3D","3L","3E"],"ABCDEFHK":["3H","3E","3B","3C","3A","3F","3D","3K"],"ABCDEFHJ":["3H","3J","3B","3C","3A","3F","3D","3E"],"ABCDEFHI":["3H","3E","3B","3C","3A","3F","3D","3I"],"ABCDEFGL":["3C","3G","3B","3D","3A","3F","3L","3E"],"ABCDEFGK":["3C","3G","3B","3D","3A","3F","3E","3K"],"ABCDEFGJ":["3C","3G","3B","3D","3A","3F","3E","3J"],"ABCDEFGI":["3C","3G","3B","3D","3A","3F","3E","3I"],"ABCDEFGH":["3H","3G","3B","3C","3A","3F","3D","3E"]};

function bracketResolveThirdPlaceSlot(thirdsList, gameNum) {
  if (!thirdsList || thirdsList.length < 8) return null;
  var slotIdx = _THIRD_SLOTS.indexOf(gameNum);
  if (slotIdx < 0) return null;
  var qualifyingGroups = thirdsList.map(function (t) { return t.group; }).slice().sort().join('');
  var assignments = _ANNEXC_MATRIX[qualifyingGroups];
  if (!assignments) return thirdsList[slotIdx] ? thirdsList[slotIdx].team : null;
  var winnerSlotKey = '1' + _THIRD_SLOT_WINNER_GROUP[slotIdx];
  var winnerSlotIdx = _ANNEXC_WINNER_SLOTS.indexOf(winnerSlotKey);
  if (winnerSlotIdx < 0) return null;
  var assignedGroup = assignments[winnerSlotIdx].charAt(1);
  var match = thirdsList.filter(function (t) { return t.group === assignedGroup; });
  return match.length ? match[0].team : null;
}

// winnerOf/loserOf: retornam o placeholder cru (ex. "V. Jogo 89"), igual ao _winnerOf do frontend --
// a resolução final do nome real acontece em bracketResolveTeam, recursivamente.
function bracketWinnerOf(gameNum, getScore, getKOSide) {
  var g = GAME_BY_ID_AB[gameNum]; if (!g) return null;
  var s = getScore(gameNum); if (!s || s.a === undefined || s.b === undefined) return null;
  if (s.a > s.b) return g.a;
  if (s.b > s.a) return g.b;
  var side = getKOSide ? getKOSide(gameNum) : null;
  if (side === 'a') return g.a;
  if (side === 'b') return g.b;
  return null;
}
function bracketLoserOf(gameNum, getScore, getKOSide) {
  var g = GAME_BY_ID_AB[gameNum]; if (!g) return null;
  var s = getScore(gameNum); if (!s || s.a === undefined || s.b === undefined) return null;
  if (s.a > s.b) return g.b;
  if (s.b > s.a) return g.a;
  var side = getKOSide ? getKOSide(gameNum) : null;
  if (side === 'a') return g.b;
  if (side === 'b') return g.a;
  return null;
}

// Cria um "contexto" de chaveamento (classificação de grupo + 3os colocados + vencedor/perdedor
// + resolução de placeholder) a partir de uma função getScore(gn) e opcionalmente getKOSide(gn).
// Usado tanto para o chaveamento REAL (com placares reais) quanto para o SIMULADO
// (com os palpites de um participante, com fallback pro placar real quando não há palpite).
function makeBracketContext(getScore, getKOSide) {
  var gsCache = {}, thirdsCache = null;
  function groupStandings(letter) {
    if (Object.prototype.hasOwnProperty.call(gsCache, letter)) return gsCache[letter];
    var teams = GROUPS[letter] || [], pts = {}, gp = {}, gf = {}, ga = {};
    teams.forEach(function (t) { pts[t] = 0; gp[t] = 0; gf[t] = 0; ga[t] = 0; });
    var groupGames = BOLAO_GAMES_AB.filter(function (g) { return g.f === GROUP_NAMES[letter]; });
    groupGames.forEach(function (g) {
      var s = getScore(g.n);
      if (s && s.a !== undefined && s.b !== undefined) {
        gp[g.a]++; gp[g.b]++; gf[g.a] += s.a; ga[g.a] += s.b; gf[g.b] += s.b; ga[g.b] += s.a;
        if (s.a > s.b) pts[g.a] += 3; else if (s.a < s.b) pts[g.b] += 3; else { pts[g.a]++; pts[g.b]++; }
      }
    });
    var anyPlayed = teams.some(function (t) { return gp[t] > 0; });
    if (!anyPlayed) { gsCache[letter] = null; return null; }
    var finished = groupGames.every(function (g) { var s = getScore(g.n); return s && s.a !== undefined && s.b !== undefined; });
    var sorted = bracketResolveGroupOrder(teams, pts, gf, ga, groupGames, getScore, function () { return 0; });
    var st = { teams: sorted, pts: pts, gf: gf, ga: ga, gp: gp, finished: finished };
    gsCache[letter] = st; return st;
  }
  function rankedThirds() {
    if (thirdsCache) return thirdsCache;
    var thirds = [];
    GROUP_ORDER.forEach(function (letter) {
      var st = groupStandings(letter); if (!st || st.teams.length < 3) return;
      var t = st.teams[2]; var p = st.pts[t] || 0, gf = st.gf[t] || 0, ga = st.ga[t] || 0;
      thirds.push({ team: t, group: letter, pts: p, sg: gf - ga, gf: gf, gp: st.gp[t] || 0, finished: st.finished });
    });
    thirds.sort(function (a, b) {
      if (b.pts !== a.pts) return b.pts - a.pts;
      if (b.sg !== a.sg) return b.sg - a.sg;
      if (b.gf !== a.gf) return b.gf - a.gf;
      if ((FIFA_RANK[a.team] || 999) !== (FIFA_RANK[b.team] || 999)) return (FIFA_RANK[a.team] || 999) - (FIFA_RANK[b.team] || 999);
      return a.team.localeCompare(b.team);
    });
    thirdsCache = thirds.slice(0, 8);
    return thirdsCache;
  }
  var ctx = {
    groupStandings: groupStandings,
    rankedThirds: rankedThirds,
    winnerOf: function (gn) { return bracketWinnerOf(gn, getScore, getKOSide); },
    loserOf: function (gn) { return bracketLoserOf(gn, getScore, getKOSide); }
  };
  return ctx;
}

// Resolve um placeholder ("1° Grupo X", "V. Jogo N", "Perd. Jogo N", "0") para o nome real do
// time dentro de um contexto de chaveamento (ctx = makeBracketContext(...)). Retorna null se
// ainda não é possível resolver (jogo/grupo não terminado).
function bracketResolveTeam(placeholder, gameNum, ctx, depth) {
  depth = depth || 0;
  if (depth > 12) return null;
  if (!placeholder || placeholder === '') return null;

  var mGrp = placeholder.match(/^(\d+)°\s+Grupo\s+([A-L])$/);
  if (mGrp) {
    var pos = parseInt(mGrp[1], 10) - 1, letter = mGrp[2];
    var st = ctx.groupStandings(letter);
    if (st && st.teams.length > pos) return st.teams[pos];
    return null;
  }

  var mV = placeholder.match(/^V\.\s*Jogo\s+(\d+)$/);
  if (mV) {
    var vn = parseInt(mV[1], 10);
    var w = ctx.winnerOf(vn);
    if (!w) return null;
    if (w === '0' || /°\s*Grupo|V\.\s*Jogo|Perd\./.test(w)) return bracketResolveTeam(w, vn, ctx, depth + 1);
    return w;
  }

  var mP = placeholder.match(/^Perd\.\s*Jogo\s+(\d+)$/);
  if (mP) {
    var pn = parseInt(mP[1], 10);
    var pg = GAME_BY_ID_AB[pn]; if (!pg) return null;
    var winner = ctx.winnerOf(pn); if (!winner) return null;
    var rA = bracketResolveTeam(pg.a, pn, ctx, depth + 1), rB = bracketResolveTeam(pg.b, pn, ctx, depth + 1);
    if (winner === rA) return rB;
    if (winner === rB) return rA;
    if (winner === pg.a) return rB;
    if (winner === pg.b) return rA;
    return null;
  }

  if (placeholder === '0') {
    var thirds = ctx.rankedThirds();
    if (thirds.length === 8) {
      var resolved = bracketResolveThirdPlaceSlot(thirds, gameNum);
      if (resolved) return resolved;
    }
    var slotIdx = _THIRD_SLOTS.indexOf(gameNum);
    if (slotIdx >= 0 && thirds[slotIdx]) return thirds[slotIdx].team;
    return null;
  }

  return placeholder; // nome literal, já resolvido (ex. "Brasil")
}

// Compara o confronto REAL de um jogo de mata-mata com o confronto SIMULADO a partir dos
// palpites de um participante (via bracketResolveTeam nos dois lados, real x simulado).
// Retorna true só quando os dois times de AMBOS os lados batem (ordem não importa).
function bracketAcertouConfronto(gameNum, realCtx, simCtx) {
  var g = GAME_BY_ID_AB[gameNum]; if (!g) return false;
  var realA = bracketResolveTeam(g.a, gameNum, realCtx);
  var realB = bracketResolveTeam(g.b, gameNum, realCtx);
  var simA = bracketResolveTeam(g.a, gameNum, simCtx);
  var simB = bracketResolveTeam(g.b, gameNum, simCtx);
  if (!realA || !realB || !simA || !simB) return false;
  return (realA === simA && realB === simB) || (realA === simB && realB === simA);
}

// ── Mata-mata: mapeamento fase → jogos e jogo → fase ──
var KO_PHASE_GAMES = {
  r32:   [73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88],
  r16:   [89,90,91,92,93,94,95,96],
  qf:    [97,98,99,100],
  sf:    [101,102],
  '3rd': [103],
  final: [104]
};
var KO_GAME_PHASE = {};
Object.keys(KO_PHASE_GAMES).forEach(function(ph) {
  KO_PHASE_GAMES[ph].forEach(function(n) { KO_GAME_PHASE[n] = ph; });
});

// Calcula o instante UTC de início do jogo a partir de g.d ("DD/MM Dia") e g.t ("HH:MM", horário de Brasília UTC-3)
function gameUTC(g) {
  try {
    var p = g.d.split(' ')[0].split('/');
    var tp = g.t.split(':');
    if (p.length < 2 || tp.length < 2) return null;
    return new Date(Date.UTC(2026, parseInt(p[1], 10) - 1, parseInt(p[0], 10), parseInt(tp[0], 10) + 3, parseInt(tp[1], 10)));
  } catch (e) { return null; }
}

// Retorna o deadline (instante a partir do qual o palpite NÃO pode mais ser salvo/alterado)
function bolaoDeadline(gameN) {
  var g = BOLAO_GAME_BY_ID[gameN];
  if (!g) return null;
  var gd = gameUTC(g);
  return gd ? new Date(gd.getTime() - BOLAO_DEADLINE_MS) : null;
}

// Retorna o deadline de reabertura de uma fase: 5 min antes do kickoff do 1º jogo da fase
function phaseReopenDeadline(phaseName) {
  var gameNs = KO_PHASE_GAMES[phaseName];
  if (!gameNs || !gameNs.length) return null;
  var earliest = null;
  for (var i = 0; i < gameNs.length; i++) {
    var g = BOLAO_GAME_BY_ID[gameNs[i]];
    if (!g) continue;
    var t = gameUTC(g);
    if (!t) continue;
    if (!earliest || t.getTime() < earliest.getTime()) earliest = t;
  }
  return earliest ? new Date(earliest.getTime() - BOLAO_REOPEN_DEADLINE_MS) : null;
}

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: Object.assign({ 'Content-Type': 'application/json' }, CORS),
  });
}

function error(msg, status) {
  return json({ error: msg }, status || 400);
}

function normalizeName(s) {
  return s.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ');
}

async function sha256(data) {
  var buf = new TextEncoder().encode(data);
  var hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash)).map(function (b) {
    return b.toString(16).padStart(2, '0');
  }).join('');
}

async function supaFetch(path, method, body, extraHeaders) {
  var opts = {
    method: method || 'GET',
    headers: Object.assign({
      apikey: SUPABASE_KEY,
      Authorization: 'Bearer ' + SUPABASE_KEY,
      'Content-Type': 'application/json',
    }, extraHeaders || {}),
  };
  if (body) opts.body = JSON.stringify(body);
  var res = await fetch(SUPABASE_URL + '/rest/v1/' + path, opts);
  if (!res.ok) {
    var txt = await res.text();
    throw new Error('Supabase ' + res.status + ': ' + txt.slice(0, 200));
  }
  if (method === 'DELETE') return null;
  var ct = res.headers.get('content-type') || '';
  return ct.indexOf('json') >= 0 ? res.json() : null;
}

async function handle(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }

  var url = new URL(req.url);
  var path = url.pathname;
  var method = req.method;

  try {
    if (!SUPABASE_URL || !SUPABASE_KEY || !JWT_SECRET) {
      return error('Worker nao configurado', 500);
    }

    // POST /register — BLOQUEADO: cadastro encerrado
    if (method === 'POST' && path === '/register') {
      return error('Cadastro encerrado. Apenas login para participantes existentes.', 403);
    }

    // POST /login
    if (method === 'POST' && path === '/login') {
      var body = await req.json();
      if (!body.name || !body.password) return error('name e password obrigatorios');
      var allParts = await supaFetch("participants?select=id,name,password,confirmed");
      var target = normalizeName(body.name);
      var existing = allParts ? allParts.filter(function(p){ return normalizeName(p.name) === target; }) : [];
      // SEGURANCA: resposta identica (mesma mensagem, mesmo status 401) tanto para nome
      // inexistente quanto para senha errada. Antes, 404 vs 401 permitia enumerar nomes
      // cadastrados so testando o endpoint. O hash e sempre calculado (mesmo sem usuario
      // encontrado) para nao vazar a diferenca por tempo de resposta.
      var found = (existing && existing.length) ? existing[0] : null;
      var hash = await sha256(body.password + ':' + JWT_SECRET);
      if (!found || found.password !== hash) return error('Nome ou senha invalidos', 401);
      var header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
      var payload = btoa(JSON.stringify({ sub: found.id, name: found.name, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 86400 * 90 }));
      var sig = await sha256(header + '.' + payload + '.' + JWT_SECRET);
      return json({ id: found.id, name: found.name, confirmed: found.confirmed, token: header + '.' + payload + '.' + sig });
    }

    // Rotas autenticadas
    var auth = req.headers.get('Authorization') || '';
    var token = auth.replace('Bearer ', '');
    var user = null;
    if (token) {
      try {
        var parts = token.split('.');
        if (parts.length === 3) {
          var vsig = await sha256(parts[0] + '.' + parts[1] + '.' + JWT_SECRET);
          if (vsig === parts[2]) {
            var p = JSON.parse(atob(parts[1]));
            if (p.exp > Math.floor(Date.now() / 1000)) user = p;
          }
        }
      } catch (e) {
        // Token malformado (payload nao e' JSON valido, ou base64 invalido) --
        // tratar como nao-autenticado sem crashar o Worker inteiro.
        user = null;
      }
    }

    // POST /picks
    if (method === 'POST' && path === '/picks') {
      if (!user) return error('Token invalido', 401);
      var body = await req.json();
      if (!body.picks || !body.picks.length) return error('picks obrigatorio');
      var rejected = [];
      var now = Date.now();
      var validPicks = [];
      var historyBatch = [];
      for (var i = 0; i < body.picks.length; i++) {
        var pick = body.picks[i];
        var dl = bolaoDeadline(pick.game_n);
        // Se não há jogo conhecido ou não há deadline calculável, rejeita por segurança
        // (evita aceitar palpites para game_n inválidos/inexistentes).
        if (!dl) { rejected.push(pick.game_n); continue; }
        if (now >= dl.getTime()) { rejected.push(pick.game_n); continue; }
        // Bug 5: validar placar antes de salvar
        var ga = parseInt(pick.goals_a, 10), gb = parseInt(pick.goals_b, 10);
        if (isNaN(ga) || isNaN(gb) || ga < 0 || gb < 0) { rejected.push(pick.game_n); continue; }
        var isKOPick = !!(BOLAO_GAME_BY_ID[pick.game_n] && BOLAO_GAME_BY_ID[pick.game_n].f && BOLAO_GAME_BY_ID[pick.game_n].f.indexOf('Grupo') !== 0);
        if (isKOPick && pick.ko_pick && pick.ko_pick !== 'a' && pick.ko_pick !== 'b') { rejected.push(pick.game_n); continue; }
        validPicks.push({ participant_id: user.sub, game_n: pick.game_n, goals_a: ga, goals_b: gb, ko_pick: pick.ko_pick || null });
        historyBatch.push({ participant_id: user.sub, game_n: pick.game_n, goals_a: pick.goals_a, goals_b: pick.goals_b, ko_pick: pick.ko_pick || null });
      }
      // Fix 2026-07-08: antes, 1 POST 'picks' + 1 POST 'pick_history' POR JOGO (ate ~200
      // subrequests numa unica chamada com os 104 jogos) -- mesma classe de bug ja corrigida
      // em task=fifa (batching, ver bloco "Bug: Limite de 50 subrequests CF"). Agora e' no
      // maximo 1 POST em lote por tabela, independente da quantidade de jogos enviados.
      // Bug 4a (upsert atomico via on_conflict) preservado, so aplicado ao lote inteiro.
      if (validPicks.length) {
        await supaFetch('picks?on_conflict=participant_id,game_n', 'POST', validPicks, { 'Prefer': 'resolution=merge-duplicates' });
        await supaFetch('pick_history', 'POST', historyBatch);
      }
      if (rejected.length === body.picks.length) {
        return error('Prazo encerrado ou jogo invalido para todos os palpites enviados: ' + rejected.join(','), 403);
      }
      return json({ ok: true, rejected: rejected.length ? rejected : undefined });
    }

    // GET /mypicks
    if (method === 'GET' && path === '/mypicks') {
      if (!user) return error('Token invalido', 401);
      var picks = (await supaFetch("picks?participant_id=eq." + user.sub + "&select=game_n,goals_a,goals_b,ko_pick")) || [];
      var picksReopen = (await supaFetch("picks_reopen?participant_id=eq." + user.sub + "&select=game_n,goals_a,goals_b,ko_pick,updated_at")) || [];
      var sp = (await supaFetch("special_picks?participant_id=eq." + user.sub + "&select=champion,top_scorer,locked")) || [];
      var part = (await supaFetch("participants?id=eq." + user.sub + "&select=confirmed")) || [];
      return json({ picks: picks, picksReopen: picksReopen, specialPicks: sp[0] || null, confirmed: part[0] ? part[0].confirmed : false });
    }

    // GET /ranking
    if (method === 'GET' && path === '/ranking') {
      var participants = (await supaFetch('participants?select=id,name,confirmed,confirmed_at,bonus_points')) || [];
      var maxGame = url.searchParams.get('maxGame');
      var picksUrl = 'picks?select=participant_id,game_n,goals_a,goals_b,ko_pick';
      if (maxGame) picksUrl += '&game_n=lte.' + encodeURIComponent(maxGame);
      // Buscar picks com paginação para evitar limite de 1000 linhas
      var allPicks = [];
      try {
        var baseUrl = SUPABASE_URL + '/rest/v1/' + picksUrl;
        var opts = { method: 'GET', headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY, 'Content-Type': 'application/json' } };
        for (var page = 0; page < 20; page++) {
          var start = page * 1000;
          opts.headers['Range'] = start + '-' + (start + 999);
          var pres = await fetch(baseUrl, opts);
          if (!pres.ok && pres.status !== 206) break;
          var ct = pres.headers.get('content-type') || '';
          if (ct.indexOf('json') < 0) break;
          var batch = await pres.json() || [];
          if (!batch.length) break;
          allPicks = allPicks.concat(batch);
          if (batch.length < 1000) break;
        }
      } catch(e) {}
      // Contagem total de picks preenchidos por participante (só com goals não nulos)
      var pickCounts = {};
      try {
        var countUrl = SUPABASE_URL + '/rest/v1/picks?select=participant_id,goals_a,goals_b';
        var countOpts = { method: 'GET', headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY, 'Content-Type': 'application/json' } };
        for (var page = 0; page < 10; page++) {
          var start = page * 1000;
          countOpts.headers['Range'] = start + '-' + (start + 999);
          var cres = await fetch(countUrl, countOpts);
          if (!cres.ok && cres.status !== 206) break;
          var ct = cres.headers.get('content-type') || '';
          if (ct.indexOf('json') < 0) break;
          var cdata = await cres.json() || [];
          if (!cdata.length) break;
          cdata.forEach(function(c){ if(c.goals_a!==null && c.goals_b!==null) pickCounts[c.participant_id] = (pickCounts[c.participant_id] || 0) + 1; });
          if (cdata.length < 1000) break;
        }
      } catch(e) {}
      var allSp = [];
      if (url.searchParams.get('showSpecials') === '1') {
        allSp = (await supaFetch('special_picks?select=participant_id,champion,top_scorer')) || [];
      }
      // Buscar picks reabertos (mata-mata) — tabela menor, sem paginação necessária
      var allPicksReopen = [];
      try {
        allPicksReopen = (await supaFetch('picks_reopen?select=participant_id,game_n,goals_a,goals_b,ko_pick&limit=10000')) || [];
      } catch(e) { allPicksReopen = []; }
      return json({ participants: participants, picks: allPicks, picksReopen: allPicksReopen, specialPicks: allSp, pickCounts: pickCounts });
    }

    // POST /special-picks
    if (method === 'POST' && path === '/special-picks') {
      if (!user) return error('Token invalido', 401);
      var body = await req.json();
      var existing = ((await supaFetch("special_picks?participant_id=eq." + user.sub + "&select=champion,top_scorer")) || [])[0] || {};
      var champion  = (body.champion  !== undefined && body.champion  !== '' && body.champion  !== null) ? body.champion  : (existing.champion  || null);
      var topScorer = (body.topScorer !== undefined && body.topScorer !== '' && body.topScorer !== null) ? body.topScorer : (existing.top_scorer || null);
      // Bug 4b: upsert atômico para special_picks
      await supaFetch('special_picks?on_conflict=participant_id', 'POST', { participant_id: user.sub, champion: champion, top_scorer: topScorer }, { 'Prefer': 'resolution=merge-duplicates' });
      return json({ ok: true });
    }

    // PATCH /confirm
    if (method === 'PATCH' && path === '/confirm') {
      if (!user) return error('Token invalido', 401);
      // Validacao server-side: todos os jogos do bolao (>= BOLAO_FIRST) cujo prazo
      // ainda nao passou precisam ter palpite preenchido antes de poder confirmar.
      // Isso espelha a validacao que o frontend ja faz (bolaoConfirmAll), mas agora
      // tambem e' aplicada no servidor, que e' a unica barreira que nao pode ser
      // contornada chamando a API diretamente.
      var existingPicks = (await supaFetch("picks?participant_id=eq." + user.sub + "&select=game_n,goals_a,goals_b,ko_pick")) || [];
      var picksByGame = {};
      existingPicks.forEach(function (p) { picksByGame[p.game_n] = p; });
      var nowConfirm = Date.now();
      var missingGames = [];
      for (var gi = 0; gi < BOLAO_GAMES.length; gi++) {
        var bg = BOLAO_GAMES[gi];
        if (bg.n < BOLAO_FIRST) continue;
        var bgDeadline = bolaoDeadline(bg.n);
        if (!bgDeadline || nowConfirm >= bgDeadline.getTime()) continue; // jogo ja travado, nao exigimos mais
        var bp = picksByGame[bg.n];
        if (!bp || bp.goals_a === null || bp.goals_a === undefined || bp.goals_b === null || bp.goals_b === undefined) {
          missingGames.push(bg.n);
          continue;
        }
        var isKO = bg.f && bg.f.indexOf('Grupo') !== 0;
        if (isKO && bp.goals_a === bp.goals_b && !bp.ko_pick) {
          missingGames.push(bg.n);
        }
      }
      if (missingGames.length) {
        return error('Faltam palpites para confirmar: jogos ' + missingGames.join(','), 400);
      }
      await supaFetch("participants?id=eq." + user.sub, 'PATCH', { confirmed: true, confirmed_at: new Date().toISOString() });
      return json({ ok: true });
    }

    // DELETE /reset
    if (method === 'DELETE' && path === '/reset') {
      var ak = req.headers.get('X-Admin-Key') || '';
      if (ak !== ADMIN_KEY) return error('Admin key invalida', 403);
      // Esta acao apaga TODOS os participantes/picks/special_picks/pick_history do bolao,
      // sem possibilidade de desfazer. Antes nao havia nenhum log nem segunda confirmacao --
      // se a ADMIN_KEY fosse vazada ou usada por engano, o bolao inteiro era destruido sem
      // deixar rastro de quem/quando. Agora exigimos um header extra de confirmacao explicita
      // e registramos a acao nos logs do Worker (visiveis em tempo real no dashboard do
      // Cloudflare, sem precisar de infraestrutura nova).
      if (req.headers.get('X-Confirm-Reset') !== 'CONFIRMO-RESET-TOTAL') {
        return error('Reset requer header X-Confirm-Reset: CONFIRMO-RESET-TOTAL para confirmar a intencao', 400);
      }
      console.log('[AUDIT] DELETE /reset executado em ' + new Date().toISOString() + ' a partir de IP ' + (req.headers.get('CF-Connecting-IP') || 'desconhecido'));
      // picks e pick_history usam BIGSERIAL (id bigint), participants usa UUID, special_picks usa BIGSERIAL
      await supaFetch("picks?id=gte.0", 'DELETE');
      await supaFetch("special_picks?id=gte.0", 'DELETE');
      await supaFetch("participants?id=gte.00000000-0000-0000-0000-000000000000", 'DELETE');
      await supaFetch("pick_history?id=gte.0", 'DELETE');
      return json({ ok: true });
    }

    // PATCH /admin/unlock
    if (method === 'PATCH' && path === '/admin/unlock') {
      var body = await req.json();
      if (!body.name || !body.adminPass) return error('name e adminPass obrigatorios');
      var h = await sha256(body.adminPass + ':' + JWT_SECRET);
      if (h !== ADMIN_HASH) return error('Admin pass invalida', 403);
      var allParts = await supaFetch("participants?select=id,name,confirmed");
      var target = normalizeName(body.name);
      var parts = allParts ? allParts.filter(function(p){ return normalizeName(p.name) === target; }) : [];
      if (!parts || !parts.length) return error('Participante nao encontrado', 404);
      console.log('[AUDIT] PATCH /admin/unlock para "' + parts[0].name + '" em ' + new Date().toISOString());
      await supaFetch("participants?id=eq." + parts[0].id, 'PATCH', { confirmed: false });
      return json({ ok: true });
    }

    // PATCH /admin/confirm — seta confirmed=true (admin). Ex: { adminPass, name }
    if (method === 'PATCH' && path === '/admin/confirm') {
      var body = await req.json();
      if (!body.name || !body.adminPass) return error('name e adminPass obrigatorios');
      var h = await sha256(body.adminPass + ':' + JWT_SECRET);
      if (h !== ADMIN_HASH) return error('Admin pass invalida', 403);
      var allParts = await supaFetch("participants?select=id,name,confirmed,confirmed_at");
      var target = normalizeName(body.name);
      var parts = allParts ? allParts.filter(function(p){ return normalizeName(p.name) === target; }) : [];
      if (!parts || !parts.length) return error('Participante nao encontrado', 404);
      console.log('[AUDIT] PATCH /admin/confirm para "' + parts[0].name + '" (' + parts[0].id + ') em ' + new Date().toISOString());
      await supaFetch("participants?id=eq." + parts[0].id, 'PATCH', { confirmed: true, confirmed_at: new Date().toISOString() });
      return json({ ok: true, name: parts[0].name, confirmed: true });
    }

    // GET /stats?participantId=...
    if (method === 'GET' && path === '/stats') {
      var pid = url.searchParams.get('participantId');
      if (!pid) return error('participantId obrigatorio');
      var participant = (await supaFetch('participants?id=eq.' + pid + '&select=id,name,confirmed,confirmed_at')) || [];
      if (!participant.length) return error('Participante nao encontrado', 404);
      var picks = (await supaFetch('picks?participant_id=eq.' + pid + '&select=game_n,goals_a,goals_b&limit=10000')) || [];
      var sp = (await supaFetch('special_picks?participant_id=eq.' + pid + '&select=champion,top_scorer')) || [];
      var history = (await supaFetch('pick_history?participant_id=eq.' + pid + '&select=game_n,goals_a,goals_b,created_at&order=created_at.desc&limit=50')) || [];
      return json({ participant: participant[0], picks: picks, special: sp[0] || null, recentHistory: history });
    }

    // GET /majority?gameN=N  ou  GET /majority (todos)
    if (method === 'GET' && path === '/majority') {
      var gn = url.searchParams.get('gameN');
      if (!gn) {
        var allCache = (await supaFetch('majority_cache?select=game_n,data,updated_at&order=game_n')) || [];
        return json({ majority: allCache });
      }
      var cached = (await supaFetch('majority_cache?game_n=eq.' + gn + '&select=data,updated_at')) || [];
      if (cached.length) return json({ game_n: parseInt(gn), data: cached[0].data, updated_at: cached[0].updated_at, cached: true });
      var picks = (await supaFetch('picks?game_n=eq.' + gn + '&select=goals_a,goals_b&limit=10000')) || [];
      // Excluir picks ainda nao preenchidos (goals_a/goals_b nulos) -- antes eram contados
      // como um placar literal "nullxnull", distorcendo o total e podendo aparecer na tela
      // do usuario como um placar real entre os mais votados.
      picks = picks.filter(function(p) { return p.goals_a !== null && p.goals_a !== undefined && p.goals_b !== null && p.goals_b !== undefined; });
      var total = picks.length;
      if (!total) return json({ game_n: parseInt(gn), data: [], total: 0 });
      var counts = {};
      picks.forEach(function(p) { var k = p.goals_a + 'x' + p.goals_b; counts[k] = (counts[k] || 0) + 1; });
      var data = Object.keys(counts).map(function(k) {
        var parts = k.split('x');
        return { goals_a: parseInt(parts[0]), goals_b: parseInt(parts[1]), count: counts[k], pct: Math.round(counts[k] / total * 100) };
      }).sort(function(a, b) { return b.count - a.count; });
      return json({ game_n: parseInt(gn), data: data, total: total, cached: false });
    }

    // POST /majority/refresh — recalcula cache (admin ou JWT)
    if (method === 'POST' && path === '/majority/refresh') {
      var ak = req.headers.get('X-Admin-Key') || '';
      if (ak !== ADMIN_KEY && !user) return error('Auth invalida (admin key ou token JWT obrigatorio)', 403);
      var gnbody = await req.json();
      var gn2 = gnbody.game_n;
      if (!gn2) return error('game_n obrigatorio');
      var picks2 = (await supaFetch('picks?game_n=eq.' + gn2 + '&select=goals_a,goals_b&limit=10000')) || [];
      picks2 = picks2.filter(function(p) { return p.goals_a !== null && p.goals_a !== undefined && p.goals_b !== null && p.goals_b !== undefined; });
      var total2 = picks2.length;
      var counts2 = {};
      picks2.forEach(function(p) { var k = p.goals_a + 'x' + p.goals_b; counts2[k] = (counts2[k] || 0) + 1; });
      var data2 = Object.keys(counts2).map(function(k) {
        var parts = k.split('x');
        return { goals_a: parseInt(parts[0]), goals_b: parseInt(parts[1]), count: counts2[k], pct: Math.round(counts2[k] / total2 * 100) };
      }).sort(function(a, b) { return b.count - a.count; });
      await supaFetch('majority_cache?on_conflict=game_n', 'POST', { game_n: gn2, data: data2, updated_at: new Date().toISOString() });
      return json({ ok: true, game_n: gn2, total: total2, data: data2 });
    }

    // POST /snapshot — grava posição atual (admin ou JWT)
    if (method === 'POST' && path === '/snapshot') {
      var ak2 = req.headers.get('X-Admin-Key') || '';
      if (ak2 !== ADMIN_KEY && !user) return error('Auth invalida (admin key ou token JWT obrigatorio)', 403);
      var snap = await req.json();
      var round = snap.round;
      if (!round) return error('round obrigatorio');
      var ranking = snap.ranking;
      if (!ranking || !ranking.length) return error('ranking obrigatorio');
      // Batch upsert via PostgREST (array no body) em vez de N requests sequenciais --
      // antes, cada participante gerava um round-trip separado ao Supabase, o que
      // podia causar timeout do Worker com 20+ participantes (30s CPU limit do CF).
      var batchData = ranking.map(function(entry) {
        return {
          participant_id: entry.participant_id,
          round: round,
          position: entry.position,
          points: entry.points,
          exact_count: entry.exact_count || 0,
          result_count: entry.result_count || 0
        };
      });
      await supaFetch('ranking_snapshots?on_conflict=participant_id,round', 'POST', batchData, { 'Prefer': 'resolution=merge-duplicates' });
      return json({ ok: true, round: round, count: batchData.length });
    }

    // GET /evolution?participantId=...
    if (method === 'GET' && path === '/evolution') {
      var pid2 = url.searchParams.get('participantId');
      if (!pid2) return error('participantId obrigatorio');
      var snaps = (await supaFetch('ranking_snapshots?participant_id=eq.' + pid2 + '&select=round,position,points,recorded_at&order=round')) || [];
      return json({ participantId: pid2, evolution: snaps });
    }

    // GET /evolution/all — historico completo de todos participantes (snapshots)
    if (method === 'GET' && path === '/evolution/all') {
      var allSnaps = (await supaFetch('ranking_snapshots?select=participant_id,round,position,points,recorded_at&order=round')) || [];
      return json({ snapshots: allSnaps });
    }

    // GET /app — proxy do site (backup se GitHub Pages cair)
    // Restrito a uma allowlist de arquivos estaticos conhecidos do projeto -- antes,
    // QUALQUER path terminando em .png/.json era aceito e repassado para o GitHub Pages
    // sem validacao (ex: /../../x.json, ou paths arbitrarios longos), o que permitia abusar
    // do proxy/cache do Worker com paths que nao correspondem a nenhum arquivo real do site.
    var APP_PROXY_ALLOWLIST = [
      'bola_t.png','mascote1_t.png','mascote2_t.png','mascote3_t.png',
      'logo_globo.png','logo_sportv.png','logo_cazetv.png','logo_sbt.png',
      'logo_nsports.png','logo_globoplay.png','logo_getv.png',
      'players.json','photos.json'
    ];
    var isAppProxyAsset = APP_PROXY_ALLOWLIST.indexOf(path.replace(/^\//,'')) >= 0;
    if (method === 'GET' && (path === '/app' || isAppProxyAsset)) {
      var ghUrl = 'https://lfgobbo.github.io/Copa2026/' + (path === '/app' ? '' : path.replace(/^\//,''));
      var cacheKey = ghUrl;
      var cache = await caches.open('copa2026-proxy');
      var cached = await cache.match(cacheKey);
      if (cached && path !== '/app') return cached;
      try {
        var siteRes = await fetch(ghUrl + (path === '/app' ? '?v=' + Date.now() : ''), { cf: { cacheEverything: false } });
        if (siteRes.ok) {
          if (path !== '/app') { var copy = siteRes.clone(); cache.put(cacheKey, copy); }
          if (path === '/app') {
            var text = await siteRes.text();
            return new Response(text, { status: 200, headers: { 'Content-Type': 'text/html;charset=utf-8', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' } });
          }
          return siteRes;
        }
      } catch(e) {}
      if (cached) return cached;
      return json({ error: 'Site temporariamente indisponivel' }, 503);
    }

    // GET /reopen-status — fases abertas para reabertura (público, sem auth)
    if (method === 'GET' && path === '/reopen-status') {
      var phases = (await supaFetch('phase_reopen?select=phase_name,game_ns,open,deadline,opened_at')) || [];
      return json({ phases: phases });
    }

    // POST /picks-reopen — salva palpite reaberto em mata-mata (tabela separada, picks original intocado)
    if (method === 'POST' && path === '/picks-reopen') {
      if (!user) return error('Token invalido', 401);
      var body = await req.json();
      if (!body.game_n) return error('game_n obrigatorio');
      var gameN = parseInt(body.game_n, 10);
      // Verificar se é jogo de mata-mata
      var phaseName = KO_GAME_PHASE[gameN];
      if (!phaseName) return error('Jogo nao pertence ao mata-mata', 400);
      // Verificar se a fase está aberta
      var phaseRows = (await supaFetch('phase_reopen?phase_name=eq.' + phaseName + '&select=open,deadline')) || [];
      if (!phaseRows.length || !phaseRows[0].open) return error('Fase nao esta aberta para reabertura', 403);
      // Deadline: 5 min antes do 1º jogo da fase.
      // Se admin configurou deadline manual no DB, ele prevalece; senão usa o calculado.
      var now = Date.now();
      var phaseDeadline = phaseRows[0].deadline
        ? new Date(phaseRows[0].deadline)
        : phaseReopenDeadline(phaseName);
      if (phaseDeadline && now >= phaseDeadline.getTime()) return error('Prazo da fase encerrado', 403);
      // Bug 5: validar placar antes de salvar
      var goalsA = body.goals_a !== undefined ? body.goals_a : body.score_a;
      var goalsB = body.goals_b !== undefined ? body.goals_b : body.score_b;
      var parsedA = (goalsA !== null && goalsA !== undefined) ? parseInt(goalsA, 10) : null;
      var parsedB = (goalsB !== null && goalsB !== undefined) ? parseInt(goalsB, 10) : null;
      if (parsedA !== null && (isNaN(parsedA) || parsedA < 0)) return error('goals_a invalido', 400);
      if (parsedB !== null && (isNaN(parsedB) || parsedB < 0)) return error('goals_b invalido', 400);
      if (body.ko_pick && body.ko_pick !== 'a' && body.ko_pick !== 'b') return error('ko_pick invalido', 400);
      if (parsedA !== null && parsedB !== null && parsedA === parsedB && !body.ko_pick) return error('ko_pick obrigatorio em empate KO', 400);
      var payload = {
        participant_id: user.sub,
        game_n: gameN,
        goals_a: parsedA,
        goals_b: parsedB,
        ko_pick: body.ko_pick || null,
        updated_at: new Date().toISOString()
      };
      // Upsert atômico via Supabase on_conflict (NUNCA modifica a tabela picks original)
      await supaFetch('picks_reopen?on_conflict=participant_id,game_n', 'POST', payload, { 'Prefer': 'resolution=merge-duplicates' });
      return json({ ok: true });
    }

    // PATCH /admin/phase-reopen — admin abre ou fecha uma fase para reabertura
    if (method === 'PATCH' && path === '/admin/phase-reopen') {
      var body = await req.json();
      if (!body.phase_name || body.adminPass === undefined) return error('phase_name e adminPass obrigatorios');
      var h = await sha256(body.adminPass + ':' + JWT_SECRET);
      if (h !== ADMIN_HASH) return error('Admin pass invalida', 403);
      var isOpen = body.open === true || body.open === 'true';
      var patch = { open: isOpen };
      if (isOpen) {
        patch.opened_at = new Date().toISOString();
        patch.closed_at = null;
        // Admin pode passar deadline manual; se não, calcula automaticamente (5 min antes do 1º jogo da fase)
        if (body.deadline) {
          patch.deadline = body.deadline;
        } else {
          var autoDl = phaseReopenDeadline(body.phase_name);
          if (autoDl) patch.deadline = autoDl.toISOString();
        }
      } else {
        patch.closed_at = new Date().toISOString();
      }
      await supaFetch('phase_reopen?phase_name=eq.' + body.phase_name, 'PATCH', patch);
      console.log('[AUDIT] /admin/phase-reopen: fase=' + body.phase_name + ' open=' + isOpen + ' em ' + new Date().toISOString());
      return json({ ok: true, phase_name: body.phase_name, open: isOpen });
    }

    // PATCH /admin/set-game-n — admin associa game_n a um registro de live_scores (necessario para jogos KO)
    // Body: { adminPass, game_key, game_n }
    if (method === 'PATCH' && path === '/admin/set-game-n') {
      var body = await req.json();
      if (!body.game_key || !body.game_n || body.adminPass === undefined) return error('game_key, game_n e adminPass obrigatorios');
      var h = await sha256(body.adminPass + ':' + JWT_SECRET);
      if (h !== ADMIN_HASH) return error('Admin pass invalida', 403);
      var gnInt = parseInt(body.game_n, 10);
      if (isNaN(gnInt) || gnInt < 1 || gnInt > 104) return error('game_n invalido (1-104)');
      var existing = (await supaFetch('live_scores?game_key=eq.' + encodeURIComponent(body.game_key) + '&select=game_key,game_n')) || [];
      if (!existing.length) return error('game_key nao encontrado em live_scores', 404);
      await supaFetch('live_scores?game_key=eq.' + encodeURIComponent(body.game_key), 'PATCH', { game_n: gnInt });
      console.log('[AUDIT] /admin/set-game-n: game_key=' + body.game_key + ' game_n=' + gnInt + ' em ' + new Date().toISOString());
      return json({ ok: true, game_key: body.game_key, game_n: gnInt });
    }

    // GET /health — monitoramento
    if (method === 'GET' && path === '/health') {
      return json({ ok: true, uptime: Math.floor(Date.now() / 1000) });
    }

    // GET /scores — scores centralizados da FIFA (cache no Supabase via /cron)
    if (method === 'GET' && path === '/scores') {
      try {
        var scoresData = (await supaFetch('live_scores?select=game_key,home_team,away_team,goals_home,goals_away,match_id,updated_at&order=updated_at.desc')) || [];
        return json({ scores: scoresData, count: scoresData.length });
      } catch (e) {
        // Tabela pode não existir ainda — retorna array vazio em vez de 500
        console.error('GET /scores falhou:', e.message);
        return json({ scores: [], count: 0, warning: 'live_scores indisponivel' });
      }
    }

    // GET /events — gols/cartões centralizados (fonte compartilhada entre navegadores)
    // Alimentado pelo POST abaixo: qualquer navegador que já resolveu o timeline de um
    // jogo (nomes de jogador, gol contra, etc., resolvidos no cliente) envia o resultado
    // pronto para cá, e quem ainda não tem esse jogo localmente (ex.: celular aberto
    // >24h depois do jogo) recebe pronto na próxima carga da página.
    if (method === 'GET' && path === '/events') {
      try {
        var evData = (await supaFetch('game_events?select=game_n,goals,cards,updated_at')) || [];
        return json({ events: evData, count: evData.length });
      } catch (e) {
        console.error('GET /events falhou:', e.message);
        return json({ events: [], count: 0, warning: 'game_events indisponivel' });
      }
    }

    // Conta quantos eventos (gols+cartoes) um objeto {a:[...],b:[...]} tem.
    function _evCount(obj) {
      if (!obj) return 0;
      return (obj.a ? obj.a.length : 0) + (obj.b ? obj.b.length : 0);
    }

    // Protecao contra regressao (incidente 2026-07-03: um navegador com timeline PARCIAL da
    // FIFA — ex. rede instavel no meio da busca — sobrescreveu dado completo dos jogos #83/#84
    // que outros navegadores ja tinham enviado, apagando gols e cartoes para todo mundo).
    // Antes de gravar, busca o que ja existe para esses jogos e descarta qualquer linha nova
    // que tenha MENOS eventos (gols+cartoes) que a ja salva — a escrita so pode crescer.
    async function _filterNonRegressing(rows) {
      if (!rows.length) return rows;
      var ns = rows.map(function (r) { return r.game_n; }).join(',');
      var existing = [];
      try {
        existing = (await supaFetch('game_events?game_n=in.(' + ns + ')&select=game_n,goals,cards')) || [];
      } catch (e) { existing = []; }
      var existingByN = {};
      existing.forEach(function (e) { existingByN[e.game_n] = e; });
      return rows.filter(function (r) {
        var old = existingByN[r.game_n];
        if (!old) return true;
        var oldCount = _evCount(old.goals) + _evCount(old.cards);
        var newCount = _evCount(r.goals) + _evCount(r.cards);
        return newCount >= oldCount;
      });
    }

    // POST /events — recebe goals/cards já resolvidos de um jogo específico e persiste.
    // Best-effort: não exige autenticação (só leitura agregada, sem dado sensível de
    // participante) e falha silenciosamente do lado do cliente se der erro.
    if (method === 'POST' && path === '/events') {
      try {
        var evBody = await req.json();
        var evGameN = parseInt(evBody && evBody.game_n, 10);
        if (!evGameN || evGameN < 1 || evGameN > 104) return json({ error: 'game_n inválido' }, 400);
        var evRow = {
          game_n: evGameN,
          goals: evBody.goals || {},
          cards: evBody.cards || {},
          updated_at: new Date().toISOString()
        };
        var evRowsToWrite = await _filterNonRegressing([evRow]);
        if (!evRowsToWrite.length) return json({ ok: true, skipped: true });
        await supaFetch('game_events?on_conflict=game_n', 'POST', evRowsToWrite, { 'Prefer': 'resolution=merge-duplicates' });
        return json({ ok: true });
      } catch (e) {
        console.error('POST /events falhou:', e.message);
        return json({ ok: false, error: 'Erro ao salvar evento' }, 500);
      }
    }

    // POST /events/bulk — mesma coisa que /events, mas para varios jogos em uma unica
    // requisicao. Adicionado em 2026-07-03: o backfill de sessao (varre tudo que o navegador
    // ja tem localmente) disparava 1 POST /events por jogo — nesta fase do campeonato,
    // 80-100 requisicoes paralelas de uma vez, travando o carregamento da pagina por
    // varios segundos (mais grave no celular). Cliente agora manda tudo aqui de uma vez.
    if (method === 'POST' && path === '/events/bulk') {
      try {
        var bulkBody = await req.json();
        var bulkRows = (bulkBody && bulkBody.rows) || [];
        if (!Array.isArray(bulkRows) || !bulkRows.length) return json({ ok: true, count: 0 });
        var validRows = [];
        for (var bi = 0; bi < bulkRows.length; bi++) {
          var rn = parseInt(bulkRows[bi] && bulkRows[bi].game_n, 10);
          if (!rn || rn < 1 || rn > 104) continue;
          validRows.push({
            game_n: rn,
            goals: bulkRows[bi].goals || {},
            cards: bulkRows[bi].cards || {},
            updated_at: new Date().toISOString()
          });
        }
        if (!validRows.length) return json({ ok: true, count: 0 });
        var bulkRowsToWrite = await _filterNonRegressing(validRows);
        if (!bulkRowsToWrite.length) return json({ ok: true, count: 0 });
        await supaFetch('game_events?on_conflict=game_n', 'POST', bulkRowsToWrite, { 'Prefer': 'resolution=merge-duplicates' });
        return json({ ok: true, count: bulkRowsToWrite.length });
      } catch (e) {
        console.error('POST /events/bulk falhou:', e.message);
        return json({ ok: false, error: 'Erro ao salvar eventos' }, 500);
      }
    }

    // GET /cron — tarefas agendadas (chamado via cron-job.org ou Cloudflare Cron)
    if (method === 'GET' && path === '/cron') {
      // Usa CRON_SECRET em vez de ADMIN_KEY para isolar permissoes.
      // Fallback para ADMIN_KEY se CRON_SECRET ainda nao estiver configurado.
      var expectedCronSecret = (typeof CRON_SECRET !== 'undefined' && CRON_SECRET) ? CRON_SECRET : ADMIN_KEY;
      // Fix 2026-07-08: aceita tambem via header (evita o secret aparecer em URL completa
      // nos logs de acesso do Cloudflare/qualquer proxy intermediario). Query string mantida
      // como fallback pra nao quebrar chamadas manuais/scripts antigos que ainda usam ?secret=.
      var cronSecret = req.headers.get('X-Cron-Secret') || url.searchParams.get('secret') || '';
      if (cronSecret !== expectedCronSecret) return error('Cron secret invalido', 403);

      // Fix 2026-07-20: torneio encerrado (Final = Jogo 104 ja disputado, resultado nao muda
      // mais). Buscar calendario/timeline da FIFA e recalcular o snapshot do ranking inteiro
      // (tasks fifa/snapshot) e trabalho pesado e inutil pra sempre a partir de agora -- essas
      // duas tasks curto-circuitam mais abaixo, mesmo que o Cron Trigger nativo do Cloudflare ou
      // um job externo (cron-job.org) ainda disparem essa rota por engano. O "keepalive" (1 ping
      // barato no Supabase) continua rodando de propósito: sem ele o projeto do Supabase pode
      // pausar por inatividade no free tier, e aí a aba Resumo/Bolão (que ainda depende de dados
      // ao vivo do Supabase) para de funcionar pra quem visitar o site no futuro. Reverter os
      // curto-circuitos (por ex. pra reaproveitar este Worker num torneio futuro) e so trocar
      // TORNEIO_ENCERRADO pra false.
      var TORNEIO_ENCERRADO = true;

      var task = url.searchParams.get('task') || '';
      var results = {};
      // Mapa game_key -> game_n para jogos de grupo (72 jogos). Compartilhado por task=fifa e task=snapshot.
      var GAME_KEY_MAP = {"MEX_RSA":1,"KOR_CZE":2,"CAN_BIH":3,"USA_PAR":4,"QAT_SUI":5,"BRA_MAR":6,"HAI_SCO":7,"AUS_TUR":8,"GER_CUW":9,"NED_JPN":10,"CIV_ECU":11,"SWE_TUN":12,"ESP_CPV":13,"BEL_EGY":14,"KSA_URU":15,"IRN_NZL":16,"ARG_ALG":17,"FRA_SEN":18,"IRQ_NOR":19,"AUT_JOR":20,"POR_COD":21,"ENG_CRO":22,"GHA_PAN":23,"UZB_COL":24,"CZE_RSA":25,"SUI_BIH":26,"CAN_QAT":27,"MEX_KOR":28,"TUR_PAR":29,"USA_AUS":30,"SCO_MAR":31,"BRA_HAI":32,"NED_SWE":33,"GER_CIV":34,"ECU_CUW":35,"TUN_JPN":36,"ESP_KSA":37,"BEL_IRN":38,"URU_CPV":39,"NZL_EGY":40,"ARG_AUT":41,"FRA_IRQ":42,"NOR_SEN":43,"JOR_ALG":44,"POR_UZB":45,"ENG_GHA":46,"PAN_CRO":47,"COL_COD":48,"BIH_QAT":50,"SUI_CAN":49,"MAR_HAI":52,"SCO_BRA":51,"RSA_KOR":54,"CZE_MEX":53,"CUW_CIV":56,"ECU_GER":55,"TUN_NED":58,"JPN_SWE":57,"PAR_AUS":60,"TUR_USA":59,"SEN_IRQ":62,"NOR_FRA":61,"URU_ESP":64,"CPV_KSA":63,"NZL_BEL":66,"EGY_IRN":65,"CRO_GHA":68,"PAN_ENG":67,"COD_UZB":70,"COL_POR":69,"JOR_ARG":72,"ALG_AUT":71};


      // Mapa data ISO (YYYY-MM-DDTHH:MM) -> game_n para jogos KO (game_n > 72)
      // Usado como fallback quando GAME_KEY_MAP não tem a chave (equipes KO são desconhecidas antes da partida)
      var dateToGameN = {};
      BOLAO_GAMES.forEach(function(g) {
        if (g.n > 72) {
          var p = g.d.split(' ')[0].split('/');
          var tp = g.t.split(':');
          try {
            var t = new Date(Date.UTC(2026, parseInt(p[1],10)-1, parseInt(p[0],10), parseInt(tp[0],10)+3, parseInt(tp[1],10)));
            dateToGameN[t.toISOString().slice(0,16)] = g.n;
          } catch(e) {}
        }
      });

      // keepalive: pingar Supabase para evitar pausa do Free Tier
      if (task === 'keepalive' || task === 'all') {
        try {
          await supaFetch('participants?select=id&limit=1');
          results.keepalive = 'ok';
        } catch (e) { results.keepalive = 'fail: ' + e.message; }
      }

      // fifa: buscar scores da FIFA e armazenar no Supabase
      if (!TORNEIO_ENCERRADO && (task === 'fifa' || task === 'all')) {
        try {
          var fresp = await fetch('https://api.fifa.com/api/v3/calendar/matches?idCompetition=17&idSeason=285023&count=200');
          var fdata = await fresp.json();
          if (fdata && fdata.Results) {
            var batch = [];
            var etPatches = []; // jogos em prorrogação que precisam do placar de 90min
            var now = new Date().toISOString();
            for (var i = 0; i < fdata.Results.length; i++) {
              var m = fdata.Results[i];
              if (m.HomeTeamScore === null || m.AwayTeamScore === null) continue;
              var h = m.Home ? m.Home.Abbreviation : null;
              var a = m.Away ? m.Away.Abbreviation : null;
              var hs = parseInt(m.HomeTeamScore, 10);
              var as = parseInt(m.AwayTeamScore, 10);
              if (!h || !a || isNaN(hs) || isNaN(as)) continue;
              var gkFifa = h + '_' + a;
              // Detectar vencedor nos pênaltis (hs===as após ET + penaltyScores disponíveis)
              var penWinner = null;
              if (hs === as && m.HomeTeamPenaltyScore !== null && m.HomeTeamPenaltyScore !== undefined &&
                  m.AwayTeamPenaltyScore !== null && m.AwayTeamPenaltyScore !== undefined) {
                var hp = parseInt(m.HomeTeamPenaltyScore, 10), ap2 = parseInt(m.AwayTeamPenaltyScore, 10);
                if (!isNaN(hp) && !isNaN(ap2) && hp !== ap2) penWinner = hp > ap2 ? 'home' : 'away';
              }
              batch.push({
                game_key: gkFifa,
                home_team: h,
                away_team: a,
                goals_home: hs,
                goals_away: as,
                game_n: (function() { var gn = GAME_KEY_MAP[gkFifa]; if (!gn && m.Date) { var dk = (m.Date+'').slice(0,16); gn = dateToGameN[dk] || null; } return gn || null; })(),
                match_id: m.IdMatch || null,
                match_status: (m.MatchStatus != null) ? m.MatchStatus : null,
                pen_winner: penWinner,
                updated_at: now
              });
              // Detecta ir a prorrogação (Status 5 = ET, 6 = pênaltis) — o placar de 90min
              // é reconstruído depois via Timeline (ver bloco abaixo), não capturado aqui.
              // A tentativa antiga de capturar isso "ao vivo" (só quando pegava o jogo
              // empatado exatamente no momento do poll) falhava sempre que o gol da
              // prorrogação caía entre dois polls de 5min — caso real: Bélgica R32.
              if (m.MatchStatus === 5 || m.MatchStatus === 6) {
                etPatches.push(gkFifa);
              }
            }
            // Deduplicar por game_key antes do upsert em lote. O Postgres rejeita o INSERT
            // inteiro (23505 duplicate key) se duas linhas do MESMO lote tiverem a mesma
            // chave -- ON CONFLICT so resolve conflito contra linhas JA existentes na tabela,
            // nao contra duplicatas dentro do proprio lote sendo inserido. Se a API da FIFA
            // listar o mesmo jogo duas vezes numa resposta, o lote inteiro falhava e NENHUM
            // jogo era gravado (foi o que travou o live_scores por dias na virada pro mata-mata).
            var batchByKey = {};
            batch.forEach(function(r) { batchByKey[r.game_key] = r; }); // ultima entrada da FIFA vence
            batch = Object.keys(batchByKey).map(function(k) { return batchByKey[k]; });
            // Um único upsert em batch (1 subrequest) em vez de N individuais
            if (batch.length > 0) {
              await supaFetch('live_scores?on_conflict=game_key', 'POST', batch, { 'Prefer': 'resolution=merge-duplicates' });
            }
            // Placar de 90min via Timeline (robusto — não depende de pegar o jogo "ao vivo"
            // no instante exato em que está empatado). Reconstrói percorrendo os eventos da
            // Timeline da FIFA e pegando o último placar com MatchMinute<=90. Só busca para
            // jogos que ainda não têm goals_home_90 gravado (idempotente, barato no cron seguinte).
            for (var pi = 0; pi < etPatches.length; pi++) {
              var gk = etPatches[pi];
              var row = batch.find(function(r){ return r.game_key === gk; });
              if (!row || !row.match_id) continue;
              try {
                var pending = (await supaFetch('live_scores?game_key=eq.' + gk + '&goals_home_90=is.null&select=game_key')) || [];
                if (!pending.length) continue; // já resolvido antes
                var tlResp = await fetch('https://api.fifa.com/api/v3/timelines/' + row.match_id);
                var tlData = await tlResp.json();
                if (!tlData || !tlData.Event || !tlData.Event.length) continue;
                var h90 = 0, a90 = 0, found = false;
                for (var ei = 0; ei < tlData.Event.length; ei++) {
                  var ev = tlData.Event[ei];
                  if (ev.HomeGoals === undefined || ev.AwayGoals === undefined) continue;
                  var minRaw = ev.MatchMinute ? String(ev.MatchMinute).replace(/'/g, '').split('+')[0] : null;
                  var minNum = minRaw !== null ? parseInt(minRaw, 10) : NaN;
                  if (!isNaN(minNum) && minNum <= 90) { h90 = ev.HomeGoals; a90 = ev.AwayGoals; found = true; }
                }
                if (found) {
                  await supaFetch('live_scores?game_key=eq.' + gk + '&goals_home_90=is.null', 'PATCH', { goals_home_90: h90, goals_away_90: a90 });
                }
              } catch (e) { /* tenta de novo no próximo cron */ }
            }
            results.fifa = batch.length + ' scores stored';
          } else {
            results.fifa = 'no data';
          }
        } catch (e) { results.fifa = 'fail: ' + e.message; }
      }

      // snapshot: calcular ranking real com placares da FIFA (live_scores no Supabase)
      if (!TORNEIO_ENCERRADO && (task === 'snapshot' || task === 'all')) {
        try {
          // Funcao de pontuacao grupos: identica ao bolaoCalcPickPts do frontend
          function calcPts(pA,pB,rA,rB){
            if(pA===null||pA===undefined||pB===null||pB===undefined)return -1;
            if(rA===null||rA===undefined||rB===null||rB===undefined)return -1;
            if(pA===rA&&pB===rB)return 10;
            var pr=Math.sign(pA-pB),rr=Math.sign(rA-rB);
            if(pr!==rr)return 0;
            if(Math.max(pA,pB)===Math.max(rA,rB))return 6;
            if(Math.min(pA,pB)===Math.min(rA,rB))return 4;
            return 2;
          }
          // Funcao KO: tabela cheia (acertou confronto, nao reabriu) ou reduzida (reabriu/errou)
          function calcKOPts(pA,pB,rA,rB,useFullTable){
            if(pA===null||pA===undefined||pB===null||pB===undefined)return -1;
            if(rA===null||rA===undefined||rB===null||rB===undefined)return -1;
            var exact=pA===rA&&pB===rB;
            var pr=Math.sign(pA-pB),rr=Math.sign(rA-rB);
            if(useFullTable){
              if(exact)return 15;
              if(pr!==rr)return 0;
              if(Math.max(pA,pB)===Math.max(rA,rB))return 9;
              if(Math.min(pA,pB)===Math.min(rA,rB))return 6;
              return 3;
            }else{
              if(exact)return 10;
              if(pr!==rr)return 0;
              if(Math.max(pA,pB)===Math.max(rA,rB))return 6;
              if(Math.min(pA,pB)===Math.min(rA,rB))return 4;
              return 2;
            }
          }

          // 1. Buscar placares reais do Supabase (gravados pelo task=fifa)
          var liveScores = (await supaFetch('live_scores?select=game_key,game_n,goals_home,goals_away,goals_home_90,goals_away_90,pen_winner,home_team,away_team')) || [];
          // Montar mapa game_n -> {a, b}
          var realScores = {};
          liveScores.forEach(function(s) {
            var gn = s.game_n || GAME_KEY_MAP[s.game_key] || null;
            if (!gn) return;
            realScores[gn] = { a: s.goals_home, b: s.goals_away, homeTeam: s.home_team, awayTeam: s.away_team };
            if (s.goals_home_90 !== null && s.goals_home_90 !== undefined) realScores[gn].ft = { a: s.goals_home_90, b: s.goals_away_90 };
            // pen_winner: 'home' ou 'away' → converter para 'a'/'b' (home=a, away=b no jogo)
            if (s.pen_winner) realScores[gn].penWinner = s.pen_winner === 'home' ? 'a' : 'b';
          });

          // 2. Buscar participantes confirmados
          var snapParticipants = (await supaFetch('participants?select=id,name,confirmed,confirmed_at,bonus_points&confirmed=eq.true')) || [];
          if (!snapParticipants.length) { results.snapshot = 'nenhum participante confirmado'; }
          else if (!Object.keys(realScores).length) { results.snapshot = 'nenhum placar disponivel em live_scores (rodar task=fifa primeiro)'; }
          else {
            // 3. Buscar todos os picks (paginado)
            var snapPicks = [];
            try {
              var spBase = SUPABASE_URL + '/rest/v1/picks?select=participant_id,game_n,goals_a,goals_b';
              var spOpts = { method:'GET', headers:{ apikey:SUPABASE_KEY, Authorization:'Bearer '+SUPABASE_KEY, 'Content-Type':'application/json' } };
              for (var pg=0; pg<20; pg++) {
                spOpts.headers['Range'] = (pg*1000)+'-'+((pg+1)*1000-1);
                var spr = await fetch(spBase, spOpts);
                if (!spr.ok && spr.status !== 206) break;
                var spb = await spr.json() || [];
                if (!spb.length) break;
                snapPicks = snapPicks.concat(spb);
                if (spb.length < 1000) break;
              }
            } catch(e) {}

            var picksByPid = {};
            snapPicks.forEach(function(p) {
              if (!picksByPid[p.participant_id]) picksByPid[p.participant_id] = {};
              picksByPid[p.participant_id][p.game_n] = p;
            });

            // 3b. Buscar picks reabertos (mata-mata) — tabela separada, picks originais intocados
            var snapPicksReopen = [];
            try {
              var rpBase = SUPABASE_URL + '/rest/v1/picks_reopen?select=participant_id,game_n,goals_a,goals_b,ko_pick';
              var rpOpts = { method:'GET', headers:{ apikey:SUPABASE_KEY, Authorization:'Bearer '+SUPABASE_KEY, 'Content-Type':'application/json', 'Range':'0-9999' } };
              var rpr = await fetch(rpBase, rpOpts);
              if (rpr.ok || rpr.status === 206) { snapPicksReopen = (await rpr.json()) || []; }
            } catch(e) {}
            var reopenByPid = {};
            snapPicksReopen.forEach(function(p) {
              if (!reopenByPid[p.participant_id]) reopenByPid[p.participant_id] = {};
              reopenByPid[p.participant_id][p.game_n] = p;
            });

            // 4. Calcular pontuacao por participante (grupos + KO com picks_reopen)
            var KO_PHASE_BONUS = {r32:5,r16:10,qf:15,sf:20,'3rd':20,final:30};

            // Contexto de chaveamento REAL (placares reais, com _r90 = ft||real para jogos com prorrogacao).
            // Construido uma unica vez e compartilhado por todos os participantes.
            function realGetScore(gn) {
              var r = realScores[gn];
              if (!r || r.a === undefined || r.b === undefined) return null;
              return r.ft || r;
            }
            function realGetKOSide(gn) {
              var r = realScores[gn];
              return (r && r.penWinner) ? r.penWinner : null;
            }
            var realCtx = makeBracketContext(realGetScore, realGetKOSide);

            var rows = snapParticipants.map(function(part) {
              var myPicks = picksByPid[part.id] || {};
              var myReopen = reopenByPid[part.id] || {};
              var total = 0, exactCount = 0, resultCount = 0;
              var confirmTs = part.confirmed_at ? new Date(part.confirmed_at).getTime() : null;

              // Contexto de chaveamento SIMULADO: usa o palpite do participante para jogos a partir
              // de BOLAO_FIRST (reopen tem prioridade sobre o palpite original); antes disso, ou sem
              // palpite algum, cai no placar real (igual ao _bolaoGetScore do frontend).
              function simGetScore(gn) {
                if (gn < BOLAO_FIRST) return realGetScore(gn);
                var rp = myReopen[gn];
                if (rp && rp.goals_a !== null && rp.goals_a !== undefined) return { a: rp.goals_a, b: rp.goals_b };
                var p = myPicks[gn];
                if (p && p.goals_a !== null && p.goals_a !== undefined) return { a: p.goals_a, b: p.goals_b };
                return realGetScore(gn);
              }
              function simGetKOSide(gn) {
                var rp = myReopen[gn];
                if (rp && rp.ko_pick) return rp.ko_pick;
                return realGetKOSide(gn);
              }
              var simCtx = makeBracketContext(simGetScore, simGetKOSide);

              Object.keys(realScores).forEach(function(gn) {
                var gnNum = parseInt(gn, 10);
                var dl = bolaoDeadline(gnNum);
                if (dl && confirmTs && (dl.getTime() + BOLAO_DEADLINE_MS) < confirmTs) return;
                var pick = myPicks[gnNum];
                var real = realScores[gn];
                var isKO = !!KO_GAME_PHASE[gnNum];
                var pts;
                if (isKO) {
                  // KO: reopen tem prioridade; sem reopen usa pick original.
                  // acertouConfronto: os dois times do confronto (resolvidos via bracket) batem com a
                  // simulacao a partir dos palpites do participante -- so entao vale tabela cheia e bonus
                  // de fase, igual a regra final do frontend (v20.22): useFullTable = acertouConfronto && !hasReopen.
                  var reopenPick = myReopen[gnNum];
                  var hasReopen = reopenPick && reopenPick.goals_a !== null && reopenPick.goals_a !== undefined;
                  var activePick = hasReopen ? reopenPick : pick;
                  if (!activePick || activePick.goals_a === null || activePick.goals_a === undefined) return;
                  var acertouConfronto = bracketAcertouConfronto(gnNum, realCtx, simCtx);
                  var useFullTable = acertouConfronto && !hasReopen;
                  var _r90 = real.ft || real; pts = calcKOPts(activePick.goals_a, activePick.goals_b, _r90.a, _r90.b, useFullTable);
                  if (pts >= 0 && acertouConfronto) total += (KO_PHASE_BONUS[KO_GAME_PHASE[gnNum]] || 0);
                  // +5 se acertou ko_pick nos pênaltis (real.a===real.b = placar final empatado = pênaltis)
                  if (pts >= 0 && real.a === real.b && activePick.ko_pick && real.penWinner) {
                    if (activePick.ko_pick === real.penWinner) { total += 5; }
                  }
                } else {
                  if (!pick || pick.goals_a === null || pick.goals_b === null) return;
                  pts = calcPts(pick.goals_a, pick.goals_b, real.a, real.b);
                }
                if (pts < 0) return;
                total += pts;
                if (pts === 10 || pts === 15) exactCount++;
                else if (pts >= 2) resultCount++;
              });
              total += (part.bonus_points || 0);
              return { participant_id: part.id, points: total, exact_count: exactCount, result_count: resultCount, position: 0 };
            });
            rows.sort(function(a,b){ return b.points-a.points || b.exact_count-a.exact_count || b.result_count-a.result_count; });
            rows.forEach(function(r,i){ r.position=i+1; });

            // 5. Batch upsert no Supabase (PostgREST aceita array no body com on_conflict)
            var round = url.searchParams.get('round') || String(Math.max.apply(null, Object.keys(realScores).map(Number)));
            var snapData = rows.map(function(r){
              return { participant_id:r.participant_id, round:parseInt(round,10), position:r.position,
                       points:r.points, exact_count:r.exact_count, result_count:r.result_count };
            });
            await supaFetch('ranking_snapshots?on_conflict=participant_id,round', 'POST', snapData, { 'Prefer': 'resolution=merge-duplicates' });
            results.snapshot = rows.length+' participants, round='+round+', '+Object.keys(realScores).length+' scored games';
          }
        } catch (e) { results.snapshot = 'fail: ' + e.message; }
      }

      // auto-reopen: abre fases automaticamente baseado em partidas concluídas pela FIFA
      // Thresholds: r32 após 72 grupos, r16 após 88, qf após 96, sf após 100, 3rd+final após 102
      // Fix 2026-07-20: todas as fases já estão abertas pra sempre (torneio encerrado) — essa
      // task já virou um no-op de qualquer forma (o loop pula toda fase com open=true), mas
      // continuava gastando 1 fetch na FIFA + 1 leitura no Supabase por ciclo à toa.
      if (!TORNEIO_ENCERRADO && (task === 'auto-reopen' || task === 'all')) {
        try {
          // Contar partidas concluídas diretamente da API da FIFA — não depende do
          // mapeamento game_n em live_scores (mais frágil nas fases de mata-mata, onde
          // os times só são conhecidos após o grupo/fase anterior terminar).
          var arFresp = await fetch('https://api.fifa.com/api/v3/calendar/matches?idCompetition=17&idSeason=285023&count=200');
          var arData = await arFresp.json();
          var completedCount = 0;
          if (arData && arData.Results) {
            completedCount = arData.Results.filter(function(m) {
              return m.HomeTeamScore !== null && m.AwayTeamScore !== null;
            }).length;
          }
          // Threshold por fase (cumulativo)
          var PHASE_THRESHOLD = { r32: 72, r16: 88, qf: 96, sf: 100, '3rd': 102, final: 102 }; // final abre com semifinalistas conhecidos (igual sf)
          var phaseRows = (await supaFetch('phase_reopen?select=phase_name,open,deadline')) || [];
          var opened = [];
          for (var pri = 0; pri < phaseRows.length; pri++) {
            var pr = phaseRows[pri];
            if (pr.open) continue; // já aberta
            var threshold = PHASE_THRESHOLD[pr.phase_name];
            if (threshold === undefined) continue;
            if (completedCount >= threshold) {
              var autoDlAR = phaseReopenDeadline(pr.phase_name);
              // Abre a fase mesmo que o deadline já tenha passado (ex: fase iniciada antes do cron rodar).
              // Nesse caso não define deadline — fica aberta até admin fechar manualmente.
              var patchAR = { open: true, opened_at: new Date().toISOString(), closed_at: null };
              if (autoDlAR && Date.now() < autoDlAR.getTime()) patchAR.deadline = autoDlAR.toISOString();
              await supaFetch('phase_reopen?phase_name=eq.' + pr.phase_name, 'PATCH', patchAR);
              console.log('[AUTO-REOPEN] Fase ' + pr.phase_name + ' aberta automaticamente. Partidas concluídas: ' + completedCount);
              opened.push(pr.phase_name);
            }
          }
          results['auto-reopen'] = completedCount + ' partidas concluídas. Abertas: ' + (opened.length ? opened.join(',') : 'nenhuma');
        } catch (e) { results['auto-reopen'] = 'fail: ' + e.message; }
      }

      return json({ ok: true, tasks: results });
    }

        return json({ ok: true, message: 'Copa2026 Bolao — API do Worker. Rotas: GET /ranking, POST /register, POST /login, GET|POST /picks, GET /mypicks, POST /special-picks, PATCH /confirm, PATCH /admin/unlock, PATCH /admin/confirm, DELETE /reset, GET /health, GET /cron, GET /reopen-status, POST /picks-reopen, PATCH /admin/phase-reopen' });
  } catch (e) {
    // Fix 2026-07-08: mensagem crua do erro (que pode incluir detalhes de schema/policy do
    // Postgres via supaFetch) vazava direto pro cliente publico. Log fica so no lado do
    // Worker (visivel via 'wrangler tail'/dashboard Cloudflare); resposta ao cliente e' generica.
    console.error('Erro interno nao tratado:', e && e.message, e && e.stack);
    return json({ error: 'Erro interno do servidor' }, 500);
  }
}
