/**
 * A simplified TypeScript implementation of the Japanese Noise Generator.
 * Mimics casual typing, slang, and script mixing.
 */

const SLANG_MAP: Record<string, string> = {
  "です": "っす",
  "だ": "じゃん",
  "あります": "あるわ",
  "ください": "くだせぇ",
  "本当": "マジ",
  "すごい": "すっごい",
  "とても": "めっちゃ",
  "いい": "ええ",
};

const VOWELS = "あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん";
const ELONGATION_MARKS = ["ー", "〜", "っ", "！"];

export function generateJapaneseNoise(text: string): string {
  let noisyText = text;

  // 1. Slang Replacement
  for (const [clean, noisy] of Object.entries(SLANG_MAP)) {
    if (Math.random() > 0.4) {
      noisyText = noisyText.replace(new RegExp(clean, 'g'), noisy);
    }
  }

  // 2. Vowel Elongation & Punctuation
  if (Math.random() > 0.5) {
    const lastChar = noisyText.slice(-1);
    if (VOWELS.includes(lastChar) || lastChar === "。" || lastChar === "！") {
      const mark = ELONGATION_MARKS[Math.floor(Math.random() * ELONGATION_MARKS.length)];
      if (noisyText.endsWith("。")) {
        noisyText = noisyText.slice(0, -1) + mark;
      } else {
        noisyText += mark;
      }
    }
  }

  // 3. Random Script Mixing (Simplified: some Kanji to Hiragana)
  // This is hard without a proper morphological analyzer, but we can do some common ones.
  const commonKanjiToHiragana: Record<string, string> = {
    "今日": "きょう",
    "明日": "あした",
    "昨日": "きのう",
    "天気": "てんき",
    "料理": "りょうり",
    "美味しい": "おいしい",
  };

  for (const [kanji, hiragana] of Object.entries(commonKanjiToHiragana)) {
    if (Math.random() > 0.6) {
      noisyText = noisyText.replace(new RegExp(kanji, 'g'), hiragana);
    }
  }

  return noisyText;
}
