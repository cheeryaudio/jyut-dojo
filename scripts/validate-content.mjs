import { readFile, stat } from "node:fs/promises";

const readJson = async (relativePath) =>
  JSON.parse(await readFile(new URL(relativePath, import.meta.url), "utf8"));

const [words, sentences, scenarios, tones] = await Promise.all([
  readJson("../src/data/words.json"),
  readJson("../src/data/sentences.json"),
  readJson("../src/data/scenarios.json"),
  readJson("../src/data/tones.json"),
]);

const errors = [];
const requiredWordFields = ["id", "hanzi", "jyutping", "mandarin", "audio", "tones"];
const requiredSentenceFields = ["id", "words", "hanzi", "jyutping", "mandarin", "audio", "scenarioId"];
const forbiddenTeachingForms = ["他", "的", "在", "沒有", "没有", "了", "是", "不", "這", "这", "那", "給", "给", "看", "吃", "說", "说", "一點", "一点"];

const duplicateIds = (items) => {
  const seen = new Set();
  return items.map((item) => item.id).filter((id) => seen.has(id) || !seen.add(id));
};

for (const duplicate of duplicateIds(words)) errors.push(`Duplicate word id: ${duplicate}`);
for (const duplicate of duplicateIds(sentences)) errors.push(`Duplicate sentence id: ${duplicate}`);
for (const duplicate of duplicateIds(scenarios)) errors.push(`Duplicate scenario id: ${duplicate}`);
for (const duplicate of duplicateIds(tones)) errors.push(`Duplicate tone item id: ${duplicate}`);

const wordIds = new Set(words.map((word) => word.id));
const sentenceIds = new Set(sentences.map((sentence) => sentence.id));
const scenarioIds = new Set(scenarios.map((scenario) => scenario.id));
const referencedWordIds = new Set(sentences.flatMap((sentence) => sentence.words));
const wordById = new Map(words.map((word) => [word.id, word]));
const jyutpingSyllables = (value) => [...value.matchAll(/[a-z]+[1-6]/g)].map((match) => match[0]);
const teachingCharacters = (value) => value.replace(/[\s，。！？、,.!?]/g, "");
const validateAudioFile = async (item) => {
  try {
    const file = await stat(new URL(`../public${item.audio}`, import.meta.url));
    if (!file.isFile() || file.size === 0) errors.push(`${item.id} has an empty audio file`);
  } catch {
    errors.push(`${item.id} is missing its audio file`);
  }
};

for (const word of words) {
  for (const field of requiredWordFields) {
    if (!(field in word)) errors.push(`${word.id ?? "unknown word"} is missing ${field}`);
  }

  const writtenTones = [...word.jyutping.matchAll(/([1-6])/g)].map((match) => Number(match[1]));
  if (JSON.stringify(writtenTones) !== JSON.stringify(word.tones)) {
    errors.push(`${word.id} tones do not match its Jyutping`);
  }
  if (word.audio !== `/audio/words/${word.id}.mp3`) {
    errors.push(`${word.id} has a stale or noncanonical audio path`);
  }
  await validateAudioFile(word);

  const syllables = word.jyutping.split(/\s+/);
  for (const syllable of syllables) {
    const match = syllable.match(/^([a-z]+)([1-6])$/);
    if (match === null) {
      errors.push(`${word.id} has invalid Jyutping syllable: ${syllable}`);
      continue;
    }
    const [, body, toneText] = match;
    const tone = Number(toneText);
    if (/[ptk]$/.test(body) && ![1, 3, 6].includes(tone)) {
      errors.push(`${word.id} violates the checked-tone rule at ${syllable}`);
    }
  }

  for (const forbidden of forbiddenTeachingForms) {
    if (word.hanzi.includes(forbidden)) errors.push(`${word.id} contains non-colloquial teaching form: ${forbidden}`);
  }
}

