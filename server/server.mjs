// Jyut Dojo sync + analytics server. Zero-dependency (node:sqlite, Node >= 22.5).
// Endpoints (mounted behind /api by the reverse proxy):
//   PUT  /api/sync/:code  body {state, baseVersion?, base?} -> optimistic save
//        baseVersion is preferred; legacy base=updatedAt remains accepted during rollout.
//        On mismatch -> 409 {state, updatedAt, v}. Omit both for legacy first push.
//   GET  /api/sync/:code                        -> {state, updatedAt, v} | 404
//   POST /api/events      body [{name,props?,ts?,device?}] (<=50)  -> 204
//   GET  /api/stats       (Authorization: Bearer <ADMIN_KEY>)      -> aggregates
//   GET  /api/health                            -> {ok, version, db}
//
// Environment:
//   ADMIN_KEY        required, >=12 chars (fail closed)
//   PORT             default 3251
//   DB_PATH          default /data/jyut.db
//   ALLOWED_ORIGINS  comma-separated; defaults cover the live site, native shells, and dev
//   TRUST_PROXY      '0' to ignore forwarded IP headers (default: trust, we sit behind cloudflared)
import { createServer } from 'node:http';
import { DatabaseSync } from 'node:sqlite';

const PORT = Number(process.env.PORT || 3251);
// Fail closed: refuse to boot with a missing or trivially short admin key.
const ADMIN_KEY = process.env.ADMIN_KEY;
if (!ADMIN_KEY || ADMIN_KEY.length < 12) {
  console.error('FATAL: set ADMIN_KEY env (>=12 chars) before starting.');
  process.exit(1);
}

// Browsers enforce CORS, so an allowlist keeps a hostile page from driving a
// learner's sync code around. Native shells (Capacitor) send localhost origins.
const DEFAULT_ORIGINS = [
  'https://jyut.benbox.dev',
  'https://localhost',
  'capacitor://localhost',
  'http://localhost:5173',
  'http://localhost:4173',
];
const ALLOWED_ORIGINS = new Set(
  (process.env.ALLOWED_ORIGINS || DEFAULT_ORIGINS.join(','))
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
);
const TRUST_PROXY = process.env.TRUST_PROXY !== '0';

const db = new DatabaseSync(process.env.DB_PATH || '/data/jyut.db');
db.exec(`
  PRAGMA journal_mode=WAL;
  CREATE TABLE IF NOT EXISTS sync (code TEXT PRIMARY KEY, state TEXT NOT NULL, v INTEGER DEFAULT 0, updated_at TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL,
    props TEXT, device TEXT, ts TEXT NOT NULL);
  CREATE INDEX IF NOT EXISTS idx_events_name ON events(name);
  CREATE INDEX IF NOT EXISTS idx_events_ts ON events(ts);
`);
// Migrate: add the version column if an older DB predates it.
try { db.exec('ALTER TABLE sync ADD COLUMN v INTEGER DEFAULT 0'); } catch { /* already there */ }

const SERVER_VERSION = '2026.07.30';
const CODE_RE = /^[A-Z0-9]{8,16}$/;
const MAX_STATE = 1024 * 1024; // 1 MB snapshot ceiling (client caps its arrays well below this)
const MAX_EVENTS_BODY = 64 * 1024;
const MAX_URL_LENGTH = 512;
const EVENTS_RETENTION_DAYS = 60;
const EVENTS_HARD_CAP = 2_000_000;

// --- crude per-IP rate limiter (token bucket, in-memory) ---
const buckets = new Map();
const LIMIT = 60; // requests
const WINDOW = 60_000; // per minute
function rateState(ip) {
  const now = Date.now();
  let bucket = buckets.get(ip);
  if (!bucket || now - bucket.start > WINDOW) { bucket = { start: now, n: 0 }; buckets.set(ip, bucket); }
  bucket.n += 1;
  return { limited: bucket.n > LIMIT, retryAfter: Math.ceil((WINDOW - (now - bucket.start)) / 1000) };
}
const sweepTimer = setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) if (now - bucket.start > WINDOW) buckets.delete(key);
}, WINDOW);
sweepTimer.unref();

