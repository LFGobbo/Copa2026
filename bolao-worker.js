// Cloudflare Worker — Copa2026 Bolão (v19.7)
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
      if (!body.name || !body.password || !body.turnstileToken)
        return error('name, password e turnstileToken obrigatorios');

      var tres = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        body: new URLSearchParams({ secret: TURNSTILE_SEC, response: body.turnstileToken }),
      });
      var tdata = await tres.json();
      if (!tdata.success) return error('Captcha invalido', 403);

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
        await supaFetch('picks?on_conflict=participant_id,game_n', 'POST', { participant_id: user.sub, game_n: pick.game_n, goals_a: pick.goals_a, goals_b: pick.goals_b, ko_pick: pick.ko_pick || null });
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
      var participants = (await supaFetch('participants?select=id,name')) || [];
      var maxGame = url.searchParams.get('maxGame');
      var picksUrl = 'picks?select=participant_id,game_n,goals_a,goals_b&limit=10000';
      if (maxGame) picksUrl += '&game_n=lte.' + encodeURIComponent(maxGame);
      var allPicks = (await supaFetch(picksUrl)) || [];
      var allSp = [];
      if (url.searchParams.get('showSpecials') === '1') {
        allSp = (await supaFetch('special_picks?select=participant_id,champion,top_scorer')) || [];
      }
      return json({ participants: participants, picks: allPicks, specialPicks: allSp });
    }

    // POST /special-picks
    if (method === 'POST' && path === '/special-picks') {
      if (!user) return error('Token invalido', 401);
      var body = await req.json();
      await supaFetch('special_picks?on_conflict=participant_id', 'POST', { participant_id: user.sub, champion: body.champion || null, top_scorer: body.topScorer || null });
      return json({ ok: true });
    }

    // PATCH /confirm
    if (method === 'PATCH' && path === '/confirm') {
      if (!user) return error('Token invalido', 401);
      await supaFetch("participants?id=eq." + user.sub, 'PATCH', { confirmed: true });
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

    return json({ ok: true, message: 'Copa2026 Bolao — API do Worker. Rotas: GET /ranking, POST /register, POST /login, GET|POST /picks, GET /mypicks, POST /special-picks, PATCH /confirm, PATCH /admin/unlock, DELETE /reset' });
  } catch (e) {
    return json({ error: 'Internal: ' + e.message }, 500);
  }
}
