# M1 Cantonese content self-review

## Coverage

The dataset contains six scenarios and exactly ten dialogue lines per scenario. Every line has Traditional Chinese, Jyutping with tone digits, a Mandarin gloss, a static audio path, and ordered links to vocabulary records. Every vocabulary record carries the same four learner-facing fields plus tone arrays.

## Authenticity review

The teaching lines were written from spoken Hong Kong Cantonese constructions rather than translated Mandarin syntax. High-frequency colloquial forms are used in context, including `係咪`, `唔係`, `喺`, `冇`, `咗`, `畀`, `啲`, `嗰`, `呢`, `乜嘢`, `邊度`, `而家`, `聽日`, `得閒`, `落車`, `埋單`, and sentence-final particles such as `呀`, `喇`, `㗎`, `咋`, `喎`, and `吖`.

The dialogues also preserve Hong Kong usage by scenario. Examples include `凍檸茶，少甜`, `個餐跟唔跟蛋`, `燈位`, `隔籬`, `試身室`, `平啲畀你`, `月台`, and `話你知`. The Mandarin glosses are deliberately translations for comprehension and are not used as source sentences.

## Jyutping and tone review

All teaching romanization uses Jyutping only and every syllable has a 1-6 digit suffix. Tone arrays are mechanically checked against the Jyutping digits. The validator also enforces that checked syllables ending in `-p`, `-t`, or `-k` use only tones 1, 3, or 6.

## Deliberate limits

Names are fictional and neutral. Audio files are not generated in M1 because the delivery protocol assigns the generation pipeline to M2. A native-speaker editorial pass is still recommended before recording production audio, especially for preferred particle choices and shop-specific phrasing, since natural Cantonese allows regional and speaker variation.
