import fs from "node:fs";
import path from "node:path";

const output = path.resolve("assets/salon/sounds");
const sampleRate = 44100;
const duration = 5;
const count = sampleRate * duration;
const presets = {
  "luxury-chime.wav": [
    [523.25, 0],
    [659.25, 0.42],
    [783.99, 0.84],
    [1046.5, 1.35],
  ],
  "crystal-sparkle.wav": [
    [1318.5, 0],
    [1568, 0.28],
    [2093, 0.62],
    [2637, 1.02],
    [2093, 1.5],
  ],
  "piano-melody.wav": [
    [261.63, 0],
    [329.63, 0.55],
    [392, 1.1],
    [523.25, 1.75],
    [392, 2.45],
    [659.25, 3.1],
  ],
  "celebration.wav": [
    [392, 0],
    [523.25, 0.32],
    [659.25, 0.64],
    [783.99, 0.96],
    [1046.5, 1.45],
    [1318.5, 2.15],
  ],
  "classic-bell.wav": [
    [659.25, 0],
    [659.25, 1.15],
    [783.99, 2.3],
  ],
  "luxury-cash-register.wav": [
    [880, 0],
    [1174.66, 0.16],
    [1396.91, 0.36],
    [1760, 0.62],
  ],
  "golden-coins.wav": [
    [1760, 0],
    [1396.91, 0.22],
    [2093, 0.48],
    [1568, 0.8],
    [2349.32, 1.12],
  ],
  "jackpot.wav": [
    [523.25, 0],
    [659.25, 0.28],
    [783.99, 0.56],
    [1046.5, 0.84],
    [1318.5, 1.25],
    [1568, 1.7],
  ],
  "elegant-success-chime.wav": [
    [440, 0],
    [554.37, 0.45],
    [659.25, 0.9],
    [880, 1.45],
  ],
  "digital-payment.wav": [
    [987.77, 0],
    [1318.5, 0.18],
    [1568, 0.42],
    [1975.53, 0.72],
  ],
};

for (const [filename, notes] of Object.entries(presets)) {
  const pcm = Buffer.alloc(count * 4);
  for (let i = 0; i < count; i++) {
    const time = i / sampleRate;
    let value = 0;
    for (const [frequency, start] of notes) {
      const age = time - start;
      if (age < 0 || age > 3.8) continue;
      const attack = Math.min(1, age / 0.012);
      const envelope = attack * Math.exp(-age * 1.35);
      value +=
        envelope *
        (Math.sin(2 * Math.PI * frequency * age) + 0.28 * Math.sin(4 * Math.PI * frequency * age));
    }
    const fade = time > 4.55 ? Math.max(0, (5 - time) / 0.45) : 1;
    const sample = Math.max(-1, Math.min(1, value * 0.18 * fade));
    const integer = Math.round(sample * 32767);
    pcm.writeInt16LE(integer, i * 4);
    pcm.writeInt16LE(integer, i * 4 + 2);
  }
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(2, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 4, 28);
  header.writeUInt16LE(4, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);
  fs.writeFileSync(path.join(output, filename), Buffer.concat([header, pcm]));
}
