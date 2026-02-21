
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
        : `Translate ONLY the generated constructive prompt into the target language (code: ${targetLanguage}). Keep the same Markdown structure in the translation.`;

    if (promptType === PromptType.CONSTRUCTIVE) {
        return `You are a world-class AI Prompt Engineer. Your task is to transform the user's raw idea into a highly structured, professional prompt using the following Constructive Prompt Model.
        
        The output MUST use Markdown headings (###) for the following sections:
        
        ### Role
        [Define a specific, expert persona for the AI to adopt]
        
        ### Context
        [Provide background information, the situation, and why this task is being performed]
        
        ### Task
        [Clearly and concisely state exactly what the AI needs to do]
        
        ### Constraints & Guidelines
        [List specific rules, tone, style, length, and what the AI MUST avoid]
        
        ### Output Format
        [Describe the structure, format, or layout of the final response]
        
        Use deep reasoning to optimize the prompt for maximum effectiveness.
        ${translationTask}`;
    }
    return `Create a polished, effective standard prompt. Use a clear structure with Markdown headings if appropriate to make it scannable.
    ${translationTask}`;
}

export const generatePromptAndTranslation = async (
  userInput: string,
  targetLanguage: string,
  promptType: PromptType,
): Promise<GeminiResponse> => {
  const apiKey = process.env.API_KEY;
  
  if (!apiKey || apiKey === "undefined" || apiKey === "") {
    throw new Error("API Key is missing. Ensure GEMINI_API_KEY is set in Hostinger and the app is re-built.");
  }

  // Creating a new instance right before making an API call to ensure it uses the most up-to-date key.
  const ai = new GoogleGenAI({ apiKey });

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
        thinkingConfig: { thinkingBudget: 16384 },
        maxOutputTokens: 20000, 
      },
    });

    const result = response.text;
    if (!result) {
      throw new Error("AI returned an empty response.");
    }
    
    return JSON.parse(result.trim()) as GeminiResponse;
  } catch (error) {
    console.error("Gemini API Error:", error);
    if (error instanceof Error) {
        if (error.message.includes("entity was not found")) {
            throw new Error("API Key issue: Project or model not found. Check billing status.");
        }
        throw error;
    }
    throw new Error("AI Reasoning failed. Check API Key or Connection.");
  }
};
