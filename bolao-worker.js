// ============================================================
// Copa 2026 — Bolão Worker
// Deploy: copa2026-bolao.luizfelipegobbo.workers.dev
//
// O Worker funciona como proxy entre o front-end e o Supabase.
// Isso evita expor credenciais sensíveis e permite adicionar
// Turnstile anti-bot no cadastro futuramente.
// ============================================================

const SUPA_URL = 'https://etbezmraylbvlnycltha.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0YmV6bXJheWxidmxueWNsdGhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyNzQxNDAsImV4cCI6MjA5Njg1MDE0MH0.SC_k3ztY-uSyQAB60ctJvb1iAMGkJJYlG5qy7RJhuqY';

// Domínios que podem chamar este Worker (CORS)
const ALLOWED_ORIGINS = [
  'https://lfgobbo.github.io',
  'http://localhost',
  'http://127.0.0.1',
];

function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

// Proxy para o Supabase REST API
async function supaProxy(request, path, origin) {
  const url = `${SUPA_URL}/rest/v1/${path}`;

  const headers = {
    'apikey': SUPA_KEY,
    'Authorization': `Bearer ${SUPA_KEY}`,
    'Content-Type': 'application/json',
  };

  // Repassar headers especiais do Supabase vindos do cliente
  const prefer = request.headers.get('Prefer');
  if (prefer) headers['Prefer'] = prefer;

  const opts = {
    method: request.method,
    headers,
  };

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    opts.body = await request.text();
  }

  const res = await fetch(url, opts);
  const body = await res.text();

  return new Response(body, {
    status: res.status,
    headers: {
      ...corsHeaders(origin),
      'Content-Type': res.headers.get('Content-Type') || 'application/json',
    },
  });
}

export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get('Origin') || '';
    const url = new URL(request.url);

    // Responder preflight CORS
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(origin),
      });
    }

    // Rota: /rest/v1/* → proxy para Supabase
    // Ex: /rest/v1/participants?name=eq.João
    const match = url.pathname.match(/^\/rest\/v1\/(.*)$/);
    if (match) {
      const path = match[1] + url.search;
      return supaProxy(request, path, origin);
    }

    // Health check
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ ok: true, ts: Date.now() }), {
        headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
      });
    }

    return new Response('Not found', { status: 404, headers: corsHeaders(origin) });
  },
};
