import { courses } from "../data/courses";
import { sentences, words as legacyWords } from "../data";
import type { Course, CoursePhrase, CourseWord } from "../types/course";

const staticAudio = new Map(
  sentences.map(sentence => [sentence.hanzi.replace(/[\s，。！？、；：]/g, ""), sentence.audio]),
);

export const resolvePhraseAudio = (phrase: CoursePhrase): string | undefined =>
  phrase.audio ?? staticAudio.get(phrase.hanzi.replace(/[\s，。！？、；：]/g, ""));

export interface ListeningDrill {
  id: string;
  courseId: string;
  courseTitle: string;
  phraseId: string;
  hanzi: string;
  jyutping: string;
  mandarin: string;
  audio?: string;
  options: string[];
  answer: string;
}

export interface PuzzleToken {
  text: string;
  jyutping: string;
}

export interface SentencePuzzleDrill {
  id: string;
  courseId: string;
  courseTitle: string;
  phraseId: string;
  hanzi: string;
  jyutping: string;
  mandarin: string;
  audio?: string;
  targetChunks: string[];
  shuffledChunks: string[];
  targetTokens: PuzzleToken[];
  shuffledTokens: PuzzleToken[];
}

const CORE_CANTONESE_LEXICON = [
  // 4-char & 3-char fixed patterns / A-not-A / idioms
  "唔好意思", "可唔可以", "得唔得閒", "係唔係呀", "好唔好呀", "使唔使呀", "知唔知道", "有冇問題",
  "一陣間見", "差唔多啦", "唔該借借", "唔該晒你", "多謝晒你", "好耐冇見", "出門口先", "出門口", "大一個碼", "細一個碼",
  "一個星期", "半個鐘頭", "一個鐘頭", "唔緊要啦", "冇問題嘅", "試身室", "着上身", "叫咩名", "幾多錢", "幾多號",
  "唔緊要", "唔該晒", "多謝晒", "得唔得", "係唔係", "好唔好", "使唔使", "知唔知", "去唔去", "食唔食",
  "飲唔飲", "買唔買", "睇唔睇", "要唔要", "想唔想", "啱唔啱", "夠唔夠", "貴唔貴", "平唔平", "遠唔遠",
  "近唔近", "辣唔辣", "凍唔凍", "熱唔熱", "忙唔忙", "難唔難", "易唔易", "得唔到", "見唔到", "聽唔到",
  "搵唔到", "買唔到", "去唔到", "食唔落", "瞓唔着", "記唔記得", "明唔明白", "清唔清楚", "方唔方便", "開唔開心",
  "中唔中意", "鍾唔鍾意", "歡唔歡迎", "習唔習慣", "緊唔緊張", "辛唔辛苦", "舒唔舒服", "安唔安全", "麻唔麻煩",
  "有啲緊", "有啲鬆", "有啲凍", "有啲熱", "有啲貴", "有啲累", "有啲攰", "有啲餓", "有啲渴", "有啲忙",
  "好得意", "好開心", "好中意", "好鍾意", "好方便", "好味道", "好抵食", "好塞車", "好多人", "好大風",
  // 2-char pronouns, demonstratives, interrogatives, time & adverbs
  "我哋", "你哋", "佢哋", "自己", "大家", "呢個", "呢件", "呢度", "呢啲", "呢間", "呢條", "呢張",
  "呢份", "呢隻", "呢架", "呢杯", "呢碗", "呢雙", "呢對", "呢次", "呢款", "呢種", "呢邊", "呢排",
  "嗰個", "嗰件", "嗰度", "嗰啲", "嗰間", "嗰條", "嗰張", "嗰隻", "嗰邊", "嗰次", "邊個", "邊度",
  "邊間", "邊條", "邊款", "邊種", "邊邊", "點樣", "點解", "點算", "幾多", "幾時", "幾點", "幾耐",
  "幾錢", "幾遠", "幾大", "幾好", "咩名", "咩事", "咩話", "乜嘢", "咩嘢", "邊啲", "咁早", "咁夜",
  "咁快", "咁慢", "咁多", "咁少", "咁耐", "咁好", "咁貴", "咁平", "咁遠", "咁近", "咁大", "咁細",
  "啱啱", "而家", "聽日", "今日", "尋日", "後日", "琴日", "今晚", "聽晚", "尋晚", "今朝", "聽朝",
  "下晝", "晏晝", "朝早", "夜晚", "平時", "最近", "一陣", "一齊", "少少", "有啲", "好似", "已經",
  "仲有", "仲未", "仲要", "仲係", "即刻", "馬上", "順便", "特登", "專登", "成日", "有時", "通常",
  "一般", "特別", "非常", "真係", "其實", "原來", "總共", "一共", "先至", "之後", "之前", "以前",
  "以後", "頭先", "跟住", "然後", "最後", "首先", "另外", "不過", "因為", "所以", "如果", "雖然",
  "或者", "不如", "定係", "抑或", "除咗", "關於", "對於", "根據", "按照",
  // Common 2-char verbs, modals, nouns, directional compounds
  "早晨", "早唞", "拜拜", "再見", "請問", "唔該", "多謝", "借過", "對唔住", "冇事", "有冇", "係咪",
  "可以", "需要", "唔使", "應該", "可能", "一定", "肯定", "準備", "開始", "完成", "結束", "繼續",
  "決定", "選擇", "考慮", "建議", "同意", "反對", "明白", "知道", "記得", "忘記", "覺得", "認為",
  "希望", "相信", "擔心", "緊張", "放心", "小心", "注意", "發現", "發覺", "習慣", "適應", "介紹",
  "認識", "聯絡", "通知", "確認", "預約", "取消", "改期", "遲到", "早退", "加班", "返工", "收工",
  "放工", "返學", "放學", "出門", "門口", "屋企", "食飯", "飲茶", "飲水", "飲嘢", "食嘢", "買嘢",
  "做嘢", "講嘢", "睇嘢", "搵嘢", "執嘢", "搬屋", "執屋", "洗衫", "煮飯", "煲湯", "買餸", "行街",
  "睇戲", "聽歌", "打波", "跑步", "游水", "行山", "散步", "休息", "瞓覺", "起身", "沖涼", "洗面",
  "刷牙", "換衫", "着衫", "除衫", "試衫", "買衫", "剪髮", "洗頭", "吹頭", "睇病", "食藥", "打針",
  "埋單", "找錢", "收錢", "俾錢", "畀錢", "碌卡", "轉賬", "過數", "入數", "提款", "存款", "開戶",
  "排隊", "等位", "訂位", "留位", "外賣", "堂食", "打包", "走冰", "少甜", "少冰", "走甜", "熱飲",
  "凍飲", "加底", "轉車", "搭車", "上車", "落車", "過海", "出站", "入站", "出口", "入口", "月台",
  "大堂", "客服", "入面", "出面", "上面", "下面", "後面", "前面", "對面", "隔離", "附近", "中間",
  "左邊", "右邊", "轉左", "轉右", "直行", "入嚟", "出嚟", "返嚟", "過嚟", "上嚟", "落嚟", "入去",
  "出去", "返去", "過去", "上去", "落去", "起嚟", "出咗", "入咗", "嚟咗", "去咗", "食咗", "飲咗",
  "買咗", "睇咗", "做咗", "寫咗", "講咗", "問咗", "訂咗", "約咗", "遲咗", "走咗", "完咗", "好咗",
  "到咗", "開咗", "關咗", "壞咗", "跌咗", "不見", "唔見", "搵到", "買到", "見到", "聽到", "收到",
  "去到", "回到", "返到", "一個", "兩個", "三個", "四個", "五個", "半個", "一位", "兩位", "三位",
  "四位", "一件", "兩件", "一杯", "兩杯", "一碗", "一碟", "一份", "一張", "一條", "一隻", "一架",
  "一間", "一齊", "一下", "一啲", "摸吓", "睇吓", "試吓", "問吓", "等吓", "坐吓", "行吓", "諗吓",
  "查吓", "聽吓", "聞吓", "幫手", "幫忙", "水果", "豆豆", "得意", "天氣", "時間", "地方", "問題",
  "辦法", "意見", "經驗", "電話", "號碼", "地址", "密碼", "賬號", "文件", "資料", "報告", "會議",
  "同事", "老細", "朋友", "屋企人", "鄰居", "師傅", "司機", "醫生", "姑娘", "先生", "小姐", "太太",
];

