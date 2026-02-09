
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
      description: "A refined, constructive, and polished prompt in English based on the user's core idea. The format should match the requested prompt type (Standard or Constructive).",
    },
    translatedPrompt: {
      type: Type.STRING,
      description: "The translation of the constructive English prompt into the specified target language. If no translation is requested, this should be an empty string.",
    },
  },
  required: ["detectedLanguage", "constructiveEnglishPrompt", "translatedPrompt"],
};

const getSystemInstruction = (promptType: PromptType, targetLanguage: string): string => {
    const translationTask = targetLanguage === 'none'
        ? "4. Do not perform any translation. The 'translatedPrompt' field in the JSON output must be an empty string."
        : `4. Translate ONLY the generated constructive English prompt into the target language (code: ${targetLanguage}), ensuring the translation sounds natural and fluent, as a native speaker would say it.`;

    if (promptType === PromptType.CONSTRUCTIVE) {
        return `You are a world-class AI Prompt Engineer and multilingual creative assistant. Your goal is to transform a user's raw idea into a highly structured, constructive English prompt and then translate it if requested.
        
        Deeply analyze the user's intent, the desired tone, and the likely end-user of the prompt. Use your reasoning capabilities to fill in gaps and suggest the best AI personas.
        
        Tasks:
        1. Detect the input language of the user's idea.
        2. Analyze the core idea and its potential pitfalls or missing details.
        3. Generate a refined, constructive English prompt using the following Markdown format:
        ## **Role:**
        (Define the role the AI should assume for this task. Be specific.)
        ## **Objective:**
        (Clearly state the goal or outcome expected. Use actionable verbs.)
        ## **Context:**
        (Provide background, scenario, or constraints for the task to give the AI better grounding.)
        ## **Instructions:**
        ### **Instruction 1 :** (First actionable step based on user’s intent)
        ### **Instruction 2 :** (Second actionable step)
        ### **Instruction 3 :** (Third actionable step)
        ## **Notes:**
        - Add clarifications, assumptions, or constraints here.
        - Specify output format (e.g., Markdown, JSON, List).
        - Expand steps or notes if required for complexity.
        ${translationTask}
        Ensure your tone is clear, creative, and professional. The output must be a valid JSON object matching the provided schema.`;
    }

    return `You are an AI-powered multilingual creative assistant. Your goal is to transform a user's raw idea into a polished, standard English prompt and then translate it if requested.
    Tasks:
    1. Detect the input language of the user's idea.
    2. Understand and summarize the core idea.
    3. Generate a refined, simple, and actionable English prompt based on that idea.
    ${translationTask}
    Ensure your tone is clear, creative, and helpful. The output must be a valid JSON object matching the provided schema.`;
}


export const generatePromptAndTranslation = async (
  userInput: string,
  targetLanguage: string,
  promptType: PromptType,
): Promise<GeminiResponse> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

  try {
    const systemInstruction = getSystemInstruction(promptType, targetLanguage);
    const contents = targetLanguage === 'none'
      ? `User Idea: "${userInput}"`
      : `User Idea: "${userInput}"\nTarget Language: "${targetLanguage}"`;

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

    const jsonText = response.text;
    if (!jsonText) {
      throw new Error("AI returned an empty response.");
    }
    const parsedResponse = JSON.parse(jsonText.trim()) as GeminiResponse;
    return parsedResponse;
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    if (error instanceof Error) {
        throw new Error(`Failed to generate prompt: ${error.message}`);
    }
    throw new Error("An unknown error occurred while generating the prompt.");
  }
};
