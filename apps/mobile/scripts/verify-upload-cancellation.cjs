const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');
const source = ts.transpileModule(fs.readFileSync('lib/salon/media/upload.web.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const flush = () => new Promise(resolve => setImmediate(resolve));
function setup({ deferredBlob = false, deferredPrevious = false, abortRejects = false } = {}) {
  let finishBlob, finishPrevious;
  const instances = [];
  class Upload {
    constructor(blob, options) { this.options = options; this.started = 0; this.aborted = []; instances.push(this); }
    findPreviousUploads() { return deferredPrevious ? new Promise(resolve => { finishPrevious = resolve; }) : Promise.resolve([{ uploadUrl: 'https://example.invalid/resume' }]); }
    resumeFromPreviousUpload(previous) { this.previous = previous; }
    start() { this.started++; }
    abort(terminate) { this.aborted.push(terminate); return abortRejects ? Promise.reject(new Error('Abort failed')) : Promise.resolve(); }
  }
  const exports = {};
  vm.runInNewContext(source, {
    exports, URL, Error,
    require(name) { assert.equal(name, 'tus-js-client'); return { Upload }; },
    fetch: async () => ({ blob: () => deferredBlob ? new Promise(resolve => { finishBlob = resolve; }) : Promise.resolve(new Blob(['test'])) }),
  });
  const controller = new AbortController();
  let outcome = 'pending';
  const promise = exports.uploadFile('https://example.invalid/storage/v1/object/lj-client-media/client/file.mp4', 'blob:test', 'video/mp4', {}, () => {}, controller.signal)
    .then(() => { outcome = 'success'; }, error => { outcome = error.message; });
  return { controller, instances, promise, outcome: () => outcome, finishBlob: () => finishBlob(new Blob(['test'])), finishPrevious: () => finishPrevious([]) };
}
test('successful upload resumes existing transfer and resolves', async () => {
  const h = setup(); await flush();
  assert.equal(h.instances[0].started, 1);
  assert.ok(h.instances[0].previous);
  h.instances[0].options.onSuccess(); await h.promise;
  assert.equal(h.outcome(), 'success');
  h.controller.abort(); assert.deepEqual(h.instances[0].aborted, []);
});
test('failed upload reports server error', async () => {
  const h = setup(); await flush();
  h.instances[0].options.onError(new Error('Network offline')); await h.promise;
  assert.equal(h.outcome(), 'Network offline');
});
test('cancelling an active upload settles without deleting its resumable data', async () => {
  const h = setup(); await flush(); h.controller.abort(); await flush();
  assert.match(h.outcome(), /paused|cancelled/i);
  assert.deepEqual(h.instances[0].aborted, [false]);
});
test('cancelling during previous-upload lookup cannot restart a transfer', async () => {
  const h = setup({ deferredPrevious: true }); await flush();
  h.controller.abort(); h.finishPrevious(); await flush();
  assert.equal(h.instances[0].started, 0);
  assert.match(h.outcome(), /paused|cancelled/i);
});
test('cancelling during local file reading cannot start an upload', async () => {
  const h = setup({ deferredBlob: true }); await flush();
  h.controller.abort(); h.finishBlob(); await flush();
  assert.equal(h.instances.length, 0);
  assert.match(h.outcome(), /paused|cancelled/i);
});
test('late success cannot overwrite cancellation', async () => {
  const h = setup(); await flush(); h.controller.abort();
  h.instances[0].options.onSuccess(); await flush();
  assert.match(h.outcome(), /paused|cancelled/i);
});

test('abort failures are handled without leaving the caller pending', async () => {
  const h = setup({ abortRejects: true }); await flush(); h.controller.abort(); await flush();
  assert.match(h.outcome(), /paused|cancelled/i);
});
