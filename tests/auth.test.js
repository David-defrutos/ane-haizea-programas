import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pbkdf2Sync, createHmac } from 'node:crypto';
import worker from '../src/worker.js';

const passwords = { ane: 'test-only-ane-password', haizea: 'test-only-haizea-password' };
const users = Object.fromEntries(Object.entries(passwords).map(([user, password]) => {
  const salt = 'aa'.repeat(16);
  return [user, { salt, iterations: 100000, hash: pbkdf2Sync(password, Buffer.from(salt, 'hex'), 100000, 32, 'sha256').toString('hex') }];
}));
function environment() {
  return { USER_CREDENTIALS: JSON.stringify(users), SESSION_SECRET: 'test-only-signing-key-never-use-in-production',
    LOGIN_LIMITER: { async limit() { return { success: true }; } },
    ASSETS: { async fetch(request) { return new Response(`protected asset: ${new URL(request.url).pathname}`); } } };
}
function request(path = '/', cookie, options = {}) {
  return new Request(`https://family.example${path}`, { ...options, headers: { ...(cookie ? { Cookie: cookie } : {}), ...options.headers } });
}
function login(user, password, env = environment(), origin = 'https://family.example') {
  return worker.fetch(request('/login', null, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ user, password }).toString() }), env);
}
function guest(name, env = environment(), origin = 'https://family.example', extra = {}) {
  return worker.fetch(request('/guest', null, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ name, ...extra }).toString() }), env);
}
test('all asset paths require authentication and responses cannot be cached', async () => {
  for (const path of ['/', '/portal.js', '/portal.css', '/haizea/irregular-verbs-quiz/', '/haizea/irregular-verbs-quiz/index.html', '/programas/lab-tools-quiz/', '/programas/lab-tools-quiz/index.html', '/404.html', '/api/me']) {
    const response = await worker.fetch(request(path), environment());
    assert.equal(response.status, 303);
    assert.equal(response.headers.get('Location'), '/login');
    assert.match(response.headers.get('Cache-Control'), /no-store/);
  }
});
test('both users can sign in, read their profile and access assets', async () => {
  for (const user of Object.keys(passwords)) {
    const env = environment();
    const response = await login(user, passwords[user], env);
    assert.equal(response.status, 303);
    const cookie = response.headers.get('Set-Cookie');
    for (const flag of ['HttpOnly', 'Secure', 'SameSite=Lax', 'Path=/']) assert.ok(cookie.includes(flag));
    const token = cookie.split(';')[0];
    const profile = await worker.fetch(request('/api/me', token), env);
    const profileData = await profile.json();
    assert.equal(profileData.user, user);
    assert.equal(profileData.role, 'member');
    const asset = await worker.fetch(request('/haizea/irregular-verbs-quiz/', token), env);
    assert.equal(asset.status, 200);
    assert.match(await asset.text(), /protected asset/);
  }
});
test('wrong passwords and unknown users receive the same error', async () => {
  const wrong = await login('ane', 'wrong');
  const unknown = await login('someone', passwords.ane);
  assert.equal(wrong.status, 401);
  assert.equal(unknown.status, 401);
  assert.equal(await wrong.text(), await unknown.text());
  assert.equal(wrong.headers.get('Set-Cookie'), null);
});
test('cross-origin login/logout are rejected; logout expires the cookie', async () => {
  assert.equal((await login('ane', passwords.ane, environment(), 'https://evil.example')).status, 403);
  assert.equal((await worker.fetch(request('/logout', null, { method: 'POST' }), environment())).status, 403);
  const response = await worker.fetch(request('/logout', null, { method: 'POST', headers: { Origin: 'https://family.example' } }), environment());
  assert.equal(response.status, 303);
  assert.match(response.headers.get('Set-Cookie'), /Max-Age=0/);
});
test('tampered, expired and revoked sessions are rejected', async () => {
  const env = environment();
  const response = await login('ane', passwords.ane, env);
  const cookie = response.headers.get('Set-Cookie').split(';')[0];
  assert.equal((await worker.fetch(request('/', cookie.replace('ane.', 'haizea.')), env)).status, 303);
  const version = createHmac('sha256', env.SESSION_SECRET).update(users.ane.hash).digest('hex').slice(0,16);
  const payload = `ane.1.${version}`;
  const expired = `__Host-family=${payload}.${createHmac('sha256', env.SESSION_SECRET).update(payload).digest('hex')}`;
  assert.equal((await worker.fetch(request('/', expired), env)).status, 303);
  const changed = structuredClone(users); changed.ane.hash = 'bb'.repeat(32);
  assert.equal((await worker.fetch(request('/', cookie), { ...env, USER_CREDENTIALS: JSON.stringify(changed) })).status, 303);
});
test('missing configuration fails closed and rate limiting is enforced', async () => {
  assert.equal((await worker.fetch(request('/'), {})).status, 503);
  const env = environment(); env.LOGIN_LIMITER = { async limit() { return { success: false }; } };
  assert.equal((await login('ane', passwords.ane, env)).status, 429);
  delete env.LOGIN_LIMITER;
  assert.equal((await login('ane', passwords.ane, env)).status, 503);
});
test('large bodies and unsupported form encodings are rejected', async () => {
  assert.equal((await login('ane', 'x'.repeat(5000))).status, 413);
  const response = await worker.fetch(request('/login', null, { method: 'POST', headers: { Origin: 'https://family.example', 'Content-Type': 'application/json' }, body: '{}' }), environment());
  assert.equal(response.status, 415);
});
test('guests enter without passwords and can open the quiz with their own signed profile', async () => {
  const env = environment();
  const response = await guest('  María   💫  ', env);
  assert.equal(response.status, 303);
  const cookieHeader = response.headers.get('Set-Cookie');
  assert.match(cookieHeader, /Max-Age=86400/);
  assert.match(cookieHeader, /HttpOnly/);
  const cookie = cookieHeader.split(';')[0];
  const profileResponse = await worker.fetch(request('/api/me', cookie), env);
  const profile = await profileResponse.json();
  assert.equal(profile.name, 'María 💫');
  assert.equal(profile.role, 'guest');
  assert.match(profile.user, /^guest-[a-f0-9-]{36}$/);
  assert.equal((await worker.fetch(request('/haizea/irregular-verbs-quiz/', cookie), env)).status, 200);
});
test('two guests with the same name get independent identities', async () => {
  const env = environment();
  const first = await guest('Amiga', env);
  const second = await guest('Amiga', env);
  const profile1 = await (await worker.fetch(request('/api/me', first.headers.get('Set-Cookie').split(';')[0]), env)).json();
  const profile2 = await (await worker.fetch(request('/api/me', second.headers.get('Set-Cookie').split(';')[0]), env)).json();
  assert.notEqual(profile1.user, profile2.user);
});
test('guest names and submitted role fields cannot grant family privileges or private access', async () => {
  const env = environment();
  const response = await guest('Haizea', env, 'https://family.example', { user: 'haizea', role: 'member' });
  const cookie = response.headers.get('Set-Cookie').split(';')[0];
  const profile = await (await worker.fetch(request('/api/me', cookie), env)).json();
  assert.equal(profile.role, 'guest');
  assert.notEqual(profile.user, 'haizea');
  for (const method of ['GET', 'POST']) {
    const options = method === 'POST' ? { method, headers: { Origin: 'https://family.example' }, body: '' } : {};
    assert.equal((await worker.fetch(request('/api/private/progress', cookie, options), env)).status, 403);
  }
  assert.equal((await worker.fetch(request('/api/private/progress'), env)).status, 401);
  const family = await login('haizea', passwords.haizea, env);
  // The namespace currently has no data endpoints; members reach the normal 404.
  assert.equal((await worker.fetch(request('/api/private/progress', family.headers.get('Set-Cookie').split(';')[0]), env)).status, 404);
});
test('tampered, expired or differently signed guest cookies are rejected', async () => {
  const env = environment();
  const response = await guest('Amiga', env);
  const cookie = response.headers.get('Set-Cookie').split(';')[0];
  assert.equal((await worker.fetch(request('/', cookie.replace('guest.', 'ane.')), env)).status, 303);
  const parts = cookie.slice(cookie.indexOf('=') + 1).split('.');
  parts[2] = Buffer.from('Otro nombre').toString('base64url');
  assert.equal((await worker.fetch(request('/', `__Host-family=${parts.join('.')}`), env)).status, 303);
  parts[3] = '1';
  parts[4] = createHmac('sha256', env.SESSION_SECRET).update(parts.slice(0, 4).join('.')).digest('hex');
  assert.equal((await worker.fetch(request('/', `__Host-family=${parts.join('.')}`), env)).status, 303);
  assert.equal((await worker.fetch(request('/', cookie), { ...env, SESSION_SECRET: 'a-new-test-only-signing-secret-for-rotation' })).status, 303);
});
test('guest form rejects invalid names, cross-origin posts, oversized input and rate excess', async () => {
  for (const name of ['', ' ', 'a', 'x'.repeat(25), '<script>', 'abc\u202edef']) {
    const response = await guest(name);
    assert.equal(response.status, 400, name);
    assert.equal(response.headers.get('Set-Cookie'), null);
    assert.equal((await response.text()).includes('<script>'), false);
  }
  assert.equal((await guest('Amiga', environment(), 'https://evil.example')).status, 403);
  assert.equal((await guest('x'.repeat(5000))).status, 413);
  const env = environment(); env.LOGIN_LIMITER = { async limit() { return { success: false }; } };
  assert.equal((await guest('Amiga', env)).status, 429);
});
test('guest logout clears the session cookie and login page offers both entry paths', async () => {
  const env = environment();
  const response = await guest('Amiga', env);
  const cookie = response.headers.get('Set-Cookie').split(';')[0];
  const logout = await worker.fetch(request('/logout', cookie, { method: 'POST', headers: { Origin: 'https://family.example' } }), env);
  assert.match(logout.headers.get('Set-Cookie'), /Max-Age=0/);
  const page = await (await worker.fetch(request('/login'), env)).text();
  assert.match(page, /action="\/login"/);
  assert.match(page, /action="\/guest"/);
  assert.match(page, /Entrar sin contraseña/);
});