const SUFFIX_PARTICLES = new Set([
  "咗", "緊", "過", "晒", "完", "埋", "吓", "呀", "吖", "啦", "喇", "喎", "呢", "咩", "嗎", "啫", "囉", "嘅", "添",
]);

let cachedGlobalWords: string[] | null = null;
function getGlobalWords(): string[] {
  if (cachedGlobalWords) return cachedGlobalWords;
  const set = new Set<string>(CORE_CANTONESE_LEXICON);
  for (const course of courses) {
    for (const word of course.words) {
      const cleaned = word.hanzi.replace(/[\s，。！？、；：…（）,.!?]/g, "");
      if (cleaned.length >= 2 && cleaned.length <= 5) set.add(cleaned);
    }
  }
  for (const w of legacyWords) {
    const cleaned = w.hanzi.replace(/[\s，。！？、；：…（）,.!?]/g, "");
    if (cleaned.length >= 2 && cleaned.length <= 5) set.add(cleaned);
  }
  cachedGlobalWords = [...set].sort((a, b) => b.length - a.length);
  return cachedGlobalWords;
}

function stableHash(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function deterministicShuffle<T>(items: readonly T[], seedKey: string): T[] {
  const result = [...items];
  let seed = stableHash(seedKey) || 1;
  for (let i = result.length - 1; i > 0; i -= 1) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const j = seed % (i + 1);
    const temp = result[i]!;
    result[i] = result[j]!;
    result[j] = temp;
  }
  return result;
}

