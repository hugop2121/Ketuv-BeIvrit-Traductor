import { GoogleGenAI, Type } from "@google/genai";
import { VerseData, WordAnalysis } from "../types";

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

// Cargar caché inicial desde localStorage
const getInitialCache = (): Record<string, VerseData> => {
  try {
    const saved = localStorage.getItem('ketuv_verse_cache');
    return saved ? JSON.parse(saved) : {};
  } catch (e) {
    return {};
  }
};

const verseCache: Record<string, VerseData> = getInitialCache();

const saveCache = () => {
  try {
    // Limitar el tamaño de la caché para no saturar localStorage (aprox 50 versículos)
    const keys = Object.keys(verseCache);
    if (keys.length > 50) {
      delete verseCache[keys[0]];
    }
    localStorage.setItem('ketuv_verse_cache', JSON.stringify(verseCache));
  } catch (e) {
    console.warn("No se pudo guardar la caché en localStorage");
  }
};

export async function getVerseAnalysis(book: string, chapter: number, verse: number): Promise<VerseData> {
  const cacheKey = `${book}-${chapter}-${verse}`;
  if (verseCache[cacheKey]) {
    return verseCache[cacheKey];
  }

  const model = "gemini-3-flash-preview";
  const prompt = `Actúa como un experto en hebreo bíblico y lingüística semítica. 
  Proporciona el texto original, análisis morfosintáctico detallado y sugerencias de traducción para el siguiente versículo de la Torah:
  Libro: ${book}
  Capítulo: ${chapter}
  Versículo: ${verse}

  El análisis de cada palabra debe incluir: significado (traducción literal al español), raíz (shoresh), forma léxica, categoría gramatical, morfología detallada (tiempo, modo, aspecto para verbos; género, número, estado para sustantivos), función sintáctica, transliteración y pronunciación.
  
  También proporciona una traducción sugerida al español y una breve explicación de las decisiones de traducción.`;

  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("La clave de API de Gemini no está configurada. Por favor, añádela en las variables de entorno.");
    }

    const response = await genAI.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            hebrewText: { type: Type.STRING },
            words: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  word: { type: Type.STRING },
                  meaning: { type: Type.STRING },
                  root: { type: Type.STRING },
                  lexicalForm: { type: Type.STRING },
                  category: { type: Type.STRING },
                  morphology: { type: Type.STRING },
                  function: { type: Type.STRING },
                  transliteration: { type: Type.STRING },
                  pronunciation: { type: Type.STRING },
                },
                required: ["word", "meaning", "root", "lexicalForm", "category", "morphology", "function", "transliteration", "pronunciation"]
              }
            },
            aiTranslation: { type: Type.STRING },
            aiExplanation: { type: Type.STRING }
          },
          required: ["hebrewText", "words", "aiTranslation", "aiExplanation"]
        }
      }
    });

    if (!response.text) {
      throw new Error("No se recibió respuesta del modelo.");
    }

    const data = JSON.parse(response.text);
    const result = {
      book,
      chapter,
      verse,
      ...data
    };
    verseCache[cacheKey] = result;
    saveCache();
    return result;
  } catch (error: any) {
    console.error("Error in getVerseAnalysis:", error);
    if (error.message?.includes("429") || error.message?.includes("quota") || error.message?.includes("RESOURCE_EXHAUSTED")) {
      throw new Error("Has alcanzado el límite de consultas gratuitas. Por favor, espera un minuto antes de intentar de nuevo.");
    }
    throw error;
  }
}

export async function searchBible(query: string): Promise<string> {
  const model = "gemini-3-flash-preview";
  const prompt = `Busca en la Torah (Hebreo Bíblico) información sobre: "${query}". 
  Devuelve una lista de versículos relevantes con su referencia (Libro Capítulo:Versículo) y una breve explicación de por qué son relevantes.`;

  try {
    const response = await genAI.models.generateContent({
      model,
      contents: prompt,
    });

    return response.text || "No se encontraron resultados.";
  } catch (error) {
    console.error("Error in searchBible:", error);
    throw error;
  }
}
