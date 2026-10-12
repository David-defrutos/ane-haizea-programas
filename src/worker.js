import { loginPage } from './views.js';

const encoder = new TextEncoder();
const COOKIE = '__Host-family';
const TTL = 60 * 60 * 24 * 7;
const GUEST_TTL = 60 * 60 * 24;
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
  if (cookie.length > 1024) return null;
  const parts = cookie.slice(COOKIE.length + 1).split('.');
  if (parts[0] === 'guest') {
    if (parts.length !== 5) return null;
    const [, id, encodedName, expiry, mac] = parts;
    if (!/^[a-f0-9-]{36}$/.test(id) || !/^[A-Za-z0-9_-]+$/.test(encodedName) || !/^\d+$/.test(expiry) || Number(expiry) <= Date.now() / 1000 || Number(expiry) > Date.now() / 1000 + GUEST_TTL + 60 || !/^[a-f0-9]{64}$/.test(mac)) return null;
    const valid = await crypto.subtle.verify('HMAC', await key(env.SESSION_SECRET), unhex(mac), encoder.encode(parts.slice(0, 4).join('.')));
    if (!valid) return null;
    let name;
    try {
      name = new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(atob(encodedName.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0)));
    } catch { return null; }
    if (!validGuestName(name)) return null;
    return { user: `guest-${id}`, name, role: 'guest' };
  }
  if (parts.length !== 4) return null;
  const [user, expiry, version, mac] = parts;
  if (!USERS.includes(user) || !/^\d+$/.test(expiry) || Number(expiry) <= Date.now() / 1000 || Number(expiry) > Date.now() / 1000 + TTL + 60 || !/^[a-f0-9]{64}$/.test(mac)) return null;
  // Password changes invalidate previously issued cookies for that account.
  const expectedVersion = (await signature(users[user].hash, env.SESSION_SECRET)).slice(0, 16);
  if (version !== expectedVersion) return null;
  const payload = parts.slice(0, 3).join('.');
  const valid = await crypto.subtle.verify('HMAC', await key(env.SESSION_SECRET), unhex(mac), encoder.encode(payload));
  return valid ? { user, name: user === 'ane' ? 'Ane' : 'Haizea', role: 'member' } : null;
}
function validGuestName(name) {
  return Array.from(name).length >= 2 && Array.from(name).length <= 24 && !/[\u0000-\u001f\u007f<>\u202a-\u202e\u2066-\u2069]/u.test(name);
}
async function guestCookie(name, env) {
  const encodedName = btoa(String.fromCharCode(...encoder.encode(name))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const payload = `guest.${crypto.randomUUID()}.${encodedName}.${Math.floor(Date.now() / 1000) + GUEST_TTL}`;
  return `${COOKIE}=${payload}.${await signature(payload, env.SESSION_SECRET)}; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=${GUEST_TTL}`;
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
  const profile = await session(request, env, users);
  // Future personal-data endpoints must live here and scope every query to profile.user.
  // A display name is never proof of account ownership, even if it is "Ane" or "Haizea".
  if (url.pathname.startsWith('/api/private/')) {
    if (!profile) return new Response('Inicia sesión con tu cuenta.', { status: 401 });
    if (profile.role !== 'member') return new Response('Esta información es privada de las cuentas familiares.', { status: 403 });
  }
  if (!['GET', 'HEAD', 'POST'].includes(request.method)) return new Response('Método no permitido.', { status: 405 });
  if (request.method === 'POST') {
    if (request.headers.get('Origin') !== url.origin) return new Response('Origen no permitido.', { status: 403 });
    if (url.pathname === '/logout') return redirect('/login', `${COOKIE}=; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=0`);
    if (!['/login', '/guest'].includes(url.pathname)) return new Response('No encontrado.', { status: 404 });
    const entryKind = url.pathname === '/guest' ? 'guest' : 'member';
    // Always require the configured rate limiter, including in development.
    if (!env.LOGIN_LIMITER) return new Response('Acceso temporalmente no disponible.', { status: 503 });
    const { success } = await env.LOGIN_LIMITER.limit({ key: request.headers.get('CF-Connecting-IP') || 'local' });
    if (!success) return html(loginPage('Demasiados intentos. Espera un minuto y vuelve a probar.', entryKind), 429);
    if (!request.headers.get('Content-Type')?.startsWith('application/x-www-form-urlencoded')) return new Response('Formato no permitido.', { status: 415 });
    // Stream and bound the body rather than trusting Content-Length.
    let body = '';
    const reader = request.body?.getReader();
    if (!reader) return html(loginPage('Completa el formulario para entrar.', entryKind), 400);
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
    if (entryKind === 'guest') {
      const name = (form.get('name') || '').trim().replace(/\s+/gu, ' ');
      if (!validGuestName(name)) return html(loginPage('Escribe un nombre o apodo de 2 a 24 caracteres, sin símbolos < o >.', 'guest'), 400);
      return redirect('/', await guestCookie(name, env));
    }
    const user = (form.get('user') || '').toLowerCase();
    const password = form.get('password') || '';
    const valid = await checkPassword(password, users[USERS.includes(user) ? user : 'ane']);
    if (!USERS.includes(user) || !valid) return html(loginPage('Revisa el usuario y la contraseña.'), 401);
    const version = (await signature(users[user].hash, env.SESSION_SECRET)).slice(0, 16);
    const payload = `${user}.${Math.floor(Date.now() / 1000) + TTL}.${version}`;
    const token = `${payload}.${await signature(payload, env.SESSION_SECRET)}`;
    return redirect('/', `${COOKIE}=${token}; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=${TTL}`);
  }
  if (url.pathname === '/login') return profile ? redirect('/') : html(loginPage());
  if (!profile) return redirect('/login');
  if (url.pathname === '/api/me') return Response.json(profile);
  if (url.pathname.startsWith('/api/') || ['/logout', '/guest'].includes(url.pathname)) return new Response('No encontrado.', { status: 404 });
  return env.ASSETS.fetch(request);
}
export default {
  async fetch(request, env) {
    try { return secure(await handle(request, env)); }
    catch { return secure(new Response('No se pudo atender la petición. Vuelve a intentarlo.', { status: 503 })); }
  }
};