function segmentClause(clause: string, dictionary: string[]): string[] {
  const tokens: string[] = [];
  let index = 0;

  while (index < clause.length) {
    const matched = dictionary.find(word => clause.startsWith(word, index));
    if (matched) {
      tokens.push(matched);
      index += matched.length;
    } else {
      const char = clause[index]!;
      const prev = tokens[tokens.length - 1];
      if (prev && prev.length === 1 && SUFFIX_PARTICLES.has(char)) {
        tokens[tokens.length - 1] = `${prev}${char}`;
      } else {
        tokens.push(char);
      }
      index += 1;
    }
  }

  // Second pass within the same clause: attach trailing single-char sentence-final / aspect particles
  // to a preceding 1-char verb/word so chunks stay natural
  const refined: string[] = [];
  for (const token of tokens) {
    const prev = refined[refined.length - 1];
    if (
      token.length === 1 &&
      SUFFIX_PARTICLES.has(token) &&
      prev &&
      prev.length <= 2
    ) {
      refined[refined.length - 1] = `${prev}${token}`;
    } else {
      refined.push(token);
    }
  }
  return refined;
}

export function tokenizeCantonesePhrase(hanzi: string, courseWords: readonly CourseWord[] = []): string[] {
  const clauses = hanzi
    .split(/[\s，。！？、；：…「」『』（）,.!?]+/)
    .map(part => part.trim())
    .filter(Boolean);
  if (clauses.length === 0) return [];

  const localWords = courseWords
    .map(w => w.hanzi.replace(/[\s，。！？、；：…（）,.!?]/g, ""))
    .filter(w => w.length >= 2 && w.length <= 5);
  const dictionary = [...new Set([...localWords, ...getGlobalWords()])].sort((a, b) => b.length - a.length);

  // Keep track of clause boundaries so we prefer merging within the same clause first
  const clauseGroups = clauses.map(clause => segmentClause(clause, dictionary));
  const rawChunks = clauseGroups.flat();

  while (rawChunks.length < 3 && rawChunks.some(chunk => chunk.length >= 2)) {
    const longestIndex = rawChunks.reduce(
      (bestIdx, chunk, idx, arr) => (chunk.length > arr[bestIdx]!.length ? idx : bestIdx),
      0,
    );
    const target = rawChunks[longestIndex]!;
    const mid = Math.ceil(target.length / 2);
    rawChunks.splice(longestIndex, 1, target.slice(0, mid), target.slice(mid));
  }

  while (rawChunks.length > 7) {
    // Prefer merging a 1-char token with an adjacent 1- or 2-char token
    let mergeIdx = rawChunks.findIndex(
      (chunk, idx) => idx < rawChunks.length - 1 && (chunk.length === 1 || rawChunks[idx + 1]!.length === 1) && chunk.length + rawChunks[idx + 1]!.length <= 3,
    );
    if (mergeIdx === -1) {
      mergeIdx = rawChunks.findIndex(
        (chunk, idx) => idx < rawChunks.length - 1 && chunk.length + rawChunks[idx + 1]!.length <= 4,
      );
    }
    if (mergeIdx === -1) mergeIdx = rawChunks.length - 2;
    rawChunks.splice(mergeIdx, 2, `${rawChunks[mergeIdx]}${rawChunks[mergeIdx + 1]}`);
  }

  return rawChunks;
}

