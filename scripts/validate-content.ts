import { existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  basicsDecks,
  basicsWords,
  curriculumSourceBundle,
  manifest,
  patterns,
  pinyin,
  scenarios,
  sentences,
  tonesets,
  words,
} from '../src/domain/curriculum/registry';
import type { ToneNumber } from '../src/domain/curriculum/types';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const errors: string[] = [];
const cjkCharacters = (text: string): string[] =>
  [...text].filter((character) => /\p{Script=Han}/u.test(character));
const syllables = (jyutping: string): string[] => jyutping.trim().split(/\s+/);

function checkJyutping(
  owner: string,
  hanzi: string,
  jyutping: string,
  expectedTones?: readonly ToneNumber[]
): void {
  const characters = cjkCharacters(hanzi);
  const parsedSyllables = syllables(jyutping);
  if (characters.length !== parsedSyllables.length) {
    errors.push(
      `${owner}: hanzi CJK chars (${characters.length}) != jyutping syllables (${parsedSyllables.length})`
    );
  }

  const actualTones: number[] = [];
  for (const syllable of parsedSyllables) {
    if (!/^[a-z]+[1-6]$/.test(syllable)) {
      errors.push(`${owner}: bad syllable "${syllable}"`);
      continue;
    }
    actualTones.push(Number(syllable.at(-1)));
    const checked = syllable.match(/^([a-z]+?)([ptk])([1-6])$/);
    if (checked !== null && !['1', '3', '6'].includes(checked[3])) {
      errors.push(`${owner}: checked syllable ${syllable} must be tone 1/3/6`);
    }
  }

  if (
    expectedTones !== undefined &&
    (expectedTones.length !== actualTones.length ||
      expectedTones.some((tone, index) => tone !== actualTones[index]))
  ) {
    errors.push(
      `${owner}: tones array ${JSON.stringify(expectedTones)} != jyutping digits ${JSON.stringify(actualTones)}`
    );
  }
}

// Forbidden written-Mandarin forms inside Cantonese teaching text (sentence hanzi only).
const FORBIDDEN = ['的', '是', '沒有', '他', '她', '了', '這', '那', '給', '看', '吃', '說', '不', '在'];
const ALLOWED_COMPOUNDS = ['而家', '唔', '現在', '不如', '不過', '利是'];

function removeAllowedCompounds(text: string, forbidden: string): string {
  return ALLOWED_COMPOUNDS.filter((compound) => compound.includes(forbidden)).reduce(
    (remaining, compound) => remaining.split(compound).join(''),
    text
  );
}

for (const sentence of sentences) {
  checkJyutping(`sentence ${sentence.id}`, sentence.hanzi, sentence.jyutping);
  for (const forbidden of FORBIDDEN) {
    if (removeAllowedCompounds(sentence.hanzi, forbidden).includes(forbidden)) {
      errors.push(`sentence ${sentence.id}: forbidden written form 「${forbidden}」 in "${sentence.hanzi}"`);
    }
  }
}

for (const word of words) {
  checkJyutping(`word ${word.id}`, word.hanzi, word.jyutping, word.tones);
}
for (const word of basicsWords) {
  checkJyutping(`basics ${word.id}`, word.hanzi, word.jyutping, word.tones);
}
for (const set of tonesets) {
  const tones = set.items.map((item) => item.tone).sort((left, right) => left - right);
  if (tones.join('') !== '123456') {
    errors.push(`toneset ${set.syllable}: tones not exactly 1-6`);
  }
  for (const item of set.items) {
    checkJyutping(`toneset ${set.syllable} tone ${item.tone}`, item.hanzi, item.jyutping);
    if (item.jyutping !== `${set.syllable}${item.tone}`) {
      errors.push(`toneset ${set.syllable}: bad jyutping ${item.jyutping}`);
    }
  }
}
for (const item of pinyin.initials) {
  checkJyutping(`pinyin initial ${item.jp}`, item.hanzi, item.jyutping);
  if (cjkCharacters(item.hanzi).length !== 1) {
    errors.push(`pinyin initial ${item.jp}: example must be one CJK character`);
  }
}
for (const group of pinyin.finalGroups) {
  for (const item of group.items) {
    checkJyutping(`pinyin final ${item.jp}`, item.hanzi, item.jyutping);
    if (cjkCharacters(item.hanzi).length !== 1) {
      errors.push(`pinyin final ${item.jp}: example must be one CJK character`);
    }
  }
}
for (const pattern of patterns) {
  for (const [index, example] of pattern.examples.entries()) {
    checkJyutping(`pattern ${pattern.id}.examples[${index}]`, example.hanzi, example.jyutping);
  }
}

for (const scenario of scenarios) {
  if (scenario.sentences.length !== 8) {
    errors.push(`scenario ${scenario.id}: expected 8 sentences, got ${scenario.sentences.length}`);
  }
}

const usedWordIds = new Set(sentences.flatMap((sentence) => sentence.vocab));
for (const word of words) {
  if (!usedWordIds.has(word.id)) errors.push(`word ${word.id}: unused`);
}

