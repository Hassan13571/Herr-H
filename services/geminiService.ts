import { GoogleGenAI, Type } from "@google/genai";
import { Difficulty, Question, Language } from "../types";

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

// Fallback Data (Offline Mode)
const MOCK_TOPICS = [
  "Allgemeinwissen", "Tiere", "Geografie", "Wissenschaft", 
  "Geschichte", "Kino & TV", "Musik 80er", "Technologie", 
  "Sport", "Essen & Trinken"
];

const generateMockQuestions = (topic: string, count: number, difficulty: Difficulty, lang: Language): Question[] => {
  const isDE = lang === 'DE';
  return Array.from({ length: count }).map((_, i) => {
    const correctIndex = Math.floor(Math.random() * 4);
    const options = isDE 
        ? ["Antwort A", "Antwort B", "Antwort C", "Antwort D"] 
        : ["Answer A", "Answer B", "Answer C", "Answer D"];
    options[correctIndex] = isDE ? "Dies ist die richtige Antwort" : "This is the correct answer";
    
    return {
      text: isDE 
        ? `[Offline/Demo] Frage ${i + 1} zu "${topic}" (${difficulty}). (Die KI-API war nicht erreichbar)`
        : `[Offline/Demo] Question ${i + 1} about "${topic}" (${difficulty}). (AI API unavailable)`,
      options: options,
      correctIndex: correctIndex,
      timeLimitSeconds: 60, // Increased to 60 seconds
      explanation: isDE 
        ? "Dies ist eine generierte Erklärung für den Offline-Modus."
        : "This is a generated explanation for offline mode."
    };
  });
};

export const generateTopicSuggestions = async (baseInput: string, lang: Language): Promise<string[]> => {
  try {
    const ai = getAiClient();
    const isDE = lang === 'DE';
    
    const basePrompt = baseInput.trim() 
      ? (isDE ? `Basierend auf dem Stichwort "${baseInput}", schlage 5 spezifische, lustige und kurze Quiz-Titel vor.` : `Based on the keyword "${baseInput}", suggest 5 specific, fun, and short quiz titles.`)
      : (isDE ? `Schlage 5 lustige, zufällige und kreative Quiz-Themen für eine Party vor.` : `Suggest 5 fun, random, and creative quiz topics for a party.`);

    const prompt = `
      ${basePrompt}
      ${isDE ? 'Die Titel sollten auf Deutsch sein' : 'The titles should be in English'}, kurz (max 4-5 Wörter/words) und spannend klingen.
      Antworte nur mit einer JSON Liste von Strings.
    `;

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
    if (!rawText) return MOCK_TOPICS.slice(0, 5);
    return JSON.parse(rawText) as string[];
  } catch (error) {
    console.warn("Gemini API failed (Topics), using fallback:", error);
    // Fallback: Return random selection from MOCK_TOPICS
    return MOCK_TOPICS.sort(() => 0.5 - Math.random()).slice(0, 5);
  }
};

export const generateQuizCover = async (topic: string): Promise<string | null> => {
  try {
    const ai = getAiClient();
    
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
    console.warn("Gemini API failed (Cover Image):", error);
    return null; // Fail gracefully without image
  }
};

export const fetchDailyNews = async (lang: Language): Promise<string[]> => {
    try {
        const ai = getAiClient();
        const isDE = lang === 'DE';
        const prompt = isDE 
            ? "Suche nach den aktuellsten 'Breaking News' Schlagzeilen aus Deutschland von heute (Tagesschau, Spiegel, NTV). Gib mir NUR eine reine Liste von 5-8 kurzen, prägnanten Sätzen. Keine Aufzählungszeichen im Text."
            : "Search for the latest breaking news headlines from major networks. Give me a clean list of 5-8 short, punchy sentences. No bullet points in text.";

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
                // Note: responseSchema is not allowed with tools for this model often, so we ask for text and parse manually or rely on newlines
            }
        });

        let text = response.text || "";
        // Clean up text to get simple lines
        const headlines = text.split('\n')
            .map(line => line.replace(/^[\-\*\d\.]+\s*/, '').trim())
            .filter(line => line.length > 10); // Filter out empty or too short lines

        return headlines.slice(0, 10);
    } catch (e) {
        console.error("News fetch failed", e);
        return lang === 'DE' 
            ? ["Willkommen bei Herr Raza TV", "Das ultimative Quiz Erlebnis", "Breaking News: Heute wird gespielt!", "Viel Spaß beim Raten"]
            : ["Welcome to Herr Raza TV", "The ultimate quiz experience", "Breaking News: Game on!", "Have fun guessing"];
    }
};

