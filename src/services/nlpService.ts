import { GoogleGenAI } from "@google/genai";
import { getMetrics, NLPMetrics } from "../lib/metrics";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface NLPResponse {
  normalized: string;
  inputTranslation: string;
  outputTranslation: string;
  explanation: {
    changes: string[];
    reasoning: string;
    posAnalysis: { token: string; pos: string; action: string }[];
  };
  metrics: NLPMetrics;
  styleTransfer?: {
    casual: { text: string; translation: string };
    polite: { text: string; translation: string };
    honorific: { text: string; translation: string };
  };
}

export async function processNLP(text: string): Promise<NLPResponse> {
  const prompt = `
    You are an advanced Japanese NLP System (JP-Norm++). 
    Perform a hybrid normalization pipeline on the following input.
    
    Input: "${text}"
    
    Pipeline Steps:
    1. Morphological Analysis: Identify tokens and parts of speech.
    2. Noise Detection: Identify phonetic distortions, character repetitions, and slang.
    3. Transformer Normalization: Convert to standard formal (Desu/Masu) Japanese.
    4. Dual Translation Layer: 
       - Translate the original noisy input to English (inputTranslation).
       - Translate the final normalized output to English (outputTranslation).
       - Ensure semantic consistency: Both translations should reflect the same core meaning, but the input translation should capture the casual/noisy nuance if applicable.
    5. Style Transfer: Generate casual, polite, and honorific versions, each with its own English translation.
    6. Explanation: Provide POS-based reasoning for each change.
    
    Return a JSON object with:
    - normalized: Standard formal Japanese.
    - inputTranslation: English translation of input.
    - outputTranslation: English translation of normalized output.
    - explanation: {
        changes: string[],
        reasoning: string,
        posAnalysis: { token: string, pos: string, action: string }[]
      }
    - confidence: A number between 0 and 1.
    - styleTransfer: { 
        casual: { text: string, translation: string }, 
        polite: { text: string, translation: string }, 
        honorific: { text: string, translation: string } 
      }
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const result = JSON.parse(response.text || "{}");
    
    // Calculate metrics locally for consistency
    const metrics = getMetrics(result.normalized, text, result.confidence || 0.95);

    return {
      ...result,
      metrics
    };
  } catch (error) {
    console.error("NLP Pipeline Error:", error);
    throw error;
  }
}

export async function batchProcessNLP(texts: string[]): Promise<NLPResponse[]> {
  return Promise.all(texts.map(text => processNLP(text)));
}
