const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const ts = require("typescript");

const read = (file) => fs.readFileSync(path.join(__dirname, "..", file), "utf8");

test("Maria safely detects whether the native speech module exists before loading it", () => {
  const source = read("lib/salon/mariaSpeechRecognition.native.ts");
  assert.match(source, /requireOptionalNativeModule<MariaSpeechRecognitionModule>/);
  assert.match(source, /if \(!requireOptionalNativeModule/);
  assert.match(source, /require\("expo-speech-recognition"\)/);
});

test("Needs Attention is one compact horizontal interactive row", () => {
  const source = read("components/salon/owner/DailyBriefing.tsx");
  assert.equal((source.match(/<Pressable/g) || []).length, 1);
  assert.match(source, /flexDirection: "row"/);
  assert.match(source, /numberOfLines=\{1\}/);
  assert.match(source, /notificationCount/);
});

test("Block Time keeps the black native button and supports save, edit, and delete", () => {
  const menu = read("components/salon/owner/BlockTimeMenu.tsx");
  const editor = read("components/salon/owner/BlockTimeEditor.tsx");
  const owner = read("components/salon/OwnerScreen.tsx");
  assert.match(menu, /backgroundColor: "#000000"/);
  assert.match(menu, /color="#FFFFFF"/);
  assert.match(editor, /db\(\)\.rpc\("lj_save_calendar_block"/);
  assert.match(editor, /label="Delete Block"/);
  assert.match(owner, /db\(\)\.rpc\("lj_delete_calendar_block"/);
  assert.match(owner, /setEditingBlock\(block\)/);
});

test("booking derives VIP icons only from the current weekday and start time", () => {
  const exports = {};
  vm.runInNewContext(
    ts.transpileModule(read("lib/salon/vipAccess.ts"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText,
    { exports },
  );
  const { shouldShowVipIcon } = exports;
  const slots = Array.from({ length: 64 }, (_, index) => 360 + index * 15);
  const time = (minutes) =>
    `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

  for (const day of [2, 3, 4, 5, 6, 0, 1, 5, 0, 2, 1, 6, 3]) {
    for (const minute of slots) {
      const expected = day === 0 || day === 1 || minute <= 585 || minute >= 1080;
      assert.equal(shouldShowVipIcon(day, time(minute)), expected, `day ${day} at ${time(minute)}`);
    }
  }

  const source = read("components/salon/BookingScreen.tsx");
  assert.match(source, /Array\.from\(\{ length: 64 \}/);
  assert.match(source, /const minute = 360 \+ index \* 15/);
  assert.match(source, /const showVipIcon = shouldShowVipIcon\(dayOfWeek, time\)/);
  assert.match(source, /showVipIcon \? ", VIP time" : vip \? `, \$\{percentage\} percent surcharge applies`/);
  assert.doesNotMatch(source, /VIP plus \$\{percentage\} percent/);
  assert.match(source, /key=\{`\$\{date\}-\$\{timeValue\}`\}/);
  assert.match(source, /slotGeneration\.current \+= 1/);
  assert.match(source, /setVipDraft\(null\)/);
  assert.match(source, /const vipCard = showVipIcon/);
  assert.match(source, /const regularBackground = theme\.name === "light" \? "#FFFFFF" : "#151515"/);
  assert.match(source, /const regularInk = theme\.name === "light" \? "#000000" : "#FFFFFF"/);
  assert.match(source, /const vipInk = "#24180F"/);
  assert.match(source, /height: 56/);
  assert.match(source, /hitSlop=\{6\}/);
  assert.doesNotMatch(source, /forceGold|outsideHours|goldVipStyle/);
});
