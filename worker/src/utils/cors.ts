// CORS utilities

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  /^http:\/\/[^.]+\.localhost:5173$/,
  /^https:\/\/.*\.neurosift\.app$/,
  // CatalystNeuro Cloudflare Pages deployment, including preview aliases
  /^https:\/\/([a-z0-9-]+\.)?qp-8z3\.pages\.dev$/,
  'https://magland.github.io',
  'https://dandi.github.io',
  'https://medit.dandiarchive.org',
  // dandi-medit pull request previews on Cloudflare Pages
  /^https:\/\/([a-z0-9-]+\.)?dandi-medit\.pages\.dev$/,
  "https://dandiset-metadata-assistant.surge.sh",
  'https://airesearchcoach.org'
];

export function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;
  
  return ALLOWED_ORIGINS.some(allowed => {
    if (typeof allowed === 'string') {
      return origin === allowed;
    }
    return allowed.test(origin);
  });
}

export function getCorsHeaders(request: Request): HeadersInit {
  const origin = request.headers.get('Origin');
  const headers: HeadersInit = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-openrouter-key, x-admin-key',
    'Access-Control-Max-Age': '86400',
  };

  if (origin && isOriginAllowed(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }

  return headers;
}

export function handleOptions(request: Request): Response {
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(request),
  });
}
