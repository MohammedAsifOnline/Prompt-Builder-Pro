
import { GoogleGenAI, Type } from "@google/genai";
import { GeminiResponse, PromptType } from '../types';

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    detectedLanguage: {
      type: Type.STRING,
      description: "The language detected from the user's input text.",
    },
    constructiveEnglishPrompt: {
      type: Type.STRING,
      description: "A refined, constructive, and polished prompt in English based on the user's core idea.",
    },
    translatedPrompt: {
      type: Type.STRING,
      description: "The translation of the constructive English prompt into the specified target language.",
    },
  },
  required: ["detectedLanguage", "constructiveEnglishPrompt", "translatedPrompt"],
};

const getSystemInstruction = (promptType: PromptType, targetLanguage: string): string => {
    const translationTask = targetLanguage === 'none'
        ? "Do not perform any translation. Set 'translatedPrompt' to empty string."
        : `Translate ONLY the generated constructive prompt into the target language (code: ${targetLanguage}).`;

    if (promptType === PromptType.CONSTRUCTIVE) {
        return `You are a world-class AI Prompt Engineer. Transform the user's idea into a structured prompt with Role, Objective, Context, and Instructions. Use deep reasoning to optimize.
        ${translationTask}`;
    }
    return `Create a polished, simple standard prompt.
    ${translationTask}`;
}

export const generatePromptAndTranslation = async (
  userInput: string,
  targetLanguage: string,
  promptType: PromptType,
): Promise<GeminiResponse> => {
  // Uses injected process.env.API_KEY from Vite config
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

  try {
    const systemInstruction = getSystemInstruction(promptType, targetLanguage);
    const contents = `User Idea: "${userInput}"\nTarget: "${targetLanguage}"`;

    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: contents,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.8,
        thinkingConfig: { thinkingBudget: 16384 }, // Enable reasoning
        maxOutputTokens: 20000, 
      },
    });

    return JSON.parse(response.text.trim()) as GeminiResponse;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("AI Reasoning failed. Check API Key or Connection.");
  }
};