for (const sentence of sentences) {
  for (const field of requiredSentenceFields) {
    if (!(field in sentence)) errors.push(`${sentence.id ?? "unknown sentence"} is missing ${field}`);
  }
  if (!scenarioIds.has(sentence.scenarioId)) errors.push(`${sentence.id} has unknown scenario ${sentence.scenarioId}`);
  if (sentence.audio !== `/audio/sentences/${sentence.id}.mp3`) {
    errors.push(`${sentence.id} has a stale or noncanonical audio path`);
  }
  await validateAudioFile(sentence);
  for (const wordId of sentence.words) {
    if (!wordIds.has(wordId)) errors.push(`${sentence.id} references unknown word ${wordId}`);
  }
  const linkedWords = sentence.words.map((wordId) => wordById.get(wordId)).filter(Boolean);
  const linkedJyutping = linkedWords.flatMap((word) => jyutpingSyllables(word.jyutping));
  const sentenceJyutping = jyutpingSyllables(sentence.jyutping);
  if (JSON.stringify(linkedJyutping) !== JSON.stringify(sentenceJyutping)) {
    errors.push(`${sentence.id} Jyutping does not match its ordered word records`);
  }
  const linkedHanzi = linkedWords.map((word) => word.hanzi).join("");
  if (linkedHanzi !== teachingCharacters(sentence.hanzi)) {
    errors.push(`${sentence.id} characters do not match its ordered word records`);
  }
  for (const forbidden of forbiddenTeachingForms) {
    if (sentence.hanzi.includes(forbidden)) errors.push(`${sentence.id} contains non-colloquial teaching form: ${forbidden}`);
  }
}

for (const wordId of wordIds) {
  if (!referencedWordIds.has(wordId)) errors.push(`Unused vocabulary record: ${wordId}`);
}

for (const tone of tones) {
  for (const field of ["id", "setId", "hanzi", "jyutping", "mandarin", "audio", "tone"]) {
    if (!(field in tone)) errors.push(`${tone.id ?? "unknown tone item"} is missing ${field}`);
  }
  if (!Number.isInteger(tone.tone) || tone.tone < 1 || tone.tone > 6) {
    errors.push(`${tone.id} has an invalid tone number`);
  }
  if (tone.jyutping !== tone.id || tone.audio !== `/audio/tones/${tone.id}.mp3`) {
    errors.push(`${tone.id} has a stale or noncanonical tone record`);
  }
  if (!tone.jyutping.endsWith(String(tone.tone))) {
    errors.push(`${tone.id} tone does not match its Jyutping`);
  }
  await validateAudioFile(tone);
}

const toneSets = new Map();
for (const tone of tones) {
  toneSets.set(tone.setId, [...(toneSets.get(tone.setId) ?? []), tone]);
}
for (const [setId, setItems] of toneSets) {
  const setTones = [...setItems].map((tone) => tone.tone).sort();
  if (JSON.stringify(setTones) !== JSON.stringify([1, 2, 3, 4, 5, 6])) {
    errors.push(`${setId} must contain one real word for each of the six tones`);
  }
}

if (scenarios.length !== 6) errors.push(`Expected 6 scenarios, found ${scenarios.length}`);
for (const scenario of scenarios) {
  for (const field of ["id", "title", "emoji", "intro", "sentences"]) {
    if (!(field in scenario)) errors.push(`${scenario.id ?? "unknown scenario"} is missing ${field}`);
  }
  for (const forbidden of forbiddenTeachingForms) {
    if (`${scenario.title}${scenario.intro}`.includes(forbidden)) {
      errors.push(`${scenario.id} metadata contains non-colloquial teaching form: ${forbidden}`);
    }
  }
  if (scenario.sentences.length !== 10) errors.push(`${scenario.id} must contain exactly 10 sentences`);
  for (const sentenceId of scenario.sentences) {
    if (!sentenceIds.has(sentenceId)) errors.push(`${scenario.id} references unknown sentence ${sentenceId}`);
  }
}

if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Validated ${words.length} words, ${sentences.length} sentences, ${scenarios.length} scenarios, and ${tones.length} tone items.`);
}
