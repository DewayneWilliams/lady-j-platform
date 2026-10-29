const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');
const { execFileSync } = require('node:child_process');
function readSource(path) {
  if (process.env.LJ_TEST_BASELINE && !['lib/salon/catalogData.ts', 'lib/salon/shoppingBag.ts'].includes(path))
    return execFileSync('git', ['show', `${process.env.LJ_TEST_BASELINE}:${path}`], { encoding: 'utf8' });
  return fs.readFileSync(path, 'utf8');
}
function load(path, imports = {}) {
  const source = readSource(path);
  const parsed = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true);
  assert.equal(parsed.parseDiagnostics.length, 0, path);
  const output = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React,
    esModuleInterop: true,
  } }).outputText;
  const exports = {};
  vm.runInNewContext(output, { exports, Error, console: { warn() {} }, setTimeout, clearTimeout,
    require(name) { if (name in imports) return imports[name]; throw new Error('Unexpected import: ' + name); },
  });
  return exports;
}
const plain = (value) => JSON.parse(JSON.stringify(value));
const tick = () => new Promise((resolve) => setImmediate(resolve));
const service = { id: 'service-a', name: 'Service A', description: 'Existing description', category: 'Hair', image: 'hair', price: 100, duration: 45, active: true, bookable: true };
const product = { id: 'product-a', name: 'Product A', description: 'Existing product description', category: 'Hair', image: 'oil', price: 75, stock: 3, active: true };
const catalog = load('lib/salon/catalogData.ts');
const bag = load('lib/salon/shoppingBag.ts');

test('catalog validates every render field and retains zero-cost consultations', () => {
  assert.equal(catalog.serviceRows([service])[0], service);
  assert.equal(catalog.productRows([product])[0], product);
  assert.equal(catalog.serviceRows([{ ...service, price: 0 }])[0].price, 0);
  for (const value of [null, {}, [null], [{ ...service, name: '' }], [{ ...service, image: null }], [{ ...service, price: '100' }], [{ ...service, duration: NaN }]])
    assert.throws(() => catalog.serviceRows(value), /invalid|incomplete/);
  assert.throws(() => catalog.productRows([{ ...product, stock: undefined }]), /incomplete/);
  assert.deepEqual(plain(catalog.serviceRows([])), []);
});

test('saved bag rejects malformed identifiers and merges delayed selections without duplicates', () => {
  const saved = bag.readShoppingBag(JSON.stringify({ products: { p: 2, bad: -1 }, services: ['a', null, 3, 'a'], workshops: ['w'] }));
  assert.deepEqual(plain(saved), { products: { p: 2 }, services: ['a'], workshops: ['w'] });
  assert.deepEqual(plain(bag.restoreBagIds(saved.services, ['b', 'a'])), ['a', 'b']);
  const current = ['a'];
  assert.equal(bag.addRequestedService(current, 'a'), current);
  assert.deepEqual(plain(bag.addRequestedService(current, 'b')), ['a', 'b']);
});

