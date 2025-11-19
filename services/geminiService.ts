import { GoogleGenAI, Type } from "@google/genai";
import { Difficulty, Question } from "../types";

// Initialize Gemini Client
// The API key is injected via process.env.API_KEY
const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("API Key not found in environment variables");
    throw new Error("API Key missing");
  }
  return new GoogleGenAI({ apiKey });
};

export const generateTopicSuggestions = async (baseInput: string): Promise<string[]> => {
  const ai = getAiClient();
  
  const basePrompt = baseInput.trim() 
    ? `Basierend auf dem Stichwort "${baseInput}", schlage 5 spezifische, lustige und kurze Quiz-Titel vor.` 
    : `Schlage 5 lustige, zufällige und kreative Quiz-Themen für eine Party vor.`;

  const prompt = `
    ${basePrompt}
    Die Titel sollten auf Deutsch sein, kurz (max 4-5 Wörter) und spannend klingen.
    Antworte nur mit einer JSON Liste von Strings.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
      },
    });

    const rawText = response.text;
    if (!rawText) return [];
    return JSON.parse(rawText) as string[];
  } catch (error) {
    console.error("Error generating topics:", error);
    return [];
  }
};

export const generateQuizCover = async (topic: string): Promise<string | null> => {
  const ai = getAiClient();
  
  try {
    const response = await ai.models.generateImages({
      model: 'imagen-4.0-generate-001',
      prompt: `A fun, vibrant, 3d cartoon-style illustration representing the quiz topic: "${topic}". Minimalist, colorful background, high quality, suitable for a game cover.`,
      config: {
        numberOfImages: 1,
        aspectRatio: '16:9',
        outputMimeType: 'image/jpeg',
      },
    });

    if (response.generatedImages && response.generatedImages.length > 0) {
      return response.generatedImages[0].image.imageBytes;
    }
    return null;
  } catch (error) {
    console.error("Error generating cover image:", error);
    return null; // Fail gracefully without image
  }
};

export const generateQuizQuestions = async (
  topic: string,
  difficulty: Difficulty,
  count: number = 5
): Promise<Question[]> => {
  const ai = getAiClient();

  const prompt = `
    Erstelle ein Quiz für das Thema: "${topic}".
    Schwierigkeitsgrad: ${difficulty}.
    Anzahl der Fragen: ${count}.
    Sprache: Deutsch.
    
    Generiere 4 Antwortmöglichkeiten pro Frage. 
    Nur eine Antwort ist korrekt.
    Die Fragen sollten prägnant und unterhaltsam sein, im Stil von 'Kahoot'.
    Setze das Zeitlimit basierend auf der Komplexität (zwischen 10 und 30 Sekunden).
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              text: {
                type: Type.STRING,
                description: "Der Text der Frage",
              },
              options: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Ein Array von genau 4 Antwortmöglichkeiten",
              },
              correctIndex: {
                type: Type.INTEGER,
                description: "Der Index der korrekten Antwort (0-3)",
              },
              timeLimitSeconds: {
                type: Type.INTEGER,
                description: "Zeitlimit in Sekunden (10-30)",
              },
            },
            required: ["text", "options", "correctIndex", "timeLimitSeconds"],
          },
        },
      },
    });

    const rawText = response.text;
    if (!rawText) {
      throw new Error("No content generated");
    }

    const questions = JSON.parse(rawText) as Question[];
    
    // Sanity check to ensure we always have 4 options
    return questions.map(q => ({
        ...q,
        options: q.options.slice(0, 4) // Ensure max 4
    }));

  } catch (error) {
    console.error("Error generating quiz:", error);
    throw error;
  }
};