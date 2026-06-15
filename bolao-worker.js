// Cloudflare Worker — Copa2026 Bolão (v19.9)
// ENV vars (configurar no dashboard):
//   SUPABASE_URL  — https://etbezmraylbvlnycltha.supabase.co
//   SUPABASE_KEY  — service_role key (NÃO a anônima!)
//   TURNSTILE_SEC — Secret key do Turnstile
//   JWT_SECRET    — Qualquer string para assinar tokens
//   ADMIN_KEY     — Chave secreta para reset
//   ADMIN_HASH    — SHA-256('BolaoAdmin2026!' + ':' + JWT_SECRET)

addEventListener('fetch', function (event) {
  event.respondWith(handle(event.request));
});

var CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Admin-Key',
};

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: Object.assign({ 'Content-Type': 'application/json' }, CORS),
  });
}

function error(msg, status) {
  return json({ error: msg }, status || 400);
}

async function sha256(data) {
  var buf = new TextEncoder().encode(data);
  var hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash)).map(function (b) {
    return b.toString(16).padStart(2, '0');
  }).join('');
}

async function supaFetch(path, method, body) {
  var opts = {
    method: method || 'GET',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: 'Bearer ' + SUPABASE_KEY,
      'Content-Type': 'application/json',
    },
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

    // POST /register
    if (method === 'POST' && path === '/register') {
      var body = await req.json();
      if (!body.name || !body.password) return error('name e password obrigatorios');

      // Verificar captcha apenas se enviado (opcional)
      if (body.turnstileToken) {
        var tres = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
          method: 'POST',
          body: new URLSearchParams({ secret: TURNSTILE_SEC, response: body.turnstileToken }),
        });
        var tdata = await tres.json();
        if (!tdata.success) return error('Captcha invalido', 403);
      }

      var existing = await supaFetch("participants?name=eq." + encodeURIComponent(body.name) + "&select=id");
      if (existing && existing.length) return error('Nome ja cadastrado', 409);

      var hash = await sha256(body.password + ':' + JWT_SECRET);
      await supaFetch('participants', 'POST', { name: body.name, password: hash, confirmed: false });
      var np = await supaFetch("participants?name=eq." + encodeURIComponent(body.name) + "&select=id,name");
      return json({ id: np[0].id, name: np[0].name }, 201);
    }

    // POST /login
    if (method === 'POST' && path === '/login') {
      var body = await req.json();
      if (!body.name || !body.password) return error('name e password obrigatorios');
      var existing = await supaFetch("participants?name=eq." + encodeURIComponent(body.name) + "&select=id,name,password,confirmed");
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
      var parts = token.split('.');
      if (parts.length === 3) {
        var vsig = await sha256(parts[0] + '.' + parts[1] + '.' + JWT_SECRET);
        if (vsig === parts[2]) {
          var p = JSON.parse(atob(parts[1]));
          if (p.exp > Math.floor(Date.now() / 1000)) user = p;
        }
      }
    }

    // POST /picks
    if (method === 'POST' && path === '/picks') {
      if (!user) return error('Token invalido', 401);
      var body = await req.json();
      if (!body.picks || !body.picks.length) return error('picks obrigatorio');
      for (var i = 0; i < body.picks.length; i++) {
        var pick = body.picks[i];
        // Deletar pick existente (caso seja atualização) e inserir novo
        await supaFetch("picks?participant_id=eq." + user.sub + "&game_n=eq." + pick.game_n, 'DELETE').catch(function(){});
        await supaFetch('picks', 'POST', { participant_id: user.sub, game_n: pick.game_n, goals_a: pick.goals_a, goals_b: pick.goals_b, ko_pick: pick.ko_pick || null });
        await supaFetch('pick_history', 'POST', { participant_id: user.sub, game_n: pick.game_n, goals_a: pick.goals_a, goals_b: pick.goals_b, ko_pick: pick.ko_pick || null });
      }
      return json({ ok: true });
    }

    // GET /mypicks
    if (method === 'GET' && path === '/mypicks') {
      if (!user) return error('Token invalido', 401);
      var picks = (await supaFetch("picks?participant_id=eq." + user.sub + "&select=game_n,goals_a,goals_b,ko_pick")) || [];
      var sp = (await supaFetch("special_picks?participant_id=eq." + user.sub + "&select=champion,top_scorer,locked")) || [];
      var part = (await supaFetch("participants?id=eq." + user.sub + "&select=confirmed")) || [];
      return json({ picks: picks, specialPicks: sp[0] || null, confirmed: part[0] ? part[0].confirmed : false });
    }

    // GET /ranking
    if (method === 'GET' && path === '/ranking') {
      var participants = (await supaFetch('participants?select=id,name,confirmed,confirmed_at')) || [];
      var maxGame = url.searchParams.get('maxGame');
      var picksUrl = 'picks?select=participant_id,game_n,goals_a,goals_b';
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
      return json({ participants: participants, picks: allPicks, specialPicks: allSp, pickCounts: pickCounts });
    }

    // POST /special-picks
    if (method === 'POST' && path === '/special-picks') {
      if (!user) return error('Token invalido', 401);
      var body = await req.json();
      await supaFetch("special_picks?participant_id=eq." + user.sub, 'DELETE').catch(function(){});
      await supaFetch('special_picks', 'POST', { participant_id: user.sub, champion: body.champion || null, top_scorer: body.topScorer || null });
      return json({ ok: true });
    }

    // PATCH /confirm
    if (method === 'PATCH' && path === '/confirm') {
      if (!user) return error('Token invalido', 401);
      await supaFetch("participants?id=eq." + user.sub, 'PATCH', { confirmed: true, confirmed_at: new Date().toISOString() });
      return json({ ok: true });
    }

    // DELETE /reset
    if (method === 'DELETE' && path === '/reset') {
      var ak = req.headers.get('X-Admin-Key') || '';
      if (ak !== ADMIN_KEY) return error('Admin key invalida', 403);
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
      var parts = await supaFetch("participants?name=eq." + encodeURIComponent(body.name) + "&select=id,name,confirmed");
      if (!parts || !parts.length) return error('Participante nao encontrado', 404);
      await supaFetch("participants?id=eq." + parts[0].id, 'PATCH', { confirmed: false });
      return json({ ok: true });
    }


    // GET /stats?participantId=...
    if (method === 'GET' && path === '/stats') {
      var pid = url.searchParams.get('participantId');
      if (!pid) return error('participantId obrigatorio');
      var participant = (await supaFetch('participants?id=eq.' + pid + '&select=id,name,confirmed,confirmed_at')) || [];
      if (!participant.length) return error('Participante nao encontrado', 404);
      var picks = (await supaFetch('picks?participant_id=eq.' + pid + '&select=game_n,goals_a,goals_b&limit=10000')) || [];
      var sp = (await supaFetch('special_picks?participant_id=eq.' + pid + '&select=champion,top_scorer')) || [];
      var history = (await supaFetch('pick_history?participant_id=eq.' + pid + '&select=game_n,goals_a,goals_b,changed_at&order=changed_at.desc&limit=50')) || [];
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
      for (var i = 0; i < ranking.length; i++) {
        var entry = ranking[i];
        await supaFetch('ranking_snapshots?on_conflict=participant_id,round', 'POST', {
          participant_id: entry.participant_id,
          round: round,
          position: entry.position,
          points: entry.points,
          exact_count: entry.exact_count || 0,
          result_count: entry.result_count || 0
        });
      }
      return json({ ok: true, round: round, count: ranking.length });
    }

    // GET /evolution?participantId=...
    if (method === 'GET' && path === '/evolution') {
      var pid2 = url.searchParams.get('participantId');
      if (!pid2) return error('participantId obrigatorio');
      var snaps = (await supaFetch('ranking_snapshots?participant_id=eq.' + pid2 + '&select=round,position,points,recorded_at&order=round')) || [];
      return json({ participantId: pid2, evolution: snaps });
    }

    // GET /app — proxy do site (backup se GitHub Pages cair)
    if (method === 'GET' && (path === '/app' || path.match(/\.(png|json)$/))) {
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
      var cronSecret = url.searchParams.get('secret') || '';
      if (cronSecret !== ADMIN_KEY) return error('Cron secret invalido', 403);

      var task = url.searchParams.get('task') || '';
      var results = {};

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
              await supaFetch('live_scores?on_conflict=game_key', 'POST', {
                game_key: h + '_' + a,
                home_team: h,
                away_team: a,
                goals_home: hs,
                goals_away: as,
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

      // snapshot: calcular ranking e gravar (para cada jogo encerrado)
      if (task === 'snapshot' || task === 'all') {
        try {
          var participants = (await supaFetch('participants?select=id,name,confirmed,confirmed_at')) || [];
          if (participants.length) {
            var now2 = new Date().toISOString();
            for (var p = 0; p < participants.length; p++) {
              var pid = participants[p].id;
              // Placeholder: snapshot real precisa dos scores no Supabase
              // Por enquanto apenas registra que o participante existe
              results.snapshot = (results.snapshot || 0) + 1;
            }
          }
          results.snapshot = (results.snapshot || 0) + ' participants checked';
        } catch (e) { results.snapshot = 'fail: ' + e.message; }
      }

      return json({ ok: true, tasks: results });
    }

        return json({ ok: true, message: 'Copa2026 Bolao — API do Worker. Rotas: GET /ranking, POST /register, POST /login, GET|POST /picks, GET /mypicks, POST /special-picks, PATCH /confirm, PATCH /admin/unlock, DELETE /reset, GET /health, GET /cron' });
  } catch (e) {
    return json({ error: 'Internal: ' + e.message }, 500);
  }
}
