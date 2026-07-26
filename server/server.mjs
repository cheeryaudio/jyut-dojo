// Jyut Dojo sync + analytics server. Zero-dependency (node:sqlite, Node >= 22.5).
// Endpoints (mounted behind /api by the reverse proxy):
//   PUT  /api/sync/:code  body {state, base?}  -> optimistic-concurrency save
//        base = the updatedAt the client last saw. On mismatch -> 409 {state, updatedAt}
//        so the client can field-merge and retry. Omit base to force-overwrite (first push).
//   GET  /api/sync/:code                        -> {state, updatedAt, v} | 404
//   POST /api/events      body [{name,props?,ts?,device?}] (<=50)  -> 204
//   GET  /api/stats       (Authorization: Bearer <ADMIN_KEY>)      -> aggregates
//   GET  /api/health                            -> ok
import { createServer } from 'node:http';
import { DatabaseSync } from 'node:sqlite';

const PORT = Number(process.env.PORT || 3251);
// Fail closed: refuse to boot with the default/committed admin key in production.
const ADMIN_KEY = process.env.ADMIN_KEY;
if (!ADMIN_KEY || ADMIN_KEY.length < 12) {
  console.error('FATAL: set ADMIN_KEY env (>=12 chars) before starting.');
  process.exit(1);
}
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

const CODE_RE = /^[A-Z0-9]{8,16}$/;
const MAX_STATE = 1024 * 1024; // 1 MB snapshot ceiling (client caps its arrays well below this)
const MAX_EVENTS_BODY = 64 * 1024;
const EVENTS_RETENTION_DAYS = 60;
const EVENTS_HARD_CAP = 2_000_000;

// --- crude per-IP rate limiter (token bucket, in-memory) ---
const buckets = new Map();
const LIMIT = 60; // requests
const WINDOW = 60_000; // per minute
function rateLimited(ip) {
  const now = Date.now();
  let b = buckets.get(ip);
  if (!b || now - b.start > WINDOW) { b = { start: now, n: 0 }; buckets.set(ip, b); }
  b.n += 1;
  return b.n > LIMIT;
}
setInterval(() => { const now = Date.now(); for (const [k, b] of buckets) if (now - b.start > WINDOW) buckets.delete(k); }, WINDOW).unref();

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
setInterval(prune, 6 * 3600_000).unref();
prune();

const json = (res, status, body, extraHeaders = {}) => {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,PUT,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    ...extraHeaders,
  });
  res.end(JSON.stringify(body));
};

const readBody = (req, limit) =>
  new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) { reject(new Error('payload too large')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });

const clientIp = (req) =>
  (req.headers['cf-connecting-ip'] ||
    String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.socket.remoteAddress ||
    'unknown');

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const path = url.pathname.replace(/^\/api/, '');
  try {
    if (req.method === 'OPTIONS') return json(res, 204, {});
    if (path === '/health') return json(res, 200, { ok: true });

    if (rateLimited(clientIp(req))) return json(res, 429, { error: 'slow down' });

    const syncMatch = path.match(/^\/sync\/([A-Za-z0-9]+)$/);
    if (syncMatch) {
      const code = syncMatch[1];
      if (!CODE_RE.test(code)) return json(res, 400, { error: 'bad code' });
      if (req.method === 'GET') {
        const row = db.prepare('SELECT state, v, updated_at FROM sync WHERE code = ?').get(code);
        if (!row) return json(res, 404, { error: 'not found' });
        return json(res, 200, { state: JSON.parse(row.state), v: row.v, updatedAt: row.updated_at });
      }
      if (req.method === 'PUT') {
        const body = await readBody(req, MAX_STATE);
        const parsed = JSON.parse(body);
        if (!parsed || typeof parsed.state !== 'object' || parsed.state === null)
          return json(res, 400, { error: 'bad body' });
        const existing = db.prepare('SELECT v, updated_at FROM sync WHERE code = ?').get(code);
        // Optimistic concurrency: if the caller sent a base and it's stale, reject with current.
        if (existing && parsed.base !== undefined && parsed.base !== existing.updated_at) {
          const cur = db.prepare('SELECT state, v, updated_at FROM sync WHERE code = ?').get(code);
          return json(res, 409, { conflict: true, state: JSON.parse(cur.state), v: cur.v, updatedAt: cur.updated_at });
        }
        const now = new Date().toISOString();
        const v = (existing?.v ?? 0) + 1;
        db.prepare('INSERT INTO sync (code, state, v, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(code) DO UPDATE SET state = excluded.state, v = excluded.v, updated_at = excluded.updated_at')
          .run(code, JSON.stringify(parsed.state), v, now);
        return json(res, 200, { ok: true, v, updatedAt: now });
      }
    }

    if (path === '/events' && req.method === 'POST') {
      const body = await readBody(req, MAX_EVENTS_BODY);
      const events = JSON.parse(body);
      if (!Array.isArray(events) || events.length > 50) return json(res, 400, { error: 'bad batch' });
      const ins = db.prepare('INSERT INTO events (name, props, device, ts) VALUES (?, ?, ?, ?)');
      const nowIso = new Date().toISOString();
      for (const e of events) {
        if (!e || typeof e.name !== 'string' || e.name.length > 64) continue;
        // Normalize ts to ISO day-groupable form regardless of what the client sent.
        let ts = nowIso;
        if (typeof e.ts === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(e.ts)) ts = e.ts;
        else if (typeof e.ts === 'number' && Number.isFinite(e.ts)) ts = new Date(e.ts).toISOString();
        ins.run(e.name, JSON.stringify(e.props ?? {}).slice(0, 1024), String(e.device ?? '').slice(0, 32), ts);
      }
      return json(res, 204, {});
    }

    if (path === '/stats' && req.method === 'GET') {
      const auth = String(req.headers.authorization || '');
      const key = auth.startsWith('Bearer ') ? auth.slice(7) : url.searchParams.get('key');
      if (key !== ADMIN_KEY) return json(res, 403, { error: 'forbidden' });
      const byName = db.prepare('SELECT name, COUNT(*) n FROM events GROUP BY name ORDER BY n DESC').all();
      const byDay = db.prepare('SELECT substr(ts,1,10) day, COUNT(*) n, COUNT(DISTINCT device) devices FROM events GROUP BY day ORDER BY day DESC LIMIT 30').all();
      const quizWrong = db.prepare("SELECT json_extract(props,'$.refId') ref, COUNT(*) n FROM events WHERE name='quiz_wrong' GROUP BY ref ORDER BY n DESC LIMIT 20").all();
      const syncCount = db.prepare('SELECT COUNT(*) n FROM sync').get();
      return json(res, 200, { byName, byDay, hardestItems: quizWrong, syncAccounts: syncCount.n });
    }

    json(res, 404, { error: 'not found' });
  } catch (e) {
    // Generic message to the client; details only to server logs.
    console.error('req error', req.method, path, e.message);
    const status = /too large/.test(e.message) ? 413 : 400;
    json(res, status, { error: 'bad request' });
  }
}).listen(PORT, '0.0.0.0', () => console.log(`jyut sync server on :${PORT}`));
