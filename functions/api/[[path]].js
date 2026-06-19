const jsonHeaders = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
};

export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api\/?/, '');

  try {
    if (request.method === 'OPTIONS') return response({});
    if (request.method === 'GET' && path === 'health') return health();
    if (request.method === 'POST' && path === 'auth/register') return await register(context);
    if (request.method === 'POST' && path === 'auth/login') return await login(context);
    if (request.method === 'POST' && path === 'auth/logout') return await logout(context);
    if (request.method === 'GET' && path === 'me') return await me(context);
    if (request.method === 'GET' && path === 'data') return await getData(context);
    if (request.method === 'PUT' && path === 'data') return await putData(context);

    return response({ error: 'Not found' }, 404);
  } catch (error) {
    return response({ error: error.message || 'Server error' }, error.status || 500);
  }
}

async function register({ request, env }) {
  const body = await readJson(request);
  const email = normalizeEmail(body.email);
  const password = String(body.password || '');

  if (!isValidEmail(email)) throw httpError('请输入有效邮箱', 400);
  if (password.length < 6) throw httpError('密码至少 6 位', 400);
  await cleanupExpiredSessions(env);

  const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
  if (existing) throw httpError('这个邮箱已经注册过了', 409);

  const id = randomToken(16);
  const salt = randomToken(16);
  const passwordHash = await hashPassword(password, salt);
  const now = new Date().toISOString();

  await env.DB.prepare(
    'INSERT INTO users (id, email, password_hash, salt, created_at) VALUES (?, ?, ?, ?, ?)'
  ).bind(id, email, passwordHash, salt, now).run();

  const session = await createSession(env, id);
  return response({ token: session.token, user: { id, email } }, 201);
}

async function login({ request, env }) {
  const body = await readJson(request);
  const email = normalizeEmail(body.email);
  const password = String(body.password || '');
  if (!isValidEmail(email)) throw httpError('邮箱或密码不正确', 401);
  await cleanupExpiredSessions(env);

  const user = await env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first();

  if (!user) throw httpError('邮箱或密码不正确', 401);

  const passwordHash = await hashPassword(password, user.salt);
  if (passwordHash !== user.password_hash) throw httpError('邮箱或密码不正确', 401);

  const session = await createSession(env, user.id);
  return response({ token: session.token, user: { id: user.id, email: user.email } });
}

async function logout(context) {
  const auth = await requireAuth(context);
  await context.env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(auth.token).run();
  return response({ ok: true });
}

async function me(context) {
  const auth = await requireAuth(context);
  return response({ user: auth.user });
}

async function getData(context) {
  const auth = await requireAuth(context);
  const row = await context.env.DB.prepare('SELECT payload, updated_at FROM user_data WHERE user_id = ?')
    .bind(auth.user.id)
    .first();

  return response({
    payload: row ? JSON.parse(row.payload) : null,
    updatedAt: row?.updated_at || null,
  });
}

async function putData(context) {
  const auth = await requireAuth(context);
  const body = await readJson(context.request);
  const payload = sanitizePayload(body.payload);
  const updatedAt = new Date().toISOString();

  await context.env.DB.prepare(
    `INSERT INTO user_data (user_id, payload, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at`
  ).bind(auth.user.id, JSON.stringify(payload), updatedAt).run();

  return response({ ok: true, updatedAt });
}

function health() {
  return response({
    ok: true,
    service: 'worklog',
    version: '0.1.0',
    time: new Date().toISOString(),
  });
}

async function cleanupExpiredSessions(env) {
  await env.DB.prepare('DELETE FROM sessions WHERE expires_at < ?').bind(new Date().toISOString()).run();
}

async function requireAuth({ request, env }) {
  const header = request.headers.get('Authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) throw httpError('请先登录', 401);

  const row = await env.DB.prepare(
    `SELECT sessions.token, sessions.expires_at, users.id, users.email
     FROM sessions
     JOIN users ON users.id = sessions.user_id
     WHERE sessions.token = ?`
  ).bind(token).first();

  if (!row || new Date(row.expires_at).getTime() < Date.now()) {
    throw httpError('登录已过期，请重新登录', 401);
  }

  return {
    token,
    user: { id: row.id, email: row.email },
  };
}

async function createSession(env, userId) {
  const token = randomToken(32);
  const now = new Date();
  const expires = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 30);

  await env.DB.prepare(
    'INSERT INTO sessions (token, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)'
  ).bind(token, userId, expires.toISOString(), now.toISOString()).run();

  return { token, expiresAt: expires.toISOString() };
}

function sanitizePayload(payload = {}) {
  const modelConfig = payload.modelConfig && typeof payload.modelConfig === 'object' ? payload.modelConfig : {};

  return {
    entries: Array.isArray(payload.entries) ? payload.entries : [],
    goals: payload.goals && typeof payload.goals === 'object' ? payload.goals : { stage: [], year: [] },
    ideas: Array.isArray(payload.ideas) ? payload.ideas : [],
    wishes: Array.isArray(payload.wishes) ? payload.wishes : [],
    projectMeta: payload.projectMeta && typeof payload.projectMeta === 'object' ? payload.projectMeta : {},
    reviews: sanitizeReviews(payload.reviews),
    reportKind: typeof payload.reportKind === 'string' ? payload.reportKind : '',
    reportMaterials: payload.reportMaterials && typeof payload.reportMaterials === 'object' ? payload.reportMaterials : {},
    reportTemplate: typeof payload.reportTemplate === 'string' ? payload.reportTemplate : '',
    modelConfig: {
      provider: String(modelConfig.provider || ''),
      endpoint: String(modelConfig.endpoint || ''),
      model: String(modelConfig.model || ''),
    },
  };
}

function sanitizeReviews(value = {}) {
  const empty = { daily: {}, weekly: {}, report: {}, projects: {} };
  if (!value || typeof value !== 'object') return empty;

  return {
    daily: value.daily && typeof value.daily === 'object' ? value.daily : {},
    weekly: value.weekly && typeof value.weekly === 'object' ? value.weekly : {},
    report: value.report && typeof value.report === 'object' ? value.report : {},
    projects: value.projects && typeof value.projects === 'object' ? value.projects : {},
  };
}

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    throw httpError('请求格式不正确', 400);
  }
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email));
}

async function hashPassword(password, salt) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: encoder.encode(salt), iterations: 100000, hash: 'SHA-256' },
    key,
    256
  );
  return base64(bits);
}

function randomToken(bytes) {
  const values = new Uint8Array(bytes);
  crypto.getRandomValues(values);
  return Array.from(values).map((value) => value.toString(16).padStart(2, '0')).join('');
}

function base64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function response(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: jsonHeaders });
}

function httpError(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}