function providerHarness({ delayedBag = false } = {}) {
  const hooks = []; let cursor = 0, effects = [], dirty = false, state, auth, finishBag;
  const responses = {
    lj_public_services: { data: [service], error: null },
    lj_public_products: { data: [product], error: null },
    lj_products: { data: [product], error: null },
    lj_public_workshops: { data: [], error: null }, lj_workshops: { data: [], error: null },
    lj_public_settings: { data: {}, error: null }, lj_settings: { data: {}, error: null },
    lj_promotions: { data: null, error: { message: 'permission denied' } },
    lj_public_home_specials: { data: [{ ...service, id: 'special' }], error: null },
  };
  const calls = [];
  const chain = (table) => {
    calls.push(table);
    const query = new Proxy({}, { get(_target, key) {
      if (key === 'then') return (resolve) => Promise.resolve(responses[table] || { data: [], error: null }).then(resolve);
      return () => query;
    } });
    return query;
  };
  const client = { from: chain, rpc: () => Promise.resolve({ data: null, error: null }),
    auth: { onAuthStateChange(fn) { auth = fn; return { data: { subscription: { unsubscribe() {} } } }; } },
    channel() { const q = { on: () => q, subscribe: () => q }; return q; }, removeChannel() {},
  };
  const React = {
    createContext: () => ({ Provider: 'Provider' }), useContext() {},
    createElement(type, props) { if (type === 'Provider') state = props.value; return { type, props }; },
    useState(initial) {
      const i = cursor++; if (!(i in hooks)) hooks[i] = typeof initial === 'function' ? initial() : initial;
      return [hooks[i], (value) => { const next = typeof value === 'function' ? value(hooks[i]) : value; if (next !== hooks[i]) { hooks[i] = next; dirty = true; } }];
    },
    useRef(initial) { const i = cursor++; return hooks[i] ||= { current: initial }; },
    useCallback(fn, deps) { const i = cursor++; if (!hooks[i] || deps.some((dep, index) => dep !== hooks[i].deps[index])) hooks[i] = { fn, deps }; return hooks[i].fn; },
    useEffect(fn, deps) { const i = cursor++; if (!hooks[i] || deps.some((dep, index) => dep !== hooks[i].deps[index])) { const old = hooks[i]; hooks[i] = { deps }; effects.push(() => { old?.cleanup?.(); hooks[i].cleanup = fn(); }); } },
  };
  const storage = { getItem: () => delayedBag ? new Promise((resolve) => { finishBag = resolve; }) : Promise.resolve(null), setItem: () => Promise.resolve() };
  const { SalonProvider } = load('lib/salon/SalonProvider.tsx', {
    react: React, 'react-native': { Platform: { OS: 'web' }, AppState: {} },
    './useForegroundRefresh': { useForegroundRefresh() {} }, './categories': { orderServicesByCategory: (v) => v },
    './client': { supabase: client, db: () => client, check(r) { if (r.error) throw new Error(r.error.message); return r.data; }, asRows: (v) => v || [] },
    './testMode': { developmentTestMode: false }, './sessionStorage': { sessionStorage: storage },
    './catalogData': catalog, './shoppingBag': bag, './loyalty': { emptyRewardSummary: {} },
  });
  function render() { cursor = 0; effects = []; dirty = false; SalonProvider({ children: null }); effects.forEach((fn) => fn()); }
  async function settle() { for (let i = 0; i < 12; i++) { await tick(); if (dirty) render(); } }
  render();
  return { state: () => state, responses, calls, settle, auth: (id) => auth('SIGNED_IN', { user: { id } }), finishBag: (raw) => finishBag(raw) };
}

test('one failing catalog request does not discard other successful sections', async () => {
  const h = providerHarness(); await h.settle();
  assert.equal(h.state().services[0].name, service.name);
  assert.equal(h.state().products[0].name, product.name);
  assert.equal(h.state().homeSpecials[0].id, 'special');
  assert.match(h.state().error, /permission denied/);
});

test('malformed refresh preserves loaded services while applying valid products', async () => {
  const h = providerHarness(); await h.settle();
  h.responses.lj_public_services = { data: null, error: null };
  h.responses.lj_public_products = { data: [{ ...product, price: 80 }], error: null };
  await h.state().refresh(); await h.settle();
  assert.equal(h.state().services[0].name, service.name);
  assert.equal(h.state().products[0].price, 80);
  assert.match(h.state().error, /invalid/);
});

test('asynchronous native bag hydration cannot erase a selection made after startup', async () => {
  const h = providerHarness({ delayedBag: true }); await h.settle();
  h.state().setSelected(['new']); h.state().setCart({ newProduct: 1 }); await h.settle();
  h.finishBag(JSON.stringify({ services: ['saved'], products: { oldProduct: 2 } })); await h.settle();
  assert.deepEqual(plain(h.state().selected), ['saved', 'new']);
  assert.deepEqual(plain(h.state().cart), { oldProduct: 2, newProduct: 1 });
  assert.equal(h.state().bagReady, true);
});

test('switching signed-in identities reloads catalog rather than leaving cleared arrays', async () => {
  const h = providerHarness(); await h.settle(); h.auth('user-a'); await h.settle();
  const before = h.calls.filter((name) => name === 'lj_products').length;
  h.auth('user-b'); await h.settle();
  assert.equal(h.calls.filter((name) => name === 'lj_products').length, before + 1);
  assert.equal(h.state().products[0].id, product.id);
});