export const generateQuizQuestions = async (
  topic: string,
  difficulty: Difficulty,
  count: number = 5,
  useSearch: boolean = false,
  customInstructions: string = "",
  lang: Language = 'DE'
): Promise<Question[]> => {
  try {
    const ai = getAiClient();
    const isDE = lang === 'DE';
    const langName = isDE ? "Deutsch" : "English";

    let prompt = `
      You are the world's best educator and quiz master.
      Create an absolutely comprehensive quiz for the topic: "${topic}".
      Difficulty: ${difficulty}.
      Number of questions: ${count}.
      LANGUAGE: ${langName} (Strictly output everything in ${langName}).
      
      ADDITIONAL EXPERT INSTRUCTIONS: "${customInstructions}"
      (Follow these instructions strictly regarding question selection and explanation style.)

      Structure:
      - Generate 4 options per question. Only one is correct.
      - Questions should cover the topic broadly.
      - Set time limit to 60 seconds.
      - Suggest a short visual keyword string for an image for each question (field: "imagePrompt").
      
      IMPORTANT - THE EXPLANATION (explanation):
      - The "explanation" is the core.
      - ALWAYS explain complex terms with simple analogies or everyday examples.
      - If technical terms appear, "translate" them for laypeople.
      - Style should be: "Imagine..." or "It's like...".
      - Make it educational but extremely easy to understand.
      - Ensure the explanation is in ${langName}.
    `;

    if (useSearch) {
      prompt += `
      IMPORTANT: Use Google Search to find CURRENT and REAL-TIME relevant information for this topic (e.g., latest news, results, trends).
      
      Output the result EXCLUSIVELY as a valid JSON Array. 
      No Markdown, no explanations outside JSON.
      Format: [{"text": "...", "options": ["A","B","C","D"], "correctIndex": 0, "timeLimitSeconds": 60, "explanation": "...", "imagePrompt": "visual description..."}, ...]
      `;
    }

    const config: any = {};

    if (useSearch) {
      config.tools = [{ googleSearch: {} }];
    } else {
      config.responseMimeType = "application/json";
      config.responseSchema = {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            text: { type: Type.STRING },
            options: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            correctIndex: { type: Type.INTEGER },
            timeLimitSeconds: { type: Type.INTEGER },
            explanation: { type: Type.STRING },
            imagePrompt: { type: Type.STRING },
          },
          required: ["text", "options", "correctIndex", "timeLimitSeconds", "explanation"],
        },
      };
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: config,
    });

    let rawText = response.text;
    if (!rawText) {
      throw new Error("No content generated");
    }

    if (useSearch) {
        rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    }

    const parsedQuestions = JSON.parse(rawText) as (Question & { imagePrompt?: string })[];
    
    // Generate Images for questions in parallel (limit to first 5-8 to save time/quota, or all if few)
    // We will attempt to generate images for ALL questions but catch errors gracefully
    const questionsWithImages = await Promise.all(parsedQuestions.map(async (q) => {
        let imageUrl = undefined;
        if (q.imagePrompt || q.text) {
             try {
                // Shorten prompt to save tokens and be specific
                const imgPrompt = `Cartoon style illustration, ${q.imagePrompt || q.text}. Minimalist, colorful, high quality 3d render.`;
                const imgResponse = await ai.models.generateImages({
                    model: 'imagen-4.0-generate-001',
                    prompt: imgPrompt,
                    config: { numberOfImages: 1, aspectRatio: '16:9', outputMimeType: 'image/jpeg' }
                });
                if (imgResponse.generatedImages?.length > 0) {
                    imageUrl = imgResponse.generatedImages[0].image.imageBytes;
                }
             } catch (e) {
                 // Ignore image gen errors, proceed with text only
             }
        }
        return {
            ...q,
            imageUrl,
            options: q.options ? q.options.slice(0, 4) : ["A","B","C","D"],
            timeLimitSeconds: 60
        };
    }));

    return questionsWithImages;

  } catch (error) {
    console.error("Gemini API failed (Questions), using fallback:", error);
    return generateMockQuestions(topic, count, difficulty, lang);
  }
};