interface AudioReference {
  owner: string;
  path: string;
  expectedPrefix: string;
  primary: boolean;
}

const audioReferences: AudioReference[] = [
  ...words.map((word) => ({
    owner: `word ${word.id}`,
    path: word.audio,
    expectedPrefix: '/audio/words/',
    primary: true,
  })),
  ...basicsWords.map((word) => ({
    owner: `basics ${word.id}`,
    path: word.audio,
    expectedPrefix: '/audio/basics/',
    primary: true,
  })),
  ...sentences.map((sentence) => ({
    owner: `sentence ${sentence.id}`,
    path: sentence.audio,
    expectedPrefix: '/audio/sentences/',
    primary: true,
  })),
  ...tonesets.flatMap((set) =>
    set.items.map((item) => ({
      owner: `toneset ${set.syllable} tone ${item.tone}`,
      path: item.audio,
      expectedPrefix: '/audio/tones/',
      primary: true,
    }))
  ),
  ...pinyin.initials.map((item) => ({
    owner: `pinyin initial ${item.jp}`,
    path: item.audio,
    expectedPrefix: '/audio/pinyin/',
    primary: true,
  })),
  ...pinyin.finalGroups.flatMap((group) =>
    group.items.map((item) => ({
      owner: `pinyin final ${item.jp}`,
      path: item.audio,
      expectedPrefix: '/audio/pinyin/',
      primary: true,
    }))
  ),
  ...patterns.flatMap((pattern) =>
    pattern.examples.map((example, index) => ({
      owner: `pattern ${pattern.id}.examples[${index}]`,
      path: example.audio,
      expectedPrefix: '/audio/sentences/',
      // Pattern examples intentionally reuse canonical sentence recordings.
      primary: false,
    }))
  ),
];

const primaryAudioOwners = new Map<string, string[]>();
for (const reference of audioReferences) {
  if (!reference.path.startsWith(reference.expectedPrefix)) {
    errors.push(
      `${reference.owner}: audio path "${reference.path}" must start with "${reference.expectedPrefix}"`
    );
  }
  const relativePath = reference.path.startsWith('/') ? reference.path.slice(1) : reference.path;
  if (!existsSync(join(root, 'public', relativePath))) {
    errors.push(`${reference.owner}: missing public asset "${reference.path}"`);
  }
  if (reference.primary) {
    const owners = primaryAudioOwners.get(reference.path) ?? [];
    owners.push(reference.owner);
    primaryAudioOwners.set(reference.path, owners);
  }
}
for (const [audioPath, owners] of primaryAudioOwners) {
  if (owners.length > 1) {
    errors.push(`suspicious duplicate audio path "${audioPath}" used by ${owners.join(', ')}`);
  }
}

const declaredSourceFiles = Object.values(manifest.sourceFiles).flat();
const declaredSet = new Set(declaredSourceFiles);
const dataDirectory = join(root, 'src', 'data');
const discoveredSourceFiles = readdirSync(dataDirectory)
  .filter((file) => file.endsWith('.json') && file !== 'curriculum.json')
  .sort();
for (const file of discoveredSourceFiles) {
  if (!declaredSet.has(file)) errors.push(`src/data/${file}: JSON source is not declared in curriculum.json`);
}
for (const file of declaredSourceFiles) {
  if (!discoveredSourceFiles.includes(file)) errors.push(`curriculum.json: declared source "${file}" is missing`);
}

const importedSourceFiles = [
  ...curriculumSourceBundle.words,
  ...curriculumSourceBundle.sentences,
  ...curriculumSourceBundle.scenarios,
  ...curriculumSourceBundle.basics,
  ...curriculumSourceBundle.tones,
  ...curriculumSourceBundle.pinyin,
  ...curriculumSourceBundle.path,
  ...curriculumSourceBundle.patterns,
].map((entry) => entry.file);
if (
  importedSourceFiles.length !== declaredSourceFiles.length ||
  importedSourceFiles.some((file) => !declaredSet.has(file))
) {
  errors.push('curriculum.json source list does not match the files imported by the runtime registry');
}

if (errors.length > 0) {
  console.error(`FAIL: ${errors.length} error(s)`);
  for (const error of errors) console.error(` - ${error}`);
  process.exitCode = 1;
} else {
  const pinyinItemCount =
    pinyin.initials.length + pinyin.finalGroups.reduce((total, group) => total + group.items.length, 0);
  console.log(
    `OK: curriculum schema ${manifest.schemaVersion}, content ${manifest.contentVersion}; ` +
      `${words.length} words, ${basicsWords.length} basics in ${basicsDecks.length} decks, ` +
      `${pinyinItemCount} pinyin items, ${sentences.length} sentences, ${scenarios.length} scenarios, ` +
      `${patterns.length} patterns, ${tonesets.length} tone sets, ${audioReferences.length} audio refs validated.`
  );
}
