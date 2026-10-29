const { test } = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('node:fs');
const vm = require('node:vm');
function setup({ os = 'web', scheme = 'lady-j', extra, session = null } = {}) {
  let current = session, exchanges = 0;
  const saved = new Map(), redirects = [];
  const real = { user: { id: 'client', email: 'client@example.invalid' }, access_token: 'client-access', refresh_token: 'client-refresh' };
  const demo = { user: { id: 'demo', email: 'demo@example.invalid' }, access_token: 'demo-access', refresh_token: 'demo-refresh' };
  const auth = {
    getSession: async () => ({ data: { session: current }, error: null }),
    setSession: async tokens => { assert.equal(tokens.refresh_token, real.refresh_token); current = real; return { data: { session: current }, error: null }; },
    signInWithPassword: async () => { current = demo; return { data: { session: demo }, error: null }; },
    signOut: async () => { current = null; return { error: null }; },
    exchangeCodeForSession: async code => { assert.equal(code, 'valid-code'); exchanges++; current = real; return { data: { session: real, user: real.user }, error: null }; },
    verifyOtp: async args => { assert.equal(args.type, 'recovery'); return { data: { session: real, user: real.user }, error: null }; },
    signInWithOAuth: async () => ({ data: { url: 'https://accounts.google.com/authorize' }, error: null }),
  };
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync('lib/salon/auth.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(source, { exports, URL, URLSearchParams, Map, globalThis: { location: { origin: 'https://preview.example.invalid', assign: url => redirects.push(url) } }, require: name => {
    if (name === './client') return { db: () => ({ auth }), check: value => { if(value.error) throw Error(value.error.message); return value.data; } };
    if (name === 'expo-web-browser') return { openAuthSessionAsync: async () => { throw Error('Web must not open a popup'); } };
    if (name === 'expo-constants') return { default: { expoConfig: { scheme, extra } } };
    if (name === 'react-native') return { Platform: { OS: os }, Linking: { canOpenURL: async () => false } };
    if (name === './testMode') return { devOwnerCredentials: () => ({ email: demo.user.email, password: 'demo-test' }), isDevOwnerEmail: email => email === demo.user.email };
    if (name === './sessionStorage') return { sessionStorage: { getItem: async key => saved.get(key), setItem: async (key, value) => saved.set(key,value), removeItem: async key => saved.delete(key) } };
    throw Error(name);
  } });
  return { api: exports, real, demo, saved, redirects, current: () => current, exchanges: () => exchanges };
}
test('real session survives repeated login-free demo switching and logout removes saved account', async () => {
  const a = setup();
  // First establish a real session, then switch through demo and back repeatedly.
  await a.api.completeOAuthCallback('https://preview.example.invalid/auth/callback?code=valid-code');
  for (let i=0;i<10;i++) {
    await a.api.signInDevelopmentOwner(); assert.equal(a.current().user.id, 'demo');
    await a.api.beginAccountAccess(); assert.equal(a.current().user.id, 'client');
  }
  await a.api.signOutCurrentDevice(); assert.equal(a.current(), null);
  assert.equal(a.saved.has('lady-j-real-account-session-v1'), false);
});
test('fresh account access leaves demo without retaining owner authority', async () => {
  const a = setup(); await a.api.signInDevelopmentOwner(); await a.api.beginAccountAccess(); assert.equal(a.current(), null);
});
test('restored real account is not signed out by opening Login', async () => {
  const a = setup(); await a.api.completeOAuthCallback('https://preview.example.invalid/auth/callback?code=valid-code'); await a.api.beginAccountAccess(); assert.equal(a.current().user.id,'client');
});
test('duplicate callbacks exchange a PKCE code only once', async () => {
  const a = setup(); await Promise.all([a.api.completeOAuthCallback('https://preview.example.invalid/auth/callback?code=valid-code'), a.api.completeOAuthCallback('https://preview.example.invalid/auth/callback?code=valid-code')]); assert.equal(a.exchanges(),1);
});
test('callback rejects provider errors and missing credentials; supports recovery token hash', async () => {
  const a = setup(); await assert.rejects(a.api.completeOAuthCallback('https://preview.example.invalid/auth/callback?error=access_denied'), /access_denied/);
  await assert.rejects(a.api.completeOAuthCallback('https://preview.example.invalid/auth/callback'), /could not be verified/);
  const result = await a.api.completeOAuthCallback('https://preview.example.invalid/auth/callback?token_hash=one-time-hash&type=recovery'); assert.equal(result.user.id, 'client');
});
test('web OAuth navigates without a blocked popup and rejects external return destinations', async () => {
  const a = setup(); assert.equal(a.api.oauthRedirectUrl(), 'https://preview.example.invalid/auth/callback');
  assert.equal(await a.api.socialSignIn('google',false),null); assert.equal(a.redirects.length,1);
  assert.equal(a.api.authDestination('https://evil.example.invalid').page,'account');
});
test('native callback retains salon scheme when launcher overrides schemes; Android missing handler fails clearly', async () => {
  const a = setup({os:'ios',scheme:['exp','draftbit'],extra:{authCallbackScheme:'lady-j'}}); assert.equal(a.api.oauthRedirectUrl(),'lady-j://auth/callback');
  const android = setup({os:'android',scheme:['exp','draftbit'],extra:{authCallbackScheme:'lady-j'}}); await assert.rejects(android.api.socialSignIn('google',false),/Publishing/);
  const shared = setup({os:'ios',scheme:['exp','draftbit']}); assert.throws(()=>shared.api.oauthRedirectUrl(),/shared mobile preview/);
});