export function alignChunksWithJyutping(chunks: readonly string[], phraseJyutping: string): PuzzleToken[] {
  const syllables = phraseJyutping.trim().split(/\s+/).filter(Boolean);
  let cursor = 0;
  return chunks.map(text => {
    const charCount = [...text].filter(ch => /\p{Script=Han}/u.test(ch)).length || text.length;
    const slice = syllables.slice(cursor, cursor + charCount);
    cursor += charCount;
    return {
      text,
      jyutping: slice.join(" "),
    };
  });
}

export function buildListeningExercises(course: Course, limit = 6): ListeningDrill[] {
  const poolMandarin = [
    ...new Set([
      ...course.phrases.map(p => p.mandarin),
      ...courses.filter(c => c.topicId === course.topicId).flatMap(c => c.phrases.map(p => p.mandarin)),
      ...courses[0]!.phrases.map(p => p.mandarin),
    ]),
  ];

  return course.phrases.slice(0, limit).map(phrase => {
    const distractors = deterministicShuffle(
      poolMandarin.filter(item => item !== phrase.mandarin),
      `listen-distractors:${phrase.id}`,
    ).slice(0, 3);
    const options = deterministicShuffle([phrase.mandarin, ...distractors], `listen-options:${phrase.id}`);
    return {
      id: `listen:${phrase.id}`,
      courseId: course.id,
      courseTitle: course.title,
      phraseId: phrase.id,
      hanzi: phrase.hanzi,
      jyutping: phrase.jyutping,
      mandarin: phrase.mandarin,
      audio: resolvePhraseAudio(phrase),
      options,
      answer: phrase.mandarin,
    };
  });
}

export function buildSentencePuzzleExercises(course: Course, limit = 6): SentencePuzzleDrill[] {
  const candidates = course.phrases.filter(phrase => {
    const clean = phrase.hanzi.replace(/[\s，。！？、；：…]/g, "");
    return clean.length >= 4;
  });

  return candidates.slice(0, limit).map(phrase => {
    const targetChunks = tokenizeCantonesePhrase(phrase.hanzi, course.words);
    const targetTokens = alignChunksWithJyutping(targetChunks, phrase.jyutping);
    const indices = targetTokens.map((_, idx) => idx);
    let shuffledIndices = deterministicShuffle(indices, `puzzle:${phrase.id}`);
    if (
      shuffledIndices.length > 1 &&
      shuffledIndices.map(i => targetChunks[i]).join("|") === targetChunks.join("|")
    ) {
      shuffledIndices = [...shuffledIndices.slice(1), shuffledIndices[0]!];
    }
    const shuffledTokens = shuffledIndices.map(i => targetTokens[i]!);
    const shuffledChunks = shuffledTokens.map(t => t.text);

    return {
      id: `puzzle:${phrase.id}`,
      courseId: course.id,
      courseTitle: course.title,
      phraseId: phrase.id,
      hanzi: phrase.hanzi,
      jyutping: phrase.jyutping,
      mandarin: phrase.mandarin,
      audio: resolvePhraseAudio(phrase),
      targetChunks,
      shuffledChunks,
      targetTokens,
      shuffledTokens,
    };
  });
}
