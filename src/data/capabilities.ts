import type { CapabilityDomain } from "../types/learning";

export const capabilityCatalog: Record<string, { title: string; domain: CapabilityDomain; description: string }> = {
  "pronunciation.jyutping": { title: "粵拼拼讀", domain: "pronunciation", description: "由拼寫推到口形同讀音。" },
  "tone.checked": { title: "入聲辨讀", domain: "tone", description: "分清以 p、t、k 收尾嘅短促音節。" },
  "pattern.core": { title: "口語骨架", domain: "pattern", description: "使用否定、疑問同常用句尾助詞。" },
  "vocabulary.daily": { title: "生活詞彙", domain: "vocabulary", description: "提取香港生活高頻詞。" },
  "listening.key-info": { title: "捉關鍵資訊", domain: "listening", description: "由自然語流捉時間、地點、人物同意圖。" },
  "speaking.task": { title: "完成口語任務", domain: "speaking", description: "唔靠背稿都可以完成真實任務。" },
  "speaking.repair": { title: "對話修補", domain: "speaking", description: "聽唔明時要求重複、確認同改述。" },
  "speaking.narrative": { title: "連貫敘事", domain: "speaking", description: "按時間同因果講清楚一件事。" },
  "speaking.opinion": { title: "表達睇法", domain: "speaking", description: "比較、同意、保留同婉拒。" },
  "listening.fluency": { title: "自然語速", domain: "listening", description: "適應連讀、省音同短促回應。" },
};
