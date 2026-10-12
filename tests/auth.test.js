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
test('all asset paths require authentication and responses cannot be cached', async () => {
  for (const path of ['/', '/portal.js', '/portal.css', '/haizea/irregular-verbs-quiz/', '/haizea/irregular-verbs-quiz/index.html', '/404.html', '/api/me']) {
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
    assert.equal((await profile.json()).user, user);
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
