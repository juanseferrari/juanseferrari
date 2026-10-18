// node --test src/training/autosync.test.js
const test = require('node:test');
const assert = require('node:assert');
const Module = require('module');

// autosync hace require() perezoso de ./strava y ./sync, asi que los
// interceptamos antes de que los pida.
function withMocks(mocks, fn) {
  const orig = Module.prototype.require;
  Module.prototype.require = function (id) {
    for (const key of Object.keys(mocks)) {
      if (id === key) return mocks[key];
    }
    return orig.apply(this, arguments);
  };
  return Promise.resolve(fn()).finally(() => { Module.prototype.require = orig; });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function freshAutosync(mocks) {
  delete require.cache[require.resolve('./autosync')];
  const orig = Module.prototype.require;
  Module.prototype.require = function (id) {
    if (mocks[id]) return mocks[id];
    return orig.apply(this, arguments);
  };
  const mod = require('./autosync');
  Module.prototype.require = orig;
  return mod;
}

test('no sincroniza si la ultima sync es reciente', async () => {
  let synced = 0;
  const mocks = {
    './queries': {
      getSyncState: async () => ({ at: new Date().toISOString() }), // recien
      setSyncState: async () => {},
    },
    './strava': { isConnected: async () => true },
    './sync': { syncRecent: async () => { synced++; return { fetched: 0 }; } },
  };
  const a = freshAutosync(mocks);
  await withMocks(mocks, async () => { a.maybeSync(); await sleep(60); });
  assert.equal(synced, 0, 'no deberia sincronizar');
});

test('sincroniza si paso el intervalo', async () => {
  let synced = 0;
  const viejo = new Date(Date.now() - 8 * 3600 * 1000).toISOString();
  const mocks = {
    './queries': { getSyncState: async () => ({ at: viejo }), setSyncState: async () => {} },
    './strava': { isConnected: async () => true },
    './sync': {
      syncRecent: async () => { synced++; return { fetched: 3, from: 'x', to: 'y' }; },
    },
  };
  const a = freshAutosync(mocks);
  await withMocks(mocks, async () => { a.maybeSync(); await sleep(80); });
  assert.equal(synced, 1);
});

test('no sincroniza si Strava no esta conectado', async () => {
  let synced = 0;
  const viejo = new Date(Date.now() - 8 * 3600 * 1000).toISOString();
  const mocks = {
    './queries': { getSyncState: async () => ({ at: viejo }), setSyncState: async () => {} },
    './strava': { isConnected: async () => false },
    './sync': { syncRecent: async () => { synced++; return {}; } },
  };
  const a = freshAutosync(mocks);
  await withMocks(mocks, async () => { a.maybeSync(); await sleep(60); });
  assert.equal(synced, 0);
});

test('diez visitas seguidas disparan un solo sync', async () => {
  let synced = 0;
  const viejo = new Date(Date.now() - 8 * 3600 * 1000).toISOString();
  const mocks = {
    './queries': { getSyncState: async () => ({ at: viejo }), setSyncState: async () => {} },
    './strava': { isConnected: async () => true },
    './sync': {
      syncRecent: async () => { synced++; await sleep(40); return { fetched: 1, from: 'x', to: 'y' }; },
    },
  };
  const a = freshAutosync(mocks);
  await withMocks(mocks, async () => {
    for (let i = 0; i < 10; i++) a.maybeSync();
    await sleep(120);
  });
  assert.equal(synced, 1, 'el lock tiene que evitar los duplicados');
});

test('un fallo de Strava no propaga la excepcion', async () => {
  const viejo = new Date(Date.now() - 8 * 3600 * 1000).toISOString();
  const mocks = {
    './queries': { getSyncState: async () => ({ at: viejo }), setSyncState: async () => {} },
    './strava': { isConnected: async () => true },
    './sync': { syncRecent: async () => { throw new Error('Strava 500'); } },
  };
  const a = freshAutosync(mocks);
  // Si propagara, esto tumbaria el proceso con unhandled rejection.
  await withMocks(mocks, async () => { a.maybeSync(); await sleep(80); });
  assert.ok(true, 'no explotó');
});

test('el middleware llama a next() sin esperar la sync', async () => {
  const viejo = new Date(Date.now() - 8 * 3600 * 1000).toISOString();
  const mocks = {
    './queries': { getSyncState: async () => ({ at: viejo }), setSyncState: async () => {} },
    './strava': { isConnected: async () => true },
    './sync': { syncRecent: async () => { await sleep(500); return {}; } },
  };
  const a = freshAutosync(mocks);
  await withMocks(mocks, async () => {
    const t0 = Date.now();
    let called = false;
    a.autosyncMiddleware({}, {}, () => { called = true; });
    const dt = Date.now() - t0;
    assert.equal(called, true, 'next() tiene que llamarse ya');
    assert.ok(dt < 50, 'no puede bloquear: tardó ' + dt + 'ms');
    await sleep(20);
  });
});