// --- periodic event pruning ---
function prune() {
  try {
    const cutoff = new Date(Date.now() - EVENTS_RETENTION_DAYS * 864e5).toISOString();
    db.prepare('DELETE FROM events WHERE ts < ?').run(cutoff);
    const { n } = db.prepare('SELECT COUNT(*) n FROM events').get();
    if (n > EVENTS_HARD_CAP)
      db.prepare('DELETE FROM events WHERE id IN (SELECT id FROM events ORDER BY id ASC LIMIT ?)').run(n - EVENTS_HARD_CAP);
  } catch (e) { console.error('prune failed', e.message); }
}
const pruneTimer = setInterval(prune, 6 * 3600_000);
pruneTimer.unref();
prune();

function corsHeaders(origin) {
  // No Origin at all (native fetch, curl, server-to-server) needs no CORS grant.
  if (!origin) return {};
  if (!ALLOWED_ORIGINS.has(origin)) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET,PUT,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Max-Age': '600',
    Vary: 'Origin',
  };
}

const json = (res, status, body, origin, extraHeaders = {}) => {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    ...corsHeaders(origin),
    ...extraHeaders,
  });
  res.end(JSON.stringify(body));
};

const readBody = (req, limit) =>
  new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > limit) { reject(new Error('payload too large')); req.destroy(); return; }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });

const clientIp = (req) => {
  // Forwarded headers are trivially spoofable when nothing sits in front of us,
  // so only honour them when we are actually behind the tunnel.
  if (TRUST_PROXY) {
    const forwarded =
      req.headers['cf-connecting-ip'] ||
      String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
    if (forwarded) return String(forwarded);
  }
  return req.socket.remoteAddress || 'unknown';
};

