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
      if (!existing || !existing.length) return error('Participante nao encontrado', 404);
      var hash = await sha256(body.password + ':' + JWT_SECRET);
      if (existing[0].password !== hash) return error('Senha incorreta', 401);
      var header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
      var payload = btoa(JSON.stringify({ sub: existing[0].id, name: existing[0].name, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 86400 * 90 }));
      var sig = await sha256(header + '.' + payload + '.' + JWT_SECRET);
      return json({ id: existing[0].id, name: existing[0].name, confirmed: existing[0].confirmed, token: header + '.' + payload + '.' + sig });
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
        // Bug 4a: upsert atômico (on_conflict) — elimina janela de perda entre DELETE e INSERT
        await supaFetch('picks?on_conflict=participant_id,game_n', 'POST', { participant_id: user.sub, game_n: pick.game_n, goals_a: ga, goals_b: gb, ko_pick: pick.ko_pick || null }, { 'Prefer': 'resolution=merge-duplicates' });
        await supaFetch('pick_history', 'POST', { participant_id: user.sub, game_n: pick.game_n, goals_a: pick.goals_a, goals_b: pick.goals_b, ko_pick: pick.ko_pick || null });
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
      await supaFetch('ranking_snapshots?on_conflict=participant_id,round', 'POST', batchData);
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
        return json({ scores: [], count: 0, warning: 'live_scores indisponivel: ' + e.message });
      }
    }

    // GET /cron — tarefas agendadas (chamado via cron-job.org ou Cloudflare Cron)
    if (method === 'GET' && path === '/cron') {
      // Usa CRON_SECRET em vez de ADMIN_KEY para isolar permissoes.
      // Fallback para ADMIN_KEY se CRON_SECRET ainda nao estiver configurado.
      var expectedCronSecret = (typeof CRON_SECRET !== 'undefined' && CRON_SECRET) ? CRON_SECRET : ADMIN_KEY;
      var cronSecret = url.searchParams.get('secret') || '';
      if (cronSecret !== expectedCronSecret) return error('Cron secret invalido', 403);

      var task = url.searchParams.get('task') || '';
      var results = {};
      // Mapa game_key -> game_n para jogos de grupo (72 jogos). Compartilhado por task=fifa e task=snapshot.
      var GAME_KEY_MAP = {"MEX_RSA":1,"KOR_CZE":2,"CAN_BIH":3,"USA_PAR":4,"QAT_SUI":5,"BRA_MAR":6,"HAI_SCO":7,"AUS_TUR":8,"GER_CUW":9,"NED_JPN":10,"CIV_ECU":11,"SWE_TUN":12,"ESP_CPV":13,"BEL_EGY":14,"KSA_URU":15,"IRN_NZL":16,"ARG_ALG":17,"FRA_SEN":18,"IRQ_NOR":19,"AUT_JOR":20,"POR_COD":21,"ENG_CRO":22,"GHA_PAN":23,"UZB_COL":24,"CZE_RSA":25,"SUI_BIH":26,"CAN_QAT":27,"MEX_KOR":28,"TUR_PAR":29,"USA_AUS":30,"SCO_MAR":31,"BRA_HAI":32,"NED_SWE":33,"GER_CIV":34,"ECU_CUW":35,"TUN_JPN":36,"ESP_KSA":37,"BEL_IRN":38,"URU_CPV":39,"NZL_EGY":40,"ARG_AUT":41,"FRA_IRQ":42,"NOR_SEN":43,"JOR_ALG":44,"POR_UZB":45,"ENG_GHA":46,"PAN_CRO":47,"COL_COD":48,"BIH_QAT":50,"SUI_CAN":49,"MAR_HAI":52,"SCO_BRA":51,"RSA_KOR":54,"CZE_MEX":53,"CUW_CIV":56,"ECU_GER":55,"TUN_NED":58,"JPN_SWE":57,"PAR_AUS":60,"TUR_USA":59,"SEN_IRQ":62,"NOR_FRA":61,"URU_ESP":64,"CPV_KSA":63,"NZL_BEL":66,"EGY_IRN":65,"CRO_GHA":68,"PAN_ENG":67,"COD_UZB":70,"COL_POR":69,"JOR_ARG":72,"ALG_AUT":71};


      // keepalive: pingar Supabase para evitar pausa do Free Tier
      if (task === 'keepalive' || task === 'all') {
        try {
          await supaFetch('participants?select=id&limit=1');
          results.keepalive = 'ok';
        } catch (e) { results.keepalive = 'fail: ' + e.message; }
      }

      // fifa: buscar scores da FIFA e armazenar no Supabase
      if (task === 'fifa' || task === 'all') {
        try {
          var fresp = await fetch('https://api.fifa.com/api/v3/calendar/matches?idCompetition=17&idSeason=285023&count=200');
          var fdata = await fresp.json();
          if (fdata && fdata.Results) {
            var stored = 0;
            for (var i = 0; i < fdata.Results.length; i++) {
              var m = fdata.Results[i];
              if (m.HomeTeamScore === null || m.AwayTeamScore === null) continue;
              var h = m.Home ? m.Home.Abbreviation : null;
              var a = m.Away ? m.Away.Abbreviation : null;
              var hs = parseInt(m.HomeTeamScore, 10);
              var as = parseInt(m.AwayTeamScore, 10);
              if (!h || !a || isNaN(hs) || isNaN(as)) continue;
              var gkFifa = h + '_' + a;
              await supaFetch('live_scores?on_conflict=game_key', 'POST', {
                game_key: gkFifa,
                home_team: h,
                away_team: a,
                goals_home: hs,
                goals_away: as,
                game_n: GAME_KEY_MAP[gkFifa] || null,
                match_id: m.IdMatch || null,
                updated_at: new Date().toISOString()
              });
              stored++;
            }
            results.fifa = stored + ' scores stored';
          } else {
            results.fifa = 'no data';
          }
        } catch (e) { results.fifa = 'fail: ' + e.message; }
      }

      // snapshot: calcular ranking real com placares da FIFA (live_scores no Supabase)
      if (task === 'snapshot' || task === 'all') {
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
          var liveScores = (await supaFetch('live_scores?select=game_key,game_n,goals_home,goals_away')) || [];
          // Montar mapa game_n -> {a, b}
          var realScores = {};
          liveScores.forEach(function(s) {
            var gn = s.game_n || GAME_KEY_MAP[s.game_key] || null;
            if (gn) realScores[gn] = { a: s.goals_home, b: s.goals_away };
          });

          // 2. Buscar participantes confirmados
          var snapParticipants = (await supaFetch('participants?select=id,name,confirmed,confirmed_at&confirmed=eq.true')) || [];
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
            var rows = snapParticipants.map(function(part) {
              var myPicks = picksByPid[part.id] || {};
              var myReopen = reopenByPid[part.id] || {};
              var total = 0, exactCount = 0, resultCount = 0;
              var confirmTs = part.confirmed_at ? new Date(part.confirmed_at).getTime() : null;
              Object.keys(realScores).forEach(function(gn) {
                var gnNum = parseInt(gn, 10);
                var dl = bolaoDeadline(gnNum);
                if (dl && confirmTs && (dl.getTime() + BOLAO_DEADLINE_MS) < confirmTs) return;
                var pick = myPicks[gnNum];
                var real = realScores[gn];
                var isKO = !!KO_GAME_PHASE[gnNum];
                var pts;
                if (isKO) {
                  // KO: reopen tem prioridade; sem reopen usa pick original com tabela cheia.
                  // LIMITACAO CONHECIDA (Bug 3): o worker nao tem como calcular acertouConfronto
                  // (verificar se o usuario previu os times corretos para o confronto) sem replicar
                  // toda a logica de resolucao de bracket do frontend. Por isso, useFullTable=!hasReopen
                  // em vez de useFullTable=acertouConfrunto&&!hasReopen. O snapshot pode sobrestimar
                  // pontos KO para usuarios com confronto errado. O ranking ao vivo (frontend) e correto.
                  var reopenPick = myReopen[gnNum];
                  var hasReopen = reopenPick && reopenPick.goals_a !== null && reopenPick.goals_a !== undefined;
                  var activePick = hasReopen ? reopenPick : pick;
                  if (!activePick || activePick.goals_a === null || activePick.goals_a === undefined) return;
                  var useFullTable = !hasReopen;
                  pts = calcKOPts(activePick.goals_a, activePick.goals_b, real.a, real.b, useFullTable);
                  if (pts >= 0 && useFullTable) total += (KO_PHASE_BONUS[KO_GAME_PHASE[gnNum]] || 0);
                } else {
                  if (!pick || pick.goals_a === null || pick.goals_b === null) return;
                  pts = calcPts(pick.goals_a, pick.goals_b, real.a, real.b);
                }
                if (pts < 0) return;
                total += pts;
                if (pts === 10 || pts === 15) exactCount++;
                else if (pts >= 2) resultCount++;
              });
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
            await supaFetch('ranking_snapshots?on_conflict=participant_id,round', 'POST', snapData);
            results.snapshot = rows.length+' participants, round='+round+', '+Object.keys(realScores).length+' scored games';
          }
        } catch (e) { results.snapshot = 'fail: ' + e.message; }
      }

      // auto-reopen: abre fases automaticamente baseado em partidas concluídas pela FIFA
      // Thresholds: r32 após 72 grupos, r16 após 88, qf após 96, sf após 100, 3rd+final após 102
      if (task === 'auto-reopen' || task === 'all') {
        try {
          // Contar partidas concluídas via live_scores (Supabase) — consistente com o snapshot.
          // Cada registro em live_scores representa um jogo com placar confirmado.
          var arLiveScores = (await supaFetch('live_scores?select=game_key')) || [];
          var completedCount = arLiveScores.length;
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
              // Só abre se ainda há tempo (deadline futuro ou não definido)
              if (autoDlAR && Date.now() >= autoDlAR.getTime()) continue;
              var patchAR = { open: true, opened_at: new Date().toISOString(), closed_at: null };
              if (autoDlAR) patchAR.deadline = autoDlAR.toISOString();
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
    return json({ error: 'Internal: ' + e.message }, 500);
  }
}
