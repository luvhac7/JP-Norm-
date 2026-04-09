/**
 * JP-Norm++ Advanced Noise Generator
 * Linguistically realistic noise injection for Japanese text.
 */

const PHONETIC_DISTORTIONS: Record<string, string> = {
  "すごい": "すっごい",
  "本当に": "マジで",
  "とても": "めっちゃ",
  "いい": "ええ",
  "美味しい": "うまっ",
  "行く": "行こーぜ",
  "食べる": "食う",
  "お腹": "腹",
};

const SLANG_EXPANSION: Record<string, string[]> = {
  "です": ["っす", "だわ", "じゃん", "だよな"],
  "だ": ["じゃん", "だよ", "だね"],
  "ます": ["る", "ちゃう", "んす"],
  "ください": ["くだせぇ", "ちょーだい", "くれ"],
  "本当": ["マジ", "ガチ", "超"],
};

const PARTICLES = ["は", "が", "を", "に", "へ", "と"];

export function generateAdvancedNoise(text: string): string {
  let noisy = text;

  // 1. Particle Dropping (Simulate casual speech)
  PARTICLES.forEach(p => {
    if (Math.random() > 0.6) {
      noisy = noisy.replace(new RegExp(`([^\\s])${p}`, 'g'), '$1');
    }
  });

  // 2. Phonetic Distortions & Slang
  Object.entries(PHONETIC_DISTORTIONS).forEach(([clean, distorted]) => {
    if (Math.random() > 0.5) {
      noisy = noisy.replace(new RegExp(clean, 'g'), distorted);
    }
  });

  // 3. Morphological Slang Expansion
  Object.entries(SLANG_EXPANSION).forEach(([clean, variants]) => {
    if (Math.random() > 0.5) {
      const variant = variants[Math.floor(Math.random() * variants.length)];
      noisy = noisy.replace(new RegExp(clean, 'g'), variant);
    }
  });

  // 4. Character Repetition & Elongation
  if (Math.random() > 0.4) {
    const marks = ["ー", "〜", "っ", "！", "？"];
    const mark = marks[Math.floor(Math.random() * marks.length)];
    const count = Math.floor(Math.random() * 3) + 1;
    
    // Find a good place to insert (usually end of sentences or adjectives)
    if (noisy.endsWith("。")) {
      noisy = noisy.slice(0, -1) + mark.repeat(count);
    } else {
      noisy += mark.repeat(count);
    }
  }

  // 5. Random Grammar Breaking (Simplified)
  if (Math.random() > 0.8) {
    // Swap some segments if possible (very basic)
    const segments = noisy.split(/[、。]/);
    if (segments.length > 1) {
      const i = Math.floor(Math.random() * (segments.length - 1));
      [segments[i], segments[i+1]] = [segments[i+1], segments[i]];
      noisy = segments.join("、");
    }
  }

  return noisy;
}
