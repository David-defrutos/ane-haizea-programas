import { loginPage } from './views.js';

const encoder = new TextEncoder();
const COOKIE = '__Host-family';
const TTL = 60 * 60 * 24 * 7;
const USERS = ['ane', 'haizea'];
const hex = bytes => Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join('');
const unhex = text => Uint8Array.from(text.match(/../g) || [], pair => parseInt(pair, 16));
const equal = (a, b) => {
  let difference = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) difference |= (a[i] || 0) ^ (b[i] || 0);
  return difference === 0;
};
async function key(secret) {
  return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}
async function signature(text, secret) {
  return hex(await crypto.subtle.sign('HMAC', await key(secret), encoder.encode(text)));
}
async function credentials(env) {
  if (!env.SESSION_SECRET || env.SESSION_SECRET.length < 32) throw new Error('Missing session secret');
  const users = JSON.parse(env.USER_CREDENTIALS);
  for (const user of USERS) {
    const record = users[user];
    if (!record || record.iterations !== 100000 || !/^[a-f0-9]{32}$/.test(record.salt) || !/^[a-f0-9]{64}$/.test(record.hash)) throw new Error('Invalid credentials');
  }
  return users;
}
async function checkPassword(password, record) {
  const material = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const result = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', iterations: record.iterations, salt: unhex(record.salt) }, material, 256);
  return equal(new Uint8Array(result), unhex(record.hash));
}
async function session(request, env, users) {
  const cookie = (request.headers.get('Cookie') || '').split(';').map(s => s.trim()).find(s => s.startsWith(COOKIE + '='));
  if (!cookie) return null;
  const parts = cookie.slice(COOKIE.length + 1).split('.');
  if (parts.length !== 4) return null;
  const [user, expiry, version, mac] = parts;
  if (!USERS.includes(user) || !/^\d+$/.test(expiry) || Number(expiry) <= Date.now() / 1000 || Number(expiry) > Date.now() / 1000 + TTL + 60 || !/^[a-f0-9]{64}$/.test(mac)) return null;
  // Password changes invalidate previously issued cookies for that account.
  const expectedVersion = (await signature(users[user].hash, env.SESSION_SECRET)).slice(0, 16);
  if (version !== expectedVersion) return null;
  const payload = parts.slice(0, 3).join('.');
  const valid = await crypto.subtle.verify('HMAC', await key(env.SESSION_SECRET), unhex(mac), encoder.encode(payload));
  return valid ? user : null;
}
function redirect(location, cookie) {
  const headers = { Location: location };
  if (cookie) headers['Set-Cookie'] = cookie;
  return new Response(null, { status: 303, headers });
}
function html(text, status = 200) {
  return new Response(text, { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
function secure(response) {
  const result = new Response(response.body, response);
  result.headers.set('Cache-Control', 'private, no-store');
  result.headers.set('Vary', 'Cookie');
  result.headers.set('X-Content-Type-Options', 'nosniff');
  result.headers.set('Referrer-Policy', 'no-referrer');
  result.headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
  result.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  result.headers.set('Strict-Transport-Security', 'max-age=31536000');
  return result;
}
async function handle(request, env) {
  const url = new URL(request.url);
  let users;
  try { users = await credentials(env); }
  catch { return new Response('El sitio todavía no tiene configuradas sus credenciales.', { status: 503 }); }
  if (!['GET', 'HEAD', 'POST'].includes(request.method)) return new Response('Método no permitido.', { status: 405 });
  if (request.method === 'POST') {
    if (request.headers.get('Origin') !== url.origin) return new Response('Origen no permitido.', { status: 403 });
    if (url.pathname === '/logout') return redirect('/login', `${COOKIE}=; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=0`);
    if (url.pathname !== '/login') return new Response('No encontrado.', { status: 404 });
    // Always require the configured rate limiter, including in development.
    if (!env.LOGIN_LIMITER) return new Response('Acceso temporalmente no disponible.', { status: 503 });
    const { success } = await env.LOGIN_LIMITER.limit({ key: request.headers.get('CF-Connecting-IP') || 'local' });
    if (!success) return html(loginPage('Demasiados intentos. Espera un minuto y vuelve a probar.'), 429);
    if (!request.headers.get('Content-Type')?.startsWith('application/x-www-form-urlencoded')) return new Response('Formato no permitido.', { status: 415 });
    // Stream and bound the body rather than trusting Content-Length.
    let body = '';
    const reader = request.body?.getReader();
    if (!reader) return html(loginPage('Revisa el usuario y la contraseña.'), 401);
    const decoder = new TextDecoder();
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 4096) { await reader.cancel(); return new Response('Formulario demasiado grande.', { status: 413 }); }
      body += decoder.decode(value, { stream: true });
    }
    body += decoder.decode();
    const form = new URLSearchParams(body);
    const user = (form.get('user') || '').toLowerCase();
    const password = form.get('password') || '';
    const valid = await checkPassword(password, users[USERS.includes(user) ? user : 'ane']);
    if (!USERS.includes(user) || !valid) return html(loginPage('Revisa el usuario y la contraseña.'), 401);
    const version = (await signature(users[user].hash, env.SESSION_SECRET)).slice(0, 16);
    const payload = `${user}.${Math.floor(Date.now() / 1000) + TTL}.${version}`;
    const token = `${payload}.${await signature(payload, env.SESSION_SECRET)}`;
    return redirect('/', `${COOKIE}=${token}; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=${TTL}`);
  }
  const user = await session(request, env, users);
  if (url.pathname === '/login') return user ? redirect('/') : html(loginPage());
  if (!user) return redirect('/login');
  if (url.pathname === '/api/me') return Response.json({ user, name: user === 'ane' ? 'Ane' : 'Haizea' });
  if (url.pathname.startsWith('/api/') || url.pathname === '/logout') return new Response('No encontrado.', { status: 404 });
  return env.ASSETS.fetch(request);
}
export default {
  async fetch(request, env) {
    try { return secure(await handle(request, env)); }
    catch { return secure(new Response('No se pudo atender la petición. Vuelve a intentarlo.', { status: 503 })); }
  }
};
