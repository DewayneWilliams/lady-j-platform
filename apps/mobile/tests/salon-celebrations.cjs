const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
require.extensions[".ts"] = (module, filename) => {
  module._compile(
    ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText,
    filename,
  );
};
const { createCelebrationAudio } = require("../lib/salon/celebrationAudio.ts");
const { dotsOnDate, activitiesOnDate } = require("../lib/salon/calendarActivity.ts");
const flush = () => new Promise((resolve) => setImmediate(resolve));
function rig(web = false) {
  const audible = new Set();
  const players = {};
  for (const id of ["service", "payment"]) {
    players[id] = {
      id,
      isLoaded: true,
      volume: 0.65,
      loop: false,
      starts: 0,
      seeks: [],
      play() {
        this.starts++;
        if (this.volume > 0) audible.add(id);
        assert(audible.size <= 1, "celebrations overlap");
      },
      pause() {
        audible.delete(id);
      },
      async seekTo(time) {
        this.seeks.push(time);
      },
    };
  }
  return { players, audible, audio: createCelebrationAudio(players, web) };
}
test("web primes silently from the tap; native never primes; successful events play once", async () => {
  for (const web of [true, false]) {
    const { players, audio } = rig(web);
    audio.prepare("service");
    audio.prepare("service");
    assert.equal(players.service.starts, web ? 1 : 0);
    if (web) assert.equal(players.service.volume, 0);
    audio.play("service", "appointment-1");
    await flush();
    assert.equal(players.service.volume, 0.9);
    assert.equal(players.service.loop, false);
    assert.deepEqual(players.service.seeks, [0]);
    audio.play("service", "appointment-1");
    await flush();
    assert.equal(players.service.starts, web ? 2 : 1);
    audio.dispose();
  }
});
test("a newer completion supersedes a delayed seek and payment replaces the fanfare without overlap", async () => {
  const { players, audible, audio } = rig();
  const waiting = [];
  players.service.seekTo = () => new Promise((resolve) => waiting.push(resolve));
  audio.play("service", "first");
  audio.play("service", "second");
  waiting[1]();
  await flush();
  assert.deepEqual([...audible], ["service"]);
  waiting[0]();
  await flush();
  assert.equal(players.service.starts, 1);
  audio.play("payment", "receipt");
  await flush();
  assert.deepEqual([...audible], ["payment"]);
  assert.equal(players.payment.volume, 0.65);
  audio.dispose();
  assert.equal(audible.size, 0);
});
test("backgrounding/unmount cancels queued playback; interrupted audio never rejects salon actions", async () => {
  const { players, audible, audio } = rig();
  let release;
  players.service.seekTo = () =>
    new Promise((resolve) => {
      release = resolve;
    });
  audio.play("service", "first");
  audio.setActive(false);
  release();
  await flush();
  assert.equal(audible.size, 0);
  audio.play("payment", "background");
  await flush();
  assert.equal(players.payment.starts, 0);
  audio.setActive(true);
  players.service.seekTo = async () => {
    throw Error("Interrupted");
  };
  assert.doesNotThrow(() => audio.play("service", "failed"));
  await flush();
  audio.dispose();
  audio.play("payment", "after-unmount");
  await flush();
  assert.equal(players.payment.starts, 0);
  audio.activate();
  audio.play("payment", "after-effect-reconnect");
  await flush();
  assert.equal(players.payment.starts, 1);
  audio.dispose();
});
test("slow decoding waits for preloaded audio and can be superseded", async () => {
  const { players, audio } = rig();
  players.service.isLoaded = false;
  audio.play("service", "slow");
  await flush();
  assert.equal(players.service.starts, 0);
  players.service.isLoaded = true;
  await new Promise((resolve) => setTimeout(resolve, 75));
  assert.equal(players.service.starts, 1);
  players.service.isLoaded = false;
  audio.play("service", "cancelled");
  audio.dispose();
  await new Promise((resolve) => setTimeout(resolve, 75));
  assert.equal(players.service.starts, 1);
});
test("appointment dot colors update after creation, rescheduling, completion, cancellation and deletion", () => {
  const day = "2026-10-20";
  const row = {
    id: "visit",
    kind: "appointment",
    status: "confirmed",
    starts_at: day + "T14:00:00Z",
    ends_at: day + "T15:00:00Z",
    services: [{ name: "Care" }],
  };
  assert.deepEqual(dotsOnDate([], day), []);
  assert.deepEqual(dotsOnDate([row, { ...row, id: "second" }], day), ["confirmed"]);
  const consult = { ...row, id: "consult", services: [{ name: "Consult" }] };
  assert.deepEqual(dotsOnDate([row, consult], day), ["confirmed", "consultation"]);
  assert.deepEqual(
    dotsOnDate(
      [{ ...row, starts_at: "2026-10-21T14:00:00Z", ends_at: "2026-10-21T15:00:00Z" }],
      day,
    ),
    [],
  );
  assert.deepEqual(dotsOnDate([{ ...row, status: "completed" }], day), ["confirmed"]);
  assert.deepEqual(dotsOnDate([{ ...row, status: "cancelled" }], day), []);
  assert.deepEqual(dotsOnDate([], day), []);
  const block = { ...row, kind: "block", block_reason: "vacation" };
  assert.deepEqual(dotsOnDate([block], day), []);
  assert.equal(activitiesOnDate([block], day).length, 1);
});