function secureStorageHarness() {
  const values = new Map(); let release, pause = true;
  const secure = {
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'device-only',
    getItemAsync: async (key) => values.get(key) ?? null,
    async setItemAsync(key, value) {
      if (pause && key.startsWith('bag.')) { pause = false; await new Promise((resolve) => { release = resolve; }); }
      values.set(key, value);
    },
    deleteItemAsync: async (key) => { values.delete(key); },
  };
  return { storage: load('lib/salon/sessionStorage.native.ts', { 'expo-secure-store': secure }).sessionStorage,
    release: () => release(), values };
}

test('native storage commits rapid bag writes in invocation order', async () => {
  const h = secureStorageHarness();
  const first = h.storage.setItem('bag', 'older selection'); await tick();
  const second = h.storage.setItem('bag', 'newest selection'); await tick();
  h.release(); await Promise.all([first, second]);
  assert.equal(await h.storage.getItem('bag'), 'newest selection');
});

test('native storage removal cannot be undone by an earlier delayed write', async () => {
  const h = secureStorageHarness(); const write = h.storage.setItem('bag', 'old selection'); await tick();
  const remove = h.storage.removeItem('bag'); await tick(); h.release(); await Promise.all([write, remove]);
  assert.equal(await h.storage.getItem('bag'), null);
});

test('booking uses the bundled approved font and has no network-font render gate', () => {
  const booking = readSource('components/salon/BookingScreen.tsx');
  const root = readSource('app/_layout.tsx');
  assert.doesNotMatch(booking, /@expo-google-fonts\/dev|if\s*\(!fontsLoaded\)/);
  assert.match(root, /@expo-google-fonts\/playfair-display\/400Regular/);
  assert.ok(fs.existsSync('node_modules/@expo-google-fonts/playfair-display/400Regular/PlayfairDisplay_400Regular.ttf'));
  assert.match(booking, /addRequestedService\(current, service.id\)/);
});

test('existing summary binds thumbnails, count, duration, total and controls at every step', () => {
  const source = ts.createSourceFile('BookingScreen.tsx', readSource('components/salon/BookingScreen.tsx'), ts.ScriptTarget.Latest, true);
  const declaration = source.statements.find((item) => item.name?.text === 'BookingSummaryBar');
  const output = ts.transpileModule('export ' + declaration.getText(source), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React,
  } }).outputText;
  const exports = {};
  vm.runInNewContext(output, {
    exports, React: { createElement: (type, props, ...children) => ({ type, props, children }) },
    View: 'View', Image: 'Image', Pressable: 'Pressable', Txt: 'Txt', Icon: 'Icon',
    Animated: { Value: class {}, View: 'AnimatedView' }, Platform: { OS: 'ios' },
    useColors: () => ({}), useReducedMotionPreference: () => true,
    useRef: (value) => ({ current: value }), useEffect() {},
    formatDuration: load('lib/salon/duration.ts').formatDuration,
    money: (value) => '$' + value, catalogPhotoSource: (name) => ({ uri: name }), reportCatalogImageFailure() {},
  });
  const walk = (node) => Array.isArray(node) ? node.flatMap(walk)
    : node && typeof node === 'object' ? [node, ...walk(node.children)] : [node];
  for (const step of [1, 2, 3]) {
    for (const count of [0, 1, 2, 5]) {
      const selected = Array.from({ length: count }, (_, index) => ({ ...service, id: String(index), image: 'photo-' + index }));
      const tree = walk(exports.BookingSummaryBar({ selected, duration: count * 45, total: count * 100,
        updating: false, step, nextLabel: 'Next Step', nextDisabled: !count, width: 390, onBack() {}, onNext() {} }));
      const images = tree.filter((node) => node?.type === 'Image');
      assert.deepEqual(images.map((node) => node.props.source.uri), selected.slice(0, 4).map((item) => item.image));
      assert.ok(tree.includes('$' + count * 100));
      assert.ok(tree.includes(count * 45 === 0 ? '0 minutes' : load('lib/salon/duration.ts').formatDuration(count * 45)));
      assert.equal(tree.some((node) => node?.props?.accessibilityLabel === 'Next Step'), step < 3);
      assert.equal(tree.find((node) => node?.props?.accessibilityLabel === 'Back').props.disabled, step === 1);
    }
  }
});
