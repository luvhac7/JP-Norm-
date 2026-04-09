import os
import json
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

# Configure Gemini
genai.configure(apiKey=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel('gemini-3-flash-preview')

async def normalize_text(text: str):
    prompt = f"""
    You are an advanced Japanese NLP System (JP-Norm++). 
    Perform a hybrid normalization pipeline on the following input extracted from social media.
    
    Input: "{text}"
    
    Pipeline Steps:
    1. Morphological Analysis: Identify tokens and parts of speech.
    2. Noise Detection: Identify phonetic distortions, character repetitions, and slang.
    3. Transformer Normalization: Convert to standard formal (Desu/Masu) Japanese.
    4. Dual Translation Layer: 
       - Translate the original noisy input to English (inputTranslation).
       - Translate the final normalized output to English (outputTranslation).
    5. Explanation: Provide POS-based reasoning for each change.
    
    Return a JSON object with:
    - original_text: The input text.
    - normalized_text: Standard formal Japanese.
    - translation_input_en: English translation of input.
    - translation_output_en: English translation of normalized output.
    - explanation: A string explaining the changes.
    - confidence_score: A number between 0 and 1.
    """

    try:
        response = model.generate_content(prompt, generation_config={"response_mime_type": "application/json"})
        return json.loads(response.text)
    except Exception as e:
        print(f"Normalization Error: {e}")
        return {{
            "original_text": text,
            "normalized_text": "Error during normalization",
            "translation_input_en": "Error",
            "translation_output_en": "Error",
            "explanation": str(e),
            "confidence_score": 0
        }}