const server = createServer(async (req, res) => {
  const origin = req.headers.origin;
  const started = Date.now();
  let path = '';
  try {
    if (!req.url || req.url.length > MAX_URL_LENGTH) return json(res, 414, { error: 'uri too long' }, origin);
    const url = new URL(req.url, 'http://x');
    path = url.pathname.replace(/^\/api/, '');

    if (req.method === 'OPTIONS') {
      // Only advertise the grant for origins we actually accept.
      return json(res, origin && !ALLOWED_ORIGINS.has(origin) ? 403 : 204, {}, origin);
    }
    if (path === '/health') {
      const { n } = db.prepare('SELECT COUNT(*) n FROM sync').get();
      return json(res, 200, { ok: true, version: SERVER_VERSION, db: 'ok', accounts: n }, origin);
    }

    const rate = rateState(clientIp(req));
    if (rate.limited) {
      return json(res, 429, { error: 'slow down' }, origin, { 'Retry-After': String(rate.retryAfter) });
    }

    const syncMatch = path.match(/^\/sync\/([A-Za-z0-9]+)$/);
    if (syncMatch) {
      const code = syncMatch[1];
      if (!CODE_RE.test(code)) return json(res, 400, { error: 'bad code' }, origin);
      if (req.method === 'GET') {
        const row = db.prepare('SELECT state, v, updated_at FROM sync WHERE code = ?').get(code);
        if (!row) return json(res, 404, { error: 'not found' }, origin);
        return json(res, 200, { state: JSON.parse(row.state), v: row.v, updatedAt: row.updated_at }, origin);
      }
      if (req.method === 'PUT') {
        const body = await readBody(req, MAX_STATE);
        const parsed = JSON.parse(body);
        if (!parsed || typeof parsed.state !== 'object' || parsed.state === null)
          return json(res, 400, { error: 'bad body' }, origin);
        const existing = db.prepare('SELECT v, updated_at FROM sync WHERE code = ?').get(code);
        // Prefer integer versions for optimistic concurrency. During the rollout,
        // keep accepting the legacy timestamp base used by older web/APK clients.
        const staleVersion = existing
          && parsed.baseVersion !== undefined
          && parsed.baseVersion !== existing.v;
        const staleLegacyBase = existing
          && parsed.baseVersion === undefined
          && parsed.base !== undefined
          && parsed.base !== existing.updated_at;
        if (staleVersion || staleLegacyBase) {
          const current = db.prepare('SELECT state, v, updated_at FROM sync WHERE code = ?').get(code);
          return json(res, 409, {
            conflict: true,
            state: JSON.parse(current.state),
            v: current.v,
            updatedAt: current.updated_at,
          }, origin);
        }
        const now = new Date().toISOString();
        const v = (existing?.v ?? 0) + 1;
        db.prepare('INSERT INTO sync (code, state, v, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(code) DO UPDATE SET state = excluded.state, v = excluded.v, updated_at = excluded.updated_at')
          .run(code, JSON.stringify(parsed.state), v, now);
        return json(res, 200, { ok: true, v, updatedAt: now }, origin);
      }
      return json(res, 405, { error: 'method not allowed' }, origin, { Allow: 'GET,PUT,OPTIONS' });
    }

    if (path === '/events') {
      if (req.method !== 'POST') {
        return json(res, 405, { error: 'method not allowed' }, origin, { Allow: 'POST,OPTIONS' });
      }
      const body = await readBody(req, MAX_EVENTS_BODY);
      const events = JSON.parse(body);
      if (!Array.isArray(events) || events.length > 50) return json(res, 400, { error: 'bad batch' }, origin);
      const insert = db.prepare('INSERT INTO events (name, props, device, ts) VALUES (?, ?, ?, ?)');
      const nowIso = new Date().toISOString();
      for (const event of events) {
        if (!event || typeof event.name !== 'string' || event.name.length > 64) continue;
        // Normalize ts to an ISO day-groupable form regardless of what the client sent.
        let ts = nowIso;
        if (typeof event.ts === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(event.ts)) ts = event.ts;
        else if (typeof event.ts === 'number' && Number.isFinite(event.ts)) ts = new Date(event.ts).toISOString();
        insert.run(
          event.name,
          JSON.stringify(event.props ?? {}).slice(0, 1024),
          String(event.device ?? '').slice(0, 32),
          ts
        );
      }
      return json(res, 204, {}, origin);
    }

    if (path === '/stats') {
      if (req.method !== 'GET') {
        return json(res, 405, { error: 'method not allowed' }, origin, { Allow: 'GET,OPTIONS' });
      }
      const auth = String(req.headers.authorization || '');
      const key = auth.startsWith('Bearer ') ? auth.slice(7) : url.searchParams.get('key');
      if (key !== ADMIN_KEY) return json(res, 403, { error: 'forbidden' }, origin);
      const byName = db.prepare('SELECT name, COUNT(*) n FROM events GROUP BY name ORDER BY n DESC').all();
      const byDay = db.prepare('SELECT substr(ts,1,10) day, COUNT(*) n, COUNT(DISTINCT device) devices FROM events GROUP BY day ORDER BY day DESC LIMIT 30').all();
      const quizWrong = db.prepare("SELECT json_extract(props,'$.refId') ref, COUNT(*) n FROM events WHERE name='quiz_wrong' GROUP BY ref ORDER BY n DESC LIMIT 20").all();
      const syncCount = db.prepare('SELECT COUNT(*) n FROM sync').get();
      return json(res, 200, { byName, byDay, hardestItems: quizWrong, syncAccounts: syncCount.n }, origin);
    }

    json(res, 404, { error: 'not found' }, origin);
  } catch (e) {
    // Generic message to the client; details only to server logs.
    console.error('req error', req.method, path, e.message);
    const status = /too large/.test(e.message) ? 413 : 400;
    json(res, status, { error: 'bad request' }, origin);
  } finally {
    if (Date.now() - started > 1000) {
      console.warn('slow request', req.method, path, `${Date.now() - started}ms`);
    }
  }
});

server.listen(PORT, '0.0.0.0', () => console.log(`jyut sync server ${SERVER_VERSION} on :${PORT}`));

// Close the database on shutdown so WAL frames are checkpointed instead of
// left for recovery after a container restart.
let shuttingDown = false;
function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`shutting down on ${signal}`);
  server.close(() => {
    try { db.exec('PRAGMA wal_checkpoint(TRUNCATE)'); } catch { /* best effort */ }
    try { db.close(); } catch { /* best effort */ }
    process.exit(0);
  });
  // Do not hang forever on a stuck connection.
  setTimeout(() => process.exit(0), 5000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
