import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface NormalizationResult {
  normalized: string;
  confidence: number;
  explanation: string;
  inputTranslation: string;
  outputTranslation: string;
}

export async function normalizeJapanese(text: string): Promise<NormalizationResult> {
  if (!text.trim()) {
    return { 
      normalized: "", 
      confidence: 0, 
      explanation: "No input provided.",
      inputTranslation: "",
      outputTranslation: ""
    };
  }

  const prompt = `
    You are an expert Japanese linguist and translator. 
    1. Normalize the following "noisy" or casual Japanese text into standard, formal Japanese (Desu/Masu style).
    2. Provide an English translation for the original "noisy" input.
    3. Provide an English translation for the normalized output.
    
    Input: "${text}"
    
    Provide the result in JSON format with the following fields:
    - normalized: The normalized Japanese text.
    - confidence: A number between 0 and 1 representing your confidence in the normalization.
    - explanation: A brief explanation of the changes made.
    - inputTranslation: English translation of the original input.
    - outputTranslation: English translation of the normalized output.
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
    return {
      normalized: result.normalized || text,
      confidence: result.confidence || 0.8,
      explanation: result.explanation || "Normalized using AI model.",
      inputTranslation: result.inputTranslation || "",
      outputTranslation: result.outputTranslation || "",
    };
  } catch (error) {
    console.error("Normalization error:", error);
    return {
      normalized: text,
      confidence: 0,
      explanation: "Error during normalization. Please try again.",
      inputTranslation: "",
      outputTranslation: "",
    };
  }
}
