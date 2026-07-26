// Batch-generate static mp3s with Microsoft Edge TTS (zh-HK voices).
// Requires the `edge-tts` CLI (pip install edge-tts); override binary via EDGE_TTS env.
// Idempotent: existing files are skipped.
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const run = promisify(execFile);
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const BIN = process.env.EDGE_TTS || 'edge-tts';
const VOICE = 'zh-HK-HiuMaanNeural';
const load = (f) => JSON.parse(readFileSync(join(root, 'src/data', f), 'utf8'));

const jobs = [];
for (const w of [...load('words.json'), ...load('words2.json'), ...load('words3.json')]) jobs.push({ text: w.hanzi, out: w.audio, rate: '-10%' });
for (const s of [...load('sentences.json'), ...load('sentences2.json'), ...load('sentences3.json')]) jobs.push({ text: s.hanzi, out: s.audio, rate: '-15%' });
for (const g of [...load('basics.json'), ...load('basics2.json')]) for (const w of g.words) jobs.push({ text: w.hanzi, out: w.audio, rate: '-10%' });
const MVOICE = 'zh-HK-WanLungNeural';
for (const s of [...load('sentences.json'), ...load('sentences2.json'), ...load('sentences3.json')])
  jobs.push({ text: s.hanzi, out: s.audio.replace('/sentences/', '/sentences-m/'), rate: '-15%', voice: MVOICE });
const pin = load('pinyin.json');
for (const it of [...pin.initials, ...pin.finalGroups.flatMap((g) => g.items)]) jobs.push({ text: it.hanzi, out: it.audio, rate: '-20%' });
for (const set of load('tonesets.json'))
  for (const i of set.items) jobs.push({ text: i.hanzi, out: i.audio, rate: '-20%' });

let done = 0, skipped = 0, failed = 0;
const queue = [...jobs];
async function worker() {
  while (queue.length) {
    const j = queue.shift();
    const path = join(root, 'public', j.out);
    if (existsSync(path)) { skipped++; continue; }
    mkdirSync(dirname(path), { recursive: true });
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await run(BIN, ['--voice', j.voice || VOICE, `--rate=${j.rate}`, '--text', j.text, '--write-media', path]);
        done++;
        break;
      } catch (e) {
        if (attempt === 3) { failed++; console.error(`FAILED ${j.out}: ${e.message}`); }
        else await new Promise((r) => setTimeout(r, 1500 * attempt));
      }
    }
    if ((done + skipped) % 20 === 0) console.log(`progress: ${done + skipped + failed}/${jobs.length}`);
  }
}
await Promise.all(Array.from({ length: 4 }, worker));
console.log(`Audio done: ${done} generated, ${skipped} skipped, ${failed} failed of ${jobs.length}.`);
process.exit(failed ? 1 : 0);
