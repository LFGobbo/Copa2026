// Cloudflare Worker — Copa2026 Bolão
// Deploy: wrangler deploy bolao-worker.js  (ou colar no dashboard)
// ENV vars (configurar no dashboard ou wrangler.toml):
//   SUPABASE_URL  — https://etbezmraylbvlnycltha.supabase.co
//   SUPABASE_KEY  — service_role key (NÃO a anônima!)
//   TURNSTILE_SEC — Secret key do Turnstile
//   ADMIN_KEY     — Chave secreta para reset (ex: uuid)
//   ADMIN_HASH    — SHA-256 de 'BolaoAdmin2026!' + ':' + JWT_SECRET (gerar com: node -e "console.log(require('crypto').createHash('sha256').update('BolaoAdmin2026!'+':'+process.env.JWT_SECRET).digest('hex'))")
//   JWT_SECRET    — Qualquer string para assinar tokens

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

function error(msg, status = 400) {
  return json({ error: msg }, status);
}

// --- Crypto helpers ---
async function sha256(data) {
  const buf = new TextEncoder().encode(data);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// Simple JWT (HS256) — sem lib externa
async function createToken(participantId, name) {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(
    JSON.stringify({
      sub: participantId,
      name,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 86400 * 90, // 90 dias
    })
  );
  const sig = await sha256(header + '.' + payload + '.' + JWT_SECRET);
  return header + '.' + payload + '.' + sig;
}

async function verifyToken(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const sig = await sha256(parts[0] + '.' + parts[1] + '.' + JWT_SECRET);
    if (sig !== parts[2]) return null;
    const payload = JSON.parse(atob(parts[1]));
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

// --- Supabase helpers (usam service_role key) ---
async function supaFetch(path, method = 'GET', body = null) {
  const opts = {
    method,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: 'Bearer ' + SUPABASE_KEY,
      'Content-Type': 'application/json',
    },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(SUPABASE_URL + '/rest/v1/' + path, opts);
  if (!res.ok) {
    const txt = await res.text();
    throw new Error('Supabase ' + res.status + ': ' + txt.slice(0, 200));
  }
  if (method === 'DELETE') return null;
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('json')) return res.json();
  return null;
}

// --- Routes ---
async function handleRequest(req) {
  const url = new URL(req.url);
  const path = url.pathname;
  const method = req.method;

  if (method === 'OPTIONS') return json({}, 204);

  // ---- POST /register ----
  if (method === 'POST' && path === '/register') {
    try {
      const { name, password, turnstileToken } = await req.json();
      if (!name || !password || !turnstileToken)
        return error('name, password e turnstileToken obrigatorios');

      // Validar Turnstile
      const turnstileRes = await fetch(
        'https://challenges.cloudflare.com/turnstile/v0/siteverify',
        { method: 'POST', body: new URLSearchParams({ secret: TURNSTILE_SEC, response: turnstileToken }) }
      );
      const turnstileData = await turnstileRes.json();
      if (!turnstileData.success) return error('Captcha invalido', 403);

      // Verificar se nome ja existe
      const existing = await supaFetch(
        "participants?name=eq." + encodeURIComponent(name) + "&select=id"
      );
      if (existing && existing.length)
        return error('Nome ja cadastrado', 409);

      // Hash da senha (servidor: SHA-256 com salt interno)
      const hash = await sha256(password + ':' + JWT_SECRET);

      // Criar participante
      const created = await supaFetch('participants', 'POST', {
        name,
        password: hash,
        confirmed: false,
      });

      // Buscar o criado (Supabase POST nao retorna o objeto por padrao)
      const np = await supaFetch(
        "participants?name=eq." + encodeURIComponent(name) + "&select=id,name"
      );

      return json({ id: np[0].id, name: np[0].name }, 201);
    } catch (e) {
      return error(e.message, 500);
    }
  }

  // ---- POST /login ----
  if (method === 'POST' && path === '/login') {
    try {
      const { name, password } = await req.json();
      if (!name || !password) return error('name e password obrigatorios');

      const existing = await supaFetch(
        "participants?name=eq." + encodeURIComponent(name) + "&select=id,name,password,confirmed"
      );
      if (!existing || !existing.length) return error('Participante nao encontrado', 404);

      const hash = await sha256(password + ':' + JWT_SECRET);
      if (existing[0].password !== hash) return error('Senha incorreta', 401);

      const token = await createToken(existing[0].id, existing[0].name);
      return json({
        id: existing[0].id,
        name: existing[0].name,
        confirmed: existing[0].confirmed,
        token,
      });
    } catch (e) {
      return error(e.message, 500);
    }
  }

  // ---- Auth middleware (para rotas que precisam de token) ----
  const authHeader = req.headers.get('Authorization') || '';
  const token = authHeader.replace('Bearer ', '');
  const user = token ? await verifyToken(token) : null;

  // ---- POST /picks ----
  if (method === 'POST' && path === '/picks') {
    try {
      if (!user) return error('Token invalido', 401);
      const { picks } = await req.json();
      if (!picks || !picks.length) return error('picks obrigatorio');

      for (const pick of picks) {
        // Upsert pick
        await supaFetch('picks?on_conflict=participant_id,game_n', 'POST', {
          participant_id: user.sub,
          game_n: pick.game_n,
          goals_a: pick.goals_a,
          goals_b: pick.goals_b,
          ko_pick: pick.ko_pick || null,
        });

        // Histórico (pick_history)
        await supaFetch('pick_history', 'POST', {
          participant_id: user.sub,
          game_n: pick.game_n,
          goals_a: pick.goals_a,
          goals_b: pick.goals_b,
          ko_pick: pick.ko_pick || null,
        });
      }
      return json({ ok: true });
    } catch (e) {
      return error(e.message, 500);
    }
  }

  // ---- GET /mypicks ----
  if (method === 'GET' && path === '/mypicks') {
    try {
      if (!user) return error('Token invalido', 401);
      const picks = (await supaFetch(
        "picks?participant_id=eq." + user.sub + "&select=game_n,goals_a,goals_b,ko_pick"
      )) || [];
      const sp = (await supaFetch(
        "special_picks?participant_id=eq." + user.sub + "&select=champion,top_scorer,locked"
      )) || [];
      const part = (await supaFetch(
        "participants?id=eq." + user.sub + "&select=confirmed"
      )) || [];
      return json({
        picks,
        specialPicks: sp[0] || null,
        confirmed: part[0] ? part[0].confirmed : false,
      });
    } catch (e) {
      return error(e.message, 500);
    }
  }

  // ---- GET /ranking ----
  if (method === 'GET' && path === '/ranking') {
    try {
      const participants = (await supaFetch('participants?select=id,name')) || [];
      const allPicks = (await supaFetch(
        'picks?select=participant_id,game_n,goals_a,goals_b&limit=10000'
      )) || [];
      const allSp = (await supaFetch(
        'special_picks?select=participant_id,champion,top_scorer'
      )) || [];
      return json({ participants, picks: allPicks, specialPicks: allSp });
    } catch (e) {
      return error(e.message, 500);
    }
  }

  // ---- POST /special-picks ----
  if (method === 'POST' && path === '/special-picks') {
    try {
      if (!user) return error('Token invalido', 401);
      const { champion, topScorer } = await req.json();
      await supaFetch('special_picks?on_conflict=participant_id', 'POST', {
        participant_id: user.sub,
        champion: champion || null,
        top_scorer: topScorer || null,
      });
      return json({ ok: true });
    } catch (e) {
      return error(e.message, 500);
    }
  }

  // ---- PATCH /confirm ----
  if (method === 'PATCH' && path === '/confirm') {
    try {
      if (!user) return error('Token invalido', 401);
      await supaFetch("participants?id=eq." + user.sub, 'PATCH', {
        confirmed: true,
      });
      return json({ ok: true });
    } catch (e) {
      return error(e.message, 500);
    }
  }

  // ---- DELETE /reset (admin) ----
  if (method === 'DELETE' && path === '/reset') {
    try {
      const auth = req.headers.get('X-Admin-Key') || '';
      if (auth !== ADMIN_KEY) return error('Admin key invalida', 403);
      await supaFetch('picks', 'DELETE');
      await supaFetch('special_picks', 'DELETE');
      await supaFetch('participants', 'DELETE');
      await supaFetch('pick_history', 'DELETE');
      return json({ ok: true });
    } catch (e) {
      return error(e.message, 500);
    }
  }

  // ---- PATCH /admin/unlock (desbloquear participante) ----
  if (method === 'PATCH' && path === '/admin/unlock') {
    try {
      const { name, adminPass } = await req.json();
      if (!name || !adminPass) return error('name e adminPass obrigatorios');
      const hash = await sha256(adminPass + ':' + JWT_SECRET);
      if (hash !== ADMIN_HASH) return error('Admin pass invalida', 403);
      const parts = await supaFetch("participants?name=eq." + encodeURIComponent(name) + "&select=id,name,confirmed");
      if (!parts || !parts.length) return error('Participante nao encontrado', 404);
      await supaFetch("participants?id=eq." + parts[0].id, 'PATCH', { confirmed: false });
      return json({ ok: true });
    } catch (e) {
      return error(e.message, 500);
    }
  }

  return error('Rota nao encontrada: ' + method + ' ' + path, 404);
}

export default {
  async fetch(req, env) {
    // Bind env vars
    SUPABASE_URL = env.SUPABASE_URL;
    SUPABASE_KEY = env.SUPABASE_KEY;
    TURNSTILE_SEC = env.TURNSTILE_SEC;
    JWT_SECRET = env.JWT_SECRET;
    ADMIN_KEY = env.ADMIN_KEY;
    ADMIN_HASH = env.ADMIN_HASH;
    try {
      return await handleRequest(req);
    } catch (e) {
      return error('Internal: ' + e.message, 500);
    }
  },
};
