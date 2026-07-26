import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const load = (f) => JSON.parse(readFileSync(join(root, 'src/data', f), 'utf8'));
const words = [...load('words.json'), ...load('words2.json'), ...load('words3.json')];
const sentences = [...load('sentences.json'), ...load('sentences2.json'), ...load('sentences3.json')];
const scenarios = [...load('scenarios.json'), ...load('scenarios2.json'), ...load('scenarios3.json')];
const tonesets = load('tonesets.json');

const errors = [];
const cjk = (s) => [...s].filter((c) => /\p{Script=Han}/u.test(c));

// forbidden written-Chinese forms inside Cantonese teaching text (hanzi fields only)
const FORBIDDEN = ['的', '是', '沒有', '他', '她', '了', '這', '那', '給', '看', '吃', '說', '不', '在'];
// 「在」「不」 legit inside some compounds; whitelist compounds we allow
const ALLOW = ['而家', '唔', '現在', '不如', '不過', '利是'];

const wordIds = new Set(words.map((w) => w.id));
const dupW = words.length - wordIds.size;
if (dupW) errors.push(`duplicate word ids: ${dupW}`);

for (const s of sentences) {
  const chars = cjk(s.hanzi);
  const syls = s.jyutping.split(/\s+/);
  if (chars.length !== syls.length)
    errors.push(`${s.id}: hanzi CJK chars (${chars.length}) != jyutping syllables (${syls.length})`);
  for (const syl of syls) {
    if (!/^[a-z]+[1-6]$/.test(syl)) errors.push(`${s.id}: bad syllable "${syl}"`);
    const m = syl.match(/^([a-z]+?)([ptk])([1-6])$/);
    if (m && !['1', '3', '6'].includes(m[3]))
      errors.push(`${s.id}: checked syllable ${syl} must be tone 1/3/6`);
  }
  for (const f of FORBIDDEN) {
    if (s.hanzi.includes(f) && !ALLOW.some((a) => s.hanzi.includes(a) && a.includes(f)))
      errors.push(`${s.id}: forbidden written form 「${f}」 in "${s.hanzi}"`);
  }
  for (const v of s.vocab) if (!wordIds.has(v)) errors.push(`${s.id}: unknown vocab ref ${v}`);
  if (!s.audio.startsWith('/audio/sentences/')) errors.push(`${s.id}: bad audio path`);
}

for (const w of words) {
  const syls = w.jyutping.split(/\s+/);
  const tones = syls.map((x) => Number(x.match(/[1-6]$/)?.[0]));
  if (JSON.stringify(tones) !== JSON.stringify(w.tones))
    errors.push(`word ${w.id}: tones array ${JSON.stringify(w.tones)} != jyutping digits ${JSON.stringify(tones)}`);
  if (cjk(w.hanzi).length !== syls.length)
    errors.push(`word ${w.id}: hanzi/syllable count mismatch`);
  for (const syl of syls) {
    const m = syl.match(/^([a-z]+?)([ptk])([1-6])$/);
    if (m && !['1', '3', '6'].includes(m[3]))
      errors.push(`word ${w.id}: checked syllable ${syl} must be tone 1/3/6`);
  }
}

const sentIds = new Set(sentences.map((s) => s.id));
for (const sc of scenarios) {
  for (const sid of sc.sentences) if (!sentIds.has(sid)) errors.push(`scenario ${sc.id}: missing sentence ${sid}`);
  if (sc.sentences.length !== 8) errors.push(`scenario ${sc.id}: expected 8 sentences, got ${sc.sentences.length}`);
}

const used = new Set(sentences.flatMap((s) => s.vocab));
for (const w of words) if (!used.has(w.id)) errors.push(`word ${w.id}: unused`);

for (const set of tonesets) {
  const tones = set.items.map((i) => i.tone).sort().join('');
  if (tones !== '123456') errors.push(`toneset ${set.syllable}: tones not exactly 1-6`);
  for (const i of set.items)
    if (i.jyutping !== `${set.syllable}${i.tone}`) errors.push(`toneset ${set.syllable}: bad jyutping ${i.jyutping}`);
}


const basics = [...load('basics.json'), ...load('basics2.json')];
for (const g of basics) {
  for (const w of g.words) {
    const syls = w.jyutping.split(/\s+/);
    const tones = syls.map((x) => Number(x.match(/[1-6]$/)?.[0]));
    if (JSON.stringify(tones) !== JSON.stringify(w.tones)) errors.push(`basics ${w.id}: tones mismatch`);
    if (cjk(w.hanzi).length !== syls.length) errors.push(`basics ${w.id}: hanzi/syllable mismatch`);
    for (const syl of syls) {
      const m = syl.match(/^([a-z]+?)([ptk])([1-6])$/);
      if (m && !['1','3','6'].includes(m[3])) errors.push(`basics ${w.id}: checked syllable ${syl}`);
    }
  }
}
const pinyin = load('pinyin.json');
const pinItems = [...pinyin.initials, ...pinyin.finalGroups.flatMap((g) => g.items)];
for (const it of pinItems) {
  if (!/^[a-z]+[1-6]$/.test(it.jyutping)) errors.push(`pinyin ${it.jp}: bad jyutping ${it.jyutping}`);
  const m = it.jyutping.match(/^([a-z]+?)([ptk])([1-6])$/);
  if (m && !['1','3','6'].includes(m[3])) errors.push(`pinyin ${it.jp}: checked syllable ${it.jyutping}`);
  if (cjk(it.hanzi).length !== 1) errors.push(`pinyin ${it.jp}: example must be single char`);
}

if (errors.length) {
  console.error(`FAIL: ${errors.length} error(s)`);
  for (const e of errors) console.error(' - ' + e);
  process.exit(1);
}
console.log(
  `OK: ${words.length} words, ${basics.reduce((a,g)=>a+g.words.length,0)} basics, ${pinItems.length} pinyin items, ${sentences.length} sentences, ${scenarios.length} scenarios, ${tonesets.length} tone sets validated.`
);
