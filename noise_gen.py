import random
import json
from typing import List, Dict

class AdvancedJapaneseNoiseGenerator:
    """
    Linguistically realistic noise generator for Japanese text.
    Simulates casual speech, slang, and phonetic distortions.
    """
    
    def __init__(self):
        self.phonetic_distortions = {
            "すごい": "すっごい",
            "本当に": "マジで",
            "とても": "めっちゃ",
            "いい": "ええ",
            "美味しい": "うまっ",
            "行く": "行こーぜ",
            "食べる": "食う",
            "お腹": "腹",
        }
        
        self.slang_expansion = {
            "です": ["っす", "だわ", "じゃん", "だよな"],
            "だ": ["じゃん", "だよ", "だね"],
            "ます": ["る", "ちゃう", "んす"],
            "ください": ["くだせぇ", "ちょーだい", "くれ"],
            "本当": ["マジ", "ガチ", "超"],
        }
        
        self.particles = ["は", "が", "を", "に", "へ", "と"]
        self.elongation_marks = ["ー", "〜", "っ", "！", "？"]

    def particle_dropping(self, text: string) -> str:
        """Simulates the dropping of particles in casual Japanese."""
        result = text
        for p in self.particles:
            if random.random() > 0.6:
                result = result.replace(p, "", 1)
        return result

    def inject_noise(self, text: str) -> str:
        """Main pipeline for noise injection."""
        noisy = text
        
        # 1. Particle Dropping
        noisy = self.particle_dropping(noisy)
        
        # 2. Phonetic Distortions
        for clean, distorted in self.phonetic_distortions.items():
            if random.random() > 0.5:
                noisy = noisy.replace(clean, distorted)
                
        # 3. Slang Replacement
        for clean, variants in self.slang_expansion.items():
            if random.random() > 0.5:
                variant = random.choice(variants)
                noisy = noisy.replace(clean, variant)
                
        # 4. Character Elongation
        if random.random() > 0.4:
            mark = random.choice(self.elongation_marks)
            count = random.randint(1, 3)
            if noisy.endswith("。"):
                noisy = noisy[:-1] + (mark * count)
            else:
                noisy += (mark * count)
                
        return noisy

if __name__ == "__main__":
    generator = AdvancedJapaneseNoiseGenerator()
    samples = [
        "今日は本当に天気がいいですね。",
        "駅まで歩いて行きましょう。",
        "この料理はとても美味しいです。",
    ]
    
    print("--- Noise Generation Test ---")
    for s in samples:
        print(f"Original: {s}")
        print(f"Noisy:    {generator.inject_noise(s)}")
        print("-" * 20)
