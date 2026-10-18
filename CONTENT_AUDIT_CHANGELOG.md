# Three-pass lesson-content audit

Audit date: 2026-07-21

## Scope

- 6 scenario introductions
- 60 Cantonese sentence records
- 166 linked vocabulary records after correction
- 466 Jyutping syllable instances across the sentences
- Mandarin glosses were checked for alignment but excluded from the register-failure scan because they are intentionally Mandarin

## Pass 1: register check

### Automatic-failure scan

The Cantonese teaching fields were scanned for `的`, `是`, `在`, `沒有`, and `他`.

Violations found: **none**.

The wider project substitution list was also checked, including `没`, `了`, `不`, `這`, `这`, `那`, `給`, `给`, `看`, `吃`, `說`, `说`, `一點`, and `一点`. No prohibited written-register form remains in a Cantonese sentence or vocabulary headword.

Words such as `請問`, `大概`, `如果`, and `明白` were retained. They are normal in spoken Hong Kong Cantonese and are not evidence of Mandarin sentence structure by themselves.

## Pass 2: Jyutping audit

Every syllable in all 60 sentences was rechecked against its linked word record. The validator now reconstructs each sentence from its ordered vocabulary records and checks both the Hanzi sequence and Jyutping sequence.

### Tone fix

| Record | Before | After | Reason |
|---|---|---|---|
| `cafe-05`, `dung3-ning2-caa4` | `凍檸茶 dung3 ning4 caa4` | `凍檸茶 dung3 ning2 caa4` | In the clipped cha chaan teng compound `檸茶`, `檸` takes the common changed tone 2. The lexical form in `檸檬` is `ning4`, but that is not the form used here. |

The vocabulary ID and future static audio path were changed from `dung3-ning4-caa4` to `dung3-ning2-caa4` so the filename cannot preserve the old error.

### Checked tones

The audit found 31 checked-syllable instances across the vocabulary records. The unique checked syllables are:

`baak6`, `daap3`, `dak1`, `fuk6`, `gaak3`, `gok3`, `jat1`, `jat6`, `jit6`, `jyut6`, `lok6`, `mat1`, `sat1`, `sik1`, `tit3`, `zek3`, `zik6`, `zoek3`.

Every one uses tone 1, 3, or 6. No checked-tone violation remains.

### Variant-sensitive syllables reviewed

- `凍檸茶`: `ning2` is used as the conservative-initial Jyutping form. `ling2` is widespread in Hong Kong because of n/l merger. The tone is 2 in either realization.
- `着得`: `zoek3 dak1` is retained for “wears/feels when worn.” `著` also has other readings in other senses, but `zoek3` is the contextual reading here.
- Telephone `喂`: `wai2` is retained. The attention-getting “hey” is normally `wai3`, which is a different use.
- `拜拜`: `baai1 baai3` is retained as the conventional changed-tone pronunciation of “bye-bye.”

Remaining tone uncertainty: **none**. The n/l choice in `ning2` versus `ling2` is a pronunciation variant, not a tone uncertainty.

## Pass 3: naturalness check

The following lines were replaced after reading each ten-line sequence as a Hong Kong interaction.

| ID | Before | Corrected | Reason |
|---|---|---|---|
| `cafe-03` | `我想要個菠蘿油。` | `唔該，我要個菠蘿油。` | Uses the compact, polite ordering pattern expected in a cha chaan teng. |
| `cafe-06` | `另外嗰杯要熱奶茶。` | `仲有一杯熱奶茶。` | Removes a translated-sounding “the other cup” construction and uses a natural add-on order. |
| `direction-02` | `你直行到前面個路口。` | `你一路直行，去到前面個路口。` | Adds the idiomatic route-giving rhythm `一路直行，去到...`. |
| `shopping-08` | `呢件最平可以幾多錢呀？` | `呢件最平幾錢呀？` | Replaces a stiff bargain question with the compact local form `幾錢`. |
| `mtr-08` | `到金鐘有好多人落車。` | `去到金鐘會有好多人落車㗎。` | Adds the natural prospective `會` and explanatory particle `㗎`. |
| `phone-05` | `我想問你聽日去唔去行街。` | `我想問你聽日去唔去行街呀。` | Adds the expected question particle in casual telephone speech. |
| `phone-07` | `下晝三點，喺旺角地鐵站等。` | `下晝三點，喺旺角地鐵站見啦。` | `見啦` answers `幾點見呀？` more directly and naturally than the bare verb `等`. |

The other 53 lines were retained after dialogue-level review. They use plausible local phrasing for their speaker and setting.

## Vocabulary and reference changes

Added or replaced records:

- `dung3-ning2-caa4` 凍檸茶
- `zung6-jau5` 仲有
- `jat1-bui1` 一杯
- `jat1-lou6` 一路
- `heoi3-dou3` 去到
- `gei2-cin2` 幾錢
- `wui5` 會

Removed records that became unused after rewriting:

- `dung3-ning4-caa4` 凍檸茶, incorrect tone in this compound
- `ling6-ngoi6` 另外
- `go2-bui1` 嗰杯
- `gei2-do1-cin2` 幾多錢
- `dang2` 等
- `ho2-ji5` 可以

All sentence references and audio paths were updated. No vocabulary record is now orphaned.

## Reference notes

- [粵典: 檸茶](https://words.hk/zidin/%E6%AA%B8%E8%8C%B6) records `ning2 caa4` and gives `凍檸茶 dung3 ning2 caa4`.
- [粵典: 凍](https://words.hk/zidin/%E5%87%8D) documents the common Hong Kong n/l-merged realization `ling2` in `凍檸茶` and gives `着 zoek3` in a clothing example.
- [粵典: 喂](https://words.hk/zidin/%E5%96%82) distinguishes telephone `wai2` from attention-getting `wai3`.
- [粵語審音配詞字庫: zoek3](https://humanum.arts.cuhk.edu.hk/Lexis/lexi-can/pho-rel.php?s1=z&s2=oek&s3=3) lists the contextual checked-tone reading.

## Final automated result

```text
Validated 166 words, 60 sentences, and 6 scenarios.
Unused vocabulary records: 0
Checked-tone violations: 0
Register automatic failures: 0
```
