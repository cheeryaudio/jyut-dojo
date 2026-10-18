import type { DeepLessonUnit } from "../types/learning";

export const deepLessons: DeepLessonUnit[] = [
  {
    id: "sound-system", level: 0, title: "聲母韻母", mandarin: "声母、韵母和入声", context: "先用五個短詞摸清粵拼點樣對應實際聲音。", goal: "讀得出常見拼法，認得入聲收尾。", capabilityIds: ["pronunciation.jyutping", "tone.checked"],
    phrases: [
      { id: "sound-1", hanzi: "巴士", jyutping: "baa1 si2", mandarin: "公交车", note: "aa 係長元音，嘴形保持打開。" },
      { id: "sound-2", hanzi: "發達", jyutping: "faat3 daat6", mandarin: "发达", note: "t 收尾要短促，唔好加元音。" },
      { id: "sound-3", hanzi: "屋", jyutping: "uk1", mandarin: "房子", note: "k 收尾只係截停氣流，唔爆破。" },
      { id: "sound-4", hanzi: "食", jyutping: "sik6", mandarin: "吃", note: "ik6 係低入聲，收尾要乾淨。" },
      { id: "sound-5", hanzi: "十", jyutping: "sap6", mandarin: "十", note: "p 收尾用雙唇合實，唔好讀成普通話 shi。" },
    ], pattern: "聲母 + 韻腹 + 收尾 + 聲調", patternNote: "入聲只會用第 1、3、6 聲。見到 p、t、k 收尾，就要短而實。", substitutions: ["baa1 → faat3", "uk1 → sik6", "sik6 → sap6"], rolePrompt: "逐個讀五個詞，每個詞之間停一秒。", transferPrompt: "見到一個新粵拼時，先圈出聲調，再睇有冇 p、t、k 收尾。", repairTip: "讀唔準時，先拆開聲母同韻母，再合返埋。",
  },
  {
    id: "core-particles", level: 0, title: "口語骨架", mandarin: "否定、疑问和语气词", context: "香港口語靠句尾助詞表達態度，唔係逐字由普通話搬過嚟。", goal: "用唔、冇、係咪同常用助詞砌基本句。", capabilityIds: ["pattern.core", "speaking.task"],
    phrases: [
      { id: "core-1", hanzi: "我唔係。", jyutping: "ngo5 m4 hai6.", mandarin: "我不是。", note: "唔用嚟否定動作或判斷。" },
      { id: "core-2", hanzi: "你去唔去呀？", jyutping: "nei5 heoi3 m4 heoi3 aa3?", mandarin: "你去不去？", note: "A 唔 A 係最常用選擇問法。" },
      { id: "core-3", hanzi: "佢哋嚟咗喇。", jyutping: "keoi5 dei6 lai4 zo2 laa3.", mandarin: "他们来了。", note: "咗講完成，喇提示新情況。" },
      { id: "core-4", hanzi: "有冇位呀？", jyutping: "jau5 mou5 wai2 aa3?", mandarin: "有位置吗？", note: "有冇係最常用嘅口語問法。" },
      { id: "core-5", hanzi: "得唔得㗎？", jyutping: "dak1 m4 dak1 gaa3?", mandarin: "行不行？", note: "㗎令問題帶有追問或確認語氣。" },
    ], pattern: "A 唔 A + 呀／㗎？", patternNote: "呀多數係中性提問；㗎通常想對方交代或確認。", substitutions: ["去唔去", "得唔得", "係咪", "有冇"], rolePrompt: "想像你約朋友食飯，用兩種問法問清楚。", transferPrompt: "將人物換成同事，將動作換成開會，再問一次。", repairTip: "唔肯定句尾助詞時，用呀做中性問題最穩陣。",
  },
  {
    id: "time-weather", level: 2, title: "時間同天氣", mandarin: "时间、日期与天气", context: "你同朋友約時間，但天氣可能令行程有變。", goal: "講時間、遲到、天氣同改期。", capabilityIds: ["vocabulary.daily", "listening.key-info", "speaking.task"],
    phrases: [
      { id: "time-1", hanzi: "聽日下晝三點見。", jyutping: "ting1 jat6 haa6 zau3 saam1 dim2 gin3.", mandarin: "明天下午三点见。", note: "聽日即係明日，下晝即係下午。" },
      { id: "time-2", hanzi: "今日好熱呀。", jyutping: "gam1 jat6 hou2 jit6 aa3.", mandarin: "今天很热。", note: "好加形容詞係常見程度表達。" },
      { id: "time-3", hanzi: "落雨喇，改聽日啦。", jyutping: "lok6 jyu5 laa3, goi2 ting1 jat6 laa1.", mandarin: "下雨了，改明天吧。", note: "喇講情況變化，啦用嚟提議。" },
      { id: "time-4", hanzi: "我遲十五分鐘。", jyutping: "ngo5 ci4 sap6 ng5 fan1 zung1.", mandarin: "我迟十五分钟。", note: "遲後面直接加時長。" },
      { id: "time-5", hanzi: "星期五得唔得閒？", jyutping: "sing1 kei4 ng5 dak1 m4 dak1 haan4?", mandarin: "星期五有空吗？", note: "得閒係有空，唔好逐字譯成有時間。" },
    ], pattern: "時間 + 得唔得閒？", patternNote: "先講日子，再問得唔得閒，對方容易捉到重點。", substitutions: ["聽日下晝", "星期五朝早", "今晚八點"], rolePrompt: "你會遲十五分鐘，打電話同朋友交代。", transferPrompt: "天氣突然轉差，提議改去第二日同另一個地點。", repairTip: "聽漏時間就問：你話幾點呀？",
  },
  {
    id: "home-delivery", level: 2, title: "住屋同送貨", mandarin: "住房、维修与快递", context: "快遞送到屋苑，同時屋企冷氣需要維修。", goal: "報地址、安排收件同講清楚維修問題。", capabilityIds: ["vocabulary.daily", "speaking.task", "listening.key-info"],
    phrases: [
      { id: "home-1", hanzi: "你好，我嚟攞件㗎。", jyutping: "nei5 hou2, ngo5 lai4 lo2 gin6 gaa3.", mandarin: "你好，我来取件。", note: "攞件係到管理處取件嘅自然講法。" },
      { id: "home-2", hanzi: "麻煩擺喺管理處。", jyutping: "maa4 faan4 baai2 hai2 gun2 lei5 cyu3.", mandarin: "麻烦放在管理处。", note: "麻煩放句首，要求會自然有禮。" },
      { id: "home-3", hanzi: "個冷氣壞咗。", jyutping: "go3 laang5 hei3 waai6 zo2.", mandarin: "空调坏了。", note: "香港通常講冷氣，唔講空調。" },
      { id: "home-4", hanzi: "幾時可以搵人整呀？", jyutping: "gei2 si4 ho2 ji5 wan2 jan4 zing2 aa3?", mandarin: "什么时候可以找人修？", note: "整喺呢度解維修。" },
      { id: "home-5", hanzi: "我住十二樓 A 室。", jyutping: "ngo5 zyu6 sap6 ji6 lau4 ei1 sat1.", mandarin: "我住十二楼 A 室。", note: "英文字母 A 通常讀 ei1。" },
    ], pattern: "麻煩 + 動作 + 地點", patternNote: "交代收件時，要一次講清楚物件、動作同位置。", substitutions: ["擺喺管理處", "送上十二樓", "聽日再送"], rolePrompt: "你唔喺屋企，叫速遞員擺低件貨。", transferPrompt: "管理處話唔可以代收，你改約聽日下晝。", repairTip: "地址聽唔清，就逐項確認樓層同室號。",
  },
  {
    id: "health", level: 2, title: "睇醫生買藥", mandarin: "就医与买药", context: "你去診所講症狀，再到藥房問食法。", goal: "講症狀、開始時間、敏感史同劑量。", capabilityIds: ["vocabulary.daily", "listening.key-info", "speaking.task"],
    phrases: [
      { id: "health-1", hanzi: "我喉嚨痛，仲有啲咳。", jyutping: "ngo5 hau4 lung4 tung3, zung6 jau5 di1 kat1.", mandarin: "我喉咙痛，还有点咳。", note: "有啲加症狀，語氣比較自然。" },
      { id: "health-2", hanzi: "尋晚開始發燒。", jyutping: "cam4 maan5 hoi1 ci2 faat3 siu1.", mandarin: "昨晚开始发烧。", note: "先講開始時間，醫護人員容易判斷。" },
      { id: "health-3", hanzi: "我對呢隻藥敏感。", jyutping: "ngo5 deoi3 ni1 zek3 joek6 man5 gam2.", mandarin: "我对这种药过敏。", note: "藥用量詞隻。" },
      { id: "health-4", hanzi: "一日食幾多次？", jyutping: "jat1 jat6 sik6 gei2 do1 ci3?", mandarin: "一天吃几次？", note: "問藥物次數通常講食幾多次。" },
      { id: "health-5", hanzi: "食完會唔會眼瞓？", jyutping: "sik6 jyun4 wui5 m4 wui5 ngaan5 fan3?", mandarin: "吃完会不会困？", note: "眼瞓即係睏。" },
    ], pattern: "時間 + 開始 + 症狀", patternNote: "症狀、持續時間、敏感史係三個最重要資訊。", substitutions: ["尋晚開始發燒", "今朝開始肚痛", "兩日前開始咳"], rolePrompt: "同醫生講兩個症狀同幾時開始。", transferPrompt: "拎藥時問清楚次數、飯前飯後同會唔會眼瞓。", repairTip: "聽唔明劑量，請對方寫低或者再講一次。",
  },
  {
    id: "work-basics", level: 2, title: "返工協作", mandarin: "工作安排与协作", context: "你要交代進度、確認要求同調整會議時間。", goal: "自然噉報進度、問要求同請假。", capabilityIds: ["pattern.core", "listening.key-info", "speaking.task"],
    phrases: [
      { id: "work-1", hanzi: "份文件我改好咗。", jyutping: "fan6 man4 gin6 ngo5 goi2 hou2 zo2.", mandarin: "文件我改好了。", note: "將份文件放前面，突出工作對象。" },
      { id: "work-2", hanzi: "呢部分要再確認。", jyutping: "ni1 bou6 fan6 jiu3 zoi3 kok3 jing6.", mandarin: "这部分要再确认。", note: "再確認比再看一下更具體。" },
      { id: "work-3", hanzi: "可唔可以聽朝傾？", jyutping: "ho2 m4 ho2 ji5 ting1 ziu1 king1?", mandarin: "可不可以明早谈？", note: "傾即係討論或聊。" },
      { id: "work-4", hanzi: "我今日想請半日假。", jyutping: "ngo5 gam1 jat6 soeng2 cing2 bun3 jat6 gaa3.", mandarin: "我今天想请半天假。", note: "想令要求冇咁硬。" },
      { id: "work-5", hanzi: "有問題即刻搵我。", jyutping: "jau5 man6 tai4 zik1 hak1 wan2 ngo5.", mandarin: "有问题马上找我。", note: "即刻係立即，搵我係聯絡我。" },
    ], pattern: "工作項目 + 我 + 完成狀態", patternNote: "先講項目，再講做成點，進度會清楚好多。", substitutions: ["份文件我改好咗", "封電郵我覆咗", "個數我確認咗"], rolePrompt: "用三句交代完成咗咩、仲欠咩、幾時再傾。", transferPrompt: "會議撞時間，提出另一個時間，再確認對方得唔得。", repairTip: "要求唔清楚就問：你想我幾時交呀？",
  },
  {
    id: "storytelling", level: 3, title: "講返件事", mandarin: "叙述经历", context: "朋友問你上星期去長洲玩成點。", goal: "用開始、轉折同結果講一段完整經歷。", capabilityIds: ["speaking.narrative", "pattern.core", "listening.key-info"],
    phrases: [
      { id: "story-1", hanzi: "上個星期我去咗長洲。", jyutping: "soeng6 go3 sing1 kei4 ngo5 heoi3 zo2 coeng4 zau1.", mandarin: "上星期我去了长洲。", note: "第一句先交代時間同地點。" },
      { id: "story-2", hanzi: "一開始落好大雨。", jyutping: "jat1 hoi1 ci2 lok6 hou2 daai6 jyu5.", mandarin: "一开始下很大雨。", note: "一開始用嚟開事件順序。" },
      { id: "story-3", hanzi: "所以我哋入咗間餐廳。", jyutping: "so2 ji5 ngo5 dei6 jap6 zo2 gaan1 caan1 teng1.", mandarin: "所以我们进了一家餐厅。", note: "所以帶出結果。" },
      { id: "story-4", hanzi: "後尾天氣好返。", jyutping: "hau6 mei5 tin1 hei3 hou2 faan1.", mandarin: "后来天气转好了。", note: "後尾係口語嘅後來。" },
      { id: "story-5", hanzi: "最後我哋睇到日落。", jyutping: "zeoi3 hau6 ngo5 dei6 tai2 dou2 jat6 lok6.", mandarin: "最后我们看到了日落。", note: "最後收束件事。" },
    ], pattern: "先交代背景 → 一開始 → 所以／不過 → 後尾 → 最後", patternNote: "連接詞唔使多，但每句要推件事向前。", substitutions: ["上個星期", "噚日放工之後", "今朝返工嗰陣"], rolePrompt: "用五個連接點講一次出行經歷。", transferPrompt: "換成一次返工遲到經歷，講清楚原因同結果。", repairTip: "講到一半卡住，可以用後尾點呀？重新接返時間線。",
  },
  {
    id: "opinions", level: 3, title: "講睇法", mandarin: "表达意见与比较", context: "你同朋友揀餐廳，大家意見唔完全一樣。", goal: "比較選擇、表達保留同提出替代方案。", capabilityIds: ["speaking.opinion", "pattern.core", "speaking.task"],
    phrases: [
      { id: "opinion-1", hanzi: "我覺得呢個方便啲。", jyutping: "ngo5 gok3 dak1 ni1 go3 fong1 bin6 di1.", mandarin: "我觉得这个方便一点。", note: "我覺得係安全自然嘅開場。" },
      { id: "opinion-2", hanzi: "兩個我都鍾意。", jyutping: "loeng5 go3 ngo5 dou1 zung1 ji3.", mandarin: "两个我都喜欢。", note: "都放喺動詞前面。" },
      { id: "opinion-3", hanzi: "如果平啲就更好。", jyutping: "jyu4 gwo2 peng4 di1 zau6 gang3 hou2.", mandarin: "如果便宜点就更好。", note: "如果加就構成條件。" },
      { id: "opinion-4", hanzi: "我明你意思，不過我有少少保留。", jyutping: "ngo5 ming4 nei5 ji3 si1, bat1 gwo3 ngo5 jau5 siu2 siu2 bou2 lau4.", mandarin: "我明白你的意思，不过我有点保留。", note: "先承接對方，再講不同意見。" },
      { id: "opinion-5", hanzi: "不如揀第一個啦。", jyutping: "bat1 jyu4 gaan2 dai6 jat1 go3 laa1.", mandarin: "不如选第一个吧。", note: "不如用嚟提出方案。" },
    ], pattern: "我明你意思，不過……", patternNote: "先表示聽到對方，再講保留，語氣會合作好多。", substitutions: ["方便啲", "平啲", "近啲", "靜啲"], rolePrompt: "比較兩間餐廳，講一個優點、一個保留同最後選擇。", transferPrompt: "換成工作方案，禮貌噉不同意同提出另一個做法。", repairTip: "唔想直接拒絕，可以先講：等我諗一諗先。",
  },
  {
    id: "repair", level: 3, title: "聽唔明點算", mandarin: "澄清、改述与修补", context: "對方講得太快，你漏咗時間同出口資料。", goal: "主動要求重複、講慢同確認重點。", capabilityIds: ["speaking.repair", "listening.key-info", "speaking.task"],
    phrases: [
      { id: "repair-1", hanzi: "唔好意思，我聽唔明。", jyutping: "m4 hou2 ji3 si1, ngo5 teng1 m4 ming4.", mandarin: "不好意思，我听不懂。", note: "直接講聽唔明完全正常。" },
      { id: "repair-2", hanzi: "可唔可以講慢啲？", jyutping: "ho2 m4 ho2 ji5 gong2 maan6 di1?", mandarin: "可以说慢一点吗？", note: "講慢啲比慢慢說自然。" },
      { id: "repair-3", hanzi: "麻煩你再講一次。", jyutping: "maa4 faan4 nei5 zoi3 gong2 jat1 ci3.", mandarin: "麻烦再说一次。", note: "麻煩令請求更有禮。" },
      { id: "repair-4", hanzi: "你係話聽日下晝？", jyutping: "nei5 hai6 waa6 ting1 jat6 haa6 zau3?", mandarin: "你是说明天下午？", note: "重複已聽到部分，等對方確認。" },
      { id: "repair-5", hanzi: "即係喺 A 出口等？", jyutping: "zik1 hai6 hai2 ei1 ceot1 hau2 dang2?", mandarin: "也就是在 A 出口等？", note: "即係用嚟重述理解。" },
    ], pattern: "你係話 + 已聽到資訊？", patternNote: "唔使叫對方成句重講，先確認你捉到嘅部分。", substitutions: ["聽日下晝", "A 出口", "三點半", "中環站"], rolePrompt: "你只聽到地點，請對方再講時間，然後完整確認。", transferPrompt: "模擬電話訊號差，連續用兩種修補策略完成確認。", repairTip: "修補唔係失敗，而係真實對話必備能力。",
  },
  {
    id: "fast-speech", level: 4, title: "正常語速", mandarin: "连读、省音与语流", context: "香港人日常回應短、快，功能詞經常黐埋一齊。", goal: "捉實詞同意圖，唔逐粒音硬解。", capabilityIds: ["listening.fluency", "listening.key-info", "speaking.repair"],
    phrases: [
      { id: "fast-1", hanzi: "唔使急，慢慢講。", jyutping: "m4 sai2 gap1, maan6 maan6 gong2.", mandarin: "不用急，慢慢说。", note: "唔使通常連讀得好短。" },
      { id: "fast-2", hanzi: "我而家過緊嚟。", jyutping: "ngo5 ji4 gaa1 gwo3 gan2 lai4.", mandarin: "我现在正过来。", note: "緊表示動作進行中。" },
      { id: "fast-3", hanzi: "你等陣先啦。", jyutping: "nei5 dang2 zan6 sin1 laa1.", mandarin: "你先等一下。", note: "等陣係等一會，先啦令語氣自然。" },
      { id: "fast-4", hanzi: "嗰樣嘢仲有冇呀？", jyutping: "go2 joeng6 je5 zung6 jau5 mou5 aa3?", mandarin: "那个东西还有没有？", note: "樣嘢連讀時中間界線唔明顯。" },
      { id: "fast-5", hanzi: "得喇，我知點做。", jyutping: "dak1 laa3, ngo5 zi1 dim2 zou6.", mandarin: "行了，我知道怎么做。", note: "得喇可以表示收到、足夠或停止，要靠語境判斷。" },
    ], pattern: "先捉內容詞，再判斷句尾語氣", patternNote: "自然語速唔需要聽清每粒音，先捉人物、動作、時間同否定。", substitutions: ["而家", "過緊嚟", "等陣", "有冇", "得喇"], rolePrompt: "將五句先慢讀，再用自然速度連續讀。", transferPrompt: "只睇關鍵詞，用自己嘅話重述對方意圖。", repairTip: "漏一兩粒音唔使停，先用上下文估，再確認關鍵資訊。",
  },
  {
    id: "integrated-tasks", level: 4, title: "綜合任務", mandarin: "跨场景综合沟通", context: "同一個問題可能同時涉及預約、交通、收件同投訴。", goal: "跨場景提取資訊、提出要求同完成修補。", capabilityIds: ["listening.fluency", "speaking.task", "speaking.repair"],
    phrases: [
      { id: "integrated-1", hanzi: "我訂咗位，不過可能遲少少。", jyutping: "ngo5 deng6 zo2 wai2, bat1 gwo3 ho2 nang4 ci4 siu2 siu2.", mandarin: "我订了位，不过可能晚一点。", note: "先交代已有安排，再講變化。" },
      { id: "integrated-2", hanzi: "由呢度去中環使唔使轉車呀？", jyutping: "jau4 ni1 dou6 heoi3 zung1 waan4 sai2 m4 sai2 zyun2 ce1 aa3?", mandarin: "从这里去中环要不要换乘？", note: "使唔使用嚟問有冇必要。" },
      { id: "integrated-3", hanzi: "我收到件貨，但係入面爛咗。", jyutping: "ngo5 sau1 dou2 gin6 fo3, daan6 hai6 jap6 min6 laan6 zo2.", mandarin: "我收到货，但里面坏了。", note: "投訴先講事實，再講問題。" },
      { id: "integrated-4", hanzi: "我想改期，聽日下午得唔得？", jyutping: "ngo5 soeng2 goi2 kei4, ting1 jat6 haa6 zau3 dak1 m4 dak1?", mandarin: "我想改期，明天下午行吗？", note: "提出要求之後即刻畀替代時間。" },
      { id: "integrated-5", hanzi: "如果搵唔到我，麻煩擺管理處。", jyutping: "jyu4 gwo2 wan2 m4 dou2 ngo5, maa4 faan4 baai2 gun2 lei5 cyu3.", mandarin: "如果找不到我，麻烦放管理处。", note: "如果加處理方法，可以減少來回確認。" },
    ], pattern: "背景 + 問題 + 具體要求 + 確認", patternNote: "綜合任務要一次講清楚四層資訊，亦要預備修補。", substitutions: ["遲少少", "想改期", "入面爛咗", "擺管理處"], rolePrompt: "你訂咗位但會遲，打電話保留張枱同確認最遲到達時間。", transferPrompt: "件貨壞咗，向客服講事實、要求更換，再確認收件安排。", repairTip: "對方一次講太多，就逐項確認：時間先，跟住地點。",
  },
  {
    id: "fluency-check", level: 4, title: "流利度檢測", mandarin: "三至五分钟持续交流", context: "完成一段有背景、轉折、要求同修補嘅持續表達。", goal: "用分項證據睇理解、聲調、流暢、語用同修補能力。", capabilityIds: ["speaking.task", "speaking.repair", "speaking.narrative", "speaking.opinion", "listening.fluency"],
    phrases: [
      { id: "fluency-1", hanzi: "我想先講清楚成件事。", jyutping: "ngo5 soeng2 sin1 gong2 cing1 seng4 gin6 si6.", mandarin: "我想先把整件事说清楚。", note: "先設定表達框架。" },
      { id: "fluency-2", hanzi: "等我諗一諗先。", jyutping: "dang2 ngo5 nam2 jat1 nam2 sin1.", mandarin: "让我先想一想。", note: "自然爭取思考時間，唔使沉默。" },
      { id: "fluency-3", hanzi: "我唔係好同意，因為……", jyutping: "ngo5 m4 hai6 hou2 tung4 ji3, jan1 wai6……", mandarin: "我不太同意，因为……", note: "降低直接否定嘅衝擊。" },
      { id: "fluency-4", hanzi: "如果係我，我會……", jyutping: "jyu4 gwo2 hai6 ngo5, ngo5 wui5……", mandarin: "如果是我，我会……", note: "用假設提出做法。" },
      { id: "fluency-5", hanzi: "你明唔明我意思？", jyutping: "nei5 ming4 m4 ming4 ngo5 ji3 si1?", mandarin: "你明白我的意思吗？", note: "主動檢查對方有冇跟到。" },
    ], pattern: "背景 → 問題 → 原因 → 做法 → 確認", patternNote: "流利唔係講得快，而係可以持續、有組織同識得修補。", substitutions: ["等我諗一諗", "我嘅意思係", "換句話講", "你明唔明"], rolePrompt: "揀一個生活問題，連續講三分鐘，中途最少用一次思考策略。", transferPrompt: "模擬對方唔同意，你要回應、解釋同確認最後安排。", repairTip: "卡住時用已學框架接續，唔好轉返普通話。",
  },
  {
    id: "family-friends", level: 2, title: "家庭同朋友", mandarin: "介绍家人与朋友", context: "同新朋友介紹屋企人，再約對方一齊食飯。", goal: "講家庭關係、童年經歷同自然邀請。", capabilityIds: ["vocabulary.daily", "speaking.task", "speaking.narrative"],
    phrases: [
      { id: "family-1", hanzi: "呢位係我家姐。", jyutping: "ni1 wai2 hai6 ngo5 gaa1 ze1.", mandarin: "这位是我姐姐。", note: "家姐係姐姐，細佬係弟弟。" },
      { id: "family-2", hanzi: "我哋細個成日一齊玩。", jyutping: "ngo5 dei6 sai3 go3 seng4 jat6 jat1 cai4 waan2.", mandarin: "我们小时候经常一起玩。", note: "細個即係年紀細嗰陣。" },
      { id: "family-3", hanzi: "你屋企有幾多人？", jyutping: "nei5 uk1 kei2 jau5 gei2 do1 jan4?", mandarin: "你家里有几个人？", note: "屋企可以指家或者家人。" },
      { id: "family-4", hanzi: "得閒過嚟食飯啦。", jyutping: "dak1 haan4 gwo3 lai4 sik6 faan6 laa1.", mandarin: "有空过来吃饭吧。", note: "過嚟即係去講者嗰邊。" },
      { id: "family-5", hanzi: "代我問你媽咪好吖。", jyutping: "doi6 ngo5 man6 nei5 maa1 mi4 hou2 aa1.", mandarin: "替我问候你妈妈。", note: "問某人好係自然口語問候。" },
    ], pattern: "呢位係我 + 關係／稱呼", patternNote: "介紹人時先講關係，再補一件共同經歷，對話容易接落去。", substitutions: ["家姐", "細佬", "朋友", "同事"], rolePrompt: "介紹一位家人或朋友，再講一件一齊做過嘅事。", transferPrompt: "換成公司聚會，介紹一位同事畀朋友識。", repairTip: "唔識親屬稱呼時，可以先講佢係我屋企人。",
  },
  {
    id: "takeaway-services", level: 2, title: "外賣同公共服務", mandarin: "外卖与公共服务", context: "你要叫外賣、安排送達，再到服務櫃位辦事。", goal: "問等候時間、交代送達方法同辦理基本服務。", capabilityIds: ["vocabulary.daily", "listening.key-info", "speaking.task"],
    phrases: [
      { id: "service-1", hanzi: "我想叫個外賣。", jyutping: "ngo5 soeng2 giu3 go3 ngoi6 maai6.", mandarin: "我想点外卖。", note: "叫外賣可以指落單或者叫送餐。" },
      { id: "service-2", hanzi: "送到大堂就得喇。", jyutping: "sung3 dou3 daai6 tong4 zau6 dak1 laa3.", mandarin: "送到大堂就可以了。", note: "就得喇表示咁樣已經足夠。" },
      { id: "service-3", hanzi: "大概要等幾耐？", jyutping: "daai6 koi3 jiu3 dang2 gei2 noi6?", mandarin: "大概要等多久？", note: "幾耐用嚟問時長。" },
      { id: "service-4", hanzi: "我想報失張八達通。", jyutping: "ngo5 soeng2 bou3 sat1 zoeng1 baat3 daat6 tung1.", mandarin: "我想挂失八达通。", note: "報失係申報遺失。" },
      { id: "service-5", hanzi: "呢張表點填呀？", jyutping: "ni1 zoeng1 biu2 dim2 tin4 aa3?", mandarin: "这张表怎么填？", note: "點加動詞用嚟問方法。" },
    ], pattern: "我想 + 辦理事項", patternNote: "先講想做咩，再問程序、時間同要帶咩文件。", substitutions: ["叫個外賣", "報失八達通", "申請證明", "交張表"], rolePrompt: "叫一份外賣，問幾耐送到，再交代放喺邊。", transferPrompt: "去服務櫃位報失物件，問清楚要填咩資料。", repairTip: "程序太多時，逐步問：跟住要做咩呀？",
  },
  {
    id: "money-services", level: 2, title: "銀行同付款", mandarin: "银行、转账与付款", context: "付款失敗，你要向職員講清楚情況。", goal: "問付款方法、開戶、提款同核對帳目。", capabilityIds: ["vocabulary.daily", "listening.key-info", "speaking.task"],
    phrases: [
      { id: "money-1", hanzi: "可唔可以用轉數快？", jyutping: "ho2 m4 ho2 ji5 jung6 zyun2 sou3 faai3?", mandarin: "可以用转数快吗？", note: "轉數快係香港常用即時轉帳系統。" },
      { id: "money-2", hanzi: "我想開個戶口。", jyutping: "ngo5 soeng2 hoi1 go3 wu6 hau2.", mandarin: "我想开账户。", note: "戶口係銀行帳戶。" },
      { id: "money-3", hanzi: "撳唔到錢。", jyutping: "gam6 m4 dou2 cin2.", mandarin: "取不出钱。", note: "撳錢即係用提款機提款。" },
      { id: "money-4", hanzi: "呢筆數好似唔啱。", jyutping: "ni1 bat1 sou3 hou2 ci5 m4 ngaam1.", mandarin: "这笔账好像不对。", note: "筆數可以指一筆款項或帳目。" },
      { id: "money-5", hanzi: "麻煩幫我查下。", jyutping: "maa4 faan4 bong1 ngo5 caa4 haa5.", mandarin: "麻烦帮我查一下。", note: "查下語氣比直接叫人查柔和。" },
    ], pattern: "情況 + 好似唔啱／做唔到", patternNote: "先講客觀情況，再請職員核對，避免一開始就責怪。", substitutions: ["撳唔到錢", "過唔到數", "張卡用唔到", "筆數唔啱"], rolePrompt: "提款失敗，向職員講現象同請佢核對。", transferPrompt: "付款後見到金額唔啱，禮貌提出同確認退款安排。", repairTip: "數字一定要逐位確認，尤其係小數點同日期。",
  },
  {
    id: "invitations", level: 3, title: "邀請同婉拒", mandarin: "邀请、接受与婉拒", context: "朋友約你食飯，但原本時間撞咗安排。", goal: "自然邀請、接受、拒絕同提出替代時間。", capabilityIds: ["speaking.opinion", "pattern.core", "speaking.task"],
    phrases: [
      { id: "invite-1", hanzi: "星期六一齊食飯吖？", jyutping: "sing1 kei4 luk6 jat1 cai4 sik6 faan6 aa1?", mandarin: "星期六一起吃饭吗？", note: "吖令邀請語氣輕鬆。" },
      { id: "invite-2", hanzi: "好呀，幾點見？", jyutping: "hou2 aa3, gei2 dim2 gin3?", mandarin: "好啊，几点见？", note: "接受之後即刻確認細節。" },
      { id: "invite-3", hanzi: "唔好意思，嗰日我唔得閒。", jyutping: "m4 hou2 ji3 si1, go2 jat6 ngo5 m4 dak1 haan4.", mandarin: "不好意思，那天我没空。", note: "先表示唔好意思，再講客觀限制。" },
      { id: "invite-4", hanzi: "下次再約吖。", jyutping: "haa6 ci3 zoi3 joek3 aa1.", mandarin: "下次再约。", note: "表達今次唔得，但仍然有意願。" },
      { id: "invite-5", hanzi: "不如改星期日？", jyutping: "bat1 jyu4 goi2 sing1 kei4 jat6?", mandarin: "不如改星期日？", note: "婉拒之後畀替代方案最自然。" },
    ], pattern: "唔好意思 + 限制 + 替代方案", patternNote: "拒絕唔需要長篇解釋，有替代方案就已經夠合作。", substitutions: ["嗰日唔得閒", "要返工", "已經有約", "改星期日"], rolePrompt: "婉拒一個星期六邀請，再提出星期日。", transferPrompt: "換成同事邀請開會，保留禮貌但講清楚可行時間。", repairTip: "未決定時可以講：我睇一睇先，再覆你。",
  },
  {
    id: "explanations", level: 3, title: "解釋原因", mandarin: "解释原因与结果", context: "你遲到咗，要講清楚發生咩事同點處理。", goal: "用因為、所以、其實同因果順序解釋。", capabilityIds: ["speaking.narrative", "pattern.core", "speaking.task"],
    phrases: [
      { id: "explain-1", hanzi: "因為架車壞咗，所以我遲到。", jyutping: "jan1 wai6 gaa3 ce1 waai6 zo2, so2 ji5 ngo5 ci4 dou3.", mandarin: "因为车坏了，所以我迟到。", note: "因為交代原因，所以帶出結果。" },
      { id: "explain-2", hanzi: "我噉做係想慳時間。", jyutping: "ngo5 gam2 zou6 hai6 soeng2 haan1 si4 gaan3.", mandarin: "我这样做是想省时间。", note: "噉做指前面提過嘅做法。" },
      { id: "explain-3", hanzi: "其實我一早講咗。", jyutping: "kei4 sat6 ngo5 jat1 zou2 gong2 zo2.", mandarin: "其实我早就说了。", note: "其實用嚟補充或修正對方理解。" },
      { id: "explain-4", hanzi: "問題出喺邊度？", jyutping: "man6 tai4 ceot1 hai2 bin1 dou6?", mandarin: "问题出在哪里？", note: "出喺用嚟指出問題來源。" },
      { id: "explain-5", hanzi: "等我由頭講一次。", jyutping: "dang2 ngo5 jau4 tau4 gong2 jat1 ci3.", mandarin: "让我从头说一次。", note: "對方誤會時重新建立順序。" },
    ], pattern: "因為 + 原因，所以 + 結果", patternNote: "原因同結果一人一句就夠，之後再補處理方法。", substitutions: ["架車壞咗", "落大雨", "收唔到訊息", "所以遲到"], rolePrompt: "解釋一次遲到，講原因、結果同補救方法。", transferPrompt: "換成工作延期，講清楚問題出處同新交付時間。", repairTip: "對方理解錯時，先講：唔係，我嘅意思係……",
  },
  {
    id: "voice-messages", level: 3, title: "電話同口訊", mandarin: "电话与语音留言", context: "你唔方便即時接電話，要用口訊交代。", goal: "留言、承諾回覆同確認已收到。", capabilityIds: ["listening.key-info", "speaking.repair", "speaking.task"],
    phrases: [
      { id: "voice-1", hanzi: "我而家唔方便聽電話。", jyutping: "ngo5 ji4 gaa1 m4 fong1 bin6 teng1 din6 waa2.", mandarin: "我现在不方便接电话。", note: "先講唔方便，再提供另一種聯絡方法。" },
      { id: "voice-2", hanzi: "你留言畀我啦。", jyutping: "nei5 lau4 jin4 bei2 ngo5 laa1.", mandarin: "你给我留言吧。", note: "留言畀我係日常電話用法。" },
      { id: "voice-3", hanzi: "我遲啲覆你。", jyutping: "ngo5 ci4 di1 fuk1 nei5.", mandarin: "我晚点回复你。", note: "遲啲係稍後，覆係回覆。" },
      { id: "voice-4", hanzi: "收到之後話我知。", jyutping: "sau1 dou2 zi1 hau6 waa6 ngo5 zi1.", mandarin: "收到后告诉我。", note: "話我知即係告訴我。" },
      { id: "voice-5", hanzi: "麻煩你留低個地址。", jyutping: "maa4 faan4 nei5 lau4 dai1 go3 dei6 zi2.", mandarin: "麻烦留下地址。", note: "留低個地址方便之後跟進。" },
    ], pattern: "而家唔方便 + 替代方法 + 幾時回覆", patternNote: "口訊要講邊個打嚟、想做咩、下一步同聯絡方法。", substitutions: ["留個口訊", "傳訊息畀我", "遲啲覆你", "留低地址"], rolePrompt: "錄一段二十秒口訊，講你係邊個、想做咩同回覆方法。", transferPrompt: "換成工作電話，留言交代截止時間同下一步。", repairTip: "電話訊號差就改用文字，再重複最重要數字。",
  },
  {
    id: "group-conversation", level: 3, title: "多人對話", mandarin: "多人对话与轮次", context: "幾個人一齊傾計，你要接入、補充同交還話輪。", goal: "自然加入多人對話而唔搶話。", capabilityIds: ["listening.fluency", "speaking.opinion", "speaking.task"],
    phrases: [
      { id: "group-1", hanzi: "你哋講到邊呀？", jyutping: "nei5 dei6 gong2 dou3 bin1 aa3?", mandarin: "你们说到哪里了？", note: "中途加入時先問進度。" },
      { id: "group-2", hanzi: "等佢講完先啦。", jyutping: "dang2 keoi5 gong2 jyun4 sin1 laa1.", mandarin: "先让他讲完吧。", note: "用嚟管理話輪，語氣唔硬。" },
      { id: "group-3", hanzi: "我想補充少少。", jyutping: "ngo5 soeng2 bou2 cung1 siu2 siu2.", mandarin: "我想补充一点。", note: "先講明想補充，其餘人容易畀位。" },
      { id: "group-4", hanzi: "不如逐個講。", jyutping: "bat1 jyu4 zuk6 go3 gong2.", mandarin: "不如一个个说。", note: "多人同時講時重整次序。" },
      { id: "group-5", hanzi: "大家仲有冇第二啲睇法？", jyutping: "daai6 gaa1 zung6 jau5 mou5 dai6 ji6 di1 tai2 faat3?", mandarin: "大家还有没有别的看法？", note: "主動將話輪交畀其餘人。" },
    ], pattern: "承接上一位 + 補充內容 + 交出話輪", patternNote: "多人對話要聽內容，亦要睇邊個準備接話。", substitutions: ["我想補充少少", "我同意呢點", "我有另一個睇法", "大家點睇"], rolePrompt: "模擬三人討論，你先承接，再補一點，最後問其餘人。", transferPrompt: "換成會議場合，用較正式語氣管理話輪。", repairTip: "漏咗前文先問講到邊，唔好假裝完全跟到。",
  },
  {
    id: "workplace-fluency", level: 4, title: "工作協作進階", mandarin: "自然工作协作", context: "會議中要對齊目標、分工、進度同下一步。", goal: "持續完成一輪自然工作協作。", capabilityIds: ["listening.fluency", "speaking.task", "speaking.opinion"],
    phrases: [
      { id: "workplus-1", hanzi: "我哋先對清楚個目標。", jyutping: "ngo5 dei6 sin1 deoi3 cing1 co2 go3 muk6 biu1.", mandarin: "我们先把目标对清楚。", note: "對清楚即係先確保大家理解一致。" },
      { id: "workplus-2", hanzi: "呢件事邊個跟開？", jyutping: "ni1 gin6 si6 bin1 go3 gan1 hoi1?", mandarin: "这件事一直是谁负责？", note: "跟開表示一直負責緊。" },
      { id: "workplus-3", hanzi: "我晏啲更新進度。", jyutping: "ngo5 aan3 di1 gang1 san1 zeon3 dou6.", mandarin: "我晚一点更新进度。", note: "晏啲即係稍後。" },
      { id: "workplus-4", hanzi: "如果冇問題就照做。", jyutping: "jyu4 gwo2 mou5 man6 tai4 zau6 ziu3 zou6.", mandarin: "如果没问题就照做。", note: "照做表示按現有方案執行。" },
      { id: "workplus-5", hanzi: "我總結返三點。", jyutping: "ngo5 zung2 git3 faan1 saam1 dim2.", mandarin: "我总结三点。", note: "總結返用嚟收束討論。" },
    ], pattern: "目標 → 分工 → 時間 → 確認 → 總結", patternNote: "工作流利度重點係資訊清楚同話輪完整，唔係用艱深詞。", substitutions: ["對一對目標", "邊個跟開", "更新進度", "總結返三點"], rolePrompt: "主持一段一分鐘工作更新，交代目標、進度同下一步。", transferPrompt: "對方提出異議，你要確認、調整分工再總結。", repairTip: "要求含糊就問交付物、時間同負責人三樣。",
  },
  {
    id: "social-smalltalk", level: 4, title: "社交寒暄", mandarin: "自然社交寒暄", context: "喺公司茶水間或者朋友聚會自然開話題。", goal: "由一句問候延伸成幾個話輪。", capabilityIds: ["listening.fluency", "speaking.task", "speaking.opinion"],
    phrases: [
      { id: "social-1", hanzi: "今日返工順唔順呀？", jyutping: "gam1 jat6 faan1 gung1 seon6 m4 seon6 aa3?", mandarin: "今天工作顺不顺？", note: "順唔順係輕鬆開場。" },
      { id: "social-2", hanzi: "最近忙唔忙呀？", jyutping: "zeoi3 gan6 mong4 m4 mong4 aa3?", mandarin: "最近忙不忙？", note: "用開放但唔私密嘅問題延伸。" },
      { id: "social-3", hanzi: "你食咗飯未呀？", jyutping: "nei5 sik6 zo2 faan6 mei6 aa3?", mandarin: "你吃饭了吗？", note: "香港常見日常寒暄。" },
      { id: "social-4", hanzi: "放假有咩搞呀？", jyutping: "fong3 gaa3 jau5 me1 gaau2 aa3?", mandarin: "放假有什么安排？", note: "有咩搞係有咩活動或安排。" },
      { id: "social-5", hanzi: "得閒一齊飲嘢。", jyutping: "dak1 haan4 jat1 cai4 jam2 je5.", mandarin: "有空一起喝点东西。", note: "飲嘢係泛指飲品，邀請感輕鬆。" },
    ], pattern: "安全話題 + 追問一點 + 分享自己 + 輕邀請", patternNote: "寒暄唔係連續盤問，每問一次都要畀少少自己資訊。", substitutions: ["返工順唔順", "最近忙唔忙", "放假有咩搞", "得閒飲嘢"], rolePrompt: "由天氣或者工作開場，完成四個來回。", transferPrompt: "換成第一次見嘅朋友，避開太私人問題再延伸對話。", repairTip: "話題完咗可以承接對方最後一個關鍵詞再問。",
  },
  {
    id: "public-announcements", level: 4, title: "廣播同公共資訊", mandarin: "广播与公共信息", context: "港鐵或街上廣播速度快，資訊只出現一兩次。", goal: "由廣播捉時間、地點、變更同指示。", capabilityIds: ["listening.fluency", "listening.key-info", "speaking.repair"],
    phrases: [
      { id: "public-1", hanzi: "下一班車三分鐘後到。", jyutping: "haa6 jat1 baan1 ce1 saam1 fan1 zung1 hau6 dou3.", mandarin: "下一班车三分钟后到。", note: "先捉數字同時間單位。" },
      { id: "public-2", hanzi: "前面路段有意外。", jyutping: "cin4 min6 lou6 dyun6 jau5 ji3 ngoi6.", mandarin: "前方路段有事故。", note: "意外喺交通語境即係事故。" },
      { id: "public-3", hanzi: "請由 B 出口離開。", jyutping: "cing2 jau4 bi1 ceot1 hau2 lei4 hoi1.", mandarin: "请从 B 出口离开。", note: "字母同出口係最重要資訊。" },
      { id: "public-4", hanzi: "服務暫停，請改搭巴士。", jyutping: "fuk6 mou6 zaam6 ting4, cing2 goi2 daap3 baa1 si2.", mandarin: "服务暂停，请改乘公交。", note: "改搭後面係替代交通方法。" },
      { id: "public-5", hanzi: "有需要請搵職員幫手。", jyutping: "jau5 seoi1 jiu3 cing2 wan2 zik1 jyun4 bong1 sau2.", mandarin: "有需要请找工作人员帮忙。", note: "搵職員幫手係常見求助方式。" },
    ], pattern: "變更原因 + 影響 + 替代指示", patternNote: "廣播先捉否定或暫停，再捉出口、時間同替代方案。", substitutions: ["三分鐘後", "B 出口", "服務暫停", "改搭巴士"], rolePrompt: "聽完五句，每句只講返最重要一項資訊。", transferPrompt: "模擬班次取消，向職員確認下一班同替代路線。", repairTip: "廣播聽漏可以睇電子顯示，再向職員確認關鍵字。",
  },
];

export const deepLessonById = new Map(deepLessons.map((unit) => [unit.id, unit]));
