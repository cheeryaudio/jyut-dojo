import { access, mkdir, readFile, rename, rm, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";

const VOICE = "zh-HK-HiuMaanNeural";
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(SCRIPT_DIR, "..");
const PUBLIC_ROOT = path.resolve(PROJECT_ROOT, "public");

const readJson = async (relativePath) => JSON.parse(await readFile(path.resolve(PROJECT_ROOT, relativePath), "utf8"));

const [words, sentences, tones] = await Promise.all([
  readJson("src/data/words.json"),
  readJson("src/data/sentences.json"),
  readJson("src/data/tones.json"),
]);

const escapeXml = (value) => value
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&apos;");

const targetPathFor = (audioPath) => {
  const relativePath = audioPath.replace(/^\/+/, "");
  const targetPath = path.resolve(PUBLIC_ROOT, relativePath);
  if (!targetPath.startsWith(`${PUBLIC_ROOT}${path.sep}`)) {
    throw new Error(`Audio path escaped public directory: ${audioPath}`);
  }
  return targetPath;
};

const isCompleteFile = async (filePath) => {
  try {
    const file = await stat(filePath);
    return file.isFile() && file.size > 0;
  } catch {
    return false;
  }
};

const jobs = [
  ...words.map((word) => ({ id: `word:${word.id}`, text: word.hanzi, targetPath: targetPathFor(word.audio) })),
  ...sentences.map((sentence) => ({ id: `sentence:${sentence.id}`, text: sentence.hanzi, targetPath: targetPathFor(sentence.audio) })),
  ...tones.map((tone) => ({ id: `tone:${tone.id}`, text: tone.hanzi, targetPath: targetPathFor(tone.audio) })),
];

await mkdir(path.resolve(PUBLIC_ROOT, "audio", "words"), { recursive: true });
await mkdir(path.resolve(PUBLIC_ROOT, "audio", "sentences"), { recursive: true });
await mkdir(path.resolve(PUBLIC_ROOT, "audio", "tones"), { recursive: true });

const tts = new MsEdgeTTS();
await tts.setMetadata(VOICE, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

let generated = 0;
let skipped = 0;

try {
  for (const [index, job] of jobs.entries()) {
    if (await isCompleteFile(job.targetPath)) {
      skipped += 1;
      console.log(`[${index + 1}/${jobs.length}] skip ${job.id}`);
      continue;
    }

    const tempDirectory = path.resolve(PUBLIC_ROOT, "audio", `.tmp-${process.pid}-${index}`);
    await rm(tempDirectory, { recursive: true, force: true });
    await mkdir(tempDirectory, { recursive: true });

    try {
      const { audioFilePath } = await tts.toFile(tempDirectory, escapeXml(job.text));
      await mkdir(path.dirname(job.targetPath), { recursive: true });
      await access(audioFilePath);
      await rename(audioFilePath, job.targetPath);
      generated += 1;
      console.log(`[${index + 1}/${jobs.length}] wrote ${path.relative(PROJECT_ROOT, job.targetPath)}`);
    } finally {
      await rm(tempDirectory, { recursive: true, force: true });
    }
  }
} finally {
  tts.close();
}

console.log(`Audio complete: ${generated} generated, ${skipped} skipped, ${jobs.length} total.`);